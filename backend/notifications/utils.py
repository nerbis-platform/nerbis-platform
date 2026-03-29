# backend/notifications/utils.py

import logging
from email.mime.image import MIMEImage
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from twilio.rest import Client

from .models import Notification

logger = logging.getLogger(__name__)


def send_email(user, subject, template_name, context=None, recipient_email=None):
    """
    Enviar email usando template HTML.

    Args:
        user: Usuario destinatario
        subject: Asunto del email
        template_name: Nombre del template (sin .html)
        context: Contexto adicional para el template
        recipient_email: Email alternativo (si no es el del usuario)

    Returns:
        Notification object
    """

    if context is None:
        context = {}

    # Agregar datos del tenant y usuario al contexto
    context.update(
        {
            "user": user,
            "tenant_name": user.tenant.name if user.tenant else settings.DEFAULT_FROM_NAME,
            "tenant_email": user.tenant.email if user.tenant else settings.DEFAULT_FROM_EMAIL,
            "tenant_phone": user.tenant.phone if user.tenant else "",
            "tenant_address": user.tenant.address if user.tenant else "",
            "tenant_city": user.tenant.city if user.tenant else "",
            "frontend_url": settings.FRONTEND_URL if hasattr(settings, "FRONTEND_URL") else "http://localhost:3000",
        }
    )

    # Recipient
    to_email = recipient_email or user.email

    # Crear registro de notificación
    notification = Notification.objects.create(
        tenant=user.tenant,
        user=user,
        notification_type="email",
        subject=subject,
        message=f"Email template: {template_name}",
        recipient=to_email,
        status="pending",
        metadata=context.get("metadata", {}),
    )

    try:
        # Renderizar template
        html_content = render_to_string(f"emails/{template_name}.html", context)
        text_content = f"{subject}\n\nVer en tu cliente de email para mejor visualización."

        # Crear email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=f"{settings.DEFAULT_FROM_NAME} <{settings.DEFAULT_FROM_EMAIL}>",
            to=[to_email],
        )
        email.attach_alternative(html_content, "text/html")

        # Adjuntar logo como imagen inline si el template lo referencia
        if "cid:nerbis-logo" in html_content:
            logo_path = Path(settings.BASE_DIR) / "static" / "branding" / "nerbis_logo.png"
            if logo_path.exists():
                with open(logo_path, "rb") as f:
                    logo = MIMEImage(f.read(), _subtype="png")
                    logo.add_header("Content-ID", "<nerbis-logo>")
                    logo.add_header("Content-Disposition", "inline", filename="nerbis-logo.png")
                    email.attach(logo)

        # Enviar
        email.send(fail_silently=False)

        # Marcar como enviado
        notification.mark_as_sent()

        logger.info(f"Email enviado a {to_email}: {subject}")
        return notification

    except Exception as e:
        # Marcar como fallido
        notification.mark_as_failed(str(e))
        logger.error(f"Error enviando email a {to_email}: {str(e)}")
        raise


def send_whatsapp(user, message, phone=None):
    """
    Enviar mensaje por WhatsApp usando Twilio.

    Args:
        user: Usuario destinatario
        message: Mensaje a enviar
        phone: Teléfono alternativo

    Returns:
        Notification object
    """

    if not settings.TWILIO_ENABLED:
        logger.warning("Twilio está deshabilitado")
        return None

    # Verificar configuración
    if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN]):
        logger.error("Twilio no está configurado correctamente")
        return None

    # Recipient
    to_phone = phone or user.phone

    if not to_phone:
        logger.warning(f"Usuario {user.email} no tiene teléfono configurado")
        return None

    # Formatear teléfono para WhatsApp
    if not to_phone.startswith("whatsapp:"):
        to_phone = f"whatsapp:{to_phone}"

    # Crear registro de notificación
    notification = Notification.objects.create(
        tenant=user.tenant,
        user=user,
        notification_type="whatsapp",
        subject="WhatsApp Message",
        message=message,
        recipient=to_phone,
        status="pending",
    )

    try:
        # Inicializar cliente Twilio
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        # Enviar mensaje
        message_response = client.messages.create(from_=settings.TWILIO_WHATSAPP_FROM, body=message, to=to_phone)

        # Marcar como enviado
        notification.mark_as_sent()
        notification.metadata["twilio_sid"] = message_response.sid
        notification.save()

        logger.info(f"WhatsApp enviado a {to_phone}")
        return notification

    except Exception as e:
        # Marcar como fallido
        notification.mark_as_failed(str(e))
        logger.error(f"Error enviando WhatsApp a {to_phone}: {str(e)}")
        return notification


def send_sms(user, message, phone=None):
    """
    Enviar SMS usando Twilio.

    Args:
        user: Usuario destinatario
        message: Mensaje a enviar
        phone: Teléfono alternativo

    Returns:
        Notification object
    """

    if not settings.TWILIO_ENABLED:
        logger.warning("Twilio está deshabilitado")
        return None

    # Verificar configuración
    if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_SMS_FROM]):
        logger.error("Twilio SMS no está configurado correctamente")
        return None

    # Recipient
    to_phone = phone or user.phone

    if not to_phone:
        logger.warning(f"Usuario {user.email} no tiene teléfono configurado")
        return None

    # Crear registro de notificación
    notification = Notification.objects.create(
        tenant=user.tenant,
        user=user,
        notification_type="sms",
        subject="SMS Message",
        message=message,
        recipient=to_phone,
        status="pending",
    )

    try:
        # Inicializar cliente Twilio
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        # Enviar SMS
        message_response = client.messages.create(from_=settings.TWILIO_SMS_FROM, body=message, to=to_phone)

        # Marcar como enviado
        notification.mark_as_sent()
        notification.metadata["twilio_sid"] = message_response.sid
        notification.save()

        logger.info(f"SMS enviado a {to_phone}")
        return notification

    except Exception as e:
        # Marcar como fallido
        notification.mark_as_failed(str(e))
        logger.error(f"Error enviando SMS a {to_phone}: {str(e)}")
        return notification
