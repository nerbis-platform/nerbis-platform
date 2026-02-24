# backend/coupons/models.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from core.models import TenantAwareModel, User


class Coupon(TenantAwareModel):
    """
    Modelo de cupón de descuento.
    Soporta descuentos porcentuales, fijos y envío gratis.
    """

    class DiscountType(models.TextChoices):
        PERCENTAGE = 'percentage', 'Porcentaje'
        FIXED_AMOUNT = 'fixed_amount', 'Monto Fijo'
        FREE_SHIPPING = 'free_shipping', 'Envío Gratis'

    code = models.CharField(
        max_length=50,
        verbose_name='Código',
        help_text='Código único del cupón (ej: VERANO2024)'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Descripción',
        help_text='Descripción interna del cupón'
    )

    # Tipo y valor del descuento
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE,
        verbose_name='Tipo de Descuento'
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Valor del Descuento',
        help_text='Porcentaje (0-100) o monto fijo según el tipo'
    )

    # Restricciones de monto
    minimum_purchase = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Compra Mínima',
        help_text='Monto mínimo requerido para aplicar el cupón'
    )
    maximum_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name='Descuento Máximo',
        help_text='Límite máximo del descuento (solo para porcentaje)'
    )

    # Vigencia
    valid_from = models.DateTimeField(
        verbose_name='Válido Desde'
    )
    valid_until = models.DateTimeField(
        verbose_name='Válido Hasta'
    )

    # Límites de uso
    max_uses = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Usos Máximos',
        help_text='Dejar vacío para uso ilimitado'
    )
    max_uses_per_user = models.PositiveIntegerField(
        default=1,
        verbose_name='Usos por Usuario',
        help_text='Cuántas veces puede usar el cupón un mismo usuario'
    )
    times_used = models.PositiveIntegerField(
        default=0,
        verbose_name='Veces Usado'
    )

    # Restricciones especiales
    first_purchase_only = models.BooleanField(
        default=False,
        verbose_name='Solo Primera Compra',
        help_text='Cupón solo válido para usuarios sin compras previas'
    )

    # Estado
    is_active = models.BooleanField(
        default=True,
        verbose_name='Activo'
    )

    class Meta:
        verbose_name = 'Cupón'
        verbose_name_plural = 'Cupones'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'code'],
                name='unique_coupon_code_per_tenant'
            )
        ]

    def __str__(self):
        return f"{self.code} - {self.get_discount_display()}"

    def get_discount_display(self):
        """Retorna una representación legible del descuento."""
        if self.discount_type == self.DiscountType.PERCENTAGE:
            return f"{self.discount_value}%"
        elif self.discount_type == self.DiscountType.FIXED_AMOUNT:
            return f"${self.discount_value}"
        else:
            return "Envío Gratis"

    @property
    def is_valid(self):
        """Verifica si el cupón está actualmente válido."""
        now = timezone.now()

        if not self.is_active:
            return False

        if now < self.valid_from or now > self.valid_until:
            return False

        if self.max_uses and self.times_used >= self.max_uses:
            return False

        return True

    def validate_for_user(self, user):
        """
        Valida el cupón para un usuario específico.
        Retorna (is_valid, error_message).
        """
        if not self.is_valid:
            if not self.is_active:
                return False, "Este cupón no está activo"

            now = timezone.now()
            if now < self.valid_from:
                return False, "Este cupón aún no está vigente"
            if now > self.valid_until:
                return False, "Este cupón ha expirado"

            if self.max_uses and self.times_used >= self.max_uses:
                return False, "Este cupón ha alcanzado el límite de usos"

        # Verificar límite por usuario
        user_uses = CouponUsage.objects.filter(
            coupon=self,
            user=user
        ).count()

        if user_uses >= self.max_uses_per_user:
            return False, "Ya has utilizado este cupón el número máximo de veces"

        # Verificar si es primera compra
        if self.first_purchase_only:
            from orders.models import Order
            has_orders = Order.objects.filter(
                user=user,
                tenant=self.tenant,
                status__in=['paid', 'processing', 'shipped', 'delivered', 'completed']
            ).exists()

            if has_orders:
                return False, "Este cupón es solo válido para tu primera compra"

        return True, None

    def validate_for_amount(self, subtotal):
        """
        Valida si el monto cumple con el mínimo requerido.
        Retorna (is_valid, error_message).
        """
        if subtotal < self.minimum_purchase:
            return False, f"El monto mínimo para este cupón es ${self.minimum_purchase}"

        return True, None

    def calculate_discount(self, subtotal, shipping_cost=0):
        """
        Calcula el descuento a aplicar.
        Retorna el monto del descuento.
        """
        if self.discount_type == self.DiscountType.PERCENTAGE:
            discount = (subtotal * self.discount_value) / 100
            # Aplicar máximo si existe
            if self.maximum_discount:
                discount = min(discount, self.maximum_discount)
            return discount

        elif self.discount_type == self.DiscountType.FIXED_AMOUNT:
            # No puede ser mayor que el subtotal
            return min(self.discount_value, subtotal)

        elif self.discount_type == self.DiscountType.FREE_SHIPPING:
            return shipping_cost

        return 0

    def increment_usage(self):
        """Incrementa el contador de usos."""
        self.times_used += 1
        self.save(update_fields=['times_used'])


class CouponUsage(TenantAwareModel):
    """
    Registro de uso de cupones por usuario.
    Permite rastrear quién usó qué cupón y cuándo.
    """

    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.CASCADE,
        related_name='usages',
        verbose_name='Cupón'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='coupon_usages',
        verbose_name='Usuario'
    )
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coupon_usages',
        verbose_name='Orden'
    )
    discount_applied = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Descuento Aplicado'
    )
    used_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Uso'
    )

    class Meta:
        verbose_name = 'Uso de Cupón'
        verbose_name_plural = 'Usos de Cupones'
        ordering = ['-used_at']

    def __str__(self):
        return f"{self.user.email} - {self.coupon.code} - ${self.discount_applied}"
