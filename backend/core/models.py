# backend/core/models.py

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower
from django.utils.text import slugify

from .managers import TenantAwareManager, TenantAwareUserManager


# ===================================
# AGREGAR ESTA CLASE
# ===================================
class TenantAwareModel(models.Model):
    """
    Clase base abstracta para todos los modelos que pertenecen a un tenant.

    Todos los modelos que hereden de esta clase:
    - Tendrán un campo 'tenant' (FK a Tenant)
    - Tendrán timestamps (created_at, updated_at)
    - Usarán el TenantManager (filtrado automático)

    Ejemplo:
        class Product(TenantAwareModel):
            name = models.CharField(max_length=200)
            price = models.DecimalField(max_digits=10, decimal_places=2)
    """

    tenant = models.ForeignKey(
        "core.Tenant",  # Referencia completa para uso desde otras apps
        on_delete=models.CASCADE,
        verbose_name="Cliente",
        help_text="Tenant al que pertenece este registro",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")

    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    # Manager personalizado (filtra automáticamente por tenant)
    objects = TenantAwareManager()

    class Meta:
        abstract = True  # Esta clase NO crea tabla en la BD
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
        ]


# ===================================


class Tenant(models.Model):
    """
    Modelo para los clientes de la plataforma NERBIS.
    Cada tenant representa un negocio diferente.

    Ejemplos:
    - Pixel Sabana (Colombia)
    - GC Belleza y Estética (España)
    - Fitness Pro (México)
    """

    # === CHOICES (definidos al inicio para usarlos en los campos) ===
    INDUSTRY_CHOICES = [
        ("beauty", "Salón de Belleza / Barbería"),
        ("spa", "Spa / Centro de Bienestar"),
        ("nails", "Uñas / Nail Bar"),
        ("gym", "Gimnasio / Fitness"),
        ("yoga", "Yoga / Pilates / Danza"),
        ("clinic", "Clínica / Consultorio Médico"),
        ("dental", "Odontología"),
        ("psychology", "Psicología / Terapias"),
        ("nutrition", "Nutrición / Dietética"),
        ("veterinary", "Veterinaria / Pet Shop"),
        ("restaurant", "Restaurante / Cafetería"),
        ("bakery", "Panadería / Pastelería"),
        ("store", "Tienda / Retail"),
        ("fashion", "Moda / Boutique"),
        ("education", "Educación / Academia"),
        ("coworking", "Coworking / Oficina"),
        ("photography", "Fotografía / Videografía"),
        ("architecture", "Arquitectura / Diseño"),
        ("legal", "Abogados / Consultoría Legal"),
        ("accounting", "Contabilidad / Finanzas"),
        ("marketing", "Marketing / Publicidad"),
        ("tech", "Tecnología / Software"),
        ("real_estate", "Inmobiliaria"),
        ("automotive", "Automotriz / Taller Mecánico"),
        ("events", "Eventos / Wedding Planner"),
        ("travel", "Turismo / Agencia de Viajes"),
        ("services", "Servicios Profesionales"),
        ("other", "Otro"),
    ]

    COUNTRY_CHOICES = [
        ("Colombia", "Colombia"),
        ("México", "México"),
        ("España", "España"),
        ("Perú", "Perú"),
        ("Chile", "Chile"),
        ("Argentina", "Argentina"),
        ("Venezuela", "Venezuela"),
        ("Ecuador", "Ecuador"),
        ("Panamá", "Panamá"),
        ("Costa Rica", "Costa Rica"),
        ("Guatemala", "Guatemala"),
        ("Estados Unidos", "Estados Unidos"),
        ("Brasil", "Brasil"),
        ("Francia", "Francia"),
        ("Reino Unido", "Reino Unido"),
        ("Alemania", "Alemania"),
        ("Italia", "Italia"),
        ("Portugal", "Portugal"),
    ]

    TIMEZONE_CHOICES = [
        # América
        ("America/Bogota", "Colombia (Bogotá) UTC-5"),
        ("America/Mexico_City", "México (Ciudad de México) UTC-6"),
        ("America/Lima", "Perú (Lima) UTC-5"),
        ("America/Santiago", "Chile (Santiago) UTC-3/-4"),
        ("America/Buenos_Aires", "Argentina (Buenos Aires) UTC-3"),
        ("America/Caracas", "Venezuela (Caracas) UTC-4"),
        ("America/Guayaquil", "Ecuador (Guayaquil) UTC-5"),
        ("America/Panama", "Panamá UTC-5"),
        ("America/Costa_Rica", "Costa Rica UTC-6"),
        ("America/Guatemala", "Guatemala UTC-6"),
        ("America/New_York", "Estados Unidos (Nueva York) UTC-5/-4"),
        ("America/Los_Angeles", "Estados Unidos (Los Ángeles) UTC-8/-7"),
        ("America/Sao_Paulo", "Brasil (São Paulo) UTC-3"),
        # Europa
        ("Europe/Madrid", "España (Madrid) UTC+1/+2"),
        ("Europe/Paris", "Francia (París) UTC+1/+2"),
        ("Europe/London", "Reino Unido (Londres) UTC+0/+1"),
        ("Europe/Berlin", "Alemania (Berlín) UTC+1/+2"),
        ("Europe/Rome", "Italia (Roma) UTC+1/+2"),
        ("Europe/Lisbon", "Portugal (Lisboa) UTC+0/+1"),
    ]

    CURRENCY_CHOICES = [
        ("COP", "COP - Peso Colombiano"),
        ("USD", "USD - Dólar Estadounidense"),
        ("EUR", "EUR - Euro"),
        ("MXN", "MXN - Peso Mexicano"),
        ("PEN", "PEN - Sol Peruano"),
        ("CLP", "CLP - Peso Chileno"),
        ("ARS", "ARS - Peso Argentino"),
        ("VES", "VES - Bolívar Venezolano"),
        ("BRL", "BRL - Real Brasileño"),
        ("GBP", "GBP - Libra Esterlina"),
    ]

    # Identificadores
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="ID único del tenant (UUID)",
    )

    name = models.CharField(
        max_length=200,
        verbose_name="Nombre del cliente",
        help_text="El nombre comercial del cliente",
    )

    slug = models.SlugField(
        unique=True,
        max_length=60,
        verbose_name="Identificador único",
    )

    schema_name = models.CharField(
        max_length=63,
        unique=True,
        verbose_name="ID interno DB",
        help_text="Generado automáticamente",
        db_index=True,
    )

    # Industria / Tipo de negocio
    industry = models.CharField(
        max_length=30,
        choices=INDUSTRY_CHOICES,
        default="other",
        blank=True,
        verbose_name="Tipo de negocio",
    )

    # Información de contacto
    email = models.EmailField(verbose_name="Email de contacto")

    phone = models.CharField(max_length=20, verbose_name="Teléfono")

    # Dirección
    address = models.TextField(blank=True, verbose_name="Dirección completa")

    city = models.CharField(max_length=100, blank=True, verbose_name="Ciudad")

    state = models.CharField(max_length=100, blank=True, verbose_name="Departamento/Provincia/Estado")

    country = models.CharField(
        max_length=100,
        default="Colombia",
        choices=COUNTRY_CHOICES,
        verbose_name="País",
    )

    postal_code = models.CharField(max_length=20, blank=True, verbose_name="Código Postal")

    # Configuración y estado
    is_active = models.BooleanField(
        default=True,
        verbose_name="¿Está activo?",
        help_text="Desactivar si el cliente deja de pagar",
    )

    plan = models.CharField(
        max_length=50,
        default="trial",
        choices=[
            ("trial", "Prueba (30 días)"),
            ("basic", "Básico"),
            ("professional", "Profesional"),
            ("enterprise", "Empresarial"),
        ],
        verbose_name="Plan contratado",
    )

    subscription_ends_at = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fin de la suscripción",
        help_text="Fecha en que expira la suscripción o el trial. Dejar vacío para acceso indefinido.",
    )

    # Configuración personalizada
    logo = models.ImageField(
        upload_to="tenants/logos/",
        null=True,
        blank=True,
        verbose_name="Logo del negocio",
        help_text="Se mostrará en el panel de administración",
    )

    primary_color = models.CharField(
        max_length=7,
        default="#3B82F6",
        verbose_name="Color primario (hex)",
        help_text="Color principal de la marca (ej: #3B82F6)",
    )

    secondary_color = models.CharField(max_length=7, default="#8B5CF6", verbose_name="Color secundario (hex)")

    # Configuración regional
    timezone = models.CharField(
        max_length=50,
        default="America/Bogota",
        choices=TIMEZONE_CHOICES,
        verbose_name="Zona horaria",
    )

    currency = models.CharField(
        max_length=3,
        default="COP",
        choices=CURRENCY_CHOICES,
        verbose_name="Moneda",
    )

    language = models.CharField(
        max_length=10,
        default="es",
        choices=[
            ("es", "Español"),
            ("en", "English"),
            ("ca", "Català"),
        ],
        verbose_name="Idioma",
    )

    # Métricas del negocio (configurables desde admin)
    years_experience = models.PositiveIntegerField(
        default=0,
        verbose_name="Años de experiencia",
        help_text="Años de experiencia del negocio (se muestra en la web)",
    )

    clients_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Clientes atendidos",
        help_text="Número de clientes atendidos (se muestra en la web)",
    )

    treatments_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Tratamientos disponibles",
        help_text="Número de tratamientos ofrecidos (se muestra en la web)",
    )

    average_rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        default=0,
        verbose_name="Valoración promedio",
        help_text="Valoración promedio del negocio (0-5, se muestra en la web)",
    )

    # Imágenes hero configurables
    hero_image_home = models.ImageField(
        upload_to="tenants/hero/",
        null=True,
        blank=True,
        verbose_name="Imagen Hero - Inicio",
        help_text="Imagen de fondo para el hero de la página principal",
    )

    hero_image_services = models.ImageField(
        upload_to="tenants/hero/",
        null=True,
        blank=True,
        verbose_name="Imagen Hero - Servicios",
        help_text="Imagen de fondo para el hero de la página de servicios",
    )

    # ===================================
    # MÓDULOS HABILITADOS (Feature Flags)
    # ===================================
    has_website = models.BooleanField(
        default=False,
        verbose_name="Sitio Web",
        help_text="Habilita: Sitio web estático generado con IA",
    )

    has_shop = models.BooleanField(
        default=False,
        verbose_name="Shop",
        help_text="Habilita: Productos, Categorías, Inventario, Órdenes, Carritos",
    )

    has_bookings = models.BooleanField(
        default=False,
        verbose_name="Bookings",
        help_text="Habilita: Servicios agendables, Staff, Citas, Horarios, Días libres",
    )

    has_services = models.BooleanField(
        default=False,
        verbose_name="Services",
        help_text="Habilita: Servicios vendibles (planes, seguros, membresías) sin agendar",
    )

    has_marketing = models.BooleanField(
        default=False,
        verbose_name="Marketing",
        help_text="Habilita: Cupones, Promociones, Reseñas (requiere Shop, Bookings o Services)",
    )

    modules_configured = models.BooleanField(
        default=False,
        verbose_name="Módulos configurados",
        help_text="True cuando el dueño del negocio ya eligió sus módulos.",
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")

    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    # Configuración de Django
    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["schema_name"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """
        Sobrescribir save para generar automáticamente slug, schema_name
        y subscription_ends_at si no existen.
        """
        from datetime import timedelta

        from django.utils import timezone

        if not self.slug:
            # Generar slug desde el nombre
            self.slug = slugify(self.name)

        if not self.schema_name:
            # Generar schema_name desde el slug: pixel-sabana -> pixel_sabana_db
            self.schema_name = f"{self.slug.replace('-', '_')}_db"

        # Si es un nuevo tenant en plan trial, asignar fecha de fin configurable
        if not self.pk and self.plan == "trial" and not self.subscription_ends_at:
            try:
                from billing.models import Module

                web_module = Module.objects.filter(slug="web", is_active=True).first()
                trial_days = web_module.trial_days if web_module else 14
            except Exception:
                trial_days = 14
            self.subscription_ends_at = timezone.now().date() + timedelta(days=trial_days)

        super().save(*args, **kwargs)

    def get_absolute_url(self):
        """URL del tenant en la plataforma"""
        from django.conf import settings

        return f"https://{self.slug}.{settings.PLATFORM_BASE_DOMAIN}"

    # ===========================================
    # PROPIEDADES DE SUSCRIPCIÓN
    # ===========================================

    @property
    def is_trial(self) -> bool:
        """Indica si el tenant está en periodo de prueba"""
        return self.plan == "trial"

    @property
    def is_expired(self) -> bool:
        """Indica si la suscripción (trial o pagada) ha expirado"""
        from django.utils import timezone

        if not self.subscription_ends_at:
            # Sin fecha de fin = activo indefinidamente
            return False
        return timezone.now().date() > self.subscription_ends_at

    @property
    def is_subscription_active(self) -> bool:
        """
        Indica si la suscripción está activa.
        Retorna True si:
        - is_active está en True Y
        - No ha expirado (o no tiene fecha de fin)
        """
        if not self.is_active:
            return False

        return not self.is_expired

    @property
    def days_remaining(self) -> int | None:
        """
        Días restantes de la suscripción/trial.
        Retorna None si no hay fecha de fin definida (indefinido).
        """
        from django.utils import timezone

        if not self.subscription_ends_at:
            return None

        delta = self.subscription_ends_at - timezone.now().date()
        return max(0, delta.days)

    @property
    def subscription_status(self) -> str:
        """
        Retorna el estado de la suscripción como texto.
        Posibles valores: 'active', 'trial', 'expired', 'inactive'
        """
        if not self.is_active:
            return "inactive"

        if self.is_expired:
            return "expired"

        if self.is_trial:
            return "trial"

        return "active"

    @property
    def subscription_status_display(self) -> str:
        """Estado de la suscripción en español para mostrar en UI"""
        status_map = {
            "active": "Activo",
            "trial": f"Prueba ({self.days_remaining} días restantes)" if self.days_remaining else "Prueba",
            "expired": "Expirado",
            "inactive": "Desactivado",
        }
        return status_map.get(self.subscription_status, "Desconocido")


class TenantConfig(Tenant):
    """
    Proxy model para que el admin del tenant pueda editar
    la configuración de su propio negocio desde el panel.
    """

    class Meta:
        proxy = True
        verbose_name = "Mi Negocio"
        verbose_name_plural = "Mi Negocio"

    def __str__(self):
        # Solo mostrar el nombre, sin el slug técnico
        return self.name


class TenantWebsite(Tenant):
    """
    Proxy model para configurar el sitio web del tenant.
    Incluye: apariencia, imágenes, métricas y contenido.
    """

    class Meta:
        proxy = True
        verbose_name = "Mi Sitio Web"
        verbose_name_plural = "Mi Sitio Web"

    def __str__(self):
        return f"Sitio Web - {self.name}"


class User(AbstractUser):
    """
    Usuario personalizado que pertenece a un Tenant.

    Tipos de usuarios:
    - admin: Dueño del negocio, acceso total
    - staff: Empleado, puede gestionar citas y servicios
    - customer: Cliente final, puede comprar y agendar

    Autenticación Multi-Tenant:
    - El mismo email puede existir en múltiples tenants
    - La autenticación se hace por email+tenant usando TenantEmailBackend
    - uid es un campo único global generado automáticamente (requerido por Django)
    """

    # UID único global - necesario para satisfacer Django's USERNAME_FIELD requirement
    # Se genera automáticamente, el usuario no lo ve ni usa
    uid = models.CharField(
        max_length=150,
        unique=True,
        editable=False,
        verbose_name="Username (Email)",
        help_text="Identificador único: tenant:email (generado automáticamente)",
        blank=True,  # Permitir blank para generación automática en save()
    )

    # Sobrescribir username para quitar unique=True global
    # La unicidad se maneja por tenant en los constraints
    username = models.CharField(
        max_length=150,
        verbose_name="Nombre de usuario",
        help_text="Requerido. 150 caracteres o menos.",
    )

    # Email único por tenant (un mismo email puede existir en múltiples tenants)
    email = models.EmailField(
        verbose_name="Email",
        help_text="Email del usuario (único por tenant)",
    )

    # IMPORTANTE: Usamos 'uid' como USERNAME_FIELD para satisfacer Django.
    # La autenticación real se hace por email+tenant en TenantEmailBackend.
    USERNAME_FIELD = "uid"
    REQUIRED_FIELDS = ["email", "username"]

    # Relación con Tenant (opcional para superusuarios de plataforma)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
        verbose_name="Cliente",
        help_text="Centro de estética al que pertenece este usuario. Null para admins de plataforma.",
    )

    # Información adicional
    phone = models.CharField(max_length=20, blank=True, verbose_name="Teléfono")

    avatar = models.ImageField(upload_to="users/avatars/", null=True, blank=True, verbose_name="Foto de perfil")

    # Roles
    ROLE_CHOICES = [
        ("admin", "Administrador"),
        ("staff", "Empleado"),
        ("customer", "Cliente"),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="customer",
        verbose_name="Rol",
        help_text="Rol del usuario en el sistema",
    )

    # Flag para usuarios creados via guest booking
    is_guest = models.BooleanField(
        default=False,
        verbose_name="¿Es cuenta de invitado?",
        help_text="True si la cuenta fue creada automáticamente al reservar como invitado",
    )

    # Manager personalizado (filtra por tenant + métodos de UserManager)
    objects = TenantAwareUserManager()

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de registro")

    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    # Configuración de Django
    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "email"]),
            models.Index(fields=["tenant", "role"]),
            models.Index(fields=["tenant", "username"]),
        ]
        # Constraints: username y email únicos por tenant
        constraints = [
            models.UniqueConstraint(fields=["tenant", "email"], name="unique_email_per_tenant"),
            models.UniqueConstraint(fields=["tenant", "username"], name="unique_username_per_tenant"),
            # Email único (case-insensitive) entre superadmins de plataforma (tenant IS NULL)
            models.UniqueConstraint(
                Lower("email"),
                condition=models.Q(tenant__isnull=True),
                name="core_user_superadmin_email_uq",
            ),
        ]

    def __str__(self):
        name = self.get_full_name() or self.username
        if self.tenant:
            return f"{name} ({self.tenant.name})"
        return f"{name} (Plataforma)"

    def save(self, *args, **kwargs):
        """
        Generar uid y username automáticamente si no existen.
        - uid: combinación de tenant_slug + email para unicidad global
        - username: generado desde nombre completo, o email si no hay nombre
        - is_staff: sincronizar con role (admin y staff pueden acceder al admin)
        """
        # Generar username automáticamente si no existe
        if not self.username:
            # Prioridad: nombre completo > email
            full_name = self.get_full_name().strip()
            if full_name:
                # Convertir nombre a username válido: "Luis Felipe García" -> "luis_felipe_garcia"
                base_username = slugify(full_name).replace("-", "_")
            elif self.email:
                # Fallback: usar parte local del email
                base_username = self.email.split("@")[0]
            else:
                base_username = "user"

            self.username = base_username[:150]  # Respetar max_length

        # Generar uid automáticamente
        if not self.uid:
            # Formato: tenant_slug:email o admin:email para superusuarios
            tenant_part = self.tenant.slug if self.tenant else "admin"
            self.uid = f"{tenant_part}:{self.email}"

        # Sincronizar is_staff con el rol — SOLO para usuarios de tenant.
        # Para superadmins de plataforma (is_superuser=True o tenant_id IS NULL)
        # se preserva el valor que estableció Django/createsuperuser/caller.
        if not (self.is_superuser or self.tenant_id is None):
            if self.role == "admin":
                self.is_staff = True
            else:
                self.is_staff = False

        super().save(*args, **kwargs)

    def get_role_display_es(self):
        """Obtener rol en español"""
        roles = {"admin": "Administrador", "staff": "Empleado", "customer": "Cliente"}
        return roles.get(self.role, self.role)

    @property
    def is_admin(self):
        """Verificar si el usuario es admin del tenant"""
        return self.role == "admin"

    @property
    def is_staff_member(self):
        """Verificar si el usuario es empleado"""
        return self.role == "staff"

    @property
    def is_customer(self):
        """Verificar si el usuario es cliente"""
        return self.role == "customer"


