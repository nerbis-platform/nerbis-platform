# backend/notifications/models.py

from django.db import models
from core.models import TenantAwareModel, User


class Notification(TenantAwareModel):
    """
    Registro de notificaciones enviadas.
    """

    NOTIFICATION_TYPES = [
        ("email", "Email"),
        ("sms", "SMS"),
        ("whatsapp", "WhatsApp"),
        ("push", "Push Notification"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("sent", "Enviado"),
        ("failed", "Fallido"),
        ("delivered", "Entregado"),
        ("read", "Leído"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications", verbose_name="Usuario")

    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, verbose_name="Tipo")

    subject = models.CharField(max_length=255, blank=True, verbose_name="Asunto")

    message = models.TextField(verbose_name="Mensaje")

    recipient = models.CharField(
        max_length=255, verbose_name="Destinatario", help_text="Email, teléfono o device token"
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", verbose_name="Estado")

    sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Enviado en")

    delivered_at = models.DateTimeField(null=True, blank=True, verbose_name="Entregado en")

    error_message = models.TextField(blank=True, verbose_name="Mensaje de error")

    # Metadata
    metadata = models.JSONField(
        default=dict, blank=True, verbose_name="Metadata", help_text="Datos adicionales (order_id, appointment_id, etc)"
    )

    class Meta:
        verbose_name = "Notificación"
        verbose_name_plural = "Notificaciones"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "user"]),
            models.Index(fields=["notification_type", "status"]),
            models.Index(fields=["sent_at"]),
        ]

    def __str__(self):
        return f"{self.get_notification_type_display()} - {self.user.email} - {self.get_status_display()}"

    def mark_as_sent(self):
        """Marcar como enviado"""
        from django.utils import timezone

        self.status = "sent"
        self.sent_at = timezone.now()
        self.save()

    def mark_as_delivered(self):
        """Marcar como entregado"""
        from django.utils import timezone

        self.status = "delivered"
        self.delivered_at = timezone.now()
        self.save()

    def mark_as_failed(self, error_message):
        """Marcar como fallido"""
        self.status = "failed"
        self.error_message = error_message
        self.save()
