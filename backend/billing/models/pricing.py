# backend/billing/models/pricing.py
"""
Configuracion global de precios del sistema de billing (singleton).
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models


class PricingConfig(models.Model):
    """
    Configuracion global del sistema de billing (singleton).

    Contiene configuraciones que aplican a todas las suscripciones:
    - Periodo de prueba
    - Precios de extras (pay-as-you-go)

    NOTA: Los precios de los modulos (Web, Shop, etc.) estan en el modelo Module.
    """

    # Trial
    trial_days = models.PositiveIntegerField(
        "Dias de prueba", default=14, help_text="Dias de prueba gratis para nuevas suscripciones"
    )

    # Precios de extras globales (pay-as-you-go)
    extra_employee_price = models.DecimalField(
        "Precio empleado extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("25000.00"),
        help_text="Precio mensual por empleado adicional",
    )
    extra_sms_price = models.DecimalField(
        "Precio SMS extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("180.00"),
        help_text="Precio por SMS adicional",
    )
    extra_whatsapp_price = models.DecimalField(
        "Precio WhatsApp extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("250.00"),
        help_text="Precio por mensaje WhatsApp adicional",
    )
    extra_appointment_price = models.DecimalField(
        "Precio cita extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("800.00"),
        help_text="Precio por cita adicional (sobre limite)",
    )
    extra_storage_price = models.DecimalField(
        "Precio GB extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("5000.00"),
        help_text="Precio mensual por GB adicional de almacenamiento",
    )
    extra_ai_request_price = models.DecimalField(
        "Precio generacion IA extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("500.00"),
        help_text="Precio por generacion de IA adicional (~$0.12 USD)",
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuracion Global"
        verbose_name_plural = "Configuracion Global"

    def __str__(self):
        return f"Configuracion Global (Trial: {self.trial_days} dias)"

    def save(self, *args, **kwargs):
        # Singleton: solo puede existir una instancia
        if not self.pk and PricingConfig.objects.exists():
            raise ValidationError("Solo puede existir una configuracion")
        super().save(*args, **kwargs)

    @classmethod
    def get_current(cls):
        """Obtiene la configuracion actual o crea una por defecto."""
        config, created = cls.objects.get_or_create(pk=1)
        return config
