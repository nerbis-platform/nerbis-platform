# backend/billing/serializers.py
"""
Serializers de billing para la API de ciclo de vida de suscripciones (B1).

Reglas multi-tenancy:
- NUNCA exponer ``tenant``/``tenant_id`` ni el UUID de la suscripcion.
- La suscripcion se resuelve siempre via ``request.tenant.subscription``;
  el cliente nunca envia un id de tenant/suscripcion.
"""

from rest_framework import serializers

from .models import Module, Subscription, SubscriptionModule

# Periodos de facturacion validos (espejo de Subscription.BILLING_PERIOD_CHOICES).
_BILLING_PERIODS = ("monthly", "yearly")


# ===================================
# READ SERIALIZERS
# ===================================


class ModuleSerializer(serializers.ModelSerializer):
    """Item del catalogo global de modulos (sin datos de tenant)."""

    yearly_price = serializers.ReadOnlyField()
    annual_savings = serializers.ReadOnlyField()

    class Meta:
        model = Module
        fields = [
            "slug",
            "name",
            "description",
            "icon",
            "is_base",
            "monthly_price",
            "yearly_price",
            "annual_discount_months",
            "annual_savings",
            "included_appointments",
            "included_employees",
            "included_products",
            "included_services",
            "included_sms",
            "included_whatsapp",
            "included_storage_gb",
            "included_ai_requests",
            "extra_appointment_price",
            "extra_employee_price",
            "extra_product_price",
            "extra_sms_price",
            "extra_whatsapp_price",
            "extra_storage_price",
            "extra_ai_request_price",
            "has_analytics",
            "has_api_access",
            "sort_order",
        ]


class SubscriptionModuleSerializer(serializers.ModelSerializer):
    """Modulo activo de una suscripcion (anidado, sin ids sensibles)."""

    slug = serializers.CharField(source="module.slug", read_only=True)
    name = serializers.CharField(source="module.name", read_only=True)
    icon = serializers.CharField(source="module.icon", read_only=True)
    is_base = serializers.BooleanField(source="module.is_base", read_only=True)
    current_price = serializers.ReadOnlyField()

    class Meta:
        model = SubscriptionModule
        fields = [
            "slug",
            "name",
            "icon",
            "is_base",
            "price_locked",
            "current_price",
            "is_active",
            "activated_at",
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    """
    Estado de la suscripcion del tenant (lectura).

    NO expone ``id`` ni ``tenant``. Incluye derivados, modulos activos,
    pricing, usage y el flag ``cancels_at_period_end``.
    """

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    billing_period_display = serializers.CharField(source="get_billing_period_display", read_only=True)
    is_trial = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()
    trial_days_remaining = serializers.ReadOnlyField()
    cancels_at_period_end = serializers.SerializerMethodField()
    modules = serializers.SerializerMethodField()
    pricing = serializers.SerializerMethodField()
    usage = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            "status",
            "status_display",
            "billing_period",
            "billing_period_display",
            "started_at",
            "current_period_start",
            "current_period_end",
            "trial_ends_at",
            "canceled_at",
            "is_trial",
            "is_active",
            "days_remaining",
            "trial_days_remaining",
            "cancels_at_period_end",
            "modules",
            "pricing",
            "usage",
            "has_custom_domain",
            "has_priority_support",
            "has_white_label",
            "extra_employees",
        ]

    def get_cancels_at_period_end(self, obj) -> bool:
        """True si hay una cancelacion diferida pendiente (status sigue activo)."""
        return obj.canceled_at is not None and obj.status == "active"

    def get_modules(self, obj) -> list[dict]:
        active = obj.subscription_modules.filter(is_active=True)
        return SubscriptionModuleSerializer(active, many=True).data

    def get_pricing(self, obj) -> dict[str, str]:
        return {
            "monthly_total": str(obj.monthly_total),
            "yearly_total": str(obj.yearly_total),
            "current_period_price": str(obj.current_period_price),
        }

    def get_usage(self, obj) -> dict[str, dict]:
        # Snapshot ligero: solo limites derivados de get_limit (no usar
        # UsageTracker/InvoiceGenerator que referencian subscription.plan).
        resources = ["appointments", "employees", "sms", "whatsapp", "ai_requests"]
        snapshot: dict[str, dict] = {}
        for resource in resources:
            snapshot[resource] = {"current": 0, "limit": obj.get_limit(resource)}
        return snapshot


# ===================================
# INPUT SERIALIZERS
# ===================================


def _validate_active_slugs(slugs: list[str]) -> list[str]:
    """Valida que cada slug exista y este activo; si no, ValidationError 400."""
    for slug in slugs:
        if not Module.objects.filter(slug=slug, is_active=True).exists():
            raise serializers.ValidationError(f"Modulo invalido o no disponible: {slug}")
    return slugs


class SubscribeInputSerializer(serializers.Serializer):
    """Entrada de POST /subscription/subscribe/."""

    module_slugs = serializers.ListField(child=serializers.CharField(), allow_empty=False)
    billing_period = serializers.ChoiceField(choices=_BILLING_PERIODS, default="monthly")

    def validate_module_slugs(self, value: list[str]) -> list[str]:
        return _validate_active_slugs(value)


class ModulesInputSerializer(serializers.Serializer):
    """Entrada de POST /subscription/modules/ (add/remove)."""

    add = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    remove = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    def validate_add(self, value: list[str]) -> list[str]:
        return _validate_active_slugs(value)

    def validate(self, attrs: dict) -> dict:
        add = attrs.get("add", [])
        remove = attrs.get("remove", [])
        if not add and not remove:
            raise serializers.ValidationError("Debes especificar al menos un modulo en 'add' o 'remove'.")
        return attrs


class BillingPeriodInputSerializer(serializers.Serializer):
    """Entrada de POST /subscription/billing-period/."""

    billing_period = serializers.ChoiceField(choices=_BILLING_PERIODS)


class CancelInputSerializer(serializers.Serializer):
    """Entrada de POST /subscription/cancel/."""

    at_period_end = serializers.BooleanField(default=True)
