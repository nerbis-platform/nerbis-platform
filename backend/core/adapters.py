# backend/core/adapters.py

"""
Adapter personalizado para django-allauth — social login a nivel de PLATAFORMA.

Flujo de registro con social login:
  1. Dueño llena formulario (nombre negocio, industria, país)
  2. Clic en "Crear con Google" en vez de "Crear mi negocio"
  3. POST /api/public/social-login/init/ guarda datos del negocio en sesión
  4. Redirect a Google OAuth
  5. Callback → este adapter lee los datos de sesión
  6. Si hay datos de negocio → crea Tenant + User (como TenantRegisterView)
  7. Si no hay datos → busca usuario existente (login)

Flujo de login con social login:
  1. Clic en "Iniciar sesión con Google"
  2. Google OAuth → callback
  3. pre_social_login() busca usuario por email (cross-tenant)
  4. Si existe → login directo

La cadena de relación es: SocialAccount → User → Tenant
"""

import logging

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.db import transaction
from django.utils.text import slugify

from .models import Tenant, User

logger = logging.getLogger(__name__)

# Key de sesión donde se guardan los datos del negocio para registro
SOCIAL_REGISTER_SESSION_KEY = "social_register_data"


class TenantSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Adapter para social login de dueños de negocio (nivel plataforma).

    - Registro: crea Tenant + User con los datos guardados en sesión
    - Login: busca usuario existente por email cross-tenant
    """

    def pre_social_login(self, request, sociallogin):
        """
        Después de OAuth exitoso, antes de crear/conectar cuenta.

        Si el email ya existe, conecta la social account al usuario existente.
        Funciona cross-tenant (como PlatformLoginView).
        """
        if sociallogin.is_existing:
            return

        email = self._get_email_from_sociallogin(sociallogin)
        if not email:
            return

        # Buscar usuario existente por email (cross-tenant)
        try:
            existing_user = (
                User.objects.select_related("tenant").filter(email__iexact=email).order_by("-date_joined").first()
            )
            if existing_user:
                sociallogin.connect(request, existing_user)
                tenant_info = f" en tenant {existing_user.tenant.slug}" if existing_user.tenant else " (sin tenant)"
                logger.info(
                    f"Social account ({sociallogin.account.provider}) vinculada a "
                    f"usuario existente: {email}{tenant_info}"
                )
        except Exception:
            logger.exception("Error al vincular social account con usuario existente")

    def save_user(self, request, sociallogin, form=None):
        """
        Crear usuario nuevo desde social login.

        Si hay datos de negocio en sesión (registro), crea Tenant + User.
        Si no hay datos (solo login con cuenta nueva), crea User sin tenant.
        """
        register_data = request.session.pop(SOCIAL_REGISTER_SESSION_KEY, None)

        if register_data:
            return self._create_tenant_and_user(request, sociallogin, register_data)

        # Sin datos de registro — crear usuario básico sin tenant
        user = super().save_user(request, sociallogin, form)
        logger.info(
            f"Usuario creado via social login (sin tenant): {user.email} (provider: {sociallogin.account.provider})"
        )
        return user

    def _create_tenant_and_user(self, request, sociallogin, register_data):
        """
        Crear Tenant + User admin en una transacción.
        Replica la lógica de TenantRegisterSerializer.create().
        """
        business_name = register_data["business_name"]
        industry = register_data.get("industry", "other")
        country = register_data.get("country", "Colombia")
        phone = register_data.get("phone", "")

        # Datos del usuario desde Google/Facebook
        extra_data = sociallogin.account.extra_data
        email = self._get_email_from_sociallogin(sociallogin)
        first_name = extra_data.get("given_name", extra_data.get("first_name", ""))
        last_name = extra_data.get("family_name", extra_data.get("last_name", ""))

        with transaction.atomic():
            # Generar slug único
            base_slug = slugify(business_name)
            slug = base_slug
            counter = 1
            while Tenant.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            # Crear Tenant (signals auto-crean Subscription + Modules)
            tenant = Tenant.objects.create(
                name=business_name,
                slug=slug,
                email=email,
                phone=phone,
                industry=industry,
                country=country,
                plan="trial",
            )

            # Crear usuario admin (sin password — usa social login)
            user = User(
                email=email,
                tenant=tenant,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                role="admin",
                is_staff=True,
            )
            user.set_unusable_password()
            user.save()

            # Vincular la social account al usuario
            sociallogin.account.user = user
            sociallogin.account.save()

            logger.info(
                f"Tenant '{tenant.name}' ({tenant.slug}) creado via social login "
                f"({sociallogin.account.provider}) — admin: {email}"
            )

        return user

    def _get_email_from_sociallogin(self, sociallogin):
        """Extraer email de los datos del social login."""
        if sociallogin.email_addresses:
            return sociallogin.email_addresses[0].email
        return sociallogin.account.extra_data.get("email")
