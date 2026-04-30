"""
Tests de modelos del modulo de Gestion Comercial.

Verifica:
- Creacion y __str__ de cada modelo
- Auto-numeracion de PurchaseOrder y Sale
- Calculo automatico de totales en items
- Captura de cost_price_at_sale en SaleItem
"""

from decimal import Decimal

import pytest
from django.utils import timezone

from management.models import (
    Expense,
    ExpenseCategory,
    InventoryMovement,
    PurchaseOrder,
    PurchaseOrderItem,
    Sale,
    SaleItem,
)


@pytest.mark.django_db
class TestExpenseCategory:
    def test_create_and_str(self, expense_category):
        assert str(expense_category) == "Insumos"
        assert expense_category.is_active is True
        assert expense_category.slug == "insumos"

    def test_auto_slug_generation(self, tenant_context):
        cat = ExpenseCategory.objects.create(
            tenant=tenant_context,
            name="Servicios Publicos",
        )
        assert cat.slug == "servicios-publicos"


@pytest.mark.django_db
class TestSupplier:
    def test_create_with_all_fields(self, supplier):
        assert str(supplier) == "Distribuidora ABC"
        assert supplier.tax_id == "900123456-1"
        assert supplier.email == "ventas@abc.com"
        assert supplier.phone == "3001234567"
        assert supplier.address == "Calle 123"
        assert supplier.city == "Bogota"
        assert supplier.country == "Colombia"
        assert supplier.notes == "Proveedor principal"
        assert supplier.is_active is True


@pytest.mark.django_db
class TestPurchaseOrder:
    def test_auto_numbering_format(self, tenant_context, supplier):
        po = PurchaseOrder.objects.create(
            tenant=tenant_context,
            supplier=supplier,
        )
        now = timezone.now()
        expected_prefix = f"OC-{now.strftime('%Y%m')}-"
        assert po.order_number.startswith(expected_prefix)
        # Debe terminar en 3 digitos
        seq = po.order_number.split("-")[-1]
        assert len(seq) == 3

    def test_sequential_numbering(self, tenant_context, supplier):
        po1 = PurchaseOrder.objects.create(
            tenant=tenant_context,
            supplier=supplier,
        )
        po2 = PurchaseOrder.objects.create(
            tenant=tenant_context,
            supplier=supplier,
        )
        seq1 = int(po1.order_number.split("-")[-1])
        seq2 = int(po2.order_number.split("-")[-1])
        assert seq2 == seq1 + 1

    def test_str_representation(self, purchase_order, supplier):
        assert supplier.name in str(purchase_order)


@pytest.mark.django_db
class TestPurchaseOrderItem:
    def test_total_calculation(self, tenant_context, supplier, product_a):
        po = PurchaseOrder.objects.create(
            tenant=tenant_context,
            supplier=supplier,
        )
        item = PurchaseOrderItem.objects.create(
            tenant=tenant_context,
            purchase_order=po,
            product=product_a,
            quantity=5,
            unit_cost=Decimal("25000.00"),
        )
        assert item.total == Decimal("125000.00")

    def test_str_representation(self, tenant_context, supplier, product_a):
        po = PurchaseOrder.objects.create(
            tenant=tenant_context,
            supplier=supplier,
        )
        item = PurchaseOrderItem.objects.create(
            tenant=tenant_context,
            purchase_order=po,
            product=product_a,
            quantity=3,
            unit_cost=Decimal("10000.00"),
        )
        assert "x3" in str(item)
        assert product_a.name in str(item)


@pytest.mark.django_db
class TestSale:
    def test_auto_numbering_format(self, tenant_context):
        sale = Sale.objects.create(
            tenant=tenant_context,
        )
        now = timezone.now()
        expected_prefix = f"VTA-{now.strftime('%Y%m')}-"
        assert sale.sale_number.startswith(expected_prefix)
        seq = sale.sale_number.split("-")[-1]
        assert len(seq) == 3

    def test_sequential_numbering(self, tenant_context):
        s1 = Sale.objects.create(tenant=tenant_context)
        s2 = Sale.objects.create(tenant=tenant_context)
        seq1 = int(s1.sale_number.split("-")[-1])
        seq2 = int(s2.sale_number.split("-")[-1])
        assert seq2 == seq1 + 1

    def test_str_representation(self, tenant_context):
        sale = Sale.objects.create(
            tenant=tenant_context,
            total=Decimal("100000.00"),
        )
        assert "$" in str(sale)
        assert sale.sale_number in str(sale)


@pytest.mark.django_db
class TestSaleItem:
    def test_total_calculation(self, tenant_context, product_a):
        sale = Sale.objects.create(tenant=tenant_context)
        item = SaleItem.objects.create(
            tenant=tenant_context,
            sale=sale,
            product=product_a,
            quantity=3,
            unit_price=Decimal("50000.00"),
        )
        assert item.total == Decimal("150000.00")

    def test_cost_price_at_sale_captures_product_cost(
        self, tenant_context, product_a
    ):
        sale = Sale.objects.create(tenant=tenant_context)
        item = SaleItem.objects.create(
            tenant=tenant_context,
            sale=sale,
            product=product_a,
            quantity=1,
            unit_price=Decimal("50000.00"),
            cost_price_at_sale=product_a.cost_price,
        )
        assert item.cost_price_at_sale == Decimal("25000.00")

    def test_str_representation(self, tenant_context, product_a):
        sale = Sale.objects.create(tenant=tenant_context)
        item = SaleItem.objects.create(
            tenant=tenant_context,
            sale=sale,
            product=product_a,
            quantity=2,
            unit_price=Decimal("50000.00"),
        )
        assert "x2" in str(item)
        assert product_a.name in str(item)


@pytest.mark.django_db
class TestInventoryMovement:
    def test_create(self, tenant_context, product_a):
        movement = InventoryMovement.objects.create(
            tenant=tenant_context,
            product=product_a,
            movement_type="in",
            quantity=10,
            reference_type="purchase",
            reference_number="OC-202604-001",
            notes="Recepcion de compra",
        )
        assert movement.movement_type == "in"
        assert movement.quantity == 10
        assert movement.reference_type == "purchase"

    def test_str_representation(self, tenant_context, product_a):
        movement = InventoryMovement.objects.create(
            tenant=tenant_context,
            product=product_a,
            movement_type="out",
            quantity=5,
            reference_type="sale",
        )
        assert "Salida" in str(movement)
        assert product_a.name in str(movement)
        assert "x5" in str(movement)


@pytest.mark.django_db
class TestExpense:
    def test_create_with_category_and_supplier(self, expense):
        assert expense.category.name == "Insumos"
        assert expense.supplier.name == "Distribuidora ABC"
        assert expense.amount == Decimal("150000.00")
        assert expense.payment_method == "transfer"

    def test_create_without_supplier(self, tenant_context, expense_category):
        exp = Expense.objects.create(
            tenant=tenant_context,
            category=expense_category,
            description="Pago de arriendo",
            amount=Decimal("2000000.00"),
        )
        assert exp.supplier is None

    def test_str_representation(self, expense):
        assert "Compra de insumos" in str(expense)
        assert "$" in str(expense)
