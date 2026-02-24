# backend/coupons/serializers.py

from rest_framework import serializers
from .models import Coupon, CouponUsage


class CouponSerializer(serializers.ModelSerializer):
    """Serializer para mostrar información del cupón."""

    discount_display = serializers.CharField(
        source='get_discount_display',
        read_only=True
    )
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Coupon
        fields = [
            'id',
            'code',
            'description',
            'discount_type',
            'discount_value',
            'discount_display',
            'minimum_purchase',
            'maximum_discount',
            'valid_from',
            'valid_until',
            'first_purchase_only',
            'is_valid',
        ]
        read_only_fields = fields


class CouponValidateSerializer(serializers.Serializer):
    """Serializer para validar un cupón."""

    code = serializers.CharField(max_length=50)

    def validate_code(self, value):
        return value.upper().strip()


class CouponApplySerializer(serializers.Serializer):
    """Serializer para aplicar un cupón al carrito."""

    code = serializers.CharField(max_length=50)

    def validate_code(self, value):
        return value.upper().strip()


class CouponUsageSerializer(serializers.ModelSerializer):
    """Serializer para el historial de uso de cupones."""

    coupon_code = serializers.CharField(source='coupon.code', read_only=True)
    coupon_discount = serializers.CharField(
        source='coupon.get_discount_display',
        read_only=True
    )

    class Meta:
        model = CouponUsage
        fields = [
            'id',
            'coupon_code',
            'coupon_discount',
            'discount_applied',
            'used_at',
        ]
        read_only_fields = fields


class AppliedCouponSerializer(serializers.Serializer):
    """Serializer para mostrar el cupón aplicado en el carrito."""

    code = serializers.CharField()
    discount_type = serializers.CharField()
    discount_value = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_display = serializers.CharField()
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
