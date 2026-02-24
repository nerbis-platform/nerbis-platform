# backend/subscriptions/models.py

from django.db import models
from core.models import TenantAwareModel


class MarketplaceCategory(TenantAwareModel):
    """
    Categorías para servicios vendibles (no agendables).

    Ejemplos:
    - Seguros
    - Planes Funerarios
    - Membresías
    - Mantenimientos
    """

    name = models.CharField(
        max_length=200,
        verbose_name="Nombre de la categoría",
        help_text="Ej: Seguros, Planes Funerarios, Membresías"
    )

    slug = models.SlugField(
        max_length=200,
        verbose_name="Slug (URL)",
        help_text="Se genera automáticamente del nombre"
    )

    description = models.TextField(
        blank=True,
        verbose_name="Descripción",
        help_text="Descripción de la categoría"
    )

    icon = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Icono",
        help_text="Nombre del icono (lucide-react)"
    )

    image = models.ImageField(
        upload_to="subscriptions/categories/",
        null=True,
        blank=True,
        verbose_name="Imagen",
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="¿Está activa?"
    )

    order = models.PositiveIntegerField(
        default=0,
        verbose_name="Orden",
        help_text="Orden de visualización (menor número = primero)"
    )

    class Meta:
        verbose_name = "Categoría de Servicio"
        verbose_name_plural = "Categorías de Servicios"
        ordering = ["order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "slug"],
                name="unique_subscriptions_category_slug_per_tenant"
            )
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class MarketplacePlan(TenantAwareModel):
    """
    Servicios vendibles que no requieren agendar cita.

    Ejemplos:
    - Plan Funerario Básico
    - Seguro de Vida
    - Membresía Premium
    - Contrato de Mantenimiento Anual
    """

    BILLING_PERIOD_CHOICES = [
        ('once', 'Pago único'),
        ('monthly', 'Mensual'),
        ('quarterly', 'Trimestral'),
        ('biannual', 'Semestral'),
        ('annual', 'Anual'),
    ]

    category = models.ForeignKey(
        MarketplaceCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plans",
        verbose_name="Categoría"
    )

    name = models.CharField(
        max_length=200,
        verbose_name="Nombre del servicio",
        help_text="Ej: Plan Funerario Premium, Seguro de Vida Familiar"
    )

    slug = models.SlugField(
        max_length=200,
        verbose_name="Slug (URL)"
    )

    description = models.TextField(
        verbose_name="Descripción corta",
        help_text="Descripción breve para listados"
    )

    full_description = models.TextField(
        blank=True,
        verbose_name="Descripción completa",
        help_text="Descripción detallada del servicio (soporta HTML)"
    )

    features = models.JSONField(
        default=list,
        verbose_name="Características",
        help_text="Lista de características incluidas en el plan",
        blank=True
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Precio",
        help_text="Precio base del servicio"
    )

    billing_period = models.CharField(
        max_length=20,
        choices=BILLING_PERIOD_CHOICES,
        default='once',
        verbose_name="Periodo de facturación"
    )

    image = models.ImageField(
        upload_to="subscriptions/services/",
        null=True,
        blank=True,
        verbose_name="Imagen principal"
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="¿Está activo?"
    )

    is_featured = models.BooleanField(
        default=False,
        verbose_name="¿Destacado?",
        help_text="Se muestra en la página principal"
    )

    max_contracts = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Máximo de contratos",
        help_text="Límite de contratos activos (vacío = ilimitado)"
    )

    order = models.PositiveIntegerField(
        default=0,
        verbose_name="Orden",
        help_text="Orden de visualización"
    )

    class Meta:
        verbose_name = "Plan de Servicio"
        verbose_name_plural = "Planes de Servicios"
        ordering = ["order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "slug"],
                name="unique_subscriptions_plan_slug_per_tenant"
            )
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def formatted_price(self):
        """Precio formateado con periodo"""
        period_map = {
            'once': 'pago único',
            'monthly': '/mes',
            'quarterly': '/trimestre',
            'biannual': '/semestre',
            'annual': '/año',
        }
        period = period_map.get(self.billing_period, '')
        return f"${self.price:,.0f} {period}"

    @property
    def active_contracts_count(self):
        """Número de contratos activos"""
        return self.contracts.filter(status='active').count()

    @property
    def is_available(self):
        """Verificar si está disponible para compra"""
        if not self.is_active:
            return False
        if self.max_contracts is None:
            return True
        return self.active_contracts_count < self.max_contracts


class MarketplaceContract(TenantAwareModel):
    """
    Contrato activo de un cliente con un servicio.

    Representa la compra/suscripción de un cliente a un MarketplacePlan.
    """

    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('active', 'Activo'),
        ('suspended', 'Suspendido'),
        ('cancelled', 'Cancelado'),
        ('expired', 'Expirado'),
    ]

    service_plan = models.ForeignKey(
        MarketplacePlan,
        on_delete=models.PROTECT,
        related_name="contracts",
        verbose_name="Plan de servicio"
    )

    customer = models.ForeignKey(
        'core.User',
        on_delete=models.CASCADE,
        related_name="subscription_contracts",
        verbose_name="Cliente"
    )

    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscription_contracts",
        verbose_name="Orden de compra"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Estado"
    )

    start_date = models.DateField(
        verbose_name="Fecha de inicio",
        help_text="Fecha en que inicia la vigencia del contrato"
    )

    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fecha de fin",
        help_text="Fecha en que expira el contrato (vacío si es vitalicio)"
    )

    next_billing_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Próxima fecha de cobro",
        help_text="Para servicios recurrentes"
    )

    price_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Precio pagado",
        help_text="Precio pagado al momento de la compra"
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Notas internas",
        help_text="Notas para uso interno del admin"
    )

    class Meta:
        verbose_name = "Contrato de Servicio"
        verbose_name_plural = "Contratos de Servicios"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "customer", "status"]),
            models.Index(fields=["tenant", "status", "next_billing_date"]),
        ]

    def __str__(self):
        return f"{self.service_plan.name} - {self.customer.get_full_name()}"

    @property
    def is_active(self):
        """Verificar si el contrato está activo"""
        return self.status == 'active'

    @property
    def is_expired(self):
        """Verificar si el contrato ha expirado"""
        from django.utils import timezone
        if not self.end_date:
            return False
        return timezone.now().date() > self.end_date

    @property
    def days_remaining(self):
        """Días restantes de vigencia"""
        from django.utils import timezone
        if not self.end_date:
            return None
        delta = self.end_date - timezone.now().date()
        return max(0, delta.days)
