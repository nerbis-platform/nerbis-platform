# backend/bookings/models.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime, timedelta, time
from core.models import TenantAwareModel, User
from services.models import Service, StaffMember


class BusinessHours(TenantAwareModel):
    """
    Horarios de atención del negocio.

    Define cuándo está abierto el centro de estética cada día de la semana.
    """

    DAYS_OF_WEEK = [
        (0, "Lunes"),
        (1, "Martes"),
        (2, "Miércoles"),
        (3, "Jueves"),
        (4, "Viernes"),
        (5, "Sábado"),
        (6, "Domingo"),
    ]

    day_of_week = models.IntegerField(
        choices=DAYS_OF_WEEK, validators=[MinValueValidator(0), MaxValueValidator(6)], verbose_name="Día de la semana"
    )

    open_time = models.TimeField(
        null=True,
        blank=True,
        verbose_name="Hora de apertura",
        help_text="Hora en que abre el negocio (ej: 09:00). Dejar vacío si está cerrado."
    )

    close_time = models.TimeField(
        null=True,
        blank=True,
        verbose_name="Hora de cierre",
        help_text="Hora en que cierra el negocio (ej: 18:00). Dejar vacío si está cerrado."
    )

    is_open = models.BooleanField(default=True, verbose_name="¿Está abierto?", help_text="Si el negocio abre este día")

    class Meta:
        verbose_name = "Horario de Negocio"
        verbose_name_plural = "Horarios de Negocio"
        ordering = ["day_of_week"]
        unique_together = [["tenant", "day_of_week"]]
        indexes = [
            models.Index(fields=["tenant", "is_open"]),
        ]

    def __str__(self):
        day_name = self.get_day_of_week_display()
        if self.is_open:
            return f"{day_name}: {self.open_time.strftime('%H:%M')} - {self.close_time.strftime('%H:%M')}"
        return f"{day_name}: Cerrado"

    def clean(self):
        """Validar horarios"""
        if self.is_open:
            if not self.open_time or not self.close_time:
                raise ValidationError("Debe especificar hora de apertura y cierre si está abierto")
            if self.close_time <= self.open_time:
                raise ValidationError({"close_time": "La hora de cierre debe ser después de la hora de apertura"})


class TimeOff(TenantAwareModel):
    """
    Días libres, vacaciones, festivos.

    Puede ser para todo el negocio o para un staff member específico.
    """

    staff_member = models.ForeignKey(
        StaffMember,
        on_delete=models.CASCADE,
        related_name="time_offs",
        null=True,
        blank=True,
        verbose_name="Miembro del staff",
        help_text="Dejar vacío si aplica a todo el negocio",
    )

    start_datetime = models.DateTimeField(verbose_name="Inicio", help_text="Fecha y hora de inicio del tiempo libre")

    end_datetime = models.DateTimeField(verbose_name="Fin", help_text="Fecha y hora de fin del tiempo libre")

    reason = models.CharField(
        max_length=200, blank=True, verbose_name="Motivo", help_text="Ej: Vacaciones, Feriado, Capacitación"
    )

    is_recurring = models.BooleanField(
        default=False, verbose_name="¿Es recurrente?", help_text="Para festivos anuales (ej: Navidad)"
    )

    class Meta:
        verbose_name = "Tiempo Libre"
        verbose_name_plural = "Tiempos Libres"
        ordering = ["-start_datetime"]
        indexes = [
            models.Index(fields=["tenant", "start_datetime", "end_datetime"]),
            models.Index(fields=["tenant", "staff_member"]),
        ]

    def __str__(self):
        if self.staff_member:
            return f"{self.staff_member.full_name} - {self.start_datetime.strftime('%d/%m/%Y')} - {self.reason}"
        return f"Todo el negocio - {self.start_datetime.strftime('%d/%m/%Y')} - {self.reason}"

    def clean(self):
        """Validar que end_datetime sea después de start_datetime"""
        if self.end_datetime <= self.start_datetime:
            raise ValidationError({"end_datetime": "La fecha de fin debe ser después de la fecha de inicio"})


