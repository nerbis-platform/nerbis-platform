# backend/billing/models.py
"""
Sistema de Billing Modular para GRAVITIFY.

Modelo de precios modular:
1. Precio base por web estática
2. Módulos adicionales con precios individuales
3. Cobros pay-as-you-go por uso adicional

Estructura:
- PricingConfig: Configuración global de precios base (singleton)
- Module: Módulos disponibles (Tienda, Reservas, Planes, Marketing)
- Subscription: Suscripción base de un tenant
- SubscriptionModule: Módulos contratados por una suscripción
- UsageRecord: Registro de uso para cobros adicionales
- Invoice: Facturas generadas
"""

from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
import uuid


class PricingConfig(models.Model):
    """
    Configuración global del sistema de billing (singleton).

    Contiene configuraciones que aplican a todas las suscripciones:
    - Período de prueba
    - Precios de extras (pay-as-you-go)

    NOTA: Los precios de los módulos (Web, Shop, etc.) están en el modelo Module.
    """

    # Trial
    trial_days = models.PositiveIntegerField(
        'Días de prueba',
        default=14,
        help_text="Días de prueba gratis para nuevas suscripciones"
    )

    # Precios de extras globales (pay-as-you-go)
    extra_employee_price = models.DecimalField(
        'Precio empleado extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('25000.00'),
        help_text="Precio mensual por empleado adicional"
    )
    extra_sms_price = models.DecimalField(
        'Precio SMS extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('180.00'),
        help_text="Precio por SMS adicional"
    )
    extra_whatsapp_price = models.DecimalField(
        'Precio WhatsApp extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('250.00'),
        help_text="Precio por mensaje WhatsApp adicional"
    )
    extra_appointment_price = models.DecimalField(
        'Precio cita extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('800.00'),
        help_text="Precio por cita adicional (sobre límite)"
    )
    extra_storage_price = models.DecimalField(
        'Precio GB extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('5000.00'),
        help_text="Precio mensual por GB adicional de almacenamiento"
    )
    extra_ai_request_price = models.DecimalField(
        'Precio generación IA extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('500.00'),
        help_text="Precio por generación de IA adicional (~$0.12 USD)"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuración Global'
        verbose_name_plural = 'Configuración Global'

    def __str__(self):
        return f"Configuración Global (Trial: {self.trial_days} días)"

    def save(self, *args, **kwargs):
        # Singleton: solo puede existir una instancia
        if not self.pk and PricingConfig.objects.exists():
            raise ValidationError("Solo puede existir una configuración")
        super().save(*args, **kwargs)

    @classmethod
    def get_current(cls):
        """Obtiene la configuración actual o crea una por defecto."""
        config, created = cls.objects.get_or_create(pk=1)
        return config


class Module(models.Model):
    """
    Servicios/Módulos de GRAVITIFY.

    Cada módulo representa un producto de GRAVITIFY:
    - Web (base, requerido)
    - Shop (ecommerce)
    - Bookings (reservas)
    - Services (planes/contratos)
    - Marketing (marketing)
    """

    MODULE_SLUGS = [
        ('web', 'Web'),
        ('shop', 'Shop'),
        ('bookings', 'Bookings'),
        ('services', 'Services'),
        ('marketing', 'Marketing'),
    ]

    # Identificación
    slug = models.SlugField(
        'Identificador',
        max_length=50,
        unique=True,
        choices=MODULE_SLUGS,
        help_text="Identificador único del módulo"
    )
    name = models.CharField(
        'Nombre',
        max_length=100,
        help_text="Nombre comercial del módulo"
    )
    description = models.TextField(
        'Descripción',
        help_text="Descripción del módulo para mostrar al cliente"
    )
    icon = models.CharField(
        'Ícono',
        max_length=50,
        default='📦',
        help_text="Emoji o clase de ícono"
    )

    # ¿Es el módulo base requerido?
    is_base = models.BooleanField(
        'Es módulo base',
        default=False,
        help_text="Si es True, este módulo es requerido para todas las suscripciones (Web)"
    )

    # Versionamiento y vigencia
    version = models.CharField(
        'Versión',
        max_length=20,
        default='1.0',
        help_text="Versión del plan (ej: 1.0, 2.0)"
    )
    effective_date = models.DateField(
        'Fecha de vigencia',
        null=True,
        blank=True,
        help_text="Fecha desde la cual aplica este precio"
    )

    # Precios
    monthly_price = models.DecimalField(
        'Precio Mensual',
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Precio mensual en COP"
    )
    annual_discount_months = models.PositiveIntegerField(
        'Meses de descuento (anual)',
        default=2,
        help_text="Meses gratis al pagar anual (ej: 2 = paga 10 meses)"
    )

    # Límites incluidos con este módulo
    included_appointments = models.PositiveIntegerField(
        'Citas incluidas',
        default=0,
        help_text="Citas mensuales incluidas con este módulo (0 = no aplica)"
    )
    included_employees = models.PositiveIntegerField(
        'Empleados incluidos',
        default=0,
        help_text="Empleados incluidos (0 = no aplica)"
    )
    included_products = models.PositiveIntegerField(
        'Productos incluidos',
        default=0,
        help_text="Productos en catálogo (0 = no aplica/ilimitado)"
    )
    included_services = models.PositiveIntegerField(
        'Servicios incluidos',
        default=0,
        help_text="Servicios configurables (0 = no aplica/ilimitado)"
    )
    included_sms = models.PositiveIntegerField(
        'SMS incluidos',
        default=0,
        help_text="SMS incluidos por mes"
    )
    included_whatsapp = models.PositiveIntegerField(
        'WhatsApp incluidos',
        default=0,
        help_text="Mensajes WhatsApp incluidos por mes"
    )
    included_storage_gb = models.PositiveIntegerField(
        'Almacenamiento (GB)',
        default=15,
        help_text="GB de almacenamiento incluidos (0 = no aplica)"
    )
    included_ai_requests = models.PositiveIntegerField(
        'Generaciones IA incluidas',
        default=0,
        help_text="Generaciones de IA incluidas por mes (para crear/editar sitio web)"
    )

    # Precios de extras (por unidad adicional sobre el límite)
    extra_appointment_price = models.DecimalField(
        'Precio cita extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Precio por cita adicional (0 = no aplica)"
    )
    extra_employee_price = models.DecimalField(
        'Precio empleado extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Precio mensual por empleado adicional (0 = no aplica)"
    )
    extra_product_price = models.DecimalField(
        'Precio producto extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Precio por producto adicional (0 = no aplica)"
    )
    extra_sms_price = models.DecimalField(
        'Precio SMS extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Precio por SMS adicional (0 = no aplica)"
    )
    extra_whatsapp_price = models.DecimalField(
        'Precio WhatsApp extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Precio por mensaje WhatsApp adicional (0 = no aplica)"
    )
    extra_storage_price = models.DecimalField(
        'Precio GB extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Precio mensual por GB adicional (0 = no aplica)"
    )
    extra_ai_request_price = models.DecimalField(
        'Precio generación IA extra',
        max_digits=8,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Precio por generación de IA adicional en plan mensual (0 = no aplica)"
    )

    # Configuración Trial
    trial_days = models.PositiveIntegerField(
        'Días de trial',
        default=14,
        help_text="Días de prueba para nuevos tenants con este módulo"
    )
    trial_included_ai_requests = models.PositiveIntegerField(
        'Generaciones IA en trial',
        default=10,
        help_text="Generaciones de IA incluidas durante el período de prueba"
    )

    # Configuración Plan Anual (0 = usa valor mensual)
    annual_included_ai_requests = models.PositiveIntegerField(
        'Generaciones IA (plan anual)',
        default=0,
        help_text="Generaciones de IA incluidas en plan anual por mes (0 = usa valor mensual)"
    )
    annual_extra_ai_request_price = models.DecimalField(
        'Precio generación IA extra (anual)',
        max_digits=8,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Precio por generación de IA adicional en plan anual (0 = usa precio mensual)"
    )

    # Features especiales del módulo
    has_analytics = models.BooleanField(
        'Analytics avanzados',
        default=False,
        help_text="Incluye analytics avanzados"
    )
    has_api_access = models.BooleanField(
        'Acceso a API',
        default=False,
        help_text="Incluye acceso a API"
    )

    # Dependencias (ej: marketing podría requerir shop o bookings)
    requires_modules = models.ManyToManyField(
        'self',
        symmetrical=False,
        blank=True,
        related_name='required_by',
        help_text="Módulos requeridos para habilitar este"
    )

    # Estado
    is_active = models.BooleanField(
        'Activo',
        default=True,
        help_text="¿Módulo disponible para contratar?"
    )
    is_visible = models.BooleanField(
        'Visible',
        default=True,
        help_text="¿Visible en la página de precios?"
    )
    sort_order = models.PositiveIntegerField(
        'Orden',
        default=0,
        help_text="Orden de aparición en la página de precios"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'monthly_price']
        verbose_name = 'Servicio'
        verbose_name_plural = 'Servicios'

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
        Retorna el límite de generaciones IA según el estado y período de la suscripción.
        - Trial → trial_included_ai_requests
        - Anual (con valor > 0) → annual_included_ai_requests
        - Mensual (o anual sin valor específico) → included_ai_requests
        """
        if subscription.status == 'trial':
            return self.trial_included_ai_requests

        if subscription.billing_period == 'yearly' and self.annual_included_ai_requests > 0:
            return self.annual_included_ai_requests

        return self.included_ai_requests

    def get_ai_extra_price_for_subscription(self, subscription):
        """
        Retorna el precio extra por generación IA según el período de facturación.
        - Anual (con valor > 0) → annual_extra_ai_request_price
        - Mensual (o anual sin valor específico) → extra_ai_request_price
        """
        if subscription.billing_period == 'yearly' and self.annual_extra_ai_request_price > 0:
            return self.annual_extra_ai_request_price

        return self.extra_ai_request_price


class Subscription(models.Model):
    """
    Suscripción de un tenant.

    Cada tenant tiene una suscripción que incluye:
    - Precio base (web estática)
    - Módulos adicionales contratados
    - Estado y fechas de facturación
    """

    STATUS_CHOICES = [
        ('trial', 'Período de Prueba'),
        ('active', 'Activa'),
        ('past_due', 'Pago Pendiente'),
        ('canceled', 'Cancelada'),
        ('expired', 'Expirada'),
    ]

    BILLING_PERIOD_CHOICES = [
        ('monthly', 'Mensual'),
        ('yearly', 'Anual'),
    ]

    # Identificación
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    tenant = models.OneToOneField(
        'core.Tenant',
        on_delete=models.CASCADE,
        related_name='subscription'
    )

    # [DEPRECATED] Plan - Se mantiene para compatibilidad durante migración
    plan = models.ForeignKey(
        'Plan',
        on_delete=models.PROTECT,
        related_name='subscriptions',
        null=True,
        blank=True,
        help_text="[DEPRECATED] Usar módulos en su lugar"
    )

    # Módulos contratados
    modules = models.ManyToManyField(
        Module,
        through='SubscriptionModule',
        blank=True,
        related_name='subscriptions',
        help_text="Módulos adicionales contratados"
    )

    # Período de facturación
    billing_period = models.CharField(
        'Período de facturación',
        max_length=20,
        choices=BILLING_PERIOD_CHOICES,
        default='monthly'
    )

    # Features adicionales (comprados aparte de módulos)
    has_custom_domain = models.BooleanField(
        'Dominio personalizado',
        default=False,
        help_text="Dominio personalizado contratado"
    )
    has_priority_support = models.BooleanField(
        'Soporte prioritario',
        default=False,
        help_text="Soporte prioritario contratado"
    )
    has_white_label = models.BooleanField(
        'Sin branding (White Label)',
        default=False,
        help_text="Sin branding de GRAVITIFY"
    )

    # Fechas
    started_at = models.DateTimeField(
        'Fecha de inicio',
        default=timezone.now,
        help_text="Fecha de inicio de la suscripción"
    )
    current_period_start = models.DateTimeField(
        'Inicio del período',
        help_text="Inicio del período de facturación actual"
    )
    current_period_end = models.DateTimeField(
        'Fin del período',
        help_text="Fin del período de facturación actual"
    )
    trial_ends_at = models.DateTimeField(
        'Fin del trial',
        null=True,
        blank=True,
        help_text="Fecha de fin del período de prueba"
    )
    canceled_at = models.DateTimeField(
        'Fecha de cancelación',
        null=True,
        blank=True,
        help_text="Fecha de cancelación (si aplica)"
    )

    # Estado
    status = models.CharField(
        'Estado',
        max_length=20,
        choices=STATUS_CHOICES,
        default='trial'
    )

    # Extras contratados (beyond module limits)
    extra_employees = models.PositiveIntegerField(
        'Empleados adicionales',
        default=0,
        help_text="Empleados adicionales contratados"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Suscripción'
        verbose_name_plural = 'Suscripciones'

    def __str__(self):
        return f"{self.tenant.name} - ${self.monthly_total:,.0f}/mes ({self.get_status_display()})"

    @property
    def is_active(self):
        """Suscripción activa (incluye trial y active)."""
        return self.status in ('trial', 'active')

    @property
    def is_trial(self):
        """¿Está en período de prueba?"""
        return self.status == 'trial'

    @property
    def days_remaining(self):
        """Días restantes en el período actual."""
        if not self.current_period_end:
            return None
        delta = self.current_period_end - timezone.now()
        return max(0, delta.days)

    @property
    def trial_days_remaining(self):
        """Días restantes de prueba."""
        if not self.trial_ends_at:
            return None
        delta = self.trial_ends_at - timezone.now()
        return max(0, delta.days)

    # ===================================
    # CÁLCULO DE PRECIOS
    # ===================================

    @property
    def _has_non_base_modules(self):
        """Verifica si hay módulos activos además del base (Web)."""
        return self.subscription_modules.filter(
            is_active=True, module__is_base=False
        ).exists()

    @property
    def modules_monthly_price(self):
        """
        Suma de precios mensuales de los módulos contratados.
        Si hay módulos adicionales (Shop, Bookings, etc.), Web base se incluye gratis.
        Si solo tiene Web, se cobra su precio normal.
        """
        skip_base = self._has_non_base_modules
        total = Decimal('0')
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
        """Total mensual: módulos + extras."""
        return self.modules_monthly_price + self.extras_monthly_price

    @property
    def yearly_total(self):
        """Total anual con descuentos aplicados. Web base gratis si hay otros módulos."""
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
        """Precio del período actual (mensual o anual)."""
        if self.billing_period == 'yearly':
            return self.yearly_total
        return self.monthly_total

    # ===================================
    # MÓDULOS
    # ===================================

    def has_module(self, module_slug):
        """Verifica si tiene un módulo activo."""
        return self.subscription_modules.filter(
            module__slug=module_slug,
            is_active=True
        ).exists()

    def add_module(self, module, lock_price=True):
        """
        Agrega un módulo a la suscripción.

        Args:
            module: Module instance o slug
            lock_price: Si True, guarda el precio actual
        """
        if isinstance(module, str):
            module = Module.objects.get(slug=module)

        sm, created = SubscriptionModule.objects.get_or_create(
            subscription=self,
            module=module,
            defaults={
                'price_locked': module.monthly_price if lock_price else None,
                'is_active': True
            }
        )
        if not created and not sm.is_active:
            sm.is_active = True
            sm.save()

        return sm

    def remove_module(self, module_slug):
        """Desactiva un módulo (no lo elimina para mantener historial)."""
        self.subscription_modules.filter(
            module__slug=module_slug
        ).update(is_active=False, deactivated_at=timezone.now())

    def sync_modules_to_tenant(self):
        """
        Sincroniza los módulos activos al tenant.
        Actualiza los flags has_shop, has_bookings, etc.
        """
        tenant = self.tenant
        if not tenant:
            return

        # Solo sincronizar si la suscripción está activa
        if not self.is_active:
            return

        # Obtener módulos activos
        active_modules = set(
            self.subscription_modules.filter(is_active=True)
            .values_list('module__slug', flat=True)
        )

        # Actualizar flags del tenant
        tenant.has_shop = 'shop' in active_modules
        tenant.has_bookings = 'bookings' in active_modules
        tenant.has_services = 'services' in active_modules
        tenant.has_marketing = 'marketing' in active_modules

        tenant.save(update_fields=[
            'has_shop', 'has_bookings', 'has_services', 'has_marketing'
        ])

    # ===================================
    # LÍMITES
    # ===================================

    def get_limit(self, resource):
        """
        Obtiene el límite total para un recurso.
        Suma los límites de todos los módulos activos + extras.

        Args:
            resource: 'appointments', 'employees', 'sms', 'whatsapp', etc.

        Returns:
            int: Límite total, o None si es ilimitado
        """
        field_name = f'included_{resource}'

        # Sumar límites de todos los módulos activos
        total = sum(
            getattr(sm.module, field_name, 0)
            for sm in self.subscription_modules.filter(is_active=True)
            if hasattr(sm.module, field_name)
        )

        # Si algún módulo tiene 0 (ilimitado), retornar None
        for sm in self.subscription_modules.filter(is_active=True):
            if hasattr(sm.module, field_name):
                if getattr(sm.module, field_name) == 0:
                    return None  # Ilimitado

        # Sumar extras si aplica
        if resource == 'employees':
            total += self.extra_employees

        return total if total > 0 else None

    def can_use(self, resource, current_usage):
        """
        Verifica si puede usar más de un recurso.
        """
        limit = self.get_limit(resource)
        if limit is None:
            return True  # Ilimitado

        # Recursos con límite fijo
        if resource == 'employees':
            return current_usage < limit

        # Recursos pay-as-you-go siempre permitidos
        return True

    def is_over_limit(self, resource, current_usage):
        """Verifica si el uso excede el límite incluido."""
        limit = self.get_limit(resource)
        if limit is None:
            return False
        return current_usage > limit


class SubscriptionModule(models.Model):
    """
    Relación entre Subscription y Module.

    Permite:
    - Guardar el precio al momento de contratar
    - Registrar fechas de activación/desactivación
    - Mantener historial de módulos
    """

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='subscription_modules'
    )
    module = models.ForeignKey(
        Module,
        on_delete=models.PROTECT,
        related_name='subscription_modules'
    )

    # Precio bloqueado al momento de contratar
    price_locked = models.DecimalField(
        'Precio bloqueado',
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Precio mensual al momento de contratar (para grandfathering)"
    )

    # Estado
    is_active = models.BooleanField(
        'Activo',
        default=True
    )

    # Fechas
    activated_at = models.DateTimeField(
        'Fecha de activación',
        auto_now_add=True
    )
    deactivated_at = models.DateTimeField(
        'Fecha de desactivación',
        null=True,
        blank=True
    )

    class Meta:
        unique_together = ['subscription', 'module']
        verbose_name = 'Módulo de Suscripción'
        verbose_name_plural = 'Módulos de Suscripción'

    def __str__(self):
        status = "✓" if self.is_active else "✗"
        return f"{status} {self.module.name} - {self.subscription.tenant.name}"

    @property
    def current_price(self):
        """Retorna el precio actual (bloqueado o vigente)."""
        return self.price_locked or self.module.monthly_price


# ===================================
# MODELOS DE USO Y FACTURACIÓN
# (Se mantienen igual pero adaptados)
# ===================================

class UsageRecord(models.Model):
    """
    Registro de uso para facturación pay-as-you-go.
    """

    RESOURCE_CHOICES = [
        ('appointment', 'Cita'),
        ('sms', 'SMS'),
        ('whatsapp', 'WhatsApp'),
        ('employee', 'Empleado'),
        ('ai_request', 'Generación IA'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='usage_records'
    )

    # Qué se usó
    resource = models.CharField(
        max_length=50,
        choices=RESOURCE_CHOICES
    )
    quantity = models.PositiveIntegerField(
        default=1,
        help_text="Cantidad usada"
    )

    # Cuándo
    recorded_at = models.DateTimeField(default=timezone.now)
    period_start = models.DateField(
        help_text="Inicio del período de facturación"
    )
    period_end = models.DateField(
        help_text="Fin del período de facturación"
    )

    # Referencia al objeto que generó el uso
    content_type = models.ForeignKey(
        'contenttypes.ContentType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    object_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="ID del objeto relacionado"
    )

    # Facturación
    is_billable = models.BooleanField(
        default=True,
        help_text="¿Se debe cobrar?"
    )
    unit_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Precio unitario al momento del registro"
    )
    invoice = models.ForeignKey(
        'Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='usage_records',
        help_text="Factura donde se cobró este uso"
    )

    # Metadata
    description = models.CharField(
        max_length=255,
        blank=True,
        help_text="Descripción del uso"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']
        verbose_name = 'Registro de Uso'
        verbose_name_plural = 'Registros de Uso'
        indexes = [
            models.Index(fields=['subscription', 'resource', 'period_start']),
            models.Index(fields=['subscription', 'period_start', 'period_end']),
        ]

    def __str__(self):
        return f"{self.get_resource_display()} x{self.quantity} - {self.subscription.tenant.name}"


class Invoice(models.Model):
    """
    Factura generada para un período de facturación.
    """

    STATUS_CHOICES = [
        ('draft', 'Borrador'),
        ('pending', 'Pendiente'),
        ('paid', 'Pagada'),
        ('failed', 'Pago Fallido'),
        ('void', 'Anulada'),
        ('refunded', 'Reembolsada'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='invoices'
    )

    # Número de factura
    number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Número de factura (ej: INV-2024-001)"
    )

    # Período
    period_start = models.DateField()
    period_end = models.DateField()

    # Montos (COP)
    subtotal_base = models.DecimalField(
        'Cargo base',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Cargo por web estática (base)"
    )
    subtotal_modules = models.DecimalField(
        'Cargo módulos',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Cargo por módulos adicionales"
    )
    subtotal_extras = models.DecimalField(
        'Cargo extras',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Cargo por extras fijos (empleados adicionales)"
    )
    subtotal_usage = models.DecimalField(
        'Cargo uso',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Cargo por uso adicional (pay-as-you-go)"
    )
    discount = models.DecimalField(
        'Descuento',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Descuento aplicado"
    )
    tax = models.DecimalField(
        'Impuesto',
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        help_text="IVA u otros impuestos"
    )
    total = models.DecimalField(
        'Total',
        max_digits=12,
        decimal_places=2,
        help_text="Total a pagar"
    )

    # Estado
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )

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
        ordering = ['-period_start']
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'

    def __str__(self):
        return f"{self.number} - {self.subscription.tenant.name} (${self.total:,.0f})"

    def save(self, *args, **kwargs):
        if not self.total:
            self.calculate_total()
        super().save(*args, **kwargs)

    def calculate_total(self):
        """Calcula el total de la factura."""
        subtotal = (
            self.subtotal_base +
            self.subtotal_modules +
            self.subtotal_extras +
            self.subtotal_usage
        )
        self.total = subtotal - self.discount + self.tax


class InvoiceLineItem(models.Model):
    """
    Línea de detalle en una factura.
    """

    LINE_TYPE_CHOICES = [
        ('base', 'Web Base'),
        ('module', 'Módulo'),
        ('extra_employee', 'Empleado Adicional'),
        ('usage_appointment', 'Citas Adicionales'),
        ('usage_sms', 'SMS Adicionales'),
        ('usage_whatsapp', 'WhatsApp Adicionales'),
        ('usage_ai', 'Generaciones IA Adicionales'),
        ('discount', 'Descuento'),
        ('tax', 'Impuesto'),
    ]

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='line_items'
    )
    line_type = models.CharField(
        max_length=50,
        choices=LINE_TYPE_CHOICES
    )
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    # Referencia al módulo (si aplica)
    module = models.ForeignKey(
        Module,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        ordering = ['id']
        verbose_name = 'Línea de Factura'
        verbose_name_plural = 'Líneas de Factura'

    def __str__(self):
        return f"{self.description} - ${self.total:,.0f}"

    def save(self, *args, **kwargs):
        if not self.total:
            self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)


# ===================================
# MODELO PLAN (DEPRECATED - Solo para migración)
# ===================================

class Plan(models.Model):
    """
    [DEPRECATED] Planes de suscripción fijos.

    Este modelo se mantiene temporalmente para migración.
    El nuevo sistema usa Module para precios modulares.
    """

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    yearly_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    annual_discount_months = models.PositiveIntegerField(default=2)

    # Límites
    included_appointments = models.PositiveIntegerField(default=50)
    included_employees = models.PositiveIntegerField(default=1)
    included_sms = models.PositiveIntegerField(default=0)
    included_whatsapp = models.PositiveIntegerField(default=0)
    included_products = models.PositiveIntegerField(default=50)
    included_services = models.PositiveIntegerField(default=10)

    # Precios extras
    extra_appointment_price = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('800.00'))
    extra_employee_price = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('29000.00'))
    extra_sms_price = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('180.00'))
    extra_whatsapp_price = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('250.00'))

    # Features
    has_analytics = models.BooleanField(default=False)
    has_api_access = models.BooleanField(default=False)
    has_custom_domain = models.BooleanField(default=False)
    has_priority_support = models.BooleanField(default=False)
    has_white_label = models.BooleanField(default=False)

    # Módulos
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
        ordering = ['sort_order']
        verbose_name = '[DEPRECATED] Plan'
        verbose_name_plural = '[DEPRECATED] Planes'

    def __str__(self):
        return f"[DEP] {self.name}"

    def sync_modules_to_tenant(self, tenant):
        """Método legacy para compatibilidad."""
        tenant.has_shop = self.includes_shop
        tenant.has_bookings = self.includes_bookings
        tenant.has_services = self.includes_services
        tenant.has_marketing = self.includes_marketing
        tenant.save(update_fields=[
            'has_shop', 'has_bookings', 'has_services', 'has_marketing'
        ])
