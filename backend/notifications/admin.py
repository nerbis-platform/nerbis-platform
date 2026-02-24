# backend/notifications/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin para notificaciones"""

    list_display = [
        "id",
        "user",
        "notification_type",
        "recipient",
        "subject_display",
        "status_badge",
        "sent_at",
        "created_at",
    ]

    list_filter = [
        "notification_type",
        "status",
        "tenant",
        "created_at",
        "sent_at",
    ]

    search_fields = [
        "user__email",
        "recipient",
        "subject",
        "message",
    ]

    readonly_fields = [
        "sent_at",
        "delivered_at",
        "created_at",
        "updated_at",
    ]

    fieldsets = (
        (
            "Información General",
            {
                "fields": (
                    "tenant",
                    "user",
                    "notification_type",
                    "recipient",
                )
            },
        ),
        (
            "Contenido",
            {
                "fields": (
                    "subject",
                    "message",
                )
            },
        ),
        (
            "Estado",
            {
                "fields": (
                    "status",
                    "sent_at",
                    "delivered_at",
                    "error_message",
                )
            },
        ),
        ("Metadata", {"fields": ("metadata",), "classes": ("collapse",)}),
    )

    def subject_display(self, obj):
        if obj.subject:
            return obj.subject[:50] + "..." if len(obj.subject) > 50 else obj.subject
        return "-"

    subject_display.short_description = "Asunto"

    def status_badge(self, obj):
        colors = {
            "pending": "#f59e0b",
            "sent": "#3b82f6",
            "delivered": "#10b981",
            "failed": "#ef4444",
            "read": "#8b5cf6",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Estado"
