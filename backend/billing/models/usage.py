# backend/billing/models/usage.py
"""
Modelos de uso y facturacion: UsageRecord, Invoice, InvoiceLineItem.
"""

import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone

from .modules import Module
from .subscriptions import Subscription


class UsageRecord(models.Model):
    """
    Registro de uso para facturacion pay-as-you-go.
    """

    RESOURCE_CHOICES = [
        ("appointment", "Cita"),
        ("sms", "SMS"),
        ("whatsapp", "WhatsApp"),
        ("employee", "Empleado"),
        ("ai_request", "Generacion IA"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="usage_records")

    # Que se uso
    resource = models.CharField(max_length=50, choices=RESOURCE_CHOICES)
    quantity = models.PositiveIntegerField(default=1, help_text="Cantidad usada")

    # Cuando
    recorded_at = models.DateTimeField(default=timezone.now)
    period_start = models.DateField(help_text="Inicio del periodo de facturacion")
    period_end = models.DateField(help_text="Fin del periodo de facturacion")

    # Referencia al objeto que genero el uso
    content_type = models.ForeignKey("contenttypes.ContentType", on_delete=models.SET_NULL, null=True, blank=True)
    object_id = models.CharField(max_length=100, blank=True, help_text="ID del objeto relacionado")

    # Facturacion
    is_billable = models.BooleanField(default=True, help_text="Se debe cobrar?")
    unit_price = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True, help_text="Precio unitario al momento del registro"
    )
    invoice = models.ForeignKey(
        "billing.Invoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="usage_records",
        help_text="Factura donde se cobro este uso",
    )

    # Metadata
    description = models.CharField(max_length=255, blank=True, help_text="Descripcion del uso")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        verbose_name = "Registro de Uso"
        verbose_name_plural = "Registros de Uso"
        indexes = [
            models.Index(fields=["subscription", "resource", "period_start"]),
            models.Index(fields=["subscription", "period_start", "period_end"]),
        ]

    def __str__(self):
        return f"{self.get_resource_display()} x{self.quantity} - {self.subscription.tenant.name}"


class Invoice(models.Model):
    """
    Factura generada para un periodo de facturacion.
    """

    STATUS_CHOICES = [
        ("draft", "Borrador"),
        ("pending", "Pendiente"),
        ("paid", "Pagada"),
        ("failed", "Pago Fallido"),
        ("void", "Anulada"),
        ("refunded", "Reembolsada"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="invoices")

    # Numero de factura
    number = models.CharField(max_length=50, unique=True, help_text="Numero de factura (ej: INV-2024-001)")

    # Periodo
    period_start = models.DateField()
    period_end = models.DateField()

    # Montos (COP)
    subtotal_base = models.DecimalField(
        "Cargo base", max_digits=12, decimal_places=2, default=Decimal("0"), help_text="Cargo por web estatica (base)"
    )
    subtotal_modules = models.DecimalField(
        "Cargo modulos",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Cargo por modulos adicionales",
    )
    subtotal_extras = models.DecimalField(
        "Cargo extras",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Cargo por extras fijos (empleados adicionales)",
    )
    subtotal_usage = models.DecimalField(
        "Cargo uso",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Cargo por uso adicional (pay-as-you-go)",
    )
    discount = models.DecimalField(
        "Descuento", max_digits=12, decimal_places=2, default=Decimal("0"), help_text="Descuento aplicado"
    )
    tax = models.DecimalField(
        "Impuesto", max_digits=12, decimal_places=2, default=Decimal("0"), help_text="IVA u otros impuestos"
    )
    total = models.DecimalField("Total", max_digits=12, decimal_places=2, help_text="Total a pagar")

    # Estado
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Fechas
    issued_at = models.DateTimeField(null=True, blank=True)
    due_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    # Pago
    payment_method = models.CharField(max_length=50, blank=True)
    payment_reference = models.CharField(max_length=255, blank=True)

    # Notas
    notes = models.TextField(blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-period_start"]
        verbose_name = "Factura"
        verbose_name_plural = "Facturas"

    def __str__(self):
        return f"{self.number} - {self.subscription.tenant.name} (${self.total:,.0f})"

    def save(self, *args, **kwargs):
        if not self.total:
            self.calculate_total()
        super().save(*args, **kwargs)

    def calculate_total(self):
        """Calcula el total de la factura."""
        subtotal = self.subtotal_base + self.subtotal_modules + self.subtotal_extras + self.subtotal_usage
        self.total = subtotal - self.discount + self.tax


class InvoiceLineItem(models.Model):
    """
    Linea de detalle en una factura.
    """

    LINE_TYPE_CHOICES = [
        ("base", "Web Base"),
        ("module", "Modulo"),
        ("extra_employee", "Empleado Adicional"),
        ("usage_appointment", "Citas Adicionales"),
        ("usage_sms", "SMS Adicionales"),
        ("usage_whatsapp", "WhatsApp Adicionales"),
        ("usage_ai", "Generaciones IA Adicionales"),
        ("discount", "Descuento"),
        ("tax", "Impuesto"),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="line_items")
    line_type = models.CharField(max_length=50, choices=LINE_TYPE_CHOICES)
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    # Referencia al modulo (si aplica)
    module = models.ForeignKey(Module, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "Linea de Factura"
        verbose_name_plural = "Lineas de Factura"

    def __str__(self):
        return f"{self.description} - ${self.total:,.0f}"

    def save(self, *args, **kwargs):
        if not self.total:
            self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