class SocialAccount(models.Model):
    """
    Cuenta social vinculada a un usuario dentro de un tenant.

    Permite login via Google, Apple o Facebook.
    Un usuario puede tener múltiples cuentas sociales (una por provider).
    """

    PROVIDER_CHOICES = [
        ("google", "Google"),
        ("apple", "Apple"),
        ("facebook", "Facebook"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="social_accounts",
        verbose_name="Usuario",
    )

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="social_accounts",
        verbose_name="Tenant",
    )

    provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
        verbose_name="Proveedor",
    )

    provider_uid = models.CharField(
        max_length=255,
        verbose_name="ID del proveedor",
        help_text="ID único del usuario en el proveedor (sub/id)",
    )

    email = models.EmailField(
        verbose_name="Email del proveedor",
        help_text="Email asociado en la cuenta social",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Datos adicionales",
        help_text="Nombre, avatar, etc. del proveedor",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    class Meta:
        verbose_name = "Cuenta Social"
        verbose_name_plural = "Cuentas Sociales"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "provider", "provider_uid"],
                name="unique_social_account_per_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "provider", "email"]),
        ]

    def __str__(self):
        return f"{self.provider} - {self.email} ({self.user.get_full_name()})"


class Banner(TenantAwareModel):
    """
    Banner promocional configurable desde el admin.

    Permite mostrar mensajes promocionales en el frontend.
    Se puede programar con fechas de inicio y fin.
    """

    # Tipos de banner
    TYPE_CHOICES = [
        ("info", "Informativo"),
        ("promo", "Promoción"),
        ("warning", "Aviso"),
        ("announcement", "Anuncio"),
    ]

    # Posiciones
    POSITION_CHOICES = [
        ("top", "Arriba (encima del header)"),
        ("bottom", "Abajo (encima del footer)"),
    ]

    name = models.CharField(
        max_length=100,
        verbose_name="Nombre interno",
        help_text="Para identificar el banner en el admin (no se muestra al público)",
    )

    message = models.TextField(
        verbose_name="Mensaje",
        help_text="Texto que se mostrará en el banner. Puede incluir HTML básico.",
    )

    link_url = models.URLField(
        blank=True,
        null=True,
        verbose_name="URL del enlace",
        help_text="Si se proporciona, el banner será clickeable",
    )

    link_text = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Texto del enlace",
        help_text="Texto para el botón/enlace (ej: 'Ver más', 'Comprar ahora')",
    )

    banner_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default="promo",
        verbose_name="Tipo de banner",
    )

    position = models.CharField(
        max_length=10,
        choices=POSITION_CHOICES,
        default="top",
        verbose_name="Posición",
    )

    background_color = models.CharField(
        max_length=7,
        default="#3B82F6",
        verbose_name="Color de fondo (hex)",
        help_text="Color de fondo del banner (ej: #3B82F6)",
    )

    text_color = models.CharField(
        max_length=7,
        default="#FFFFFF",
        verbose_name="Color del texto (hex)",
        help_text="Color del texto (ej: #FFFFFF para blanco)",
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="¿Está activo?",
    )

    is_dismissible = models.BooleanField(
        default=True,
        verbose_name="¿Se puede cerrar?",
        help_text="Si está activo, el usuario puede cerrar el banner",
    )

    start_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de inicio",
        help_text="Si se define, el banner solo se mostrará a partir de esta fecha",
    )

    end_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de fin",
        help_text="Si se define, el banner dejará de mostrarse después de esta fecha",
    )

    priority = models.PositiveIntegerField(
        default=0,
        verbose_name="Prioridad",
        help_text="A mayor número, más prioritario. Se muestra primero el de mayor prioridad.",
    )

    rotation_interval = models.PositiveIntegerField(
        default=5000,
        verbose_name="Intervalo de rotación (ms)",
        help_text="Tiempo en milisegundos entre cada rotación de banners. Por defecto: 5000ms (5 segundos)",
    )

    class Meta:
        verbose_name = "Banner Promocional"
        verbose_name_plural = "Banners Promocionales"
        ordering = ["-priority", "-created_at"]

    def __str__(self):
        return f"{self.name} ({self.get_banner_type_display()})"

    @property
    def is_currently_active(self):
        """Verificar si el banner está activo considerando las fechas"""
        from django.utils import timezone

        if not self.is_active:
            return False

        now = timezone.now()

        if self.start_date and now < self.start_date:
            return False

        if self.end_date and now > self.end_date:
            return False

        return True


