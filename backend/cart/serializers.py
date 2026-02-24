# backend/cart/serializers.py

from rest_framework import serializers
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from ecommerce.models import Product
from ecommerce.serializers import ProductListSerializer
from services.models import Service
from services.serializers import ServiceListSerializer
from bookings.models import Appointment
from bookings.serializers import AppointmentListSerializer
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    """Serializer para items del carrito"""

    item_data = serializers.SerializerMethodField()
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    appointment = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id",
            "item_type",
            "item_data",
            "quantity",
            "unit_price",
            "total_price",
            "appointment",
        ]

    def get_item_data(self, obj):
        """Obtener datos del item (producto o servicio)"""
        try:
            if obj.item_type == "product" and obj.item:
                return ProductListSerializer(obj.item, context=self.context).data
            elif obj.item_type == "service" and obj.item:
                return ServiceListSerializer(obj.item, context=self.context).data
        except Exception:
            pass
        return {"id": obj.object_id, "name": "Item no disponible", "price": str(obj.unit_price)}

    def get_appointment(self, obj):
        """Obtener datos de la cita asociada (si existe)"""
        try:
            if obj.appointment:
                return AppointmentListSerializer(obj.appointment, context=self.context).data
        except Exception:
            pass
        return None


class AppliedCouponSerializer(serializers.Serializer):
    """Serializer para mostrar el cupón aplicado en el carrito"""

    code = serializers.CharField()
    discount_type = serializers.CharField()
    discount_value = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_display = serializers.CharField()
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2)


class CartSerializer(serializers.ModelSerializer):
    """Serializer para el carrito"""

    items = CartItemSerializer(many=True, read_only=True)
    items_count = serializers.IntegerField(read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    coupon = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id",
            "user",
            "items",
            "items_count",
            "subtotal",
            "discount_amount",
            "tax_amount",
            "total",
            "coupon",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user"]

    def get_coupon(self, obj):
        """Obtener información del cupón aplicado"""
        try:
            if not obj.coupon:
                return None

            discount_amount = obj.coupon.calculate_discount(obj.subtotal)

            return AppliedCouponSerializer({
                'code': obj.coupon.code,
                'discount_type': obj.coupon.discount_type,
                'discount_value': obj.coupon.discount_value,
                'discount_display': obj.coupon.get_discount_display(),
                'discount_amount': discount_amount,
            }).data
        except Exception:
            # Si hay error con el cupón, removerlo del carrito
            obj.coupon = None
            obj.save(update_fields=['coupon'])
            return None


class AddProductToCartSerializer(serializers.Serializer):
    """Serializer para agregar producto al carrito"""

    product_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(required=True, min_value=1, max_value=99)

    def validate_product_id(self, value):
        """Validar que el producto existe"""
        try:
            product = Product.objects.get(id=value, tenant=self.context["request"].tenant, is_active=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Producto no encontrado")

        # Verificar stock si tiene inventario
        if hasattr(product, 'inventory') and product.inventory:
            if product.inventory.track_inventory:
                if not product.inventory.can_purchase(self.initial_data.get("quantity", 1)):
                    raise serializers.ValidationError(f"Stock insuficiente. Solo quedan {product.inventory.stock} unidades")

        return value


class AddServiceToCartSerializer(serializers.Serializer):
    """Serializer para agregar servicio/cita al carrito"""

    service_id = serializers.IntegerField(required=True)
    appointment_id = serializers.IntegerField(required=True)

    def validate_service_id(self, value):
        """Validar que el servicio existe"""
        try:
            Service.objects.get(id=value, tenant=self.context["request"].tenant, is_active=True)
        except Service.DoesNotExist:
            raise serializers.ValidationError("Servicio no encontrado")
        return value

    def validate_appointment_id(self, value):
        """Validar que la cita existe y pertenece al usuario"""
        request = self.context["request"]
        try:
            appointment = Appointment.objects.get(
                id=value, tenant=request.tenant, customer=request.user, status="pending"
            )
        except Appointment.DoesNotExist:
            raise serializers.ValidationError("Cita no encontrada o no pertenece a este usuario")

        if appointment.expires_at and appointment.expires_at <= timezone.now():
            raise serializers.ValidationError("La reserva ha expirado. Selecciona un nuevo horario.")

        # Verificar que la cita no esté ya en un carrito
        if CartItem.objects.filter(appointment=appointment).exists():
            raise serializers.ValidationError("Esta cita ya está en el carrito")

        return value


class UpdateCartItemSerializer(serializers.Serializer):
    """Serializer para actualizar cantidad de item en carrito"""

    quantity = serializers.IntegerField(required=True, min_value=1, max_value=99)
