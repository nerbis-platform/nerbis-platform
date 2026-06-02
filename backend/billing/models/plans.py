# backend/billing/models/plans.py
"""
Modelo Plan (DEPRECATED) - Solo para migracion.
"""

from decimal import Decimal

from django.db import models


class Plan(models.Model):
    """
    [DEPRECATED] Planes de suscripcion fijos.

    Este modelo se mantiene temporalmente para migracion.
    El nuevo sistema usa Module para precios modulares.
    """

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    yearly_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    annual_discount_months = models.PositiveIntegerField(default=2)

    # Limites
    included_appointments = models.PositiveIntegerField(default=50)
    included_employees = models.PositiveIntegerField(default=1)
    included_sms = models.PositiveIntegerField(default=0)
    included_whatsapp = models.PositiveIntegerField(default=0)
    included_products = models.PositiveIntegerField(default=50)
    included_services = models.PositiveIntegerField(default=10)

    # Precios extras
    extra_appointment_price = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("800.00"))
    extra_employee_price = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("29000.00"))
    extra_sms_price = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("180.00"))
    extra_whatsapp_price = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("250.00"))

    # Features
    has_analytics = models.BooleanField(default=False)
    has_api_access = models.BooleanField(default=False)
    has_custom_domain = models.BooleanField(default=False)
    has_priority_support = models.BooleanField(default=False)
    has_white_label = models.BooleanField(default=False)

    # Modulos
    includes_shop = models.BooleanField(default=False)
    includes_bookings = models.BooleanField(default=False)
    includes_services = models.BooleanField(default=False)
    includes_marketing = models.BooleanField(default=False)

    # Estado
    is_active = models.BooleanField(default=False)  # Desactivado por defecto
    is_public = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order"]
        verbose_name = "[DEPRECATED] Plan"
        verbose_name_plural = "[DEPRECATED] Planes"

    def __str__(self):
        return f"[DEP] {self.name}"

    def sync_modules_to_tenant(self, tenant):
        """Metodo legacy para compatibilidad."""
        tenant.has_shop = self.includes_shop
        tenant.has_bookings = self.includes_bookings
        tenant.has_services = self.includes_services
        tenant.has_marketing = self.includes_marketing
        tenant.save(update_fields=["has_shop", "has_bookings", "has_services", "has_marketing"])
