# backend/services/models.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from core.models import TenantAwareModel, User
from decimal import Decimal


class ServiceCategory(TenantAwareModel):
    """
    Categorías de servicios del centro de estética.

    Ejemplos:
    - Tratamientos Faciales
    - Tratamientos Corporales
    - Depilación
    - Masajes
    - Manicura y Pedicura
    """

    name = models.CharField(max_length=200, verbose_name="Nombre de la categoría")

    slug = models.SlugField(max_length=220, blank=True, verbose_name="Slug")

    description = models.TextField(blank=True, verbose_name="Descripción")

    image = models.ImageField(
        upload_to="services/categories/", null=True, blank=True, verbose_name="Imagen de la categoría"
    )

    icon = models.CharField(
        max_length=100, blank=True, verbose_name="Icono", help_text="Nombre del icono (ej: 'spa', 'face', 'massage')"
    )

    is_active = models.BooleanField(default=True, verbose_name="¿Está activa?")

    order = models.IntegerField(default=0, verbose_name="Orden de visualización")

    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name="Rating promedio",
    )

    reviews_count = models.PositiveIntegerField(default=0, verbose_name="Cantidad de reviews")

    class Meta:
        verbose_name = "Categoría de Servicio"
        verbose_name_plural = "Categorías de Servicios"
        ordering = ["order", "name"]
        unique_together = [["tenant", "slug"]]
        indexes = [
            models.Index(fields=["tenant", "is_active"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_services_count(self):
        """Contar servicios activos en esta categoría"""
        return self.services.filter(is_active=True).count()


class Service(TenantAwareModel):
    """
    Servicios que ofrece el centro de estética.

    Ejemplos:
    - Limpieza Facial Profunda - 60 min - €45
    - Masaje Relajante de Espalda - 30 min - €30
    - Depilación Láser Piernas Completas - 45 min - €80
    """

    # Información básica
    name = models.CharField(max_length=300, verbose_name="Nombre del servicio")

    slug = models.SlugField(max_length=320, blank=True, verbose_name="Slug")

    category = models.ForeignKey(
        ServiceCategory, on_delete=models.PROTECT, related_name="services", verbose_name="Categoría"
    )

    # Imagen
    image = models.ImageField(
        upload_to="services/images/",
        null=True,
        blank=True,
        verbose_name="Imagen del servicio",
        help_text="Imagen representativa del servicio (recomendado: 800x600px)",
    )

    # Descripción
    short_description = models.TextField(max_length=500, blank=True, verbose_name="Descripción corta")

    description = models.TextField(blank=True, verbose_name="Descripción completa")

    # Duración y precio
    duration_minutes = models.IntegerField(
        validators=[MinValueValidator(5), MaxValueValidator(480)],
        verbose_name="Duración (minutos)",
        help_text="Duración del servicio en minutos (5-480)",
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Precio",
        help_text="Precio del servicio",
    )

    # Configuración
    requires_deposit = models.BooleanField(
        default=False, verbose_name="¿Requiere depósito?", help_text="Si requiere pago adelantado para reservar"
    )

    deposit_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Monto del depósito",
    )

    max_advance_booking_days = models.IntegerField(
        default=90,
        validators=[MinValueValidator(1)],
        verbose_name="Días máximos de anticipación",
        help_text="Cuántos días adelante se puede reservar",
    )

    min_advance_booking_hours = models.IntegerField(
        default=2,
        validators=[MinValueValidator(0)],
        verbose_name="Horas mínimas de anticipación",
        help_text="Cuántas horas antes se debe reservar",
    )

    # Personal
    assigned_staff = models.ManyToManyField(
        "StaffMember",
        related_name="services",
        blank=True,
        verbose_name="Personal asignado",
        help_text="Empleados que pueden realizar este servicio",
    )

    # Estado
    is_active = models.BooleanField(
        default=True, verbose_name="¿Está activo?", help_text="Servicio visible para clientes"
    )

    is_featured = models.BooleanField(
        default=False, verbose_name="¿Es destacado?", help_text="Mostrar en servicios destacados"
    )

    # Reviews
    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        verbose_name="Rating promedio",
    )

    reviews_count = models.PositiveIntegerField(default=0, verbose_name="Cantidad de reviews")

    # SEO
    meta_title = models.CharField(max_length=200, blank=True, verbose_name="Meta título")

    meta_description = models.TextField(max_length=320, blank=True, verbose_name="Meta descripción")

    class Meta:
        verbose_name = "Servicio"
        verbose_name_plural = "Servicios"
        ordering = ["-is_featured", "name"]
        unique_together = [["tenant", "slug"]]
        indexes = [
            models.Index(fields=["tenant", "is_active", "category"]),
            models.Index(fields=["tenant", "is_featured"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.duration_minutes}min - €{self.price}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def duration_hours(self):
        """Duración en horas (decimal)"""
        if self.duration_minutes is None:
            return None
        return self.duration_minutes / 60

    @property
    def formatted_duration(self):
        """Duración formateada (ej: 1h 30min)"""
        if self.duration_minutes is None:
            return "-"
        hours = self.duration_minutes // 60
        minutes = self.duration_minutes % 60

        if hours > 0 and minutes > 0:
            return f"{hours}h {minutes}min"
        elif hours > 0:
            return f"{hours}h"
        else:
            return f"{minutes}min"


class StaffMember(TenantAwareModel):
    """
    Personal del centro de estética que puede dar servicios.

    Un StaffMember está vinculado a un User con role='staff'.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="staff_profile",
        verbose_name="Usuario",
        limit_choices_to={"role": "staff"},
    )

    # Información profesional
    position = models.CharField(
        max_length=200, blank=True, verbose_name="Cargo", help_text="Ej: Esteticista Senior, Masajista, etc."
    )

    bio = models.TextField(blank=True, verbose_name="Biografía", help_text="Descripción profesional del empleado")

    photo = models.ImageField(upload_to="staff/photos/", null=True, blank=True, verbose_name="Foto")

    # Especialidades
    specialties = models.ManyToManyField(
        ServiceCategory,
        related_name="specialists",
        blank=True,
        verbose_name="Especialidades",
        help_text="Categorías en las que se especializa",
    )

    # Disponibilidad
    is_available = models.BooleanField(
        default=True, verbose_name="¿Está disponible?", help_text="Si está aceptando citas actualmente"
    )

    accepts_new_clients = models.BooleanField(default=True, verbose_name="¿Acepta nuevos clientes?")

    # Orden y destacado
    order = models.IntegerField(default=0, verbose_name="Orden de visualización")

    is_featured = models.BooleanField(
        default=False, verbose_name="¿Es destacado?", help_text="Mostrar primero en listados"
    )

    class Meta:
        verbose_name = "Miembro del Staff"
        verbose_name_plural = "Miembros del Staff"
        ordering = ["-is_featured", "order", "user__first_name"]
        indexes = [
            models.Index(fields=["tenant", "is_available"]),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.position}"

    @property
    def full_name(self):
        """Nombre completo del staff member"""
        return self.user.get_full_name()

    @property
    def email(self):
        """Email del staff member"""
        return self.user.email

    def get_services(self):
        """Obtener servicios que puede realizar"""
        return self.services.filter(is_active=True)
