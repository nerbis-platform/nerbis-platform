# backend/core/views_2fa.py
# Views para 2FA (TOTP): setup, verify, disable, backup codes y challenge.

import base64
import io
import logging
from datetime import UTC, datetime, timedelta

import jwt
import pyotp
import qrcode
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import TOTPDevice, User, WebAuthnCredential
from .serializers import TenantSerializer, UserSessionSerializer
from .throttles import TwoFactorChallengeThrottle, TwoFactorVerifyThrottle

logger = logging.getLogger(__name__)


# ===================================
# CHALLENGE TOKEN (JWT corto plazo)
# ===================================

_CHALLENGE_SCOPE = "2fa_challenge"
_CHALLENGE_LIFETIME = timedelta(minutes=5)


def issue_2fa_challenge_token(user: User) -> str:
    """
    Emite un JWT de corta duración que permite al cliente presentar el
    código 2FA sin re-ingresar password. Claims: user_id, scope, exp.
    """
    now = datetime.now(tz=UTC)
    payload = {
        "user_id": user.id,
        "scope": _CHALLENGE_SCOPE,
        "exp": now + _CHALLENGE_LIFETIME,
        "iat": now,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_2fa_challenge_token(token: str) -> User:
    """
    Decodifica un challenge token y devuelve el User asociado.
    Lanza ValueError con mensaje human-readable si el token es inválido.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise ValueError("El challenge token ha expirado")
    except jwt.InvalidTokenError:
        raise ValueError("Challenge token inválido")

    if payload.get("scope") != _CHALLENGE_SCOPE:
        raise ValueError("Challenge token con scope incorrecto")

    user_id = payload.get("user_id")
    if not user_id:
        raise ValueError("Challenge token sin user_id")

    try:
        return User.objects.select_related("tenant").get(id=user_id)
    except User.DoesNotExist:
        raise ValueError("Usuario no encontrado")


# ===================================
# HELPERS
# ===================================


def _build_jwt_pair(user: User) -> dict:
    """Construye la respuesta estándar de login con access + refresh."""
    refresh = RefreshToken.for_user(user)
    if user.tenant:
        refresh["tenant_id"] = str(user.tenant.id)
        refresh["tenant_slug"] = user.tenant.slug
    refresh["role"] = user.role
    return {
        "user": UserSessionSerializer(user).data,
        "tenant": TenantSerializer(user.tenant).data if user.tenant else None,
        "tokens": {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        },
    }


def _generate_qr_base64(otpauth_uri: str) -> str:
    """Genera un QR PNG en base64 (data URI) a partir de un otpauth URI."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(otpauth_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def user_has_confirmed_2fa(user: User) -> bool:
    """True si el usuario tiene un TOTPDevice confirmado."""
    device = getattr(user, "totp_device", None)
    return bool(device and device.confirmed)


# ===================================
# VIEWS
# ===================================


class TwoFactorStatusView(APIView):
    """GET /api/auth/2fa/status/ — devuelve si el usuario tiene 2FA activo."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"enabled": user_has_confirmed_2fa(request.user)})


class TwoFactorSetupView(APIView):
    """
    POST /api/auth/2fa/setup/ — inicia enrolamiento de TOTP.

    Crea (o reemplaza si no estaba confirmado) un TOTPDevice con un
    secret nuevo y devuelve el otpauth URI + un QR en base64 para que
    el frontend lo muestre.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [TwoFactorVerifyThrottle]

    def post(self, request):
        user = request.user

        existing = getattr(user, "totp_device", None)
        if existing and existing.confirmed:
            return Response(
                {"error": "Ya tienes 2FA activo. Desactívalo primero si deseas reconfigurarlo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reemplazar dispositivo no confirmado (si existe)
        if existing:
            existing.delete()

        secret = pyotp.random_base32()
        device = TOTPDevice(user=user, confirmed=False, backup_codes=[])
        device.set_secret(secret)
        device.save()

        issuer = getattr(settings, "TWO_FACTOR_ISSUER", "NERBIS")
        tenant_label = user.tenant.slug if user.tenant else ""
        account_name = f"{user.email}"
        if tenant_label:
            account_name = f"{user.email} ({tenant_label})"

        otpauth_uri = pyotp.TOTP(secret).provisioning_uri(
            name=account_name,
            issuer_name=issuer,
        )

        return Response(
            {
                "otpauth_uri": otpauth_uri,
                "qr_code_base64": _generate_qr_base64(otpauth_uri),
            }
        )


class TwoFactorVerifyView(APIView):
    """
    POST /api/auth/2fa/verify/ — confirma el dispositivo con el primer código.

    Body: {"code": "123456"}. Si verifica, marca confirmed=True,
    genera backup codes y los devuelve una sola vez.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [TwoFactorVerifyThrottle]

    def post(self, request):
        user = request.user
        code = str(request.data.get("code", "")).strip()

        if not code:
            return Response(
                {"error": "El código es requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        device = getattr(user, "totp_device", None)
        if not device:
            return Response(
                {"error": "No hay un dispositivo 2FA en proceso de enrolamiento"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if device.confirmed:
            return Response(
                {"error": "El dispositivo 2FA ya estaba confirmado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not device.verify_totp(code):
            return Response(
                {"error": "Código inválido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        device.confirmed = True
        device.last_used_at = timezone.now()
        device.save(update_fields=["confirmed", "last_used_at"])

        backup_codes = device.generate_backup_codes()

        return Response({"backup_codes": backup_codes})


class TwoFactorDisableView(APIView):
    """
    POST /api/auth/2fa/disable/ — desactiva 2FA.

    Para usuarios con password: body {"password", "code"}.
    Para usuarios social-only (sin usable password): body {"code"}.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [TwoFactorVerifyThrottle]

    def post(self, request):
        user = request.user
        device = getattr(user, "totp_device", None)

        if not device or not device.confirmed:
            return Response(
                {"error": "No tienes 2FA activo"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = str(request.data.get("code", "")).strip()
        if not code:
            return Response(
                {"error": "El código 2FA es requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.has_usable_password():
            password = request.data.get("password", "")
            if not password:
                return Response(
                    {"error": "La contraseña es requerida"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not user.check_password(password):
                return Response(
                    {"error": "Contraseña incorrecta"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

        if not (device.verify_totp(code) or device.verify_backup_code(code)):
            return Response(
                {"error": "Código 2FA inválido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        device.delete()
        return Response({"message": "2FA desactivado correctamente"})


class TwoFactorBackupCodesRegenerateView(APIView):
    """
    POST /api/auth/2fa/backup-codes/regenerate/ — regenera backup codes.

    Body: {"code": "123456"} (TOTP válido actual, no acepta backup codes).
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [TwoFactorVerifyThrottle]

    def post(self, request):
        user = request.user
        device = getattr(user, "totp_device", None)

        if not device or not device.confirmed:
            return Response(
                {"error": "No tienes 2FA activo"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = str(request.data.get("code", "")).strip()
        if not code or not device.verify_totp(code):
            return Response(
                {"error": "Código TOTP inválido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        backup_codes = device.generate_backup_codes()
        return Response({"backup_codes": backup_codes})


class TwoFactorChallengeView(APIView):
    """
    POST /api/auth/2fa/challenge/ — completa el login tras 2FA.

    Body: {"challenge_token", "code"}. El código puede ser TOTP o un
    backup code. Devuelve el par completo de tokens JWT.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [TwoFactorChallengeThrottle]

    def post(self, request):
        challenge_token = request.data.get("challenge_token", "")
        code = str(request.data.get("code", "")).strip()

        if not challenge_token or not code:
            return Response(
                {"error": "challenge_token y code son requeridos"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = decode_2fa_challenge_token(challenge_token)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        device = getattr(user, "totp_device", None)
        if not device or not device.confirmed:
            return Response(
                {"error": "El usuario no tiene 2FA configurado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (device.verify_totp(code) or device.verify_backup_code(code)):
            return Response(
                {"error": "Código 2FA inválido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        device.last_used_at = timezone.now()
        device.save(update_fields=["last_used_at"])

        return Response(_build_jwt_pair(user))


class TwoFactorPasskeyOptionsView(APIView):
    """
    POST /api/auth/2fa/challenge/passkey/options/

    Genera opciones de autenticación WebAuthn para un usuario identificado
    por su challenge_token de 2FA. Almacena el challenge en cache para
    verificación posterior.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [TwoFactorChallengeThrottle]

    def post(self, request):
        challenge_token = request.data.get("challenge_token", "")
        if not challenge_token:
            return Response(
                {"error": "challenge_token es requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = decode_2fa_challenge_token(challenge_token)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar que el usuario tiene credenciales WebAuthn
        credentials = WebAuthnCredential.objects.filter(user=user)
        if not credentials.exists():
            return Response(
                {"error": "No tienes passkeys registrados"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from webauthn import generate_authentication_options, options_to_json
        from webauthn.helpers.structs import (
            PublicKeyCredentialDescriptor,
            UserVerificationRequirement,
        )

        from .webauthn_auth import (
            _rp_id,
            _store_challenge,
        )

        allow_credentials = [
            PublicKeyCredentialDescriptor(id=bytes(cred.credential_id))
            for cred in credentials
        ]

        options = generate_authentication_options(
            rp_id=_rp_id(),
            allow_credentials=allow_credentials,
            user_verification=UserVerificationRequirement.PREFERRED,
        )

        # Almacenar challenge con scope '2fa' y key basado en user_id
        scope_key = f"2fa:{user.id}"
        _store_challenge("auth", scope_key, options.challenge)

        import json

        parsed = json.loads(options_to_json(options))
        parsed["_scope"] = scope_key
        return Response(parsed, status=status.HTTP_200_OK)


class TwoFactorPasskeyVerifyView(APIView):
    """
    POST /api/auth/2fa/challenge/passkey/verify/

    Verifica una assertion WebAuthn en contexto de 2FA. El usuario
    se identifica por el challenge_token; la assertion se verifica
    contra sus credenciales registradas. Si es válida, retorna JWT.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [TwoFactorChallengeThrottle]

    def post(self, request):
        challenge_token = request.data.get("challenge_token", "")
        credential = request.data.get("credential")
        scope = request.data.get("scope", "")

        if not challenge_token or not credential or not scope:
            return Response(
                {"error": "challenge_token, credential y scope son requeridos"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = decode_2fa_challenge_token(challenge_token)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        from webauthn import verify_authentication_response

        from .webauthn_auth import (
            _b64url_decode,
            _expected_origin,
            _pop_challenge,
            _rp_id,
        )

        stored = _pop_challenge("auth", scope)
        if not stored:
            return Response(
                {"error": "Challenge expirado. Vuelve a intentarlo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolver credencial por rawId
        raw_id_b64 = credential.get("rawId") if isinstance(credential, dict) else None
        if not raw_id_b64:
            return Response(
                {"error": "credential.rawId requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            raw_id = _b64url_decode(raw_id_b64)
        except Exception:
            return Response(
                {"error": "rawId inválido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # La credencial debe pertenecer al usuario del challenge token
        try:
            cred_obj = WebAuthnCredential.objects.get(
                credential_id=raw_id, user=user
            )
        except WebAuthnCredential.DoesNotExist:
            return Response(
                {"error": "Passkey no reconocido para este usuario"},
                status=status.HTTP_400_BAD_REQUEST,
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
                {"error": f"Verificación fallida: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Actualizar sign_count + last_used_at
        cred_obj.sign_count = verification.new_sign_count
        cred_obj.last_used_at = timezone.now()
        cred_obj.save(update_fields=["sign_count", "last_used_at"])

        return Response(_build_jwt_pair(user))
