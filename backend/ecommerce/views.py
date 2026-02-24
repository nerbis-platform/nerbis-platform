# backend/ecommerce/views.py

from django.db import models
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from core.permissions import IsTenantStaffOrAdmin
from .models import ProductCategory, Product, ProductImage, Inventory
from .serializers import (
    ProductCategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
    ProductImageSerializer,
    InventorySerializer,
)


class ProductCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet para categorías"""

    serializer_class = ProductCategorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active", "parent"]
    search_fields = ["name", "description"]
    ordering_fields = ["order", "name"]
    ordering = ["order"]

    def get_queryset(self):
        # Para generación de schema de Swagger
        if getattr(self, "swagger_fake_view", False):
            return ProductCategory.objects.none()
        queryset = ProductCategory.objects.filter(tenant=self.request.tenant)
        # Staff/admin ven todas las categorías (incluyendo inactivas)
        user = self.request.user
        if not (user.is_authenticated and hasattr(user, 'role') and user.role in ('admin', 'staff')):
            queryset = queryset.filter(is_active=True)
        return queryset

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            permission_classes = [IsAuthenticatedOrReadOnly]
        else:
            permission_classes = [IsTenantStaffOrAdmin]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet para productos"""

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "brand", "is_featured"]
    search_fields = ["name", "description", "sku"]
    ordering_fields = ["price", "name", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        # Para generación de schema de Swagger
        if getattr(self, "swagger_fake_view", False):
            return Product.objects.none()

        queryset = (
            Product.objects.filter(tenant=self.request.tenant)
            .select_related("category", "inventory")
            .prefetch_related("images")
        )

        # Staff/admin ven todos los productos (incluyendo inactivos)
        user = self.request.user
        if not (user.is_authenticated and hasattr(user, 'role') and user.role in ('admin', 'staff')):
            queryset = queryset.filter(is_active=True)

        # Por defecto, excluir productos agotados para usuarios normales
        # Solo mostrar agotados si explícitamente se pide (para admin)
        include_out_of_stock = self.request.query_params.get("include_out_of_stock") == "true"

        if not include_out_of_stock:
            # Excluir productos sin inventario o con stock <= 0
            # Productos sin track_inventory siempre se muestran
            queryset = queryset.filter(
                models.Q(inventory__track_inventory=False) |
                models.Q(inventory__stock__gt=0) |
                models.Q(inventory__allow_backorders=True)
            )

        # Filtro: solo en stock (legacy, ahora es el comportamiento por defecto)
        if self.request.query_params.get("in_stock") == "true":
            queryset = queryset.filter(inventory__stock__gt=0)

        # Filtro: rango de precios
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        elif self.action == "retrieve":
            return ProductDetailSerializer
        return ProductCreateUpdateSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve", "featured"]:
            permission_classes = [IsAuthenticatedOrReadOnly]
        else:
            permission_classes = [IsTenantStaffOrAdmin]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=False, methods=["get"])
    def featured(self, request):
        """GET /api/products/featured/ - Productos destacados"""
        products = self.get_queryset().filter(is_featured=True)[:8]
        serializer = ProductListSerializer(products, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], permission_classes=[IsTenantStaffOrAdmin])
    def update_stock(self, request, pk=None):
        """PATCH /api/products/{id}/update_stock/ - Actualizar stock"""
        product = self.get_object()
        inventory = product.inventory

        action_type = request.data.get("action")
        quantity = int(request.data.get("quantity", 0))

        if quantity <= 0:
            return Response({"error": "La cantidad debe ser mayor a 0"}, status=status.HTTP_400_BAD_REQUEST)

        if action_type == "increase":
            inventory.increase_stock(quantity)
            message = f"Stock aumentado en {quantity}"
        elif action_type == "decrease":
            if not inventory.can_purchase(quantity):
                return Response({"error": "Stock insuficiente"}, status=status.HTTP_400_BAD_REQUEST)
            inventory.decrease_stock(quantity)
            message = f"Stock reducido en {quantity}"
        else:
            return Response({"error": "Acción inválida"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": message, "inventory": InventorySerializer(inventory).data})


class ProductImageViewSet(viewsets.ModelViewSet):
    """ViewSet para imágenes de productos (nested bajo /products/{id}/images/)"""

    serializer_class = ProductImageSerializer
    permission_classes = [IsTenantStaffOrAdmin]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ProductImage.objects.none()
        return ProductImage.objects.filter(
            tenant=self.request.tenant,
            product_id=self.kwargs["product_pk"],
        ).order_by("-is_primary", "order")

    def perform_create(self, serializer):
        product = Product.objects.get(
            id=self.kwargs["product_pk"],
            tenant=self.request.tenant,
        )
        serializer.save(tenant=self.request.tenant, product=product)
