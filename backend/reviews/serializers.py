# backend/reviews/serializers.py

# backend/reviews/serializers.py

from rest_framework import serializers
from .models import Review, ReviewImage, ReviewHelpful
from core.serializers import UserSerializer


class ReviewImageSerializer(serializers.ModelSerializer):
    """Serializer para imágenes de reviews"""

    class Meta:
        model = ReviewImage
        fields = ["id", "image", "order"]


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer para reviews (listado)"""

    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    item_type = serializers.CharField(read_only=True)
    item_name = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    images = ReviewImageSerializer(many=True, read_only=True)
    has_voted_helpful = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "user_name",
            "user_avatar",
            "item_type",
            "item_name",
            "rating",
            "title",
            "comment",
            "is_verified_purchase",
            "status",
            "status_display",
            "business_response",
            "business_response_at",
            "helpful_count",
            "has_voted_helpful",
            "images",
            "created_at",
        ]

    def get_user_name(self, obj):
        """Nombre completo del usuario"""
        return obj.user.get_full_name() or obj.user.username

    def get_user_avatar(self, obj):
        """URL del avatar del usuario"""
        if obj.user.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.user.avatar.url)
        return None

    def get_has_voted_helpful(self, obj):
        """Verificar si el usuario actual votó como útil"""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return ReviewHelpful.objects.filter(review=obj, user=request.user).exists()
        return False


class CreateReviewSerializer(serializers.ModelSerializer):
    """Serializer para crear review"""

    product_id = serializers.IntegerField(required=False, write_only=True)
    service_id = serializers.IntegerField(required=False, write_only=True)
    images = serializers.ListField(
        child=serializers.ImageField(), required=False, write_only=True, max_length=5, help_text="Máximo 5 imágenes"
    )

    class Meta:
        model = Review
        fields = [
            "product_id",
            "service_id",
            "rating",
            "title",
            "comment",
            "images",
        ]

    def validate(self, data):
        """Validar que se especifique producto o servicio"""
        if not data.get("product_id") and not data.get("service_id"):
            raise serializers.ValidationError("Debes especificar un producto o servicio")

        if data.get("product_id") and data.get("service_id"):
            raise serializers.ValidationError("No puedes hacer review de producto y servicio al mismo tiempo")

        return data

    def validate_rating(self, value):
        """Validar rating"""
        if value < 1 or value > 5:
            raise serializers.ValidationError("El rating debe ser entre 1 y 5")
        return value

    def create(self, validated_data):
        """Crear review"""
        from django.contrib.contenttypes.models import ContentType

        request = self.context["request"]
        images_data = validated_data.pop("images", [])
        product_id = validated_data.pop("product_id", None)
        service_id = validated_data.pop("service_id", None)

        # Determinar el item
        if product_id:
            from ecommerce.models import Product

            item = Product.objects.get(id=product_id, tenant=request.tenant)
            content_type = ContentType.objects.get_for_model(Product)
        else:
            from services.models import Service

            item = Service.objects.get(id=service_id, tenant=request.tenant)
            content_type = ContentType.objects.get_for_model(Service)

        # Verificar si ya hizo review
        existing_review = Review.objects.filter(
            tenant=request.tenant, user=request.user, content_type=content_type, object_id=item.id
        ).first()

        if existing_review:
            raise serializers.ValidationError("Ya has hecho un review para este item")

        # Verificar si compró el item
        is_verified = self._check_purchase(request.user, item, content_type)

        # Crear review
        review = Review.objects.create(
            tenant=request.tenant,
            user=request.user,
            content_type=content_type,
            object_id=item.id,
            is_verified_purchase=is_verified,
            **validated_data
        )

        # Crear imágenes
        for idx, image in enumerate(images_data):
            ReviewImage.objects.create(tenant=request.tenant, review=review, image=image, order=idx)

        return review

    def _check_purchase(self, user, item, content_type):
        """Verificar si el usuario compró el item"""
        from orders.models import Order, OrderItem, OrderServiceItem

        if content_type.model == "product":
            # Verificar si compró el producto
            return OrderItem.objects.filter(
                order__tenant=user.tenant, order__customer=user, order__status__in=["paid", "completed"], product=item
            ).exists()

        elif content_type.model == "service":
            # Verificar si usó el servicio
            return OrderServiceItem.objects.filter(
                order__tenant=user.tenant, order__customer=user, order__status__in=["paid", "completed"], service=item
            ).exists()

        return False
