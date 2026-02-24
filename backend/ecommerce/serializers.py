# backend/ecommerce/serializers.py

from typing import Optional
from rest_framework import serializers
from .models import ProductCategory, Product, ProductImage, Inventory


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer para imágenes de productos"""

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image", "image_url", "alt_text", "is_primary", "order"]

    def get_image_url(self, obj) -> Optional[str]:
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class InventorySerializer(serializers.ModelSerializer):
    """Serializer para inventario"""

    is_in_stock = serializers.BooleanField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Inventory
        fields = [
            "stock",
            "low_stock_threshold",
            "track_inventory",
            "allow_backorders",
            "is_in_stock",
            "is_low_stock",
            "total_sold",
        ]
        read_only_fields = ["total_sold"]


class ProductCategorySerializer(serializers.ModelSerializer):
    """Serializer para categorías"""

    products_count = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = ["id", "name", "slug", "description", "image", "parent", "is_active", "order", "products_count"]
        read_only_fields = ["id", "slug"]

    def get_products_count(self, obj) -> int:
        return obj.get_products_count()


class ProductListSerializer(serializers.ModelSerializer):
    """Serializer para listar productos (vista resumida)"""

    category_name = serializers.CharField(source="category.name", read_only=True)
    main_image = serializers.SerializerMethodField()
    discount_percentage = serializers.IntegerField(read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)  # ← AGREGAR
    reviews_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "category",
            "category_name",
            "short_description",
            "price",
            "compare_at_price",
            "discount_percentage",
            "brand",
            "is_featured",
            "is_in_stock",
            "main_image",
            "average_rating",
            "reviews_count",
        ]

    def get_main_image(self, obj) -> Optional[str]:
        image = obj.main_image
        if image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(image.image.url)
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle de producto (vista completa)"""

    category = ProductCategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    inventory = InventorySerializer(read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    reviews_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "sku",
            "category",
            "short_description",
            "description",
            "price",
            "compare_at_price",
            "discount_percentage",
            "brand",
            "is_active",
            "is_featured",
            "requires_shipping",
            "images",
            "inventory",
            "average_rating",
            "reviews_count",
            "created_at",
            "updated_at",
        ]


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar productos"""

    class Meta:
        model = Product
        fields = [
            "name",
            "category",
            "short_description",
            "description",
            "price",
            "compare_at_price",
            "cost_price",
            "brand",
            "is_active",
            "is_featured",
            "requires_shipping",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["tenant"] = request.tenant
        product = super().create(validated_data)

        # Crear inventario automáticamente
        Inventory.objects.create(tenant=request.tenant, product=product, stock=0)
        return product
