# backend/core/social_auth.py
# Verificación de tokens OAuth y lógica de social login/create.

import logging
from dataclasses import dataclass, field

import jwt
import requests
from django.conf import settings
from django.db import IntegrityError, transaction
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token as google_id_token

from .models import SocialAccount, Tenant, User

logger = logging.getLogger(__name__)


class SocialAuthError(Exception):
    """Error durante la verificación de token social."""


class LinkingRequired(Exception):
    """El email ya existe con contraseña — requiere vinculación manual."""

    def __init__(self, email: str, provider: str):
        self.email = email
        self.provider = provider
        super().__init__(f"Account linking required for {email}")


@dataclass
class SocialUserInfo:
    """Datos del usuario extraídos del token del proveedor."""

    provider: str
    provider_uid: str
    email: str
    first_name: str = ""
    last_name: str = ""
    avatar_url: str = ""
    extra_data: dict = field(default_factory=dict)


# ===================================
# VERIFICADORES POR PROVEEDOR
# ===================================


def _verify_google_access_token(token: str) -> SocialUserInfo:
    """Verificar Google access_token via tokeninfo + userinfo endpoints."""
    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    try:
        # Validar que el token fue emitido para nuestra app (audience)
        tokeninfo_resp = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"access_token": token},
            timeout=10,
        )
        tokeninfo_resp.raise_for_status()
        tokeninfo = tokeninfo_resp.json()

        token_aud = tokeninfo.get("aud", "")
        if token_aud != client_id:
            raise SocialAuthError("El token de Google no corresponde a esta aplicación")

        # Obtener datos del usuario
        resp = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        resp.raise_for_status()
        userinfo = resp.json()
    except requests.RequestException as e:
        raise SocialAuthError(f"Error al verificar con Google: {e}")

    email = userinfo.get("email")
    if not email:
        raise SocialAuthError("El token de Google no contiene email")

    if not userinfo.get("email_verified", False):
        raise SocialAuthError("El email de Google no está verificado")

    return SocialUserInfo(
        provider="google",
        provider_uid=userinfo["sub"],
        email=email.lower(),
        first_name=userinfo.get("given_name", ""),
        last_name=userinfo.get("family_name", ""),
        avatar_url=userinfo.get("picture", ""),
        extra_data={
            "name": userinfo.get("name", ""),
            "picture": userinfo.get("picture", ""),
            "locale": userinfo.get("locale", ""),
        },
    )


def verify_google_token(token: str) -> SocialUserInfo:
    """Verificar Google token (id_token o access_token)."""
    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    if not client_id:
        raise SocialAuthError("Google OAuth no está configurado")

    # Intentar primero como id_token, si falla intentar como access_token
    try:
        idinfo = google_id_token.verify_oauth2_token(token, GoogleRequest(), client_id)
    except ValueError:
        # No es un id_token válido — intentar como access_token
        return _verify_google_access_token(token)

    email = idinfo.get("email")
    if not email:
        raise SocialAuthError("El token de Google no contiene email")

    if not idinfo.get("email_verified", False):
        raise SocialAuthError("El email de Google no está verificado")

    return SocialUserInfo(
        provider="google",
        provider_uid=idinfo["sub"],
        email=email.lower(),
        first_name=idinfo.get("given_name", ""),
        last_name=idinfo.get("family_name", ""),
        avatar_url=idinfo.get("picture", ""),
        extra_data={
            "name": idinfo.get("name", ""),
            "picture": idinfo.get("picture", ""),
            "locale": idinfo.get("locale", ""),
        },
    )


def _get_apple_public_keys() -> list[dict]:
    """Obtener las claves públicas de Apple para verificación JWT."""
    resp = requests.get("https://appleid.apple.com/auth/keys", timeout=10)
    resp.raise_for_status()
    return resp.json()["keys"]


def verify_apple_token(token: str, first_name: str = "", last_name: str = "") -> SocialUserInfo:
    """Verificar Apple id_token y extraer datos del usuario."""
    client_id = settings.APPLE_CLIENT_ID
    if not client_id:
        raise SocialAuthError("Apple OAuth no está configurado")

    try:
        # Decodificar header para obtener kid
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        # Obtener claves públicas de Apple
        apple_keys = _get_apple_public_keys()
        matching_key = next((k for k in apple_keys if k["kid"] == kid), None)
        if not matching_key:
            raise SocialAuthError("No se encontró la clave pública de Apple")

        # Construir clave pública y decodificar
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(matching_key)
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=client_id,
            issuer="https://appleid.apple.com",
        )
    except jwt.ExpiredSignatureError:
        raise SocialAuthError("Token de Apple expirado")
    except jwt.InvalidTokenError as e:
        raise SocialAuthError(f"Token de Apple inválido: {e}")
    except requests.RequestException as e:
        raise SocialAuthError(f"Error al verificar con Apple: {e}")

    email = payload.get("email", "")
    if not email:
        raise SocialAuthError("El token de Apple no contiene email")

    return SocialUserInfo(
        provider="apple",
        provider_uid=payload["sub"],
        email=email.lower(),
        first_name=first_name,
        last_name=last_name,
        extra_data={
            "is_private_email": payload.get("is_private_email", False),
        },
    )


