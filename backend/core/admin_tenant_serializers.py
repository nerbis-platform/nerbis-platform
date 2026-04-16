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

from rest_framework import serializers

from core.models import Tenant


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
