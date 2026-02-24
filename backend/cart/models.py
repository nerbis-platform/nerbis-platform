# backend/cart/models.py

from django.db import models
from django.core.validators import MinValueValidator
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from core.models import TenantAwareModel, User
from decimal import Decimal


class Cart(TenantAwareModel):
    """
    Carrito de compras del usuario.

    Un usuario tiene UN carrito activo a la vez.
    Puede contener productos Y servicios/citas.
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="cart", verbose_name="Usuario")

    # Cupón aplicado al carrito
    coupon = models.ForeignKey(
        "coupons.Coupon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="carts",
        verbose_name="Cupón aplicado",
    )

    # Fechas
    expires_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Expira en", help_text="Fecha de expiración del carrito (opcional)"
    )

    class Meta:
        verbose_name = "Carrito"
        verbose_name_plural = "Carritos"
        indexes = [
            models.Index(fields=["tenant", "user"]),
        ]

    def __str__(self):
        return f"Carrito de {self.user.get_full_name()}"

    @property
    def items_count(self):
        """Total de items en el carrito"""
        return self.items.count()

    @property
    def subtotal(self):
        """Subtotal (sin IVA)"""
        total = Decimal("0.00")
        for item in self.items.all():
            total += item.total_price
        return total

    @property
    def tax_amount(self):
        """Monto del IVA"""
        try:
            from django.conf import settings
            tax_rate = getattr(settings, 'TAX_RATE', 0.21)
            subtotal_after_discount = self.subtotal - self.discount_amount
            return subtotal_after_discount * Decimal(str(tax_rate))
        except Exception:
            return Decimal("0.00")

    @property
    def discount_amount(self):
        """Monto del descuento por cupón"""
        try:
            if not self.coupon:
                return Decimal("0.00")
            return Decimal(str(self.coupon.calculate_discount(self.subtotal)))
        except Exception:
            return Decimal("0.00")

    @property
    def total(self):
        """Total con IVA y descuento aplicado"""
        try:
            return self.subtotal - self.discount_amount + self.tax_amount
        except Exception:
            return self.subtotal

    def clear(self, cancel_appointments=True):
        """
        Vaciar el carrito.

        Args:
            cancel_appointments: Si True, cancela las citas asociadas a los servicios.
                                Si False, solo elimina los items (para después de pago exitoso).
        """
        if cancel_appointments:
            # Cancelar todas las citas asociadas
            for item in self.items.filter(item_type="service", appointment__isnull=False):
                if item.appointment and item.appointment.status in ["pending", "confirmed"]:
                    item.appointment.cancel(reason="Carrito vaciado por el usuario")

        self.items.all().delete()


class CartItem(TenantAwareModel):
    """
    Item en el carrito.

    Puede ser un PRODUCTO o un SERVICIO (con cita).
    Usa GenericForeignKey para flexibilidad.
    """

    ITEM_TYPES = [
        ("product", "Producto"),
        ("service", "Servicio/Cita"),
    ]

    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items", verbose_name="Carrito")

    # Tipo de item
    item_type = models.CharField(max_length=20, choices=ITEM_TYPES, verbose_name="Tipo de item")

    # GenericForeignKey para apuntar a Product o Service
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, limit_choices_to={"model__in": ("product", "service")}
    )
    object_id = models.PositiveIntegerField()
    item = GenericForeignKey("content_type", "object_id")

    # Cantidad (solo para productos)
    quantity = models.IntegerField(default=1, validators=[MinValueValidator(1)], verbose_name="Cantidad")

    # Precio guardado (al momento de agregar al carrito)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio unitario")

    # Para servicios: referencia a la cita temporal
    appointment = models.ForeignKey(
        "bookings.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cart_items",
        verbose_name="Cita asociada",
        help_text="Solo para items de tipo servicio",
    )

    class Meta:
        verbose_name = "Item del Carrito"
        verbose_name_plural = "Items del Carrito"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["tenant", "cart"]),
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self):
        item_name = "Unknown"
        if self.item:
            item_name = self.item.name

        if self.item_type == "product":
            return f"{self.quantity}x {item_name}"
        else:
            return f"{item_name} ({self.appointment.start_datetime.strftime('%d/%m %H:%M') if self.appointment else 'Sin fecha'})"

    @property
    def total_price(self):
        """Precio total del item (cantidad * precio unitario)"""
        return self.unit_price * self.quantity

    def save(self, *args, **kwargs):
        """Guardar precio al agregar al carrito"""
        if not self.unit_price and self.item:
            self.unit_price = self.item.price
        super().save(*args, **kwargs)