def verify_facebook_token(token: str) -> SocialUserInfo:
    """Verificar Facebook access_token y extraer datos del usuario."""
    app_id = settings.FACEBOOK_APP_ID
    app_secret = settings.FACEBOOK_APP_SECRET
    if not app_id or not app_secret:
        raise SocialAuthError("Facebook OAuth no está configurado")

    try:
        # Verificar validez del token con debug endpoint
        debug_resp = requests.get(
            "https://graph.facebook.com/debug_token",
            params={"input_token": token, "access_token": f"{app_id}|{app_secret}"},
            timeout=10,
        )
        debug_resp.raise_for_status()
        debug_data = debug_resp.json().get("data", {})

        if not debug_data.get("is_valid"):
            raise SocialAuthError("Token de Facebook inválido")

        if str(debug_data.get("app_id")) != str(app_id):
            raise SocialAuthError("Token de Facebook no corresponde a esta aplicación")

        # Obtener datos del usuario
        me_resp = requests.get(
            "https://graph.facebook.com/me",
            params={"fields": "id,email,first_name,last_name,picture.type(large)", "access_token": token},
            timeout=10,
        )
        me_resp.raise_for_status()
        me_data = me_resp.json()
    except requests.RequestException as e:
        raise SocialAuthError(f"Error al verificar con Facebook: {e}")

    email = me_data.get("email", "")
    if not email:
        raise SocialAuthError("No se pudo obtener el email de Facebook. Verifica los permisos de la app.")

    picture_url = ""
    picture_data = me_data.get("picture", {}).get("data", {})
    if picture_data and not picture_data.get("is_silhouette"):
        picture_url = picture_data.get("url", "")

    return SocialUserInfo(
        provider="facebook",
        provider_uid=me_data["id"],
        email=email.lower(),
        first_name=me_data.get("first_name", ""),
        last_name=me_data.get("last_name", ""),
        avatar_url=picture_url,
        extra_data={
            "name": f"{me_data.get('first_name', '')} {me_data.get('last_name', '')}".strip(),
            "picture": picture_url,
        },
    )


# Mapa de proveedor → función verificadora
PROVIDER_VERIFIERS = {
    "google": verify_google_token,
    "apple": verify_apple_token,
    "facebook": verify_facebook_token,
}


def verify_social_token(provider: str, token: str, **kwargs) -> SocialUserInfo:
    """Despachar al verificador del proveedor correspondiente."""
    verifier = PROVIDER_VERIFIERS.get(provider)
    if not verifier:
        raise SocialAuthError(f"Proveedor no soportado: {provider}")

    if provider == "apple":
        return verifier(token, first_name=kwargs.get("first_name", ""), last_name=kwargs.get("last_name", ""))
    return verifier(token)


# ===================================
# LÓGICA CORE: LOGIN O CREAR USUARIO
# ===================================


def social_login_or_create(social_info: SocialUserInfo, tenant: Tenant) -> User:
    """
    Flujo principal de social auth:
    1. Si existe SocialAccount → retornar user
    2. Si existe User con mismo email → auto-vincular (el proveedor ya verificó la identidad)
    3. No existe → crear User + SocialAccount
    """
    # 1. Buscar SocialAccount existente
    try:
        social_account = SocialAccount.objects.select_related("user").get(
            tenant=tenant,
            provider=social_info.provider,
            provider_uid=social_info.provider_uid,
        )
        # Actualizar extra_data si cambió
        social_account.extra_data = social_info.extra_data
        social_account.save(update_fields=["extra_data", "updated_at"])
        return social_account.user
    except SocialAccount.DoesNotExist:
        pass

    # 2. Buscar User con mismo email en el tenant
    try:
        existing_user = User.objects.get(email__iexact=social_info.email, tenant=tenant)

        # No vincular ni promover cuentas inactivas
        if not existing_user.is_active:
            raise SocialAuthError("Tu cuenta está desactivada")

        with transaction.atomic():
            if existing_user.is_guest:
                if social_info.first_name and not existing_user.first_name:
                    existing_user.first_name = social_info.first_name
                if social_info.last_name and not existing_user.last_name:
                    existing_user.last_name = social_info.last_name
                existing_user.is_guest = False
                existing_user.save()

            # Auto-vincular (get_or_create para manejar concurrencia)
            SocialAccount.objects.get_or_create(
                tenant=tenant,
                provider=social_info.provider,
                provider_uid=social_info.provider_uid,
                defaults={
                    "user": existing_user,
                    "email": social_info.email,
                    "extra_data": social_info.extra_data,
                },
            )
        return existing_user

    except User.DoesNotExist:
        pass

    # 3. Crear nuevo usuario + SocialAccount (con retry por concurrencia)
    try:
        with transaction.atomic():
            username = _generate_username(social_info.email, tenant)
            user = User.objects.create_user(
                tenant=tenant,
                username=username,
                email=social_info.email,
                password=None,
                first_name=social_info.first_name,
                last_name=social_info.last_name,
                role="customer",
            )
            user.set_unusable_password()
            user.save()

            SocialAccount.objects.get_or_create(
                tenant=tenant,
                provider=social_info.provider,
                provider_uid=social_info.provider_uid,
                defaults={
                    "user": user,
                    "email": social_info.email,
                    "extra_data": social_info.extra_data,
                },
            )
        return user
    except IntegrityError:
        # Concurrencia: otro request creó el usuario primero, reconsultar
        user = User.objects.get(email__iexact=social_info.email, tenant=tenant)
        SocialAccount.objects.get_or_create(
            tenant=tenant,
            provider=social_info.provider,
            provider_uid=social_info.provider_uid,
            defaults={
                "user": user,
                "email": social_info.email,
                "extra_data": social_info.extra_data,
            },
        )
        return user


def _generate_username(email: str, tenant: Tenant) -> str:
    """Generar username único desde el email dentro del tenant."""
    base_username = email.split("@")[0].lower()
    username = base_username
    counter = 1
    while User.objects.filter(tenant=tenant, username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1
    return username
