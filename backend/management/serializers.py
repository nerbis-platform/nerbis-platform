# backend/management/serializers.py
"""
Serializers para el modulo de Gestion Comercial.

Incluye serializers para:
- Categorias de gastos
- Proveedores
- Ordenes de compra (con items nested)
- Ventas (con items nested)
- Gastos
- Movimientos de inventario (read-only)
- Dashboard KPIs (read-only)
"""

from decimal import Decimal

from django.db import transaction
from django.db.models import F, Sum
from rest_framework import serializers

from ecommerce.models import Inventory

from .models import (
    Expense,
    ExpenseCategory,
    InventoryMovement,
    PurchaseOrder,
    PurchaseOrderItem,
    Sale,
    SaleItem,
    Supplier,
)

# ===================================
# CATEGORIAS DE GASTOS
# ===================================


class ExpenseCategorySerializer(serializers.ModelSerializer):
    """Serializer para categorias de gastos."""

    class Meta:
        model = ExpenseCategory
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]


# ===================================
# PROVEEDORES
# ===================================


class SupplierListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listar proveedores."""

    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "tax_id",
            "email",
            "phone",
            "is_active",
        ]


class SupplierDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle de proveedor."""

    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "tax_id",
            "email",
            "phone",
            "address",
            "city",
            "country",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ===================================
# ORDENES DE COMPRA
# ===================================


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """Serializer de lectura para items de orden de compra."""

    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "quantity",
            "unit_cost",
            "total",
        ]
        read_only_fields = ["id", "total"]


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listar ordenes de compra."""

    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "order_number",
            "supplier",
            "supplier_name",
            "status",
            "status_display",
            "total",
            "ordered_at",
        ]


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle de orden de compra."""

    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )
    items = PurchaseOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "order_number",
            "supplier",
            "supplier_name",
            "status",
            "status_display",
            "subtotal",
            "tax_rate",
            "tax_amount",
            "total",
            "notes",
            "ordered_at",
            "received_at",
            "expected_at",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "order_number",
            "created_at",
            "updated_at",
        ]


class PurchaseOrderItemWriteSerializer(serializers.Serializer):
    """Serializer para escritura de items nested en PO create/update."""

    id = serializers.IntegerField(required=False)
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_cost = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0")
    )


class PurchaseOrderCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear/actualizar ordenes de compra con items nested.

    Crea la PO y sus items en una sola transaccion.
    """

    items = PurchaseOrderItemWriteSerializer(many=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "supplier",
            "status",
            "tax_rate",
            "notes",
            "ordered_at",
            "expected_at",
            "items",
        ]

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError(
                "La orden debe tener al menos un item."
            )
        return value

    def validate_supplier(self, value):
        """Verificar que el proveedor pertenece al mismo tenant."""
        request = self.context.get("request")
        if request and value.tenant != request.tenant:
            raise serializers.ValidationError("Proveedor no encontrado.")
        return value

    def _calculate_totals(self, items_data: list[dict], tax_rate: Decimal) -> dict:
        """Calcula subtotal, tax_amount y total a partir de los items."""
        subtotal = sum(
            item["quantity"] * item["unit_cost"] for item in items_data
        )
        tax_amount = subtotal * tax_rate / Decimal("100")
        total = subtotal + tax_amount
        return {
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "total": total,
        }

    def _validate_products(self, items_data: list[dict], tenant) -> dict:
        """Valida que todos los productos existen y pertenecen al tenant."""
        from ecommerce.models import Product

        product_ids = [item["product"] for item in items_data]
        products = Product.objects.filter(
            id__in=product_ids, tenant=tenant
        )
        products_map = {p.id: p for p in products}

        missing = set(product_ids) - set(products_map.keys())
        if missing:
            raise serializers.ValidationError(
                {"items": f"Productos no encontrados: {missing}"}
            )
        return products_map

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        tenant = self.context["request"].tenant
        tax_rate = validated_data.get("tax_rate", Decimal("0"))

        products_map = self._validate_products(items_data, tenant)
        totals = self._calculate_totals(items_data, tax_rate)
        validated_data.update(totals)

        po = PurchaseOrder(**validated_data)
        po.tenant = tenant
        po.save()

        for item_data in items_data:
            product = products_map[item_data["product"]]
            PurchaseOrderItem.objects.create(
                tenant=tenant,
                purchase_order=po,
                product=product,
                quantity=item_data["quantity"],
                unit_cost=item_data["unit_cost"],
            )

        return po

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        tenant = self.context["request"].tenant

        if instance.status == "received":
            raise serializers.ValidationError(
                "No se puede editar una orden ya recibida."
            )

        tax_rate = validated_data.get("tax_rate", instance.tax_rate)

        if items_data is not None:
            products_map = self._validate_products(items_data, tenant)
            totals = self._calculate_totals(items_data, tax_rate)
            validated_data.update(totals)

            # Reemplazar items existentes
            instance.items.all().delete()
            for item_data in items_data:
                product = products_map[item_data["product"]]
                PurchaseOrderItem.objects.create(
                    tenant=tenant,
                    purchase_order=instance,
                    product=product,
                    quantity=item_data["quantity"],
                    unit_cost=item_data["unit_cost"],
                )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# ===================================
# VENTAS
# ===================================


class SaleItemSerializer(serializers.ModelSerializer):
    """Serializer de lectura para items de venta."""

    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "quantity",
            "unit_price",
            "cost_price_at_sale",
            "total",
        ]
        read_only_fields = ["id", "total", "cost_price_at_sale"]


class SaleListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listar ventas."""

    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )

    class Meta:
        model = Sale
        fields = [
            "id",
            "sale_number",
            "customer_name",
            "status",
            "status_display",
            "total",
            "sold_at",
        ]


class SaleDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle de venta."""

    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )
    payment_method_display = serializers.CharField(
        source="get_payment_method_display", read_only=True
    )
    items = SaleItemSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "sale_number",
            "customer_name",
            "customer_email",
            "customer_phone",
            "status",
            "status_display",
            "payment_method",
            "payment_method_display",
            "subtotal",
            "tax_rate",
            "tax_amount",
            "total",
            "notes",
            "sold_at",
            "paid_at",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "sale_number",
            "created_at",
            "updated_at",
        ]


class SaleItemWriteSerializer(serializers.Serializer):
    """Serializer para escritura de items nested en Sale create/update."""

    id = serializers.IntegerField(required=False)
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0")
    )


class SaleCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear/actualizar ventas con items nested.

    En create con status confirmed/completed: decrementa stock.
    En cancel: restaura stock.
    """

    items = SaleItemWriteSerializer(many=True)

    class Meta:
        model = Sale
        fields = [
            "customer_name",
            "customer_email",
            "customer_phone",
            "status",
            "payment_method",
            "tax_rate",
            "notes",
            "sold_at",
            "paid_at",
            "items",
        ]

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError(
                "La venta debe tener al menos un item."
            )
        return value

    def _calculate_totals(self, items_data: list[dict], tax_rate: Decimal) -> dict:
        """Calcula subtotal, tax_amount y total a partir de los items."""
        subtotal = sum(
            item["quantity"] * item["unit_price"] for item in items_data
        )
        tax_amount = subtotal * tax_rate / Decimal("100")
        total = subtotal + tax_amount
        return {
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "total": total,
        }

    def _validate_products(self, items_data: list[dict], tenant) -> dict:
        """Valida que todos los productos existen y pertenecen al tenant."""
        from ecommerce.models import Product

        product_ids = [item["product"] for item in items_data]
        products = Product.objects.filter(
            id__in=product_ids, tenant=tenant
        )
        products_map = {p.id: p for p in products}

        missing = set(product_ids) - set(products_map.keys())
        if missing:
            raise serializers.ValidationError(
                {"items": f"Productos no encontrados: {missing}"}
            )
        return products_map

    def _decrease_stock(self, items_data: list[dict], products_map: dict, tenant, sale):
        """Decrementa stock y crea movimientos de inventario (salida)."""
        for item_data in items_data:
            product = products_map[item_data["product"]]
            quantity = item_data["quantity"]

            # Decrementar stock con F() expression
            Inventory.objects.filter(
                product=product, tenant=tenant
            ).update(
                stock=F("stock") - quantity,
                total_sold=F("total_sold") + quantity,
            )

            # Crear movimiento de inventario
            InventoryMovement.objects.create(
                tenant=tenant,
                product=product,
                movement_type="out",
                quantity=quantity,
                reference_type="sale",
                reference_number=sale.sale_number,
                notes=f"Venta {sale.sale_number}",
            )

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        tenant = self.context["request"].tenant
        tax_rate = validated_data.get("tax_rate", Decimal("0"))
        status = validated_data.get("status", "draft")

        products_map = self._validate_products(items_data, tenant)
        totals = self._calculate_totals(items_data, tax_rate)
        validated_data.update(totals)

        sale = Sale(**validated_data)
        sale.tenant = tenant
        sale.save()

        for item_data in items_data:
            product = products_map[item_data["product"]]
            SaleItem.objects.create(
                tenant=tenant,
                sale=sale,
                product=product,
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                cost_price_at_sale=getattr(product, "cost_price", None),
            )

        # Decrementar stock si la venta esta confirmada o completada
        if status in ("confirmed", "completed"):
            self._decrease_stock(items_data, products_map, tenant, sale)

        return sale

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        tenant = self.context["request"].tenant

        if instance.status == "cancelled":
            raise serializers.ValidationError(
                "No se puede editar una venta cancelada."
            )

        tax_rate = validated_data.get("tax_rate", instance.tax_rate)

        if items_data is not None:
            products_map = self._validate_products(items_data, tenant)
            totals = self._calculate_totals(items_data, tax_rate)
            validated_data.update(totals)

            instance.items.all().delete()
            for item_data in items_data:
                product = products_map[item_data["product"]]
                SaleItem.objects.create(
                    tenant=tenant,
                    sale=instance,
                    product=product,
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    cost_price_at_sale=getattr(product, "cost_price", None),
                )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# ===================================
# GASTOS
# ===================================


class ExpenseListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listar gastos."""

    category_name = serializers.CharField(
        source="category.name", read_only=True
    )
    supplier_name = serializers.CharField(
        source="supplier.name", read_only=True, default=None
    )

    class Meta:
        model = Expense
        fields = [
            "id",
            "description",
            "amount",
            "date",
            "category",
            "category_name",
            "supplier",
            "supplier_name",
            "payment_method",
        ]


class ExpenseDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle de gasto."""

    category_name = serializers.CharField(
        source="category.name", read_only=True
    )
    supplier_name = serializers.CharField(
        source="supplier.name", read_only=True, default=None
    )
    payment_method_display = serializers.CharField(
        source="get_payment_method_display", read_only=True
    )

    class Meta:
        model = Expense
        fields = [
            "id",
            "category",
            "category_name",
            "supplier",
            "supplier_name",
            "description",
            "amount",
            "date",
            "payment_method",
            "payment_method_display",
            "reference_number",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ===================================
# MOVIMIENTOS DE INVENTARIO
# ===================================


class InventoryMovementSerializer(serializers.ModelSerializer):
    """Serializer read-only para movimientos de inventario."""

    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    movement_type_display = serializers.CharField(
        source="get_movement_type_display", read_only=True
    )
    reference_type_display = serializers.CharField(
        source="get_reference_type_display", read_only=True
    )

    class Meta:
        model = InventoryMovement
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "movement_type",
            "movement_type_display",
            "quantity",
            "reference_type",
            "reference_type_display",
            "reference_number",
            "notes",
            "moved_at",
            "created_at",
        ]
        read_only_fields = fields


