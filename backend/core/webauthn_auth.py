# backend/core/webauthn_auth.py
# WebAuthn (passkey) registration and authentication endpoints.
#
# Flujo:
#   Registro:
#     1) POST /auth/passkey/register/options/    (autenticado) -> opciones
#     2) navegador llama navigator.credentials.create(...)
#     3) POST /auth/passkey/register/verify/     (autenticado) -> guarda credential
#
#   Login:
#     1) POST /auth/passkey/authenticate/options/ (público, email opcional) -> opciones
#     2) navegador llama navigator.credentials.get(...)
#     3) POST /auth/passkey/authenticate/verify/  (público) -> JWT tokens

from __future__ import annotations

import base64
import json
import secrets

from django.conf import settings
from django.core.cache import caches
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from .models import User, WebAuthnCredential
from .serializers import TenantSerializer, UserSessionSerializer
from .throttles import LoginThrottle

# cache dedicado para challenges (reutilizamos el cache de throttle: redis/local)
_challenge_cache = caches["throttle"]

# TTL de los challenges: 5 minutos (especificación recomienda <= 10 min)
CHALLENGE_TTL_SECONDS = 300


# ===================================
# HELPERS
# ===================================


def _rp_id() -> str:
    return getattr(settings, "WEBAUTHN_RP_ID", "localhost")


def _rp_name() -> str:
    return getattr(settings, "WEBAUTHN_RP_NAME", "NERBIS")


def _expected_origin() -> str | list[str]:
    origin = getattr(settings, "WEBAUTHN_ORIGIN", "http://localhost:3000")
    # Permitir lista de orígenes separados por coma para múltiples envs de desarrollo
    if isinstance(origin, str) and "," in origin:
        return [o.strip() for o in origin.split(",") if o.strip()]
    return origin


def _b64url_encode(data: bytes) -> str:
    """Base64 URL-safe sin padding (compatible con browser atob decodificando urlsafe)."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _store_challenge(scope: str, key: str, challenge: bytes, extra: dict | None = None) -> None:
    """Guarda challenge en cache por scope ('reg' o 'auth') y key (user.id o temp token)."""
    payload = {"challenge": _b64url_encode(challenge)}
    if extra:
        payload.update(extra)
    _challenge_cache.set(f"webauthn:{scope}:{key}", payload, CHALLENGE_TTL_SECONDS)


def _pop_challenge(scope: str, key: str) -> dict | None:
    cache_key = f"webauthn:{scope}:{key}"
    payload = _challenge_cache.get(cache_key)
    if payload:
        _challenge_cache.delete(cache_key)
    return payload


def _tokens_for_user(user: User) -> dict[str, str]:
    refresh = RefreshToken.for_user(user)
    # Embedder claims de tenant (mismo patrón que PlatformLoginView)
    if user.tenant_id:
        refresh["tenant_id"] = str(user.tenant_id)
        refresh["tenant_slug"] = user.tenant.slug
    refresh["role"] = user.role
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


# ===================================
# REGISTRATION — requiere usuario autenticado
# ===================================


class PasskeyRegisterOptionsView(APIView):
    """Genera challenge + opciones para registrar un nuevo passkey al usuario actual."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # Excluir credenciales ya registradas (para que el browser no permita duplicar)
        existing = WebAuthnCredential.objects.filter(user=user)
        exclude = [PublicKeyCredentialDescriptor(id=bytes(cred.credential_id)) for cred in existing]

        options = generate_registration_options(
            rp_id=_rp_id(),
            rp_name=_rp_name(),
            user_id=str(user.id).encode("utf-8"),
            user_name=user.email,
            user_display_name=user.get_full_name() or user.email,
            exclude_credentials=exclude,
            authenticator_selection=AuthenticatorSelectionCriteria(
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.PREFERRED,
            ),
            supported_pub_key_algs=[
                COSEAlgorithmIdentifier.ECDSA_SHA_256,
                COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,
            ],
        )

        _store_challenge("reg", str(user.id), options.challenge)

        # options_to_json retorna un string JSON; parsear para que DRF no lo re-codifique
        return Response(json.loads(options_to_json(options)), status=status.HTTP_200_OK)


