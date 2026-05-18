# backend/orders/webhooks.py

import logging

import stripe
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from notifications.tasks import send_payment_confirmation_email

from .models import Payment, PaymentGateway

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    Webhook de Stripe para procesar eventos.

    URL: /api/webhooks/stripe/

    Eventos manejados:
    - payment_intent.succeeded: Pago exitoso
    - payment_intent.payment_failed: Pago fallido
    - charge.refunded: Reembolso

    Nota: El webhook verifica la firma usando el webhook_secret de la pasarela
    del tenant. Si no se puede verificar, intenta con todas las pasarelas activas.
    """
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

    # Intentar verificar con cada gateway activa de Stripe
    event = None
    validated_gateway = None
    gateways = PaymentGateway.objects.filter(provider="stripe", is_active=True).exclude(webhook_secret="")

    for gateway in gateways:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, gateway.webhook_secret)
            validated_gateway = gateway
            break
        except (ValueError, stripe.error.SignatureVerificationError):
            continue

    if event is None:
        logger.warning("Stripe webhook: firma no válida para ninguna pasarela")
        return HttpResponse(status=400)

    # Manejar el evento (scoped al gateway/tenant validado)
    event_type = event["type"]

    if event_type == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        handle_payment_success(payment_intent, validated_gateway)

    elif event_type == "payment_intent.payment_failed":
        payment_intent = event["data"]["object"]
        handle_payment_failure(payment_intent, validated_gateway)

    elif event_type == "charge.refunded":
        charge = event["data"]["object"]
        handle_refund(charge, validated_gateway)

    return JsonResponse({"status": "success"})


def handle_payment_success(payment_intent, gateway):
    """
    Manejar pago exitoso.

    1. Marcar pago como succeeded
    2. Marcar orden como paid
    3. Confirmar citas automáticamente
    4. Enviar email de confirmación
    """
    payment_intent_id = payment_intent["id"]

    try:
        payment = Payment.objects.get(
            stripe_payment_intent_id=payment_intent_id,
            gateway=gateway,
        )

        payment.mark_as_succeeded()

        order = payment.order
        order.mark_as_paid()

        # Confirmar todas las citas de la orden
        for service_item in order.service_items.all():
            appointment = service_item.appointment
            appointment.confirm()
            appointment.is_paid = True
            appointment.save()

        send_payment_confirmation_email.delay(order.id)

        logger.info("Pago exitoso para orden %s", order.order_number)

    except Payment.DoesNotExist:
        logger.warning("Pago no encontrado: %s (gateway=%s)", payment_intent_id, gateway.id)
    except Exception as e:
        logger.error("Error en handle_payment_success: %s", e)


def handle_payment_failure(payment_intent, gateway):
    """Manejar pago fallido."""
    payment_intent_id = payment_intent["id"]

    try:
        payment = Payment.objects.get(
            stripe_payment_intent_id=payment_intent_id,
            gateway=gateway,
        )
        payment.status = "failed"
        payment.save()

        logger.info("Pago fallido para orden %s", payment.order.order_number)

    except Payment.DoesNotExist:
        logger.warning("Pago no encontrado: %s (gateway=%s)", payment_intent_id, gateway.id)


def handle_refund(charge, gateway):
    """Manejar reembolso."""
    charge_id = charge["id"]

    try:
        payment = Payment.objects.get(
            stripe_charge_id=charge_id,
            gateway=gateway,
        )
        payment.status = "refunded"
        payment.save()

        order = payment.order
        order.status = "refunded"
        order.save()

        logger.info("Reembolso procesado para orden %s", order.order_number)

    except Payment.DoesNotExist:
        logger.warning("Pago no encontrado para charge: %s (gateway=%s)", charge_id, gateway.id)