class PasswordSetToken(models.Model):
    """
    Token para establecer contraseña (usuarios guest).

    Se genera cuando un usuario se registra via guest booking.
    Expira después de 24 horas.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_set_tokens",
        verbose_name="Usuario",
    )

    token = models.CharField(
        max_length=64,
        unique=True,
        verbose_name="Token",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Creado",
    )

    expires_at = models.DateTimeField(
        verbose_name="Expira",
    )

    used_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Usado",
    )

    class Meta:
        verbose_name = "Token de Contraseña"
        verbose_name_plural = "Tokens de Contraseña"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Token para {self.user.email}"

    @property
    def is_valid(self):
        """Verificar si el token es válido (no usado y no expirado)"""
        from django.utils import timezone

        return self.used_at is None and self.expires_at > timezone.now()

    @classmethod
    def create_for_user(cls, user, hours_valid=24):
        """Crear un nuevo token para un usuario"""
        import secrets
        from datetime import timedelta

        from django.utils import timezone

        # Invalidar tokens anteriores
        cls.objects.filter(user=user, used_at__isnull=True).delete()

        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=hours_valid)

        return cls.objects.create(
            user=user,
            token=token,
            expires_at=expires_at,
        )

    def mark_as_used(self):
        """Marcar el token como usado"""
        from django.utils import timezone

        self.used_at = timezone.now()
        self.save()


class OTPToken(models.Model):
    """
    Token OTP (One-Time Password) para verificación de email.

    Se usa para:
    - Restablecer contraseña (forgot password)
    - Reactivar cuenta

    El código es de 6 dígitos y expira después de 10 minutos.
    """

    PURPOSE_CHOICES = [
        ("password_reset", "Restablecer contraseña"),
        ("account_reactivation", "Reactivar cuenta"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="otp_tokens",
        verbose_name="Usuario",
    )

    code = models.CharField(
        max_length=6,
        verbose_name="Código OTP",
        help_text="Código de 6 dígitos",
    )

    purpose = models.CharField(
        max_length=30,
        choices=PURPOSE_CHOICES,
        verbose_name="Propósito",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Creado",
    )

    expires_at = models.DateTimeField(
        verbose_name="Expira",
    )

    used_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Usado",
    )

    attempts = models.PositiveIntegerField(
        default=0,
        verbose_name="Intentos fallidos",
        help_text="Número de intentos incorrectos",
    )

    class Meta:
        verbose_name = "Token OTP"
        verbose_name_plural = "Tokens OTP"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "purpose", "created_at"]),
        ]

    def __str__(self):
        return f"OTP {self.purpose} para {self.user.email}"

    @property
    def is_valid(self):
        """Verificar si el OTP es válido (no usado, no expirado, máx 3 intentos)"""
        from django.utils import timezone

        return self.used_at is None and self.expires_at > timezone.now() and self.attempts < 3

    @classmethod
    def create_for_user(cls, user, purpose, minutes_valid=10):
        """Crear un nuevo OTP para un usuario"""
        import secrets
        from datetime import timedelta

        from django.utils import timezone

        # Invalidar OTPs anteriores del mismo propósito
        cls.objects.filter(user=user, purpose=purpose, used_at__isnull=True).delete()

        # Generar código de 6 dígitos (criptográficamente seguro)
        code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
        expires_at = timezone.now() + timedelta(minutes=minutes_valid)

        return cls.objects.create(
            user=user,
            code=code,
            purpose=purpose,
            expires_at=expires_at,
        )

    def verify(self, code):
        """
        Verificar el código OTP.

        Returns:
            tuple: (success: bool, error_message: str or None)
        """
        from django.utils import timezone

        if self.used_at is not None:
            return False, "Este código ya fue utilizado"

        if self.expires_at < timezone.now():
            return False, "El código ha expirado"

        if self.attempts >= 3:
            return False, "Demasiados intentos fallidos. Solicita un nuevo código"

        if self.code != code:
            self.attempts += 1
            self.save()
            remaining = 3 - self.attempts
            if remaining > 0:
                return False, f"Código incorrecto. Te quedan {remaining} intentos"
            return False, "Demasiados intentos fallidos. Solicita un nuevo código"

        # Código correcto
        self.used_at = timezone.now()
        self.save()
        return True, None

    def mark_as_used(self):
        """Marcar el OTP como usado"""
        from django.utils import timezone

        self.used_at = timezone.now()
        self.save()


class TeamInvitation(TenantAwareModel):
    """
    Invitación para unirse al equipo de un tenant.

    Flujo:
    1. Admin crea invitación → se genera token y se envía email
    2. Invitado abre el link → ve formulario de registro simplificado
    3. Invitado acepta → se crea User con role asignado
    """

    ROLE_CHOICES = [
        ("staff", "Empleado"),
        ("admin", "Administrador"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("accepted", "Aceptada"),
        ("cancelled", "Cancelada"),
        ("expired", "Expirada"),
    ]

    email = models.EmailField(
        verbose_name="Email del invitado",
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="staff",
        verbose_name="Rol asignado",
    )

    token = models.CharField(
        max_length=64,
        unique=True,
        editable=False,
        verbose_name="Token de invitación",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        verbose_name="Estado",
    )

    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_invitations",
        verbose_name="Invitado por",
    )

    expires_at = models.DateTimeField(
        verbose_name="Expira",
    )

    accepted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Aceptada",
    )

    accepted_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_invitation",
        verbose_name="Usuario creado",
    )

    class Meta:
        verbose_name = "Invitación de equipo"
        verbose_name_plural = "Invitaciones de equipo"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "email"],
                condition=models.Q(status="pending"),
                name="unique_pending_invitation_per_tenant",
            ),
        ]

    def __str__(self):
        return f"Invitación a {self.email} ({self.get_status_display()})"

    @property
    def is_valid(self):
        from django.utils import timezone

        if self.status != "pending":
            return False
        if self.expires_at <= timezone.now():
            # Auto-expire the invitation in DB
            self.status = "expired"
            self.save(update_fields=["status", "updated_at"])
            return False
        return True

    @classmethod
    def create_invitation(cls, tenant, email, role, invited_by, days_valid=30):
        import secrets
        from datetime import timedelta

        from django.db import transaction
        from django.utils import timezone

        with transaction.atomic():
            # Cancelar invitaciones pendientes previas al mismo email
            cls.objects.filter(
                tenant=tenant, email__iexact=email, status="pending"
            ).update(status="cancelled")

            token = secrets.token_urlsafe(32)
            expires_at = timezone.now() + timedelta(days=days_valid)

            return cls.objects.create(
                tenant=tenant,
                email=email.lower(),
                role=role,
                token=token,
                invited_by=invited_by,
                expires_at=expires_at,
            )

    def cancel(self):
        self.status = "cancelled"
        self.save(update_fields=["status", "updated_at"])

    def accept(self, user):
        from django.utils import timezone

        self.status = "accepted"
        self.accepted_at = timezone.now()
        self.accepted_user = user
        self.save(update_fields=["status", "accepted_at", "accepted_user", "updated_at"])


# ===================================
# WEBAUTHN / PASSKEYS
# ===================================


class WebAuthnCredential(models.Model):
    """
    Credencial WebAuthn (passkey) registrada por un usuario.

    Un usuario puede tener múltiples passkeys (ej: huella del móvil,
    Face ID del laptop, llave física). Cada credencial es única globalmente
    y está ligada a un usuario específico.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="webauthn_credentials",
        verbose_name="Usuario",
    )

    # credential_id del authenticator — único a nivel global
    credential_id = models.BinaryField(
        unique=True,
        verbose_name="Credential ID",
        help_text="ID binario de la credencial emitido por el authenticator",
    )

    # clave pública para verificar assertions futuras
    public_key = models.BinaryField(
        verbose_name="Public Key",
        help_text="Clave pública COSE de la credencial",
    )

    # contador usado para detectar clonación
    sign_count = models.PositiveBigIntegerField(
        default=0,
        verbose_name="Sign Count",
    )

    # nombre descriptivo dado por el usuario ("iPhone de Felipe", "Yubikey azul")
    name = models.CharField(
        max_length=100,
        default="Mi passkey",
        verbose_name="Nombre",
    )

    # tipo de transporte soportado por el authenticator (internal, usb, nfc, ble)
    transports = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Transports",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado")
    last_used_at = models.DateTimeField(null=True, blank=True, verbose_name="Último uso")

    class Meta:
        verbose_name = "Credencial WebAuthn"
        verbose_name_plural = "Credenciales WebAuthn"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.name}"


