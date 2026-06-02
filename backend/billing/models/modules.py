# backend/billing/models/modules.py
"""
Modelo Module: servicios/modulos disponibles en NERBIS.
"""

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

_NON_NEGATIVE = [MinValueValidator(Decimal("0"))]


class Module(models.Model):
    """
    Catálogo global de servicios/módulos de NERBIS.

    Hereda de models.Model (NO TenantAwareModel) porque es un catálogo
    compartido de la plataforma, no datos de un tenant específico.
    Los tenants acceden a módulos vía Subscription → SubscriptionModule.

    Cada módulo representa un producto de NERBIS:
    - Web (base, requerido)
    - Shop (ecommerce)
    - Bookings (reservas)
    - Services (planes/contratos)
    - Marketing (marketing)
    """

    MODULE_SLUGS = [
        ("web", "Web"),
        ("shop", "Shop"),
        ("bookings", "Bookings"),
        ("services", "Services"),
        ("marketing", "Marketing"),
    ]

    # Identificacion
    slug = models.SlugField(
        "Identificador", max_length=50, unique=True, choices=MODULE_SLUGS, help_text="Identificador unico del modulo"
    )
    name = models.CharField("Nombre", max_length=100, help_text="Nombre comercial del modulo")
    description = models.TextField("Descripcion", help_text="Descripcion del modulo para mostrar al cliente")
    icon = models.CharField("Icono", max_length=50, default="📦", help_text="Emoji o clase de icono")

    # Es el modulo base requerido?
    is_base = models.BooleanField(
        "Es modulo base",
        default=False,
        help_text="Si es True, este modulo es requerido para todas las suscripciones (Web)",
    )

    # Versionamiento y vigencia
    version = models.CharField("Version", max_length=20, default="1.0", help_text="Version del plan (ej: 1.0, 2.0)")
    effective_date = models.DateField(
        "Fecha de vigencia", null=True, blank=True, help_text="Fecha desde la cual aplica este precio"
    )

    # Precios
    monthly_price = models.DecimalField(
        "Precio Mensual",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Precio mensual en COP",
    )
    annual_discount_months = models.PositiveIntegerField(
        "Meses de descuento (anual)", default=2, help_text="Meses gratis al pagar anual (ej: 2 = paga 10 meses)"
    )

    # Limites incluidos con este modulo
    included_appointments = models.PositiveIntegerField(
        "Citas incluidas", default=0, help_text="Citas mensuales incluidas con este modulo (0 = no aplica)"
    )
    included_employees = models.PositiveIntegerField(
        "Empleados incluidos", default=0, help_text="Empleados incluidos (0 = no aplica)"
    )
    included_products = models.PositiveIntegerField(
        "Productos incluidos", default=0, help_text="Productos en catalogo (0 = no aplica/ilimitado)"
    )
    included_services = models.PositiveIntegerField(
        "Servicios incluidos", default=0, help_text="Servicios configurables (0 = no aplica/ilimitado)"
    )
    included_sms = models.PositiveIntegerField("SMS incluidos", default=0, help_text="SMS incluidos por mes")
    included_whatsapp = models.PositiveIntegerField(
        "WhatsApp incluidos", default=0, help_text="Mensajes WhatsApp incluidos por mes"
    )
    included_storage_gb = models.PositiveIntegerField(
        "Almacenamiento (GB)", default=15, help_text="GB de almacenamiento incluidos (0 = no aplica)"
    )
    included_ai_requests = models.PositiveIntegerField(
        "Generaciones IA incluidas",
        default=0,
        help_text="Generaciones de IA incluidas por mes (para crear/editar sitio web)",
    )

    # Precios de extras (por unidad adicional sobre el limite)
    extra_appointment_price = models.DecimalField(
        "Precio cita extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0"),
        validators=_NON_NEGATIVE,
        help_text="Precio por cita adicional (0 = no aplica)",
    )
    extra_employee_price = models.DecimalField(
        "Precio empleado extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0"),
        validators=_NON_NEGATIVE,
        help_text="Precio mensual por empleado adicional (0 = no aplica)",
    )
    extra_product_price = models.DecimalField(
        "Precio producto extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0"),
        validators=_NON_NEGATIVE,
        help_text="Precio por producto adicional (0 = no aplica)",
    )
    extra_sms_price = models.DecimalField(
        "Precio SMS extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0"),
        validators=_NON_NEGATIVE,
        help_text="Precio por SMS adicional (0 = no aplica)",
    )
    extra_whatsapp_price = models.DecimalField(
        "Precio WhatsApp extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0"),
        validators=_NON_NEGATIVE,
        help_text="Precio por mensaje WhatsApp adicional (0 = no aplica)",
    )
    extra_storage_price = models.DecimalField(
        "Precio GB extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0"),
        validators=_NON_NEGATIVE,
        help_text="Precio mensual por GB adicional (0 = no aplica)",
    )
    extra_ai_request_price = models.DecimalField(
        "Precio generacion IA extra",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0"),
        validators=_NON_NEGATIVE,
        help_text="Precio por generacion de IA adicional en plan mensual (0 = no aplica)",
    )

    # Configuracion Trial
    trial_days = models.PositiveIntegerField(
        "Dias de trial", default=14, help_text="Dias de prueba para nuevos tenants con este modulo"
    )
    trial_included_ai_requests = models.PositiveIntegerField(
        "Generaciones IA en trial", default=10, help_text="Generaciones de IA incluidas durante el periodo de prueba"
    )

    # Configuracion Plan Anual (0 = usa valor mensual)
    annual_included_ai_requests = models.PositiveIntegerField(
        "Generaciones IA (plan anual)",
        default=0,
        help_text="Generaciones de IA incluidas en plan anual por mes (0 = usa valor mensual)",
    )
    annual_extra_ai_request_price = models.DecimalField(
        "Precio generacion IA extra (anual)",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0"),
        help_text="Precio por generacion de IA adicional en plan anual (0 = usa precio mensual)",
    )

    # Features especiales del modulo
    has_analytics = models.BooleanField("Analytics avanzados", default=False, help_text="Incluye analytics avanzados")
    has_api_access = models.BooleanField("Acceso a API", default=False, help_text="Incluye acceso a API")

    # Dependencias (ej: marketing podria requerir shop o bookings)
    requires_modules = models.ManyToManyField(
        "self",
        symmetrical=False,
        blank=True,
        related_name="required_by",
        help_text="Modulos requeridos para habilitar este",
    )

    # Estado
    is_active = models.BooleanField("Activo", default=True, help_text="Modulo disponible para contratar?")
    is_visible = models.BooleanField("Visible", default=True, help_text="Visible en la pagina de precios?")
    sort_order = models.PositiveIntegerField("Orden", default=0, help_text="Orden de aparicion en la pagina de precios")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "monthly_price"]
        verbose_name = "Servicio"
        verbose_name_plural = "Servicios"

    def __str__(self):
        return self.name

    @property
    def yearly_price(self):
        """Calcula el precio anual con descuento."""
        months_to_pay = 12 - self.annual_discount_months
        return self.monthly_price * months_to_pay

    @property
    def annual_savings(self):
        """Calcula el ahorro anual en COP."""
        return (self.monthly_price * 12) - self.yearly_price

    def get_tenant_flag_name(self):
        """Retorna el nombre del campo has_X en Tenant."""
        return f"has_{self.slug}"

    def get_ai_limit_for_subscription(self, subscription):
        """
        Retorna el limite de generaciones IA segun el estado y periodo de la suscripcion.
        - Trial -> trial_included_ai_requests
        - Anual (con valor > 0) -> annual_included_ai_requests
        - Mensual (o anual sin valor especifico) -> included_ai_requests
        """
        if subscription.status == "trial":
            return self.trial_included_ai_requests

        if subscription.billing_period == "yearly" and self.annual_included_ai_requests > 0:
            return self.annual_included_ai_requests

        return self.included_ai_requests

    def get_ai_extra_price_for_subscription(self, subscription):
        """
        Retorna el precio extra por generacion IA segun el periodo de facturacion.
        - Anual (con valor > 0) -> annual_extra_ai_request_price
        - Mensual (o anual sin valor especifico) -> extra_ai_request_price
        """
        if subscription.billing_period == "yearly" and self.annual_extra_ai_request_price > 0:
            return self.annual_extra_ai_request_price

        return self.extra_ai_request_price
