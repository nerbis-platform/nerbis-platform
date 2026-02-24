# backend/orders/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from cart.models import Cart, CartItem
from ecommerce.models import Product
from bookings.models import Appointment
from .models import Order, OrderItem, OrderServiceItem, Payment
from .serializers import (
    OrderListSerializer,
    OrderDetailSerializer,
    CreateOrderSerializer,
    PaymentIntentSerializer,
)
from .stripe_utils import create_payment_intent
from decimal import Decimal
from notifications.tasks import send_order_confirmation_email


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para órdenes (solo lectura para el cliente).

    GET /api/orders/           - Listar mis órdenes
    GET /api/orders/{id}/      - Ver detalle de orden
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Order.objects.filter(tenant=self.request.tenant, customer=user)
            .select_related("customer")
            .prefetch_related("product_items", "service_items", "payments")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action == "list":
            return OrderListSerializer
        return OrderDetailSerializer


class CheckoutViewSet(viewsets.ViewSet):
    """
    ViewSet para el proceso de checkout.

    POST /api/checkout/create-order/          - Crear orden desde carrito
    POST /api/checkout/create-payment-intent/ - Crear Payment Intent de Stripe
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="create-order")
    def create_order(self, request):
        """
        POST /api/checkout/create-order/

        Crear orden desde el carrito.

        Body:
        {
            "billing_name": "Juan Pérez",
            "billing_email": "juan@email.com",
            "billing_phone": "+34 600 000 000",
            "billing_address": "Calle Principal 123",
            "billing_city": "Madrid",
            "billing_postal_code": "28001",
            "billing_country": "ES",
            "use_billing_for_shipping": true,
            "customer_notes": "Entregar por la mañana"
        }
        """
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Obtener carrito
        try:
            cart = Cart.objects.get(tenant=request.tenant, user=request.user)
        except Cart.DoesNotExist:
            return Response({"error": "Carrito vacío"}, status=status.HTTP_400_BAD_REQUEST)

        if cart.items.count() == 0:
            return Response({"error": "Carrito vacío"}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        for cart_item in cart.items.all():
            if cart_item.item_type == "service":
                appointment = cart_item.appointment
                if not appointment:
                    return Response(
                        {"error": "La cita no está asociada al carrito"}, status=status.HTTP_400_BAD_REQUEST
                    )
                if appointment.status != "pending":
                    return Response({"error": "La cita ya no está disponible"}, status=status.HTTP_400_BAD_REQUEST)
                if appointment.expires_at and appointment.expires_at <= now:
                    return Response(
                        {"error": "La reserva ha expirado. Selecciona un nuevo horario."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Crear orden con transacción
        with transaction.atomic():
            # Calcular totales
            subtotal = cart.subtotal
            tax_amount = cart.tax_amount
            total = cart.total

            # Crear orden
            order = Order.objects.create(
                tenant=request.tenant,
                customer=request.user,
                status="pending",
                subtotal=subtotal,
                tax_rate=Decimal(str(settings.TAX_RATE)),
                tax_amount=tax_amount,
                total=total,
                billing_name=serializer.validated_data["billing_name"],
                billing_email=serializer.validated_data["billing_email"],
                billing_phone=serializer.validated_data.get("billing_phone", ""),
                billing_address=serializer.validated_data.get("billing_address", ""),
                billing_city=serializer.validated_data.get("billing_city", ""),
                billing_postal_code=serializer.validated_data.get("billing_postal_code", ""),
                billing_country=serializer.validated_data.get("billing_country", "ES"),
                customer_notes=serializer.validated_data.get("customer_notes", ""),
            )

            # Copiar dirección de envío si es necesario
            if serializer.validated_data.get("use_billing_for_shipping", True):
                order.shipping_name = order.billing_name
                order.shipping_address = order.billing_address
                order.shipping_city = order.billing_city
                order.shipping_postal_code = order.billing_postal_code
            else:
                order.shipping_name = serializer.validated_data.get("shipping_name", "")
                order.shipping_address = serializer.validated_data.get("shipping_address", "")
                order.shipping_city = serializer.validated_data.get("shipping_city", "")
                order.shipping_postal_code = serializer.validated_data.get("shipping_postal_code", "")

            order.save()

            # Crear items de la orden desde el carrito
            for cart_item in cart.items.all():
                if cart_item.item_type == "product":
                    # Item de producto
                    OrderItem.objects.create(
                        tenant=request.tenant,
                        order=order,
                        product=cart_item.item,
                        quantity=cart_item.quantity,
                        unit_price=cart_item.unit_price,
                    )

                    # Reducir stock
                    product = cart_item.item
                    if product.inventory.track_inventory:
                        product.inventory.decrease_stock(cart_item.quantity)

                elif cart_item.item_type == "service":
                    # Item de servicio
                    OrderServiceItem.objects.create(
                        tenant=request.tenant, order=order, service=cart_item.item, appointment=cart_item.appointment
                    )

                    # NO confirmamos la cita todavía, se confirma cuando se pague

            # Vaciar carrito (sin cancelar citas, ya están en la orden)
            cart.clear(cancel_appointments=False)

            send_order_confirmation_email.delay(order.id)

        # Retornar orden creada
        order_serializer = OrderDetailSerializer(order)
        return Response(
            {"message": "Orden creada exitosamente", "order": order_serializer.data}, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["post"], url_path="create-payment-intent")
    def create_payment_intent(self, request):
        """
        POST /api/checkout/create-payment-intent/

        Crear Payment Intent en Stripe.

        Body:
        {
            "order_id": 1
        }

        Response:
        {
            "client_secret": "pi_xxx_secret_yyy",
            "payment_intent_id": "pi_xxx",
            "amount": 10890,  // En centavos
            "currency": "eur"
        }
        """
        serializer = PaymentIntentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        order_id = serializer.validated_data["order_id"]
        order = Order.objects.get(id=order_id, tenant=request.tenant, customer=request.user)

        # Verificar que no esté ya pagada
        if order.status == "paid":
            return Response({"error": "Esta orden ya está pagada"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Crear Payment Intent en Stripe
            payment_data = create_payment_intent(order)

            # Crear registro de pago
            payment = Payment.objects.create(
                tenant=request.tenant,
                order=order,
                stripe_payment_intent_id=payment_data["payment_intent_id"],
                payment_method="stripe",
                amount=order.total,
                currency="EUR",
                status="pending",
            )

            return Response(
                {
                    "client_secret": payment_data["client_secret"],
                    "payment_intent_id": payment_data["payment_intent_id"],
                    "amount": int(order.total * 100),
                    "currency": settings.STRIPE_CURRENCY,
                    "payment_id": payment.id,
                }
            )

        except Exception as e:
            return Response(
                {"error": f"Error al procesar pago: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["post"], url_path="confirm-payment")
    def confirm_payment(self, request):
        """
        POST /api/checkout/confirm-payment/

        Confirmar pago verificando el estado en Stripe.
        Usado como respaldo cuando el webhook no está disponible (desarrollo local).

        Body:
        {
            "order_id": 1,
            "payment_intent_id": "pi_xxx"
        }
        """
        import stripe

        order_id = request.data.get("order_id")
        payment_intent_id = request.data.get("payment_intent_id")

        if not order_id or not payment_intent_id:
            return Response(
                {"error": "order_id y payment_intent_id son requeridos"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Verificar orden
            order = Order.objects.get(id=order_id, tenant=request.tenant, customer=request.user)
            print(f"📋 Confirmando pago para orden {order.order_number}")

            # Si ya está pagada, retornar éxito
            if order.status == "paid":
                print(f"✅ Orden {order.order_number} ya estaba pagada")
                return Response({
                    "message": "Orden ya confirmada",
                    "order_status": order.status,
                    "appointments_confirmed": order.service_items.count()
                })

            # Verificar estado del Payment Intent en Stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            print(f"💳 Estado del Payment Intent: {payment_intent.status}")

            if payment_intent.status == "succeeded":
                # Buscar el pago
                try:
                    payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id, order=order)
                    # Marcar pago como exitoso
                    payment.mark_as_succeeded()
                    print(f"✅ Payment {payment.id} marcado como exitoso")
                except Payment.DoesNotExist:
                    print(f"⚠️ Payment no encontrado para intent {payment_intent_id}")

                # Marcar orden como pagada
                order.mark_as_paid()
                print(f"✅ Orden {order.order_number} marcada como pagada")

                # Confirmar todas las citas de la orden
                appointments_confirmed = 0
                for service_item in order.service_items.all():
                    appointment = service_item.appointment
                    if appointment:
                        old_status = appointment.status
                        appointment.confirm()
                        appointment.is_paid = True
                        appointment.save()
                        appointments_confirmed += 1
                        print(f"✅ Cita {appointment.id} confirmada ({old_status} → confirmed)")

                print(f"🎉 Total: {appointments_confirmed} citas confirmadas para orden {order.order_number}")

                return Response({
                    "message": "Pago confirmado exitosamente",
                    "order_status": order.status,
                    "appointments_confirmed": appointments_confirmed
                })
            else:
                return Response(
                    {
                        "message": "El pago aún no ha sido completado",
                        "payment_status": payment_intent.status,
                        "order_status": order.status,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Order.DoesNotExist:
            print(f"❌ Orden {order_id} no encontrada")
            return Response({"error": "Orden no encontrada"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"❌ Error en confirm_payment: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Error al confirmar pago: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
