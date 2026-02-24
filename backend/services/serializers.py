# backend/services/serializers.py

from rest_framework import serializers
from core.serializers import UserPublicSerializer
from .models import ServiceCategory, Service, StaffMember


class AbsoluteURLImageField(serializers.ImageField):
    """Campo de imagen que devuelve URL absoluta"""

    def to_representation(self, value):
        if not value:
            return None

        import os
        from django.conf import settings

        # Usar MEDIA_BASE_URL si está configurada (para Docker/producción)
        media_base_url = os.environ.get("MEDIA_BASE_URL", "")

        if media_base_url:
            # Construir URL usando la base configurada
            return f"{media_base_url}{value.url}"

        # Fallback: intentar construir desde el request
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(value.url)

        # Último fallback: devolver la URL relativa
        return value.url


class ServiceCategorySerializer(serializers.ModelSerializer):
    """Serializer para categorías de servicios"""

    image = AbsoluteURLImageField(read_only=True)
    services_count = serializers.SerializerMethodField()
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    reviews_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ServiceCategory
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "image",
            "icon",
            "is_active",
            "order",
            "services_count",
            "average_rating",
            "reviews_count",
        ]
        read_only_fields = ["id", "slug"]

    def get_services_count(self, obj) -> int:
        return obj.get_services_count()


class StaffMemberListSerializer(serializers.ModelSerializer):
    """Serializer para listar staff members (vista resumida)"""

    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    photo = AbsoluteURLImageField(read_only=True)
    specialties = ServiceCategorySerializer(many=True, read_only=True)

    class Meta:
        model = StaffMember
        fields = [
            "id",
            "full_name",
            "email",
            "position",
            "photo",
            "specialties",
            "is_available",
            "accepts_new_clients",
            "is_featured",
        ]


class StaffMemberDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle de staff member"""

    user = UserPublicSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)
    photo = AbsoluteURLImageField(read_only=True)
    specialties = ServiceCategorySerializer(many=True, read_only=True)
    services_count = serializers.SerializerMethodField()

    class Meta:
        model = StaffMember
        fields = [
            "id",
            "user",
            "full_name",
            "position",
            "bio",
            "photo",
            "specialties",
            "is_available",
            "accepts_new_clients",
            "is_featured",
            "services_count",
            "created_at",
        ]

    def get_services_count(self, obj) -> int:
        return obj.get_services().count()


class ServiceListSerializer(serializers.ModelSerializer):
    """Serializer para listar servicios (vista resumida)"""

    category = ServiceCategorySerializer(read_only=True)
    image = AbsoluteURLImageField(read_only=True)
    assigned_staff = StaffMemberListSerializer(many=True, read_only=True)
    formatted_duration = serializers.CharField(read_only=True)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)  # ← AGREGAR
    reviews_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "image",
            "short_description",
            "duration_minutes",
            "formatted_duration",
            "price",
            "requires_deposit",
            "deposit_amount",
            "is_featured",
            "average_rating",
            "reviews_count",
            "assigned_staff",
        ]


class ServiceDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle de servicio"""

    category = ServiceCategorySerializer(read_only=True)
    image = AbsoluteURLImageField(read_only=True)
    assigned_staff = StaffMemberListSerializer(many=True, read_only=True)
    formatted_duration = serializers.CharField(read_only=True)
    duration_hours = serializers.FloatField(read_only=True)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    reviews_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "image",
            "short_description",
            "description",
            "duration_minutes",
            "formatted_duration",
            "duration_hours",
            "price",
            "requires_deposit",
            "deposit_amount",
            "max_advance_booking_days",
            "min_advance_booking_hours",
            "assigned_staff",
            "is_active",
            "is_featured",
            "average_rating",
            "reviews_count",
            "meta_title",
            "meta_description",
            "created_at",
            "updated_at",
        ]


class ServiceCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar servicios"""

    class Meta:
        model = Service
        fields = [
            "name",
            "category",
            "image",
            "short_description",
            "description",
            "duration_minutes",
            "price",
            "requires_deposit",
            "deposit_amount",
            "max_advance_booking_days",
            "min_advance_booking_hours",
            "is_active",
            "is_featured",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["tenant"] = request.tenant
        return super().create(validated_data)
