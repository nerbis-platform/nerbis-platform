# backend/orders/stripe_utils.py

import stripe
from django.conf import settings

# Configurar Stripe con la clave secreta
stripe.api_key = settings.STRIPE_SECRET_KEY


def get_or_create_stripe_customer(user):
    """
    Obtener o crear un Customer en Stripe para el usuario.

    Args:
        user: Instancia de User

    Returns:
        stripe.Customer
    """
    # Buscar si ya existe un customer con este email
    existing_customers = stripe.Customer.list(email=user.email, limit=1)

    if existing_customers.data:
        # Ya existe, retornar el primero
        return existing_customers.data[0]

    # Crear nuevo customer
    customer = stripe.Customer.create(
        email=user.email,
        name=user.get_full_name() or f"{user.first_name} {user.last_name}".strip(),
        phone=getattr(user, 'phone', None),
        metadata={
            "user_id": str(user.id),
        },
    )

    return customer


def create_payment_intent(order):
    """
    Crear un Payment Intent en Stripe.

    Args:
        order: Instancia de Order

    Returns:
        dict con client_secret y payment_intent_id
    """

    try:
        # Obtener o crear el customer en Stripe
        stripe_customer = get_or_create_stripe_customer(order.customer)

        # Crear Payment Intent
        payment_intent = stripe.PaymentIntent.create(
            amount=int(order.total * 100),  # Stripe usa centavos
            currency=settings.STRIPE_CURRENCY,
            customer=stripe_customer.id,  # Asociar al customer de Stripe
            metadata={
                "order_id": order.id,
                "order_number": order.order_number,
                "tenant_id": str(order.tenant.id),
                "customer_email": order.customer.email,
            },
            description=f"Orden {order.order_number}",
            receipt_email=order.billing_email,
        )

        return {
            "client_secret": payment_intent["client_secret"],
            "payment_intent_id": payment_intent["id"],
        }

    except stripe.error.StripeError as e:
        raise Exception(f"Error de Stripe: {str(e)}")


def retrieve_payment_intent(payment_intent_id):
    """
    Obtener un Payment Intent de Stripe.
    """
    try:
        return stripe.PaymentIntent.retrieve(payment_intent_id)
    except stripe.error.StripeError as e:
        raise Exception(f"Error de Stripe: {str(e)}")


def create_refund(charge_id, amount=None):
    """
    Crear un reembolso en Stripe.

    Args:
        charge_id: ID del cargo a reembolsar
        amount: Monto a reembolsar (en centavos). Si es None, reembolsa todo.
    """
    try:
        refund_data = {"charge": charge_id}
        if amount:
            refund_data["amount"] = amount

        return stripe.Refund.create(**refund_data)
    except stripe.error.StripeError as e:
        raise Exception(f"Error de Stripe: {str(e)}")
