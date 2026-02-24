# backend/subscriptions/serializers.py

from rest_framework import serializers
from .models import MarketplaceCategory, MarketplacePlan, MarketplaceContract


class MarketplaceCategorySerializer(serializers.ModelSerializer):
    """Serializer para categorías de servicios"""

    plans_count = serializers.SerializerMethodField()

    class Meta:
        model = MarketplaceCategory
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'icon',
            'image',
            'is_active',
            'order',
            'plans_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_plans_count(self, obj):
        """Número de planes activos en esta categoría"""
        return obj.plans.filter(is_active=True).count()


class MarketplacePlanListSerializer(serializers.ModelSerializer):
    """Serializer para listado de planes (vista resumida)"""

    category_name = serializers.CharField(source='category.name', read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    formatted_price = serializers.CharField(read_only=True)

    class Meta:
        model = MarketplacePlan
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'category',
            'category_name',
            'price',
            'formatted_price',
            'billing_period',
            'image',
            'is_active',
            'is_featured',
            'is_available',
            'order',
        ]
        read_only_fields = ['id']


class MarketplacePlanDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle completo de un plan"""

    category = MarketplaceCategorySerializer(read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    formatted_price = serializers.CharField(read_only=True)
    active_contracts_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = MarketplacePlan
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'full_description',
            'features',
            'category',
            'price',
            'formatted_price',
            'billing_period',
            'image',
            'is_active',
            'is_featured',
            'is_available',
            'max_contracts',
            'active_contracts_count',
            'order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MarketplaceContractSerializer(serializers.ModelSerializer):
    """Serializer para contratos de servicios"""

    service_plan_name = serializers.CharField(source='service_plan.name', read_only=True)
    service_plan_slug = serializers.CharField(source='service_plan.slug', read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = MarketplaceContract
        fields = [
            'id',
            'service_plan',
            'service_plan_name',
            'service_plan_slug',
            'customer',
            'customer_name',
            'order',
            'status',
            'start_date',
            'end_date',
            'next_billing_date',
            'price_paid',
            'notes',
            'is_active',
            'is_expired',
            'days_remaining',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreateContractSerializer(serializers.Serializer):
    """Serializer para crear un contrato (comprar un plan)"""

    service_plan_id = serializers.IntegerField()

    def validate_service_plan_id(self, value):
        """Validar que el plan existe y está disponible"""
        try:
            plan = MarketplacePlan.objects.get(id=value)
        except MarketplacePlan.DoesNotExist:
            raise serializers.ValidationError("Plan no encontrado")

        if not plan.is_active:
            raise serializers.ValidationError("Este plan no está disponible")

        if not plan.is_available:
            raise serializers.ValidationError("Este plan ha alcanzado el límite de contratos activos")

        return value