class PasskeyRegisterVerifyView(APIView):
    """Verifica la respuesta del authenticator y guarda la credencial."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        credential = request.data.get("credential")
        name = (request.data.get("name") or "Mi passkey").strip()[:100]

        if not credential:
            return Response({"detail": "credential requerido"}, status=status.HTTP_400_BAD_REQUEST)

        stored = _pop_challenge("reg", str(user.id))
        if not stored:
            return Response(
                {"detail": "Challenge expirado o inexistente. Vuelve a intentarlo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            verification = verify_registration_response(
                credential=credential,
                expected_challenge=_b64url_decode(stored["challenge"]),
                expected_origin=_expected_origin(),
                expected_rp_id=_rp_id(),
                require_user_verification=False,
            )
        except Exception as exc:  # noqa: BLE001 — py_webauthn lanza múltiples excepciones
            return Response(
                {"detail": f"Verificación fallida: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Guardar credencial
        transports = []
        response_data = credential.get("response", {}) if isinstance(credential, dict) else {}
        if isinstance(response_data, dict):
            transports = response_data.get("transports", []) or []

        WebAuthnCredential.objects.create(
            user=user,
            credential_id=bytes(verification.credential_id),
            public_key=bytes(verification.credential_public_key),
            sign_count=verification.sign_count,
            name=name or "Mi passkey",
            transports=transports,
        )

        return Response({"detail": "Passkey registrado", "name": name}, status=status.HTTP_201_CREATED)


# ===================================
# AUTHENTICATION — público
# ===================================


class PasskeyAuthenticateOptionsView(APIView):
    """
    Genera challenge para login con passkey.

    Acepta email opcional:
      - con email: restringe allowCredentials al usuario identificado
      - sin email: usabilidad "discoverable credential" (el browser elige)
    """

    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()

        allow_credentials: list[PublicKeyCredentialDescriptor] = []
        user_scope_key: str

        if email:
            # Buscar cualquier usuario con ese email (multi-tenant: puede haber varios)
            creds = WebAuthnCredential.objects.filter(user__email__iexact=email).select_related("user")
            allow_credentials = [PublicKeyCredentialDescriptor(id=bytes(cred.credential_id)) for cred in creds]
            if not allow_credentials:
                return Response(
                    {"detail": "No hay passkeys registrados para este email."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            user_scope_key = f"email:{email}"
        else:
            # Flujo usernameless: generamos un token temporal
            user_scope_key = f"anon:{secrets.token_urlsafe(16)}"

        options = generate_authentication_options(
            rp_id=_rp_id(),
            allow_credentials=allow_credentials,
            user_verification=UserVerificationRequirement.PREFERRED,
        )

        _store_challenge("auth", user_scope_key, options.challenge, extra={"email": email})

        # Devolvemos además el scope key para que el cliente lo envíe en verify
        parsed = json.loads(options_to_json(options))
        parsed["_scope"] = user_scope_key
        return Response(parsed, status=status.HTTP_200_OK)


class PasskeyAuthenticateVerifyView(APIView):
    """Verifica la assertion y retorna JWT access/refresh tokens."""

    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        credential = request.data.get("credential")
        scope = request.data.get("scope")

        if not credential or not scope:
            return Response(
                {"detail": "credential y scope requeridos"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stored = _pop_challenge("auth", scope)
        if not stored:
            return Response(
                {"detail": "Challenge expirado. Vuelve a intentarlo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolver credencial por id
        raw_id_b64 = credential.get("rawId") if isinstance(credential, dict) else None
        if not raw_id_b64:
            return Response({"detail": "credential.rawId requerido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            raw_id = _b64url_decode(raw_id_b64)
        except Exception:
            return Response({"detail": "rawId inválido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cred_obj = WebAuthnCredential.objects.select_related("user", "user__tenant").get(credential_id=raw_id)
        except WebAuthnCredential.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "Este passkey fue eliminado de tu cuenta. "
                        "Bórralo también del llavero de tu dispositivo para no verlo al iniciar sesión."
                    ),
                    "code": "PASSKEY_NOT_REGISTERED",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            verification = verify_authentication_response(
                credential=credential,
                expected_challenge=_b64url_decode(stored["challenge"]),
                expected_origin=_expected_origin(),
                expected_rp_id=_rp_id(),
                credential_public_key=bytes(cred_obj.public_key),
                credential_current_sign_count=cred_obj.sign_count,
                require_user_verification=False,
            )
        except Exception as exc:  # noqa: BLE001
            return Response(
                {"detail": f"Verificación fallida: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Actualizar sign_count + last_used_at
        from django.utils import timezone

        cred_obj.sign_count = verification.new_sign_count
        cred_obj.last_used_at = timezone.now()
        cred_obj.save(update_fields=["sign_count", "last_used_at"])

        user = cred_obj.user

        # Emitir JWT — mismo shape que PlatformLoginView (AuthResponse)
        tokens = _tokens_for_user(user)

        return Response(
            {
                "user": UserSessionSerializer(user).data,
                "tenant": TenantSerializer(user.tenant).data if user.tenant else None,
                "tokens": tokens,
            },
            status=status.HTTP_200_OK,
        )


# ===================================
# GESTIÓN DE PASSKEYS (listado/rename/delete) — requiere usuario autenticado
# ===================================


class PasskeyListView(APIView):
    """GET: lista de passkeys del usuario actual."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        creds = WebAuthnCredential.objects.filter(user=request.user).order_by("-created_at")
        data = [
            {
                "id": c.id,
                "name": c.name,
                "created_at": c.created_at.isoformat(),
                "last_used_at": c.last_used_at.isoformat() if c.last_used_at else None,
                "transports": c.transports,
            }
            for c in creds
        ]
        return Response(data, status=status.HTTP_200_OK)


class PasskeyDetailView(APIView):
    """PATCH (rename) / DELETE una credencial específica del usuario actual."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk: int):
        try:
            cred = WebAuthnCredential.objects.get(pk=pk, user=request.user)
        except WebAuthnCredential.DoesNotExist:
            return Response({"detail": "No encontrado"}, status=status.HTTP_404_NOT_FOUND)

        name = (request.data.get("name") or "").strip()[:100]
        if not name:
            return Response({"detail": "name requerido"}, status=status.HTTP_400_BAD_REQUEST)

        cred.name = name
        cred.save(update_fields=["name"])
        return Response({"id": cred.id, "name": cred.name}, status=status.HTTP_200_OK)

    def delete(self, request, pk: int):
        deleted, _ = WebAuthnCredential.objects.filter(pk=pk, user=request.user).delete()
        if not deleted:
            return Response({"detail": "No encontrado"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
