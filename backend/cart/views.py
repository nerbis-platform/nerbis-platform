# backend/cart/views.py

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.contenttypes.models import ContentType
from ecommerce.models import Product
from services.models import Service
from bookings.models import Appointment
from .models import Cart, CartItem
from .serializers import (
    CartSerializer,
    CartItemSerializer,
    AddProductToCartSerializer,
    AddServiceToCartSerializer,
    UpdateCartItemSerializer,
)

logger = logging.getLogger(__name__)


class CartViewSet(viewsets.ViewSet):
    """
    ViewSet para el carrito de compras.

    GET    /api/cart/              - Ver mi carrito
    POST   /api/cart/add-product/  - Agregar producto
    POST   /api/cart/add-service/  - Agregar servicio/cita
    PATCH  /api/cart/items/{id}/   - Actualizar cantidad
    DELETE /api/cart/items/{id}/   - Eliminar item
    POST   /api/cart/clear/         - Vaciar carrito
    """

    permission_classes = [IsAuthenticated]

    def _cleanup_orphaned_items(self, cart):
        """Remove cart items that point to deleted products/services"""
        try:
            for item in list(cart.items.all()):
                try:
                    # Try to access the item - if it fails, the product/service was deleted
                    if item.item is None:
                        logger.warning(f"Removing orphaned cart item {item.id} (item not found)")
                        item.delete()
                except Exception as e:
                    logger.warning(f"Removing problematic cart item {item.id}: {e}")
                    item.delete()
        except Exception as e:
            logger.exception(f"Error cleaning up orphaned items: {e}")

    def list(self, request):
        """
        GET /api/cart/

        Obtener o crear el carrito del usuario.
        """
        try:
            # Check tenant is available
            if not hasattr(request, 'tenant') or request.tenant is None:
                logger.error("No tenant found in request")
                return Response(
                    {"error": "Tenant no encontrado"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            cart, created = Cart.objects.select_related('coupon').prefetch_related(
                'items__appointment__service',
                'items__appointment__staff_member',
                'items__appointment__customer',
            ).get_or_create(
                tenant=request.tenant,
                user=request.user
            )

            # Clean up orphaned cart items (items pointing to deleted products/services)
            self._cleanup_orphaned_items(cart)

            # Refresh cart after cleanup
            cart.refresh_from_db()

            try:
                serializer = CartSerializer(cart, context={"request": request})
                data = serializer.data
            except Exception as serializer_error:
                logger.exception(f"Error serializing cart {cart.id}: {serializer_error}")
                # Return basic cart data without items if serialization fails
                return Response({
                    "id": cart.id,
                    "user": request.user.id,
                    "items": [],
                    "items_count": 0,
                    "subtotal": "0.00",
                    "discount_amount": "0.00",
                    "tax_amount": "0.00",
                    "total": "0.00",
                    "coupon": None,
                    "created_at": cart.created_at.isoformat() if cart.created_at else None,
                    "updated_at": cart.updated_at.isoformat() if cart.updated_at else None,
                })

            return Response(data)
        except Exception as e:
            user_id = getattr(request.user, 'id', None) if hasattr(request, 'user') else None
            logger.exception(f"Error getting cart for user {user_id}: {e}")
            # Return empty cart structure on error
            return Response({
                "id": None,
                "user": user_id,
                "items": [],
                "items_count": 0,
                "subtotal": "0.00",
                "discount_amount": "0.00",
                "tax_amount": "0.00",
                "total": "0.00",
                "coupon": None,
                "created_at": None,
                "updated_at": None,
            })

    @action(detail=False, methods=["post"])
    def add_product(self, request):
        """
        POST /api/cart/add-product/

        Agregar producto al carrito.

        Body:
        {
            "product_id": 1,
            "quantity": 2
        }
        """
        serializer = AddProductToCartSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data["product_id"]
        quantity = serializer.validated_data["quantity"]

        # Obtener o crear carrito
        cart, _ = Cart.objects.get_or_create(tenant=request.tenant, user=request.user)

        # Obtener producto
        product = Product.objects.get(id=product_id, tenant=request.tenant)

        # Verificar si el producto ya está en el carrito
        product_ct = ContentType.objects.get_for_model(Product)
        existing_item = CartItem.objects.filter(cart=cart, content_type=product_ct, object_id=product.id).first()

        if existing_item:
            # Actualizar cantidad
            existing_item.quantity += quantity
            existing_item.save()
            item = existing_item
        else:
            # Crear nuevo item
            item = CartItem.objects.create(
                tenant=request.tenant,
                cart=cart,
                item_type="product",
                content_type=product_ct,
                object_id=product.id,
                quantity=quantity,
                unit_price=product.price,
            )

        # Retornar carrito actualizado
        try:
            cart_serializer = CartSerializer(cart, context={"request": request})
            return Response(
                {"message": "Producto agregado al carrito", "cart": cart_serializer.data}, status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.exception(f"Error serializing cart after add_product: {e}")
            return Response(
                {"message": "Producto agregado al carrito", "cart": None}, status=status.HTTP_200_OK
            )

    @action(detail=False, methods=["post"])
    def add_service(self, request):
        """
        POST /api/cart/add-service/

        Agregar servicio/cita al carrito.

        Body:
        {
            "service_id": 1,
            "appointment_id": 5
        }
        """
        serializer = AddServiceToCartSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        service_id = serializer.validated_data["service_id"]
        appointment_id = serializer.validated_data["appointment_id"]

        # Obtener o crear carrito
        cart, _ = Cart.objects.get_or_create(tenant=request.tenant, user=request.user)

        # Obtener servicio y cita
        service = Service.objects.get(id=service_id, tenant=request.tenant)
        appointment = Appointment.objects.get(id=appointment_id, tenant=request.tenant, customer=request.user)

        # Crear item
        service_ct = ContentType.objects.get_for_model(Service)
        item = CartItem.objects.create(
            tenant=request.tenant,
            cart=cart,
            item_type="service",
            content_type=service_ct,
            object_id=service.id,
            quantity=1,  # Servicios siempre cantidad 1
            unit_price=service.price,
            appointment=appointment,
        )

        # Retornar carrito actualizado
        try:
            cart_serializer = CartSerializer(cart, context={"request": request})
            return Response(
                {"message": "Servicio agregado al carrito", "cart": cart_serializer.data}, status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.exception(f"Error serializing cart after add_service: {e}")
            return Response(
                {"message": "Servicio agregado al carrito", "cart": None}, status=status.HTTP_200_OK
            )

    @action(detail=False, methods=["patch"], url_path="items/(?P<item_id>[^/.]+)")
    def update_item(self, request, item_id=None):
        """
        PATCH /api/cart/items/{id}/

        Actualizar cantidad de un item.

        Body:
        {
            "quantity": 3
        }
        """
        try:
            cart = Cart.objects.get(tenant=request.tenant, user=request.user)
            item = CartItem.objects.get(id=item_id, cart=cart)
        except (Cart.DoesNotExist, CartItem.DoesNotExist):
            return Response({"error": "Item no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Actualizar cantidad (solo para productos)
        if item.item_type == "product":
            item.quantity = serializer.validated_data["quantity"]
            item.save()
        else:
            return Response({"error": "No se puede cambiar cantidad de servicios"}, status=status.HTTP_400_BAD_REQUEST)

        # Retornar carrito actualizado
        cart_serializer = CartSerializer(cart, context={"request": request})
        return Response({"message": "Cantidad actualizada", "cart": cart_serializer.data})

    @action(detail=False, methods=["delete"], url_path="items/(?P<item_id>[^/.]+)")
    def remove_item(self, request, item_id=None):
        """
        DELETE /api/cart/items/{id}/

        Eliminar item del carrito.
        Si el item es un servicio con cita asociada, también cancela la cita.
        """
        try:
            cart = Cart.objects.get(tenant=request.tenant, user=request.user)
            item = CartItem.objects.get(id=item_id, cart=cart)
        except (Cart.DoesNotExist, CartItem.DoesNotExist):
            return Response({"error": "Item no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        # Si es un servicio con cita asociada, cancelar la cita
        if item.item_type == "service" and item.appointment:
            appointment = item.appointment
            # Solo cancelar si la cita está en estado pendiente o confirmada
            if appointment.status in ["pending", "confirmed"]:
                appointment.cancel(reason="Eliminado del carrito por el usuario")

        item.delete()

        # Retornar carrito actualizado
        cart_serializer = CartSerializer(cart, context={"request": request})
        return Response({"message": "Item eliminado", "cart": cart_serializer.data})

    @action(detail=False, methods=["post"])
    def clear(self, request):
        """
        POST /api/cart/clear/

        Vaciar el carrito.
        """
        try:
            cart = Cart.objects.get(tenant=request.tenant, user=request.user)
            cart.clear()
        except Cart.DoesNotExist:
            pass

        return Response({"message": "Carrito vaciado"})