# ===================================
# 2FA — TOTP DEVICE
# ===================================
#
# Nota sobre multi-tenancy:
# TOTPDevice NO hereda de TenantAwareModel porque está unido 1:1 al User,
# y el User ya pertenece a un tenant. El dispositivo 2FA es una propiedad
# intrínseca del usuario (como su password), no un recurso de negocio del
# tenant. Además, el User no tiene necesariamente un segundo factor por
# tenant: un mismo email humano puede tener cuentas separadas en distintos
# tenants, pero cada User row tiene su propio TOTPDevice (o ninguno).
#
# Cualquier query debe ir filtrada vía `user=<usuario autenticado>`, lo
# que garantiza aislamiento por usuario (y por tenant, transitivamente).


class TOTPDevice(models.Model):
    """
    Dispositivo TOTP (Time-based One-Time Password) asociado a un usuario.

    El secret se almacena cifrado con Fernet (derivado de SECRET_KEY).
    Los backup codes se almacenan hasheados con make_password y se consumen
    al usarse (one-time).
    """

    user = models.OneToOneField(
        "core.User",
        on_delete=models.CASCADE,
        related_name="totp_device",
        verbose_name="Usuario",
    )
    secret_encrypted = models.BinaryField(
        verbose_name="Secreto TOTP cifrado",
        help_text="Secreto base32 cifrado con Fernet",
    )
    confirmed = models.BooleanField(
        default=False,
        verbose_name="Confirmado",
        help_text="True cuando el usuario ha verificado el primer código",
    )
    backup_codes = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Backup codes hasheados",
        help_text="Lista de hashes (make_password) de los backup codes restantes",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado")
    last_used_at = models.DateTimeField(null=True, blank=True, verbose_name="Último uso")

    class Meta:
        verbose_name = "Dispositivo TOTP"
        verbose_name_plural = "Dispositivos TOTP"

    def __str__(self) -> str:
        estado = "confirmado" if self.confirmed else "pendiente"
        return f"TOTP {estado} de {self.user.email}"

    # ------------------------------------------------------------------
    # Secret (cifrado en reposo)
    # ------------------------------------------------------------------
    def set_secret(self, secret: str) -> None:
        """Cifra y guarda el secreto TOTP en secret_encrypted."""
        from .crypto import encrypt

        self.secret_encrypted = encrypt(secret)

    def get_secret(self) -> str:
        """Descifra y devuelve el secreto TOTP como string."""
        from .crypto import decrypt

        return decrypt(self.secret_encrypted)

    # ------------------------------------------------------------------
    # Verificación TOTP
    # ------------------------------------------------------------------
    def verify_totp(self, code: str) -> bool:
        """Valida un código TOTP de 6 dígitos con tolerancia ±1 step (30s)."""
        import pyotp

        if not code:
            return False
        totp = pyotp.TOTP(self.get_secret())
        return totp.verify(str(code).strip(), valid_window=1)

    # ------------------------------------------------------------------
    # Backup codes
    # ------------------------------------------------------------------
    def generate_backup_codes(self) -> list[str]:
        """
        Genera 8 backup codes (formato XXXX-XXXX, 4+4 chars alfanuméricos
        en mayúsculas), guarda sus hashes en backup_codes y devuelve la
        lista en plaintext para mostrarla una sola vez al usuario.
        """
        import secrets

        from django.contrib.auth.hashers import make_password

        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sin caracteres ambiguos
        plaintext_codes: list[str] = []
        for _ in range(8):
            part1 = "".join(secrets.choice(alphabet) for _ in range(4))
            part2 = "".join(secrets.choice(alphabet) for _ in range(4))
            plaintext_codes.append(f"{part1}-{part2}")

        self.backup_codes = [make_password(code) for code in plaintext_codes]
        self.save(update_fields=["backup_codes"])
        return plaintext_codes

    def verify_backup_code(self, code: str) -> bool:
        """
        Verifica un backup code contra la lista hasheada. Si coincide,
        consume el código (lo elimina de la lista) y guarda.
        """
        from django.contrib.auth.hashers import check_password

        if not code:
            return False
        normalized = str(code).strip().upper()
        for idx, hashed in enumerate(self.backup_codes):
            if check_password(normalized, hashed):
                remaining = list(self.backup_codes)
                remaining.pop(idx)
                self.backup_codes = remaining
                from django.utils import timezone

                self.last_used_at = timezone.now()
                self.save(update_fields=["backup_codes", "last_used_at"])
                return True
        return False