# ===================================
# DASHBOARD KPIs
# ===================================


class LowStockProductSerializer(serializers.Serializer):
    """Serializer para productos con stock bajo."""

    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    product_sku = serializers.CharField()
    stock = serializers.IntegerField()
    low_stock_threshold = serializers.IntegerField()


class TopProductSerializer(serializers.Serializer):
    """Serializer para productos mas vendidos."""

    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    total_quantity = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)


class DashboardSerializer(serializers.Serializer):
    """Serializer read-only para KPIs del dashboard."""

    total_sales = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=14, decimal_places=2)
    gross_margin = serializers.DecimalField(max_digits=14, decimal_places=2)
    sales_count = serializers.IntegerField()
    low_stock_products = LowStockProductSerializer(many=True)
    top_products = TopProductSerializer(many=True)
    start_date = serializers.DateField()
    end_date = serializers.DateField()


def get_dashboard_data(tenant, start_date, end_date) -> dict:
    """
    Calcula KPIs del dashboard para un tenant y periodo.

    Se usa como funcion auxiliar invocada desde la view.
    """
    # Ventas del periodo (solo confirmadas/completadas)
    sales_qs = Sale.objects.filter(
        tenant=tenant,
        status__in=["confirmed", "completed"],
        sold_at__date__gte=start_date,
        sold_at__date__lte=end_date,
    )
    sales_agg = sales_qs.aggregate(
        total_sales=Sum("total"),
        sales_count=Sum("id", default=0),
    )
    total_sales = sales_agg["total_sales"] or Decimal("0")
    sales_count = sales_qs.count()

    # Costo de ventas (COGS) del periodo
    cogs = (
        SaleItem.objects.filter(
            tenant=tenant,
            sale__status__in=["confirmed", "completed"],
            sale__sold_at__date__gte=start_date,
            sale__sold_at__date__lte=end_date,
        )
        .aggregate(
            cogs=Sum(F("cost_price_at_sale") * F("quantity")),
        )["cogs"]
        or Decimal("0")
    )

    # Gastos del periodo
    total_expenses = (
        Expense.objects.filter(
            tenant=tenant,
            date__gte=start_date,
            date__lte=end_date,
        ).aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )

    gross_margin = total_sales - cogs

    # Productos con stock bajo
    low_stock_qs = Inventory.objects.filter(
        tenant=tenant,
        track_inventory=True,
        stock__lte=F("low_stock_threshold"),
    ).select_related("product")[:20]

    low_stock_products = [
        {
            "product_id": inv.product_id,
            "product_name": inv.product.name,
            "product_sku": inv.product.sku or "",
            "stock": inv.stock,
            "low_stock_threshold": inv.low_stock_threshold,
        }
        for inv in low_stock_qs
    ]

    # Top 5 productos por cantidad vendida en el periodo
    top_products_qs = (
        SaleItem.objects.filter(
            tenant=tenant,
            sale__status__in=["confirmed", "completed"],
            sale__sold_at__date__gte=start_date,
            sale__sold_at__date__lte=end_date,
        )
        .values("product__id", "product__name")
        .annotate(
            total_quantity=Sum("quantity"),
            total_revenue=Sum("total"),
        )
        .order_by("-total_quantity")[:5]
    )

    top_products = [
        {
            "product_id": tp["product__id"],
            "product_name": tp["product__name"],
            "total_quantity": tp["total_quantity"],
            "total_revenue": tp["total_revenue"],
        }
        for tp in top_products_qs
    ]

    return {
        "total_sales": total_sales,
        "total_expenses": total_expenses,
        "gross_margin": gross_margin,
        "sales_count": sales_count,
        "low_stock_products": low_stock_products,
        "top_products": top_products,
        "start_date": start_date,
        "end_date": end_date,
    }
