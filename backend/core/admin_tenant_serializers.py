# backend/core/admin_tenant_serializers.py
"""
Serializers para el panel de superadmin de NERBIS — gestión cross-tenant.

Este módulo está aislado por diseño y complementa a ``admin_views.py``:
- NO expone campos sensibles (password, secret_encrypted, backup_codes,
  credential_id binario, public_key binario).
- Usa ``fields = [...]`` explícito en todos los ``Meta``; nunca ``__all__``.
- Los campos computados (``user_count``, ``admin_count``, ``subscription_status``,
  ``days_remaining``) se declaran ``read_only=True``.

Contrato de sub-agente SDD ``sdd/tenant-user-management`` (Issue #110, Phase 2).
"""

from __future__ import annotations

from typing import Any

from rest_framework import serializers

from core.models import SocialAccount, Tenant, User, WebAuthnCredential


class AdminTenantListSerializer(serializers.ModelSerializer):
    """Resumen de tenant para el listado del panel de superadmin.

    Los campos ``user_count``, ``subscription_status`` y ``days_remaining`` se
    resuelven vía anotaciones del queryset (``user_count``) o propiedades
    calculadas del modelo (``subscription_status``, ``days_remaining``).
    """

    user_count = serializers.IntegerField(read_only=True)
    subscription_status = serializers.CharField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "industry",
            "email",
            "plan",
            "is_active",
            "subscription_ends_at",
            "subscription_status",
            "days_remaining",
            "user_count",
            "created_at",
        ]
        read_only_fields = fields


