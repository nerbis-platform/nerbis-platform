# backend/orders/webhooks.py

import stripe
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from .models import Order, Payment
from bookings.models import Appointment
from notifications.tasks import send_payment_confirmation_email


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
    """

    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

    try:
        # Verificar firma del webhook
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except ValueError:
        # Payload inválido
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        # Firma inválida
        return HttpResponse(status=400)

    # Manejar el evento
    event_type = event["type"]

    if event_type == "payment_intent.succeeded":
        # Pago exitoso
        payment_intent = event["data"]["object"]
        handle_payment_success(payment_intent)

    elif event_type == "payment_intent.payment_failed":
        # Pago fallido
        payment_intent = event["data"]["object"]
        handle_payment_failure(payment_intent)

    elif event_type == "charge.refunded":
        # Reembolso
        charge = event["data"]["object"]
        handle_refund(charge)

    return JsonResponse({"status": "success"})


def handle_payment_success(payment_intent):
    """
    Manejar pago exitoso.

    1. Marcar pago como succeeded
    2. Marcar orden como paid
    3. Confirmar citas automáticamente
    4. ENVIAR EMAIL DE CONFIRMACIÓN ← NUEVO
    """
    payment_intent_id = payment_intent["id"]

    try:
        # Buscar el pago
        payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)

        # Marcar pago como exitoso
        payment.mark_as_succeeded()

        # Marcar orden como pagada
        order = payment.order
        order.mark_as_paid()

        # Confirmar todas las citas de la orden
        for service_item in order.service_items.all():
            appointment = service_item.appointment
            appointment.confirm()
            appointment.is_paid = True
            appointment.save()

        # ENVIAR EMAIL DE CONFIRMACIÓN ← NUEVO
        send_payment_confirmation_email.delay(order.id)

        print(f"✅ Pago exitoso para orden {order.order_number}")

    except Payment.DoesNotExist:
        print(f"⚠️ Pago no encontrado: {payment_intent_id}")
    except Exception as e:
        print(f"❌ Error en handle_payment_success: {str(e)}")


def handle_payment_failure(payment_intent):
    """
    Manejar pago fallido.
    """
    payment_intent_id = payment_intent["id"]

    try:
        payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)
        payment.status = "failed"
        payment.save()

        print(f"❌ Pago fallido para orden {payment.order.order_number}")

    except Payment.DoesNotExist:
        print(f"⚠️ Pago no encontrado: {payment_intent_id}")


def handle_refund(charge):
    """
    Manejar reembolso.
    """
    charge_id = charge["id"]

    try:
        payment = Payment.objects.get(stripe_charge_id=charge_id)
        payment.status = "refunded"
        payment.save()

        order = payment.order
        order.status = "refunded"
        order.save()

        print(f"💰 Reembolso procesado para orden {order.order_number}")

    except Payment.DoesNotExist:
        print(f"⚠️ Pago no encontrado: {charge_id}")
