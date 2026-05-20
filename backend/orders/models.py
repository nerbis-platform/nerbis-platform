# backend/orders/models.py

import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from bookings.models import Appointment
from core.models import TenantAwareModel, User
from ecommerce.models import Product
from services.models import Service


class PaymentGateway(TenantAwareModel):
    """
    Pasarela de pago configurada por el tenant.

    Cada tenant conecta SU propia cuenta de Stripe/MercadoPago/WOMPI.
    NERBIS no toca el dinero — solo provee la plataforma.
    """

    PROVIDER_CHOICES = [
        ("stripe", "Stripe"),
        ("mercadopago", "MercadoPago"),
        ("wompi", "WOMPI"),
        ("paypal", "PayPal"),
    ]

    provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
        verbose_name="Proveedor",
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="Activa",
    )

    is_default = models.BooleanField(
        default=False,
        verbose_name="Pasarela por defecto",
        help_text="Si el tenant tiene múltiples pasarelas, esta es la principal",
    )

    # Credenciales del merchant (encriptadas en producción via django-fernet-fields o similar)
    public_key = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Clave pública",
        help_text="Publishable key / Public key del merchant",
    )

    secret_key = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Clave secreta",
        help_text="Secret key del merchant (se debe encriptar en producción)",
    )

    webhook_secret = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Webhook secret",
    )

    # Configuración adicional (access tokens, merchant IDs, etc.)
    extra_config = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Configuración adicional",
        help_text="Datos específicos del proveedor (merchant_id, access_token, etc.)",
    )

    class Meta:
        verbose_name = "Pasarela de Pago"
        verbose_name_plural = "Pasarelas de Pago"
        ordering = ["-is_default", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "provider"]),
            models.Index(fields=["tenant", "is_active"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "provider"],
                name="unique_gateway_per_tenant_provider",
            ),
        ]

    def __str__(self):
        return f"{self.get_provider_display()} - {self.tenant.name}"


class Order(TenantAwareModel):
    """
    Orden de compra.

    Contiene productos Y servicios comprados.
    """

    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("processing", "Procesando"),
        ("paid", "Pagado"),
        ("confirmed", "Confirmado"),
        ("completed", "Completado"),
        ("cancelled", "Cancelado"),
        ("refunded", "Reembolsado"),
    ]

    # Número de orden único
    order_number = models.CharField(max_length=50, unique=True, verbose_name="Número de orden")

    # Cliente
    customer = models.ForeignKey(User, on_delete=models.PROTECT, related_name="orders", verbose_name="Cliente")

    # Estado
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", verbose_name="Estado")

    # Cupón aplicado (opcional)
    coupon = models.ForeignKey(
        "coupons.Coupon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        verbose_name="Cupón aplicado",
    )
    coupon_code = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Código del cupón",
        help_text="Guardamos el código por si el cupón se elimina",
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Descuento",
        help_text="Monto del descuento aplicado por cupón",
    )

    # Montos
    subtotal = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="Subtotal", help_text="Suma de todos los items (sin IVA)"
    )

    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal("0.21"),
        verbose_name="Tasa de IVA",
        help_text="Ej: 0.21 para 21%",
    )

    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Monto del IVA")

    shipping_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00"), verbose_name="Costo de envío"
    )

    total = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Total")

    # Información de facturación
    billing_name = models.CharField(max_length=200, verbose_name="Nombre de facturación")

    billing_email = models.EmailField(verbose_name="Email de facturación")

    billing_phone = models.CharField(max_length=50, blank=True, verbose_name="Teléfono")

    billing_address = models.TextField(blank=True, verbose_name="Dirección de facturación")

    billing_city = models.CharField(max_length=100, blank=True, verbose_name="Ciudad")

    billing_postal_code = models.CharField(max_length=20, blank=True, verbose_name="Código postal")

    billing_country = models.CharField(max_length=2, default="ES", verbose_name="País")

    # Información de envío (para productos)
    shipping_name = models.CharField(max_length=200, blank=True, verbose_name="Nombre de envío")

    shipping_address = models.TextField(blank=True, verbose_name="Dirección de envío")

    shipping_city = models.CharField(max_length=100, blank=True, verbose_name="Ciudad de envío")

    shipping_postal_code = models.CharField(max_length=20, blank=True, verbose_name="Código postal de envío")

    # Notas
    customer_notes = models.TextField(blank=True, verbose_name="Notas del cliente")

    internal_notes = models.TextField(blank=True, verbose_name="Notas internas")

    # Fechas
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name="Pagado en")

    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Completado en")

    cancelled_at = models.DateTimeField(null=True, blank=True, verbose_name="Cancelado en")

    class Meta:
        verbose_name = "Orden"
        verbose_name_plural = "Órdenes"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "customer"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["order_number"]),
        ]

    def __str__(self):
        return f"Orden {self.order_number} - {self.customer.get_full_name()}"

    def save(self, *args, **kwargs):
        """Generar número de orden único"""
        if not self.order_number:
            # Formato: ORD-YYYYMMDD-UUID
            today = timezone.now().strftime("%Y%m%d")
            unique_id = str(uuid.uuid4())[:8].upper()
            self.order_number = f"ORD-{today}-{unique_id}"
        super().save(*args, **kwargs)

    def mark_as_paid(self):
        """Marcar como pagado"""
        self.status = "paid"
        self.paid_at = timezone.now()
        self.save()

    def mark_as_completed(self):
        """Marcar como completado"""
        self.status = "completed"
        self.completed_at = timezone.now()
        self.save()

    def cancel(self):
        """Cancelar orden"""
        self.status = "cancelled"
        self.cancelled_at = timezone.now()
        self.save()


