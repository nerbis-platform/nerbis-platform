# backend/bookings/admin.py

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils import timezone
from .models import BusinessHours, TimeOff, Appointment
from core.admin_site import nerbis_admin_site
from core.admin import BookingsModuleAdmin


@admin.register(BusinessHours, site=nerbis_admin_site)
class BusinessHoursAdmin(BookingsModuleAdmin):
    """Admin para horarios de negocio"""

    list_display = [
        "day_of_week_display",
        "tenant",
        "hours_display",
        "is_open_badge",
    ]

    list_filter = [
        "is_open",
        "tenant",
        "day_of_week",
    ]

    ordering = ["tenant", "day_of_week"]

    def day_of_week_display(self, obj):
        return obj.get_day_of_week_display()

    day_of_week_display.short_description = "Día"

    def hours_display(self, obj):
        if obj.is_open:
            return f"{obj.open_time.strftime('%H:%M')} - {obj.close_time.strftime('%H:%M')}"
        return "-"

    hours_display.short_description = "Horario"

    def is_open_badge(self, obj):
        if obj.is_open:
            return mark_safe(
                '<span style="background-color: #10b981; color: white; padding: 3px 10px; border-radius: 3px;">Abierto</span>'
            )
        return mark_safe(
            '<span style="background-color: #6b7280; color: white; padding: 3px 10px; border-radius: 3px;">Cerrado</span>'
        )

    is_open_badge.short_description = "Estado"


@admin.register(TimeOff, site=nerbis_admin_site)
class TimeOffAdmin(BookingsModuleAdmin):
    """Admin para tiempos libres"""

    list_display = [
        "date_display",
        "staff_member",
        "tenant",
        "reason",
        "duration_display",
    ]

    list_filter = [
        "tenant",
        "staff_member",
        "is_recurring",
        "start_datetime",
    ]

    search_fields = [
        "reason",
        "staff_member__user__first_name",
        "staff_member__user__last_name",
    ]

    date_hierarchy = "start_datetime"

    def date_display(self, obj):
        return obj.start_datetime.strftime("%d/%m/%Y")

    date_display.short_description = "Fecha"

    def duration_display(self, obj):
        delta = obj.end_datetime - obj.start_datetime
        hours = delta.total_seconds() / 3600
        if hours < 24:
            return f"{int(hours)}h"
        days = int(hours / 24)
        return f"{days} días"

    duration_display.short_description = "Duración"


@admin.register(Appointment, site=nerbis_admin_site)
class AppointmentAdmin(BookingsModuleAdmin):
    """Admin para citas"""

    list_display = [
        "datetime_display",
        "customer_display",
        "staff_member",
        "service",
        "tenant",
        "status_badge",
        "payment_status",
    ]

    list_filter = [
        "status",
        "is_paid",
        "tenant",
        "staff_member",
        "service__category",
        "start_datetime",
    ]

    search_fields = [
        "customer__first_name",
        "customer__last_name",
        "customer__email",
        "service__name",
        "notes",
    ]

    date_hierarchy = "start_datetime"

    readonly_fields = [
        "created_at",
        "updated_at",
        "duration_minutes",
        "cancelled_at",
        "reminder_sent_at",
    ]

    fieldsets = (
        (
            "Información de la Cita",
            {
                "fields": (
                    "tenant",
                    "customer",
                    "staff_member",
                    "service",
                )
            },
        ),
        (
            "Fecha y Hora",
            {
                "fields": (
                    "start_datetime",
                    "end_datetime",
                    "duration_minutes",
                )
            },
        ),
        ("Estado", {"fields": ("status",)}),
        (
            "Notas",
            {
                "fields": (
                    "notes",
                    "internal_notes",
                )
            },
        ),
        (
            "Pago",
            {
                "fields": (
                    "requires_payment",
                    "is_paid",
                    "paid_amount",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Recordatorios",
            {
                "fields": (
                    "reminder_sent",
                    "reminder_sent_at",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Cancelación",
            {
                "fields": (
                    "cancelled_at",
                    "cancellation_reason",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def datetime_display(self, obj):
        return obj.start_datetime.strftime("%d/%m/%Y %H:%M")

    datetime_display.short_description = "Fecha/Hora"

    def customer_display(self, obj):
        return obj.customer.get_full_name()

    customer_display.short_description = "Cliente"

    def status_badge(self, obj):
        colors = {
            "pending": "#f59e0b",  # Naranja
            "confirmed": "#3b82f6",  # Azul
            "in_progress": "#8b5cf6",  # Púrpura
            "completed": "#10b981",  # Verde
            "cancelled": "#ef4444",  # Rojo
            "no_show": "#6b7280",  # Gris
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Estado"

    def payment_status(self, obj):
        if obj.is_paid:
            return mark_safe('<span style="color: #10b981; font-weight: bold;">✓ Pagado</span>')
        elif obj.requires_payment:
            return mark_safe('<span style="color: #ef4444; font-weight: bold;">✗ Pendiente</span>')
        return "-"

    payment_status.short_description = "Pago"

    actions = ["mark_as_confirmed", "mark_as_completed", "mark_as_cancelled"]

    def mark_as_confirmed(self, request, queryset):
        queryset.update(status="confirmed")
        self.message_user(request, f"{queryset.count()} citas confirmadas")

    mark_as_confirmed.short_description = "Marcar como confirmadas"

    def mark_as_completed(self, request, queryset):
        queryset.update(status="completed")
        self.message_user(request, f"{queryset.count()} citas completadas")

    mark_as_completed.short_description = "Marcar como completadas"

    def mark_as_cancelled(self, request, queryset):
        queryset.update(status="cancelled", cancelled_at=timezone.now())
        self.message_user(request, f"{queryset.count()} citas canceladas")

    mark_as_cancelled.short_description = "Cancelar citas"
