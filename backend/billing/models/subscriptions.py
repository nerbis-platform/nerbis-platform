# backend/billing/models/subscriptions.py
"""
Modelos de suscripcion: Subscription, SubscriptionModule.
"""

import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone

from .modules import Module
from .pricing import PricingConfig


class Subscription(models.Model):
    """
    Suscripcion de un tenant.

    Cada tenant tiene una suscripcion que incluye:
    - Precio base (web estatica)
    - Modulos adicionales contratados
    - Estado y fechas de facturacion
    """

    STATUS_CHOICES = [
        ("trial", "Periodo de Prueba"),
        ("active", "Activa"),
        ("past_due", "Pago Pendiente"),
        ("canceled", "Cancelada"),
        ("expired", "Expirada"),
    ]

    BILLING_PERIOD_CHOICES = [
        ("monthly", "Mensual"),
        ("yearly", "Anual"),
    ]

    # Identificacion
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField("core.Tenant", on_delete=models.CASCADE, related_name="subscription")

    # [DEPRECATED] Plan - Se mantiene para compatibilidad durante migracion
    plan = models.ForeignKey(
        "billing.Plan",
        on_delete=models.PROTECT,
        related_name="subscriptions",
        null=True,
        blank=True,
        help_text="[DEPRECATED] Usar modulos en su lugar",
    )

    # Modulos contratados
    modules = models.ManyToManyField(
        Module,
        through="SubscriptionModule",
        blank=True,
        related_name="subscriptions",
        help_text="Modulos adicionales contratados",
    )

    # Periodo de facturacion
    billing_period = models.CharField(
        "Periodo de facturacion", max_length=20, choices=BILLING_PERIOD_CHOICES, default="monthly"
    )

    # Features adicionales (comprados aparte de modulos)
    has_custom_domain = models.BooleanField(
        "Dominio personalizado", default=False, help_text="Dominio personalizado contratado"
    )
    has_priority_support = models.BooleanField(
        "Soporte prioritario", default=False, help_text="Soporte prioritario contratado"
    )
    has_white_label = models.BooleanField(
        "Sin branding (White Label)", default=False, help_text="Sin branding de NERBIS"
    )

    # Fechas
    started_at = models.DateTimeField(
        "Fecha de inicio", default=timezone.now, help_text="Fecha de inicio de la suscripcion"
    )
    current_period_start = models.DateTimeField(
        "Inicio del periodo", help_text="Inicio del periodo de facturacion actual"
    )
    current_period_end = models.DateTimeField("Fin del periodo", help_text="Fin del periodo de facturacion actual")
    trial_ends_at = models.DateTimeField(
        "Fin del trial", null=True, blank=True, help_text="Fecha de fin del periodo de prueba"
    )
    canceled_at = models.DateTimeField(
        "Fecha de cancelacion", null=True, blank=True, help_text="Fecha de cancelacion (si aplica)"
    )

    # Estado
    status = models.CharField("Estado", max_length=20, choices=STATUS_CHOICES, default="trial")

    # Extras contratados (beyond module limits)
    extra_employees = models.PositiveIntegerField(
        "Empleados adicionales", default=0, help_text="Empleados adicionales contratados"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Suscripcion"
        verbose_name_plural = "Suscripciones"

    def __str__(self):
        return f"{self.tenant.name} - ${self.monthly_total:,.0f}/mes ({self.get_status_display()})"

    @property
    def is_active(self):
        """Suscripcion activa (incluye trial y active)."""
        return self.status in ("trial", "active")

    @property
    def is_trial(self):
        """Esta en periodo de prueba?"""
        return self.status == "trial"

    @property
    def days_remaining(self):
        """Dias restantes en el periodo actual."""
        if not self.current_period_end:
            return None
        delta = self.current_period_end - timezone.now()
        return max(0, delta.days)

    @property
    def trial_days_remaining(self):
        """Dias restantes de prueba."""
        if not self.trial_ends_at:
            return None
        delta = self.trial_ends_at - timezone.now()
        return max(0, delta.days)

    # ===================================
    # CALCULO DE PRECIOS
    # ===================================

    @property
    def _has_non_base_modules(self):
        """Verifica si hay modulos activos ademas del base (Web)."""
        return self.subscription_modules.filter(is_active=True, module__is_base=False).exists()

    @property
    def modules_monthly_price(self):
        """
        Suma de precios mensuales de los modulos contratados.
        Si hay modulos adicionales (Shop, Bookings, etc.), Web base se incluye gratis.
        Si solo tiene Web, se cobra su precio normal.
        """
        skip_base = self._has_non_base_modules
        total = Decimal("0")
        for sm in self.subscription_modules.filter(is_active=True):
            if skip_base and sm.module.is_base:
                continue
            price = sm.price_locked if sm.price_locked else sm.module.monthly_price
            total += price
        return total

    @property
    def extras_monthly_price(self):
        """Precio de extras contratados (empleados adicionales)."""
        config = PricingConfig.get_current()
        return self.extra_employees * config.extra_employee_price

    @property
    def monthly_total(self):
        """Total mensual: modulos + extras."""
        return self.modules_monthly_price + self.extras_monthly_price

    @property
    def yearly_total(self):
        """Total anual con descuentos aplicados. Web base gratis si hay otros modulos."""
        skip_base = self._has_non_base_modules
        modules_yearly = sum(
            sm.module.yearly_price
            for sm in self.subscription_modules.filter(is_active=True)
            if not (skip_base and sm.module.is_base)
        )

        # Extras (sin descuento anual por ser variable)
        extras_yearly = self.extras_monthly_price * 12

        return modules_yearly + extras_yearly

    @property
    def current_period_price(self):
        """Precio del periodo actual (mensual o anual)."""
        if self.billing_period == "yearly":
            return self.yearly_total
        return self.monthly_total

    # ===================================
    # MODULOS
    # ===================================

    def has_module(self, module_slug):
        """Verifica si tiene un modulo activo."""
        return self.subscription_modules.filter(module__slug=module_slug, is_active=True).exists()

    def add_module(self, module, lock_price=True):
        """
        Agrega un modulo a la suscripcion.

        Args:
            module: Module instance o slug
            lock_price: Si True, guarda el precio actual
        """
        if isinstance(module, str):
            module = Module.objects.get(slug=module)

        sm, created = SubscriptionModule.objects.get_or_create(
            subscription=self,
            module=module,
            defaults={"price_locked": module.monthly_price if lock_price else None, "is_active": True},
        )
        if not created and not sm.is_active:
            sm.is_active = True
            sm.save()

        return sm

    def remove_module(self, module_slug):
        """Desactiva un modulo (no lo elimina para mantener historial)."""
        self.subscription_modules.filter(module__slug=module_slug).update(
            is_active=False, deactivated_at=timezone.now()
        )

    def sync_modules_to_tenant(self):
        """
        Sincroniza los modulos activos al tenant.
        Actualiza los flags has_shop, has_bookings, etc.
        """
        tenant = self.tenant
        if not tenant:
            return

        # Solo sincronizar si la suscripcion esta activa
        if not self.is_active:
            return

        # Obtener modulos activos
        active_modules = set(self.subscription_modules.filter(is_active=True).values_list("module__slug", flat=True))

        # Actualizar flags del tenant
        tenant.has_shop = "shop" in active_modules
        tenant.has_bookings = "bookings" in active_modules
        tenant.has_services = "services" in active_modules
        tenant.has_marketing = "marketing" in active_modules

        tenant.save(update_fields=["has_shop", "has_bookings", "has_services", "has_marketing"])

    # ===================================
    # LIMITES
    # ===================================

    def get_limit(self, resource):
        """
        Obtiene el limite total para un recurso.
        Suma los limites de todos los modulos activos + extras.

        Args:
            resource: 'appointments', 'employees', 'sms', 'whatsapp', etc.

        Returns:
            int: Limite total, o None si es ilimitado
        """
        field_name = f"included_{resource}"

        # Sumar limites de todos los modulos activos
        total = sum(
            getattr(sm.module, field_name, 0)
            for sm in self.subscription_modules.filter(is_active=True)
            if hasattr(sm.module, field_name)
        )

        # Si algun modulo tiene 0 (ilimitado), retornar None
        for sm in self.subscription_modules.filter(is_active=True):
            if hasattr(sm.module, field_name):
                if getattr(sm.module, field_name) == 0:
                    return None  # Ilimitado

        # Sumar extras si aplica
        if resource == "employees":
            total += self.extra_employees

        return total if total > 0 else None

    def can_use(self, resource, current_usage):
        """
        Verifica si puede usar mas de un recurso.
        """
        limit = self.get_limit(resource)
        if limit is None:
            return True  # Ilimitado

        # Recursos con limite fijo
        if resource == "employees":
            return current_usage < limit

        # Recursos pay-as-you-go siempre permitidos
        return True

    def is_over_limit(self, resource, current_usage):
        """Verifica si el uso excede el limite incluido."""
        limit = self.get_limit(resource)
        if limit is None:
            return False
        return current_usage > limit


class SubscriptionModule(models.Model):
    """
    Relacion entre Subscription y Module.

    Permite:
    - Guardar el precio al momento de contratar
    - Registrar fechas de activacion/desactivacion
    - Mantener historial de modulos
    """

    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="subscription_modules")
    module = models.ForeignKey(Module, on_delete=models.PROTECT, related_name="subscription_modules")

    # Precio bloqueado al momento de contratar
    price_locked = models.DecimalField(
        "Precio bloqueado",
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Precio mensual al momento de contratar (para grandfathering)",
    )

    # Estado
    is_active = models.BooleanField("Activo", default=True)

    # Fechas
    activated_at = models.DateTimeField("Fecha de activacion", auto_now_add=True)
    deactivated_at = models.DateTimeField("Fecha de desactivacion", null=True, blank=True)

    class Meta:
        unique_together = ["subscription", "module"]
        verbose_name = "Modulo de Suscripcion"
        verbose_name_plural = "Modulos de Suscripcion"

    def __str__(self):
        status = "\u2713" if self.is_active else "\u2717"
        return f"{status} {self.module.name} - {self.subscription.tenant.name}"

    @property
    def current_price(self):
        """Retorna el precio actual (bloqueado o vigente)."""
        return self.price_locked or self.module.monthly_price
