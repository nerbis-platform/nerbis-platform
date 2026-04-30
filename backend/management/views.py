# backend/management/views.py
"""
ViewSets para el modulo de Gestion Comercial.

Todos los endpoints requieren autenticacion y permisos de staff/admin del tenant.
"""

from datetime import date

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsTenantStaffOrAdmin
from ecommerce.models import Inventory

from .models import (
    Expense,
    ExpenseCategory,
    InventoryMovement,
    PurchaseOrder,
    Sale,
)
from .serializers import (
    DashboardSerializer,
    ExpenseCategorySerializer,
    ExpenseDetailSerializer,
    ExpenseListSerializer,
    InventoryMovementSerializer,
    PurchaseOrderCreateUpdateSerializer,
    PurchaseOrderDetailSerializer,
    PurchaseOrderListSerializer,
    SaleCreateUpdateSerializer,
    SaleDetailSerializer,
    SaleListSerializer,
    SupplierDetailSerializer,
    SupplierListSerializer,
    get_dashboard_data,
)

# ===================================
# CATEGORIAS DE GASTOS
# ===================================


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """
    CRUD de categorias de gastos.

    GET    /api/management/expense-categories/
    POST   /api/management/expense-categories/
    GET    /api/management/expense-categories/{id}/
    PUT    /api/management/expense-categories/{id}/
    DELETE /api/management/expense-categories/{id}/
    """

    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsTenantStaffOrAdmin]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ExpenseCategory.objects.none()
        return ExpenseCategory.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


# ===================================
# PROVEEDORES
# ===================================


