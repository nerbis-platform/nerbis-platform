# backend/notifications/tasks.py

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from bookings.models import Appointment

from .utils import send_email, send_whatsapp

logger = logging.getLogger(__name__)


@shared_task
def send_order_confirmation_email(order_id):
    """
    Enviar email de confirmación de orden.
    """
    from orders.models import Order

    try:
        order = (
            Order.objects.select_related("customer", "tenant")
            .prefetch_related("product_items__product", "service_items__service", "service_items__appointment")
            .get(id=order_id)
        )

        send_email(
            user=order.customer,
            subject=f"Orden Confirmada - {order.order_number}",
            template_name="order_confirmation",
            context={"order": order, "metadata": {"order_id": order.id}},
        )

        logger.info(f"Email de confirmación enviado para orden {order.order_number}")

    except Exception as e:
        logger.error(f"Error enviando email de orden {order_id}: {str(e)}")
        raise


@shared_task
def send_payment_confirmation_email(order_id):
    """
    Enviar email de confirmación de pago.
    """
    from orders.models import Order

    try:
        order = (
            Order.objects.select_related("customer", "tenant")
            .prefetch_related("product_items__product", "service_items__service", "service_items__appointment")
            .get(id=order_id)
        )

        send_email(
            user=order.customer,
            subject=f"Pago Confirmado - {order.order_number}",
            template_name="payment_confirmation",
            context={"order": order, "metadata": {"order_id": order.id}},
        )

        logger.info(f"Email de pago confirmado enviado para orden {order.order_number}")

    except Exception as e:
        logger.error(f"Error enviando email de pago {order_id}: {str(e)}")
        raise


@shared_task
def send_appointment_confirmation_email(appointment_id):
    """
    Enviar email de confirmación de cita.
    """

    try:
        appointment = Appointment.objects.select_related("customer", "service", "staff_member__user", "tenant").get(
            id=appointment_id
        )

        send_email(
            user=appointment.customer,
            subject=f"Cita Confirmada - {appointment.service.name}",
            template_name="appointment_confirmation",
            context={"appointment": appointment, "metadata": {"appointment_id": appointment.id}},
        )

        logger.info(f"Email de confirmación enviado para cita {appointment.id}")

    except Exception as e:
        logger.error(f"Error enviando email de cita {appointment_id}: {str(e)}")
        raise


@shared_task
def send_appointment_reminder_email(appointment_id):
    """
    Enviar email de recordatorio de cita (24h antes).
    """

    try:
        appointment = Appointment.objects.select_related("customer", "service", "staff_member__user", "tenant").get(
            id=appointment_id
        )

        send_email(
            user=appointment.customer,
            subject="Recordatorio - Cita mañana",
            template_name="appointment_reminder",
            context={"appointment": appointment, "metadata": {"appointment_id": appointment.id}},
        )

        logger.info(f"Recordatorio enviado para cita {appointment.id}")

    except Exception as e:
        logger.error(f"Error enviando recordatorio de cita {appointment_id}: {str(e)}")
        raise


@shared_task
def send_appointment_reminder_whatsapp(appointment_id):
    """
    Enviar recordatorio de cita por WhatsApp (2h antes).
    """

    try:
        appointment = Appointment.objects.select_related("customer", "service", "staff_member__user", "tenant").get(
            id=appointment_id
        )

        message = f"""
🔔 Recordatorio de Cita

Hola {appointment.customer.first_name},

Tu cita es HOY:
📅 {appointment.start_datetime.strftime("%H:%M")}
💆 {appointment.service.name}
👤 Con {appointment.staff_member.full_name}

Te esperamos!

{appointment.tenant.name}
{appointment.tenant.address}
        """.strip()

        send_whatsapp(user=appointment.customer, message=message)

        logger.info(f"WhatsApp recordatorio enviado para cita {appointment.id}")

    except Exception as e:
        logger.error(f"Error enviando WhatsApp de cita {appointment_id}: {str(e)}")