class OrderItem(TenantAwareModel):
    """
    Item de producto en la orden.
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="product_items", verbose_name="Orden")

    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name="Producto")

    # Guardar datos del producto al momento de la compra
    product_name = models.CharField(max_length=300, verbose_name="Nombre del producto")

    product_sku = models.CharField(max_length=100, blank=True, verbose_name="SKU")

    quantity = models.IntegerField(validators=[MinValueValidator(1)], verbose_name="Cantidad")

    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio unitario")

    total_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio total")

    class Meta:
        verbose_name = "Item de Orden (Producto)"
        verbose_name_plural = "Items de Orden (Productos)"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["tenant", "order"]),
            models.Index(fields=["product"]),
        ]

    def __str__(self):
        return f"{self.quantity}x {self.product_name}"

    def save(self, *args, **kwargs):
        """Calcular total y guardar datos del producto"""
        if self.product:
            self.product_name = self.product.name
            self.product_sku = self.product.sku
            if not self.unit_price:
                self.unit_price = self.product.price

        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class OrderServiceItem(TenantAwareModel):
    """
    Item de servicio/cita en la orden.
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="service_items", verbose_name="Orden")

    service = models.ForeignKey(Service, on_delete=models.PROTECT, verbose_name="Servicio")

    appointment = models.OneToOneField(
        Appointment, on_delete=models.PROTECT, related_name="order_item", verbose_name="Cita"
    )

    # Guardar datos del servicio al momento de la compra
    service_name = models.CharField(max_length=300, verbose_name="Nombre del servicio")

    service_duration = models.IntegerField(verbose_name="Duración (minutos)")

    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio")

    # Datos de la cita
    staff_member_name = models.CharField(max_length=200, verbose_name="Profesional")

    appointment_datetime = models.DateTimeField(verbose_name="Fecha y hora de la cita")

    class Meta:
        verbose_name = "Item de Orden (Servicio)"
        verbose_name_plural = "Items de Orden (Servicios)"
        ordering = ["appointment_datetime"]
        indexes = [
            models.Index(fields=["tenant", "order"]),
            models.Index(fields=["appointment"]),
        ]

    def __str__(self):
        return f"{self.service_name} - {self.appointment_datetime.strftime('%d/%m/%Y %H:%M')}"

    def save(self, *args, **kwargs):
        """Guardar datos del servicio y cita"""
        if self.service:
            self.service_name = self.service.name
            self.service_duration = self.service.duration_minutes
            if not self.price:
                self.price = self.service.price

        if self.appointment:
            self.staff_member_name = self.appointment.staff_member.full_name
            self.appointment_datetime = self.appointment.start_datetime

        super().save(*args, **kwargs)


class Payment(TenantAwareModel):
    """
    Registro de pago (Stripe).
    """

    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("processing", "Procesando"),
        ("succeeded", "Exitoso"),
        ("failed", "Fallido"),
        ("cancelled", "Cancelado"),
        ("refunded", "Reembolsado"),
    ]

    PAYMENT_METHODS = [
        ("stripe", "Stripe"),
        ("mercadopago", "MercadoPago"),
        ("wompi", "WOMPI"),
        ("paypal", "PayPal"),
        ("transfer", "Transferencia"),
        ("cash", "Efectivo"),
    ]

    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="payments", verbose_name="Orden")

    gateway = models.ForeignKey(
        PaymentGateway,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
        verbose_name="Pasarela",
    )

    # ID externo del proveedor (genérico: Stripe PI, MercadoPago preference, WOMPI reference)
    external_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="ID externo",
        help_text="Payment Intent ID (Stripe), Preference ID (MercadoPago), etc.",
    )

    # Mantener por retrocompatibilidad con datos existentes
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, verbose_name="Stripe Payment Intent ID")

    stripe_charge_id = models.CharField(max_length=255, blank=True, verbose_name="Stripe Charge ID")

    # Información del pago
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHODS, default="stripe", verbose_name="Método de pago"
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Monto")

    currency = models.CharField(max_length=3, verbose_name="Moneda")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", verbose_name="Estado")

    # Fechas
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name="Procesado en")

    # Metadata
    metadata = models.JSONField(
        default=dict, blank=True, verbose_name="Metadata", help_text="Datos adicionales del pago"
    )

    class Meta:
        verbose_name = "Pago"
        verbose_name_plural = "Pagos"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "order"]),
            models.Index(fields=["stripe_payment_intent_id"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Pago {self.id} - {self.order.order_number} - €{self.amount}"

    def mark_as_succeeded(self):
        """Marcar pago como exitoso"""
        self.status = "succeeded"
        self.processed_at = timezone.now()
        self.save()

        # Marcar orden como pagada
        self.order.mark_as_paid()