class SupplierViewSet(viewsets.ModelViewSet):
    """
    CRUD de proveedores.

    GET    /api/management/suppliers/
    POST   /api/management/suppliers/
    GET    /api/management/suppliers/{id}/
    PUT    /api/management/suppliers/{id}/
    DELETE /api/management/suppliers/{id}/
    """

    permission_classes = [IsTenantStaffOrAdmin]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_active"]
    search_fields = ["name", "tax_id"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            from .models import Supplier

            return Supplier.objects.none()
        from .models import Supplier

        return Supplier.objects.filter(tenant=self.request.tenant)

    def get_serializer_class(self):
        if self.action == "list":
            return SupplierListSerializer
        if self.action == "retrieve":
            return SupplierDetailSerializer
        return SupplierDetailSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


# ===================================
# ORDENES DE COMPRA
# ===================================


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """
    CRUD de ordenes de compra con accion de recepcion.

    GET    /api/management/purchase-orders/
    POST   /api/management/purchase-orders/
    GET    /api/management/purchase-orders/{id}/
    PUT    /api/management/purchase-orders/{id}/
    DELETE /api/management/purchase-orders/{id}/
    POST   /api/management/purchase-orders/{id}/receive/
    """

    permission_classes = [IsTenantStaffOrAdmin]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["status", "supplier"]
    search_fields = ["order_number", "supplier__name"]
    ordering_fields = ["ordered_at", "created_at", "total"]
    ordering = ["-created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return PurchaseOrder.objects.none()
        queryset = PurchaseOrder.objects.filter(
            tenant=self.request.tenant
        ).select_related("supplier").prefetch_related("items__product")

        # Filtro por rango de fechas
        start_date = self.request.query_params.get("ordered_after")
        end_date = self.request.query_params.get("ordered_before")
        if start_date:
            queryset = queryset.filter(ordered_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(ordered_at__date__lte=end_date)

        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return PurchaseOrderListSerializer
        if self.action == "retrieve":
            return PurchaseOrderDetailSerializer
        return PurchaseOrderCreateUpdateSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    def create(self, request, *args, **kwargs):
        """Override create to return DetailSerializer instead of write serializer."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        detail = PurchaseOrderDetailSerializer(
            serializer.instance, context={"request": request}
        )
        return Response(detail.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        """
        POST /api/management/purchase-orders/{id}/receive/

        Marca la orden como recibida, registra fecha de recepcion,
        y crea movimientos de inventario de entrada para cada item.
        Actualiza el stock de cada producto con F() expressions.
        """
        po = self.get_object()

        if po.status == "received":
            return Response(
                {"error": "Esta orden ya fue recibida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if po.status == "cancelled":
            return Response(
                {"error": "No se puede recibir una orden cancelada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant = request.tenant

        with transaction.atomic():
            # Marcar como recibida
            po.status = "received"
            po.received_at = timezone.now()
            po.save()

            # Crear movimientos de inventario y actualizar stock
            for item in po.items.select_related("product"):
                # Crear movimiento de entrada
                InventoryMovement.objects.create(
                    tenant=tenant,
                    product=item.product,
                    movement_type="in",
                    quantity=item.quantity,
                    reference_type="purchase",
                    reference_number=po.order_number,
                    notes=f"Recepcion OC {po.order_number}",
                )

                # Incrementar stock con F() expression
                Inventory.objects.filter(
                    product=item.product, tenant=tenant
                ).update(stock=F("stock") + item.quantity)

        serializer = PurchaseOrderDetailSerializer(
            po, context={"request": request}
        )
        return Response(serializer.data)


# ===================================
# VENTAS
# ===================================


class SaleViewSet(viewsets.ModelViewSet):
    """
    CRUD de ventas con accion de cancelacion.

    GET    /api/management/sales/
    POST   /api/management/sales/
    GET    /api/management/sales/{id}/
    PUT    /api/management/sales/{id}/
    DELETE /api/management/sales/{id}/
    POST   /api/management/sales/{id}/cancel/
    """

    permission_classes = [IsTenantStaffOrAdmin]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["status", "payment_method"]
    search_fields = ["sale_number", "customer_name"]
    ordering_fields = ["sold_at", "created_at", "total"]
    ordering = ["-sold_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Sale.objects.none()
        queryset = Sale.objects.filter(
            tenant=self.request.tenant
        ).prefetch_related("items__product")

        # Filtro por rango de fechas
        start_date = self.request.query_params.get("sold_after")
        end_date = self.request.query_params.get("sold_before")
        if start_date:
            queryset = queryset.filter(sold_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(sold_at__date__lte=end_date)

        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return SaleListSerializer
        if self.action == "retrieve":
            return SaleDetailSerializer
        return SaleCreateUpdateSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    def create(self, request, *args, **kwargs):
        """Override create to return DetailSerializer instead of write serializer."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        detail = SaleDetailSerializer(
            serializer.instance, context={"request": request}
        )
        return Response(detail.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """
        POST /api/management/sales/{id}/cancel/

        Cancela la venta y restaura el stock de cada item.
        Crea movimientos de inventario de devolucion.
        """
        sale = self.get_object()

        if sale.status == "cancelled":
            return Response(
                {"error": "Esta venta ya esta cancelada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant = request.tenant
        was_confirmed = sale.status in ("confirmed", "completed")

        with transaction.atomic():
            sale.status = "cancelled"
            sale.save()

            # Restaurar stock solo si la venta habia decrementado stock
            if was_confirmed:
                for item in sale.items.select_related("product"):
                    # Crear movimiento de devolucion
                    InventoryMovement.objects.create(
                        tenant=tenant,
                        product=item.product,
                        movement_type="in",
                        quantity=item.quantity,
                        reference_type="return",
                        reference_number=sale.sale_number,
                        notes=f"Cancelacion venta {sale.sale_number}",
                    )

                    # Incrementar stock con F() expression
                    Inventory.objects.filter(
                        product=item.product, tenant=tenant
                    ).update(
                        stock=F("stock") + item.quantity,
                        total_sold=F("total_sold") - item.quantity,
                    )

        serializer = SaleDetailSerializer(
            sale, context={"request": request}
        )
        return Response(serializer.data)


# ===================================
# GASTOS
# ===================================


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    CRUD de gastos.

    GET    /api/management/expenses/
    POST   /api/management/expenses/
    GET    /api/management/expenses/{id}/
    PUT    /api/management/expenses/{id}/
    DELETE /api/management/expenses/{id}/
    """

    permission_classes = [IsTenantStaffOrAdmin]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["category", "supplier", "payment_method"]
    search_fields = ["description"]
    ordering_fields = ["date", "amount", "created_at"]
    ordering = ["-date"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Expense.objects.none()
        queryset = Expense.objects.filter(
            tenant=self.request.tenant
        ).select_related("category", "supplier")

        # Filtro por rango de fechas
        start_date = self.request.query_params.get("date_after")
        end_date = self.request.query_params.get("date_before")
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return ExpenseListSerializer
        if self.action == "retrieve":
            return ExpenseDetailSerializer
        return ExpenseDetailSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


# ===================================
# MOVIMIENTOS DE INVENTARIO
# ===================================


class InventoryMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Listado y detalle de movimientos de inventario (read-only).

    Los movimientos se crean automaticamente al recibir OC o crear/cancelar ventas.

    GET /api/management/inventory-movements/
    GET /api/management/inventory-movements/{id}/
    """

    serializer_class = InventoryMovementSerializer
    permission_classes = [IsTenantStaffOrAdmin]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["product", "movement_type", "reference_type"]
    search_fields = ["reference_number"]
    ordering_fields = ["moved_at", "created_at"]
    ordering = ["-moved_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return InventoryMovement.objects.none()
        queryset = InventoryMovement.objects.filter(
            tenant=self.request.tenant
        ).select_related("product")

        # Filtro por rango de fechas
        start_date = self.request.query_params.get("moved_after")
        end_date = self.request.query_params.get("moved_before")
        if start_date:
            queryset = queryset.filter(moved_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(moved_at__date__lte=end_date)

        return queryset


# ===================================
# DASHBOARD
# ===================================


class DashboardView(APIView):
    """
    GET /api/management/dashboard/

    Retorna KPIs agregados del negocio para un periodo.

    Query params:
    - start_date: YYYY-MM-DD (default: primer dia del mes actual)
    - end_date: YYYY-MM-DD (default: hoy)
    """

    permission_classes = [IsTenantStaffOrAdmin]

    def get(self, request):
        today = date.today()
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        try:
            start_date = (
                date.fromisoformat(start_date_str)
                if start_date_str
                else today.replace(day=1)
            )
            end_date = (
                date.fromisoformat(end_date_str)
                if end_date_str
                else today
            )
        except ValueError:
            return Response(
                {"error": "Formato de fecha invalido. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if start_date > end_date:
            return Response(
                {"error": "start_date no puede ser mayor que end_date."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = get_dashboard_data(request.tenant, start_date, end_date)
        serializer = DashboardSerializer(data)
        return Response(serializer.data)