class AdminTenantDetailSerializer(serializers.ModelSerializer):
    """Detalle completo de tenant para el panel de superadmin.

    Incluye información de negocio, dirección, suscripción (sólo resumen —
    sin montos ni datos financieros), banderas de módulos, branding y
    configuración regional. Los campos ``user_count`` y ``admin_count`` vienen
    anotados en el queryset de ``AdminTenantDetailView``.
    """

    user_count = serializers.IntegerField(read_only=True)
    admin_count = serializers.IntegerField(read_only=True)
    subscription_status = serializers.CharField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = Tenant
        fields = [
            # Identificadores
            "id",
            "name",
            "slug",
            # Contacto
            "email",
            "phone",
            # Dirección
            "address",
            "city",
            "state",
            "country",
            "postal_code",
            # Clasificación / estado
            "industry",
            "plan",
            "is_active",
            # Suscripción (resumen read-only)
            "subscription_ends_at",
            "subscription_status",
            "days_remaining",
            # Feature flags
            "has_website",
            "has_shop",
            "has_bookings",
            "has_services",
            "has_marketing",
            "modules_configured",
            # Branding
            "logo",
            "primary_color",
            "secondary_color",
            # Configuración regional
            "timezone",
            "currency",
            "language",
            # Métricas anotadas
            "user_count",
            "admin_count",
            # Metadata
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AdminTenantUpdateSerializer(serializers.Serializer):
    """Allowlist estricto de campos editables por un superadmin.

    Sólo ``is_active`` dispara una entrada en ``AdminAuditLog`` (actions
    ``activate_tenant`` / ``deactivate_tenant``). El resto son actualizaciones
    silenciosas de configuración de plan y módulos.

    Esto no es un ``ModelSerializer`` a propósito: evita que campos del
    modelo como ``name``, ``slug``, ``schema_name`` o ``email`` puedan
    filtrarse como editables por accidente.
    """

    is_active = serializers.BooleanField(required=False)
    plan = serializers.ChoiceField(
        choices=["trial", "basic", "professional", "enterprise"],
        required=False,
    )
    subscription_ends_at = serializers.DateField(required=False, allow_null=True)
    has_website = serializers.BooleanField(required=False)
    has_shop = serializers.BooleanField(required=False)
    has_bookings = serializers.BooleanField(required=False)
    has_services = serializers.BooleanField(required=False)
    has_marketing = serializers.BooleanField(required=False)


# ---------------------------------------------------------------------------
# User serializers — Phase 3 (Issue #110)
# ---------------------------------------------------------------------------


class AdminSocialAccountSerializer(serializers.ModelSerializer):
    """Resumen de cuenta social vinculada al usuario.

    Intencionalmente NO expone ``provider_uid`` ni ``extra_data`` para
    evitar filtrar datos del proveedor. El ``connected_at`` mapea a
    ``created_at`` del modelo.
    """

    connected_at = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = SocialAccount
        fields = [
            "id",
            "provider",
            "email",
            "connected_at",
        ]
        read_only_fields = fields


class AdminPasskeySerializer(serializers.ModelSerializer):
    """Resumen de passkey (WebAuthn). NUNCA expone ``credential_id`` ni ``public_key``."""

    last_used = serializers.DateTimeField(source="last_used_at", read_only=True)

    class Meta:
        model = WebAuthnCredential
        fields = [
            "id",
            "name",
            "last_used",
            "created_at",
        ]
        read_only_fields = fields


class AdminTenantUserSerializer(serializers.ModelSerializer):
    """Resumen para el listado de usuarios dentro de un tenant."""

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "is_guest",
            "last_login",
            "date_joined",
        ]
        read_only_fields = fields


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """Detalle completo del usuario incluyendo métodos de autenticación.

    Los campos ``social_accounts``, ``passkeys``, ``totp_enabled`` y
    ``totp_confirmed_at`` se calculan vía ``SerializerMethodField`` en vez de
    relaciones directas — esto permite prefetchear explícitamente en la vista
    y controlar exactamente qué se serializa.

    NUNCA expone: password hash, secret_encrypted del TOTP, backup_codes,
    credential_id binario ni public_key binario.
    """

    tenant_id = serializers.UUIDField(source="tenant.id", read_only=True, allow_null=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True, allow_null=True)
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True, allow_null=True)
    social_accounts = serializers.SerializerMethodField()
    passkeys = serializers.SerializerMethodField()
    totp_enabled = serializers.SerializerMethodField()
    totp_confirmed_at = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "is_guest",
            "tenant_id",
            "tenant_name",
            "tenant_slug",
            "last_login",
            "date_joined",
            "created_at",
            "updated_at",
            "social_accounts",
            "passkeys",
            "totp_enabled",
            "totp_confirmed_at",
        ]
        read_only_fields = fields

    def get_social_accounts(self, obj: User) -> list[dict[str, Any]]:
        return AdminSocialAccountSerializer(obj.social_accounts.all(), many=True).data

    def get_passkeys(self, obj: User) -> list[dict[str, Any]]:
        return AdminPasskeySerializer(obj.webauthn_credentials.all(), many=True).data

    def get_totp_enabled(self, obj: User) -> bool:
        device = getattr(obj, "totp_device", None)
        return bool(device and device.confirmed)

    def get_totp_confirmed_at(self, obj: User) -> str | None:
        device = getattr(obj, "totp_device", None)
        # No hay un campo ``confirmed_at`` propio en TOTPDevice — se aproxima
        # con ``created_at`` (el dispositivo se crea al confirmarse en los
        # flujos actuales). Si el dispositivo NO está confirmado, devolvemos
        # None para reflejar que la 2FA no está activa.
        if device and device.confirmed:
            return device.created_at.isoformat() if device.created_at else None
        return None


class AdminUserUpdateSerializer(serializers.Serializer):
    """Allowlist estricto para PATCH de usuarios de tenant.

    Solo ``is_active`` y ``role`` son editables por el superadmin. Cualquier
    otro campo (email, phone, tenant) se ignora silenciosamente.
    """

    is_active = serializers.BooleanField(required=False)
    role = serializers.ChoiceField(
        choices=["admin", "staff", "customer"],
        required=False,
    )