class Appointment(TenantAwareModel):
    """
    Cita agendada por un cliente.

    Relaciona: Cliente + Staff Member + Servicio + Fecha/Hora
    """

    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("confirmed", "Confirmada"),
        ("in_progress", "En Progreso"),
        ("completed", "Completada"),
        ("cancelled", "Cancelada"),
        ("expired", "Expirada"),
        ("no_show", "No Asistió"),
    ]

    # Relaciones
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="appointments",
        verbose_name="Cliente",
        limit_choices_to={"role": "customer"},
    )

    staff_member = models.ForeignKey(
        StaffMember, on_delete=models.PROTECT, related_name="appointments", verbose_name="Miembro del staff"
    )

    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="appointments", verbose_name="Servicio")

    # Fecha y hora
    start_datetime = models.DateTimeField(verbose_name="Fecha y hora de inicio")

    end_datetime = models.DateTimeField(verbose_name="Fecha y hora de fin")

    # Estado
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", verbose_name="Estado")

    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Expira en",
        help_text="Fecha de expiración para reservas temporales",
    )

    # Notas
    notes = models.TextField(blank=True, verbose_name="Notas", help_text="Notas o instrucciones especiales del cliente")

    internal_notes = models.TextField(
        blank=True, verbose_name="Notas internas", help_text="Notas del staff (no visibles para el cliente)"
    )

    # Pago
    requires_payment = models.BooleanField(
        default=False, verbose_name="¿Requiere pago?", help_text="Si se debe pagar al agendar"
    )

    is_paid = models.BooleanField(default=False, verbose_name="¿Está pagado?")

    paid_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Monto pagado"
    )

    # Recordatorios
    reminder_sent = models.BooleanField(default=False, verbose_name="¿Recordatorio enviado?")

    reminder_sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Recordatorio enviado en")

    # Cancelación
    cancelled_at = models.DateTimeField(null=True, blank=True, verbose_name="Cancelado en")

    cancellation_reason = models.TextField(blank=True, verbose_name="Motivo de cancelación")

    class Meta:
        verbose_name = "Cita"
        verbose_name_plural = "Citas"
        ordering = ["-start_datetime"]
        indexes = [
            models.Index(fields=["tenant", "start_datetime", "status"]),
            models.Index(fields=["tenant", "customer"]),
            models.Index(fields=["tenant", "staff_member", "start_datetime"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def __str__(self):
        return (
            f"{self.customer.get_full_name()} - {self.service.name} - {self.start_datetime.strftime('%d/%m/%Y %H:%M')}"
        )

    def save(self, *args, **kwargs):
        """Calcular end_datetime automáticamente si no está definido"""
        if not self.end_datetime and self.start_datetime and self.service:
            self.end_datetime = self.start_datetime + timedelta(minutes=self.service.duration_minutes)
        super().save(*args, **kwargs)

    def clean(self):
        """Validaciones antes de guardar"""
        errors = {}

        # Validar que end_datetime sea después de start_datetime
        if self.end_datetime and self.end_datetime <= self.start_datetime:
            errors["end_datetime"] = "La hora de fin debe ser después de la hora de inicio"

        # Validar que no haya conflicto con otras citas del mismo staff
        # Solo validar si tenemos tenant asignado (puede no estar asignado aún en el admin)
        if self.staff_member and self.start_datetime and self.tenant_id:
            now = timezone.now()
            conflicting_appointments = (
                Appointment.objects.filter(
                    tenant=self.tenant,
                    staff_member=self.staff_member,
                )
                .exclude(pk=self.pk)
                .filter(start_datetime__lt=self.end_datetime, end_datetime__gt=self.start_datetime)
                .filter(
                    models.Q(status__in=["confirmed", "in_progress"])
                    | models.Q(status="pending", expires_at__gt=now)
                    | models.Q(status="pending", expires_at__isnull=True)
                )
            )

            if conflicting_appointments.exists():
                errors["start_datetime"] = "El staff member ya tiene una cita en este horario"

        if errors:
            raise ValidationError(errors)

    @property
    def duration_minutes(self):
        """Duración de la cita en minutos"""
        if self.end_datetime and self.start_datetime:
            delta = self.end_datetime - self.start_datetime
            return int(delta.total_seconds() / 60)
        return 0

    @property
    def is_upcoming(self):
        """Verificar si la cita es futura"""
        return self.start_datetime > timezone.now()

    @property
    def is_past(self):
        """Verificar si la cita ya pasó"""
        if not self.end_datetime:
            return False
        return self.end_datetime < timezone.now()

    @property
    def can_cancel(self):
        """Verificar si se puede cancelar (al menos 2 horas antes)"""
        if self.status in ["cancelled", "completed", "expired"]:
            return False
        if not self.service or not self.start_datetime:
            return False
        hours_until_appointment = (self.start_datetime - timezone.now()).total_seconds() / 3600
        return hours_until_appointment >= self.service.min_advance_booking_hours

    def cancel(self, reason=""):
        """Cancelar la cita"""
        self.status = "cancelled"
        self.cancelled_at = timezone.now()
        self.cancellation_reason = reason
        self.save()

    def confirm(self):
        """Confirmar la cita"""
        self.status = "confirmed"
        self.expires_at = None
        self.save()

    def start(self):
        """Iniciar servicio (cliente llegó)"""
        self.status = "in_progress"
        self.save()

    def complete(self):
        """Marcar como completada"""
        self.status = "completed"
        self.save()

    def mark_no_show(self):
        """Marcar como no asistió"""
        self.status = "no_show"
        self.save()

    @property
    def is_expired(self):
        """Verificar si la reserva temporal ha expirado"""
        if self.status != "pending" or not self.expires_at:
            return False
        return self.expires_at <= timezone.now()