@shared_task
def send_appointment_reminders():
    """
    Tarea programada: Enviar recordatorios de citas.

    - Email: 24 horas antes
    - WhatsApp: 2 horas antes
    """

    now = timezone.now()

    # Recordatorios por email (24h antes)
    email_time = now + timedelta(hours=24)
    email_start = email_time - timedelta(minutes=30)
    email_end = email_time + timedelta(minutes=30)

    appointments_email = Appointment.objects.filter(
        status__in=["pending", "confirmed"], start_datetime__range=[email_start, email_end], reminder_sent=False
    )

    logger.info(f"Enviando {appointments_email.count()} recordatorios por email")

    for appointment in appointments_email:
        send_appointment_reminder_email.delay(appointment.id)
        appointment.reminder_sent = True
        appointment.save()

    # Recordatorios por WhatsApp (2h antes)
    whatsapp_time = now + timedelta(hours=2)
    whatsapp_start = whatsapp_time - timedelta(minutes=30)
    whatsapp_end = whatsapp_time + timedelta(minutes=30)

    appointments_whatsapp = Appointment.objects.filter(
        status__in=["pending", "confirmed"],
        start_datetime__range=[whatsapp_start, whatsapp_end],
        reminder_sent=True,  # Ya se envió email
    )

    logger.info(f"Enviando {appointments_whatsapp.count()} recordatorios por WhatsApp")

    for appointment in appointments_whatsapp:
        send_appointment_reminder_whatsapp.delay(appointment.id)


@shared_task
def send_appointment_cancelled_email(appointment_id):
    """
    Enviar email de cancelación de cita.
    """

    try:
        appointment = Appointment.objects.select_related("customer", "service", "staff_member__user", "tenant").get(
            id=appointment_id
        )

        send_email(
            user=appointment.customer,
            subject=f"Cita Cancelada - {appointment.service.name}",
            template_name="appointment_cancelled",
            context={"appointment": appointment, "metadata": {"appointment_id": appointment.id}},
        )

        logger.info(f"Email de cancelación enviado para cita {appointment.id}")

    except Exception as e:
        logger.error(f"Error enviando email de cancelación {appointment_id}: {str(e)}")
        raise


@shared_task
def send_welcome_email(user_id):
    """
    Enviar email de bienvenida al registrar un nuevo usuario.
    """
    from core.models import User

    try:
        user = User.objects.select_related("tenant").get(id=user_id)

        send_email(
            user=user,
            subject=f"Bienvenido a {user.tenant.name if user.tenant else 'NERBIS'}",
            template_name="welcome",
            context={"metadata": {"user_id": user.id}},
        )

        logger.info(f"Email de bienvenida enviado a {user.email}")

    except Exception as e:
        logger.error(f"Error enviando email de bienvenida a usuario {user_id}: {str(e)}")
        raise


@shared_task
def send_otp_email(user_id, otp_code, purpose):
    """
    Enviar email con código OTP.

    Args:
        user_id: ID del usuario
        otp_code: Código OTP de 8 dígitos
        purpose: 'password_reset' o 'account_reactivation'
    """
    from core.models import User

    try:
        user = User.objects.select_related("tenant").get(id=user_id)

        # Determinar asunto y template según propósito
        if purpose == "password_reset":
            subject = "Código de verificación - Restablecer contraseña"
            template_name = "otp_password_reset"
        elif purpose == "account_reactivation":
            subject = "Código de verificación - Reactivar cuenta"
            template_name = "otp_account_reactivation"
        else:
            subject = "Código de verificación"
            template_name = "otp_generic"

        send_email(
            user=user,
            subject=subject,
            template_name=template_name,
            context={"otp_code": otp_code, "purpose": purpose, "metadata": {"user_id": user.id, "purpose": purpose}},
        )

        logger.info(f"OTP email enviado a {user.email} para {purpose}")

    except Exception as e:
        logger.error(f"Error enviando OTP email a usuario {user_id}: {str(e)}")
        raise
