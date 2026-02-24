# backend/orders/serializers.py

from rest_framework import serializers
from core.serializers import UserSerializer
from ecommerce.serializers import ProductListSerializer
from services.serializers import ServiceListSerializer
from .models import Order, OrderItem, OrderServiceItem, Payment


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer para items de producto en la orden"""

    product = ProductListSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "quantity",
            "unit_price",
            "total_price",
        ]


class OrderServiceItemSerializer(serializers.ModelSerializer):
    """Serializer para items de servicio en la orden"""

    service = ServiceListSerializer(read_only=True)

    class Meta:
        model = OrderServiceItem
        fields = [
            "id",
            "service",
            "service_name",
            "service_duration",
            "price",
            "staff_member_name",
            "appointment_datetime",
        ]


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer para pagos"""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_method",
            "amount",
            "currency",
            "status",
            "status_display",
            "stripe_payment_intent_id",
            "processed_at",
            "created_at",
        ]


class OrderListSerializer(serializers.ModelSerializer):
    """Serializer para listar órdenes (vista resumida)"""

    customer = UserSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "customer",
            "status",
            "status_display",
            "subtotal",
            "tax_amount",
            "total",
            "created_at",
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle de orden"""

    customer = UserSerializer(read_only=True)
    product_items = OrderItemSerializer(many=True, read_only=True)
    service_items = OrderServiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "customer",
            "status",
            "status_display",
            "subtotal",
            "tax_rate",
            "tax_amount",
            "shipping_cost",
            "total",
            "billing_name",
            "billing_email",
            "billing_phone",
            "billing_address",
            "billing_city",
            "billing_postal_code",
            "billing_country",
            "shipping_name",
            "shipping_address",
            "shipping_city",
            "shipping_postal_code",
            "customer_notes",
            "product_items",
            "service_items",
            "payments",
            "created_at",
            "paid_at",
            "completed_at",
        ]


class CreateOrderSerializer(serializers.Serializer):
    """Serializer para crear orden desde el carrito"""

    # Información de facturación
    billing_name = serializers.CharField(required=True, max_length=200)
    billing_email = serializers.EmailField(required=True)
    billing_phone = serializers.CharField(required=False, max_length=50, allow_blank=True)
    billing_address = serializers.CharField(required=False, allow_blank=True)
    billing_city = serializers.CharField(required=False, max_length=100, allow_blank=True)
    billing_postal_code = serializers.CharField(required=False, max_length=20, allow_blank=True)
    billing_country = serializers.CharField(required=False, max_length=2, default="ES")

    # Información de envío (opcional, si es diferente a facturación)
    shipping_name = serializers.CharField(required=False, max_length=200, allow_blank=True)
    shipping_address = serializers.CharField(required=False, allow_blank=True)
    shipping_city = serializers.CharField(required=False, max_length=100, allow_blank=True)
    shipping_postal_code = serializers.CharField(required=False, max_length=20, allow_blank=True)

    # Notas
    customer_notes = serializers.CharField(required=False, allow_blank=True)

    # Si envío es igual a facturación
    use_billing_for_shipping = serializers.BooleanField(required=False, default=True)


class PaymentIntentSerializer(serializers.Serializer):
    """Serializer para crear Payment Intent de Stripe"""

    order_id = serializers.IntegerField(required=True)

    def validate_order_id(self, value):
        """Validar que la orden existe y pertenece al usuario"""
        request = self.context["request"]
        try:
            order = Order.objects.get(id=value, tenant=request.tenant, customer=request.user, status="pending")
        except Order.DoesNotExist:
            raise serializers.ValidationError("Orden no encontrada")
        return value
