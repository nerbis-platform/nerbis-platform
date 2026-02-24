# backend/promotions/models.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.utils.text import slugify
from core.models import TenantAwareModel
from decimal import Decimal


class Promotion(TenantAwareModel):
    """
    Promociones y ofertas especiales.

    Tipos de promoción:
    - BUNDLE: Combinar 2+ items con descuento (ej: Limpieza + Peeling = 15% OFF)
    - DISCOUNT: Descuento en items individuales (ej: 20% OFF en masajes)
    - FIXED: Precio fijo especial (ej: Tratamiento facial a €35 en vez de €45)

    Las promociones pueden aplicarse a servicios, productos o ambos.
    """

    PROMOTION_TYPES = [
        ('bundle', 'Bundle (Paquete combinado)'),
        ('discount', 'Descuento porcentual'),
        ('fixed', 'Precio fijo'),
    ]

    DISCOUNT_TYPES = [
        ('percentage', 'Porcentaje'),
        ('fixed_amount', 'Monto fijo'),
    ]

    # Información básica
    name = models.CharField(
        max_length=300,
        verbose_name="Nombre de la promoción",
        help_text="Ej: Dúo Glow: Limpieza + Peeling"
    )

    slug = models.SlugField(max_length=320, blank=True, verbose_name="Slug")

    description = models.TextField(
        blank=True,
        verbose_name="Descripción",
        help_text="Descripción detallada de la promoción"
    )

    short_description = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Descripción corta",
        help_text="Texto breve para mostrar en cards (ej: 15% OFF al reservar juntos)"
    )

    # Tipo de promoción
    promotion_type = models.CharField(
        max_length=20,
        choices=PROMOTION_TYPES,
        default='discount',
        verbose_name="Tipo de promoción"
    )

    # Descuento
    discount_type = models.CharField(
        max_length=20,
        choices=DISCOUNT_TYPES,
        default='percentage',
        verbose_name="Tipo de descuento"
    )

    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Valor del descuento",
        help_text="Porcentaje (ej: 15) o monto fijo (ej: 10.00)"
    )

    # Precio fijo (para tipo 'fixed')
    fixed_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Precio fijo",
        help_text="Solo para promociones de tipo 'Precio fijo'"
    )

    # Configuración
    minimum_purchase = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Compra mínima",
        help_text="Monto mínimo para aplicar la promoción"
    )

    max_uses = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        verbose_name="Usos máximos",
        help_text="Límite total de veces que se puede usar (vacío = sin límite)"
    )

    max_uses_per_customer = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        verbose_name="Usos máximos por cliente",
        help_text="Límite por cliente (vacío = sin límite)"
    )

    times_used = models.IntegerField(
        default=0,
        verbose_name="Veces usada"
    )

    # Vigencia
    start_date = models.DateTimeField(
        verbose_name="Fecha de inicio",
        help_text="Cuándo comienza la promoción"
    )

    end_date = models.DateTimeField(
        verbose_name="Fecha de fin",
        help_text="Cuándo termina la promoción"
    )

    # Visualización
    image = models.ImageField(
        upload_to="promotions/",
        null=True,
        blank=True,
        verbose_name="Imagen de la promoción"
    )

    badge_text = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Texto del badge",
        help_text="Ej: '15% OFF', 'OFERTA', '2x1'"
    )

    cta_text = models.CharField(
        max_length=100,
        default="Aprovechar oferta",
        verbose_name="Texto del botón",
        help_text="Texto del call-to-action"
    )

    # Estado
    is_active = models.BooleanField(
        default=True,
        verbose_name="¿Está activa?"
    )

    is_featured = models.BooleanField(
        default=False,
        verbose_name="¿Es destacada?",
        help_text="Mostrar en sección de promociones destacadas"
    )

    priority = models.IntegerField(
        default=0,
        verbose_name="Prioridad",
        help_text="Mayor número = más prioridad"
    )

    class Meta:
        verbose_name = "Promoción"
        verbose_name_plural = "Promociones"
        ordering = ["-priority", "-is_featured", "-created_at"]
        unique_together = [["tenant", "slug"]]
        indexes = [
            models.Index(fields=["tenant", "is_active"]),
            models.Index(fields=["tenant", "start_date", "end_date"]),
            models.Index(fields=["tenant", "is_featured"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_promotion_type_display()})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

        # Auto-generar badge_text si no existe
        if not self.badge_text:
            if self.discount_type == 'percentage':
                self.badge_text = f"{int(self.discount_value)}% OFF"
            elif self.discount_type == 'fixed_amount':
                self.badge_text = f"-€{self.discount_value}"

        super().save(*args, **kwargs)

    @property
    def is_currently_active(self):
        """Verificar si la promoción está activa en este momento"""
        if not self.is_active:
            return False

        now = timezone.now()
        return self.start_date <= now <= self.end_date

    @property
    def is_expired(self):
        """Verificar si la promoción ya expiró"""
        return timezone.now() > self.end_date

    @property
    def is_upcoming(self):
        """Verificar si la promoción aún no comienza"""
        return timezone.now() < self.start_date

    @property
    def has_reached_max_uses(self):
        """Verificar si se alcanzó el límite de usos"""
        if self.max_uses is None:
            return False
        return self.times_used >= self.max_uses

    @property
    def original_total_price(self):
        """Precio total sin descuento de todos los items"""
        total = Decimal("0.00")
        for item in self.items.all():
            if item.service:
                total += item.service.price * item.quantity
            elif item.product:
                total += item.product.price * item.quantity
        return total

    @property
    def discounted_price(self):
        """Precio con descuento aplicado"""
        if self.promotion_type == 'fixed' and self.fixed_price:
            return self.fixed_price

        original = self.original_total_price

        if self.discount_type == 'percentage':
            discount = original * (self.discount_value / Decimal("100"))
            return original - discount
        elif self.discount_type == 'fixed_amount':
            return max(original - self.discount_value, Decimal("0.00"))

        return original

    @property
    def savings_amount(self):
        """Cantidad de ahorro"""
        return self.original_total_price - self.discounted_price

    def can_use(self, customer=None):
        """Verificar si la promoción se puede usar"""
        if not self.is_currently_active:
            return False, "La promoción no está activa"

        if self.has_reached_max_uses:
            return False, "La promoción ha alcanzado su límite de usos"

        # TODO: Verificar usos por cliente si se proporciona

        return True, "OK"

    def apply_discount(self, original_price):
        """Aplicar descuento a un precio"""
        if self.promotion_type == 'fixed' and self.fixed_price:
            return self.fixed_price

        if self.discount_type == 'percentage':
            discount = original_price * (self.discount_value / Decimal("100"))
            return original_price - discount
        elif self.discount_type == 'fixed_amount':
            return max(original_price - self.discount_value, Decimal("0.00"))

        return original_price

    def increment_usage(self):
        """Incrementar contador de uso"""
        self.times_used += 1
        self.save(update_fields=['times_used'])


class PromotionItem(TenantAwareModel):
    """
    Items incluidos en una promoción.

    Una promoción puede incluir:
    - Servicios (para bundles de servicios)
    - Productos (para bundles de productos)
    - Combinación de ambos
    """

    promotion = models.ForeignKey(
        Promotion,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Promoción"
    )

    # Item (solo uno debe estar presente)
    service = models.ForeignKey(
        "services.Service",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="promotion_items",
        verbose_name="Servicio"
    )

    product = models.ForeignKey(
        "ecommerce.Product",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="promotion_items",
        verbose_name="Producto"
    )

    # Cantidad
    quantity = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name="Cantidad",
        help_text="Cantidad de este item incluida en la promoción"
    )

    # Orden
    order = models.IntegerField(
        default=0,
        verbose_name="Orden"
    )

    class Meta:
        verbose_name = "Item de Promoción"
        verbose_name_plural = "Items de Promoción"
        ordering = ["order", "pk"]
        indexes = [
            models.Index(fields=["tenant", "promotion"]),
        ]

    def __str__(self):
        item_name = self.service.name if self.service else (self.product.name if self.product else "Sin item")
        qty = f" x{self.quantity}" if self.quantity > 1 else ""
        return f"{item_name}{qty}"

    @property
    def item_type(self):
        """Tipo de item"""
        if self.service:
            return "service"
        elif self.product:
            return "product"
        return None

    @property
    def item(self):
        """Obtener el item (servicio o producto)"""
        return self.service or self.product

    @property
    def item_price(self):
        """Precio del item"""
        if self.service:
            return self.service.price
        elif self.product:
            return self.product.price
        return Decimal("0.00")

    @property
    def total_price(self):
        """Precio total (precio * cantidad)"""
        return self.item_price * self.quantity

    def clean(self):
        """Validar que solo haya un tipo de item"""
        from django.core.exceptions import ValidationError

        if self.service and self.product:
            raise ValidationError("Un item de promoción solo puede tener un servicio O un producto, no ambos.")

        if not self.service and not self.product:
            raise ValidationError("Debe seleccionar un servicio o un producto.")
