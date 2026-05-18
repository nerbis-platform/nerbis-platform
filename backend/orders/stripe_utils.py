# backend/orders/stripe_utils.py

import stripe


def _get_stripe_gateway(tenant):
    """Obtener la pasarela Stripe configurada para el tenant."""
    from .models import PaymentGateway

    gateway = PaymentGateway.objects.filter(tenant=tenant, provider="stripe", is_active=True).first()

    if not gateway:
        raise Exception(f"Stripe no está configurado para {tenant.name}")

    return gateway


def get_or_create_stripe_customer(user, gateway):
    """
    Obtener o crear un Customer en Stripe para el usuario.

    Args:
        user: Instancia de User
        gateway: Instancia de PaymentGateway (Stripe)

    Returns:
        stripe.Customer
    """
    stripe.api_key = gateway.secret_key

    existing_customers = stripe.Customer.list(email=user.email, limit=1)

    if existing_customers.data:
        return existing_customers.data[0]

    customer = stripe.Customer.create(
        email=user.email,
        name=user.get_full_name() or f"{user.first_name} {user.last_name}".strip(),
        phone=getattr(user, "phone", None),
        metadata={
            "user_id": str(user.id),
            "tenant_id": str(user.tenant_id),
        },
    )

    return customer


def create_payment_intent(order, gateway=None):
    """
    Crear un Payment Intent en Stripe.

    Args:
        order: Instancia de Order
        gateway: Instancia de PaymentGateway (opcional, se busca por tenant)

    Returns:
        dict con client_secret y payment_intent_id
    """
    if gateway is None:
        gateway = _get_stripe_gateway(order.tenant)

    stripe.api_key = gateway.secret_key

    try:
        stripe_customer = get_or_create_stripe_customer(order.customer, gateway)

        payment_intent = stripe.PaymentIntent.create(
            amount=int(order.total * 100),
            currency=order.tenant.currency.lower(),
            customer=stripe_customer.id,
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
            "gateway_id": gateway.id,
        }

    except stripe.error.StripeError as e:
        raise Exception(f"Error de Stripe: {str(e)}")


def retrieve_payment_intent(payment_intent_id, gateway):
    """Obtener un Payment Intent de Stripe."""
    stripe.api_key = gateway.secret_key
    try:
        return stripe.PaymentIntent.retrieve(payment_intent_id)
    except stripe.error.StripeError as e:
        raise Exception(f"Error de Stripe: {str(e)}")


def create_refund(charge_id, gateway, amount=None):
    """
    Crear un reembolso en Stripe.

    Args:
        charge_id: ID del cargo a reembolsar
        gateway: Instancia de PaymentGateway (Stripe)
        amount: Monto a reembolsar (en centavos). Si es None, reembolsa todo.
    """
    stripe.api_key = gateway.secret_key
    try:
        refund_data = {"charge": charge_id}
        if amount:
            refund_data["amount"] = amount

        return stripe.Refund.create(**refund_data)
    except stripe.error.StripeError as e:
        raise Exception(f"Error de Stripe: {str(e)}")
