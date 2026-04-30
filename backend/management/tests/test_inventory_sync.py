"""
Tests de integracion para sincronizacion de inventario.

Verifica que las operaciones de compra y venta crean movimientos
de inventario y actualizan stock correctamente.
"""

from decimal import Decimal

import pytest

from ecommerce.models import Inventory, Product
from management.models import (
    InventoryMovement,
)

BASE_URL = "/api/management"


@pytest.mark.django_db
class TestPurchaseOrderInventorySync:
    """Tests de sincronizacion de inventario al recibir ordenes de compra."""

    def test_receive_creates_movements_for_each_item(
        self, auth_admin_client, purchase_order
    ):
        """Recibir una OC con N items crea N movimientos de entrada."""
        items_count = purchase_order.items.count()
        assert items_count == 2

        response = auth_admin_client.post(
            f"{BASE_URL}/purchase-orders/{purchase_order.id}/receive/"
        )
        assert response.status_code == 200

        movements = InventoryMovement.objects.filter(
            reference_number=purchase_order.order_number,
            movement_type="in",
            reference_type="purchase",
        )
        assert movements.count() == items_count

    def test_receive_updates_stock_correctly(
        self, auth_admin_client, purchase_order, product_a, product_b
    ):
        """El stock se incrementa correctamente por cada item recibido."""
        stock_a_before = Inventory.objects.get(product=product_a).stock
        stock_b_before = Inventory.objects.get(product=product_b).stock

        auth_admin_client.post(
            f"{BASE_URL}/purchase-orders/{purchase_order.id}/receive/"
        )

        stock_a_after = Inventory.objects.get(product=product_a).stock
        stock_b_after = Inventory.objects.get(product=product_b).stock

        item_a = purchase_order.items.get(product=product_a)
        item_b = purchase_order.items.get(product=product_b)

        assert stock_a_after == stock_a_before + item_a.quantity
        assert stock_b_after == stock_b_before + item_b.quantity

    def test_receive_po_with_3_items(
        self, auth_admin_client, tenant_context, supplier, product_category
    ):
        """OC con 3 items crea 3 movimientos de inventario."""
        products = []
        for i in range(3):
            p = Product.objects.create(
                tenant=tenant_context,
                name=f"Producto {i}",
                slug=f"producto-{i}",
                sku=f"SKU-{i}",
                category=product_category,
                price=Decimal("10000.00"),
            )
            Inventory.objects.create(
                tenant=tenant_context,
                product=p,
                stock=0,
            )
            products.append(p)

        response = auth_admin_client.post(
            f"{BASE_URL}/purchase-orders/",
            {
                "supplier": supplier.id,
                "tax_rate": "0.00",
                "items": [
                    {
                        "product": p.id,
                        "quantity": 10 * (i + 1),
                        "unit_cost": "5000.00",
                    }
                    for i, p in enumerate(products)
                ],
            },
            format="json",
        )
        assert response.status_code == 201
        po_id = response.data["id"]

        # Receive
        response = auth_admin_client.post(
            f"{BASE_URL}/purchase-orders/{po_id}/receive/"
        )
        assert response.status_code == 200

        movements = InventoryMovement.objects.filter(
            reference_type="purchase",
            movement_type="in",
        )
        assert movements.count() == 3

        # Verify individual stock updates
        for i, p in enumerate(products):
            stock = Inventory.objects.get(product=p).stock
            assert stock == 10 * (i + 1)


@pytest.mark.django_db
class TestSaleInventorySync:
    """Tests de sincronizacion de inventario al crear/cancelar ventas."""

    def test_sale_creates_out_movements(
        self, auth_admin_client, product_a, product_b
    ):
        """Una venta confirmada con 2 items crea 2 movimientos de salida."""
        response = auth_admin_client.post(
            f"{BASE_URL}/sales/",
            {
                "status": "confirmed",
                "tax_rate": "0.00",
                "items": [
                    {
                        "product": product_a.id,
                        "quantity": 2,
                        "unit_price": "50000.00",
                    },
                    {
                        "product": product_b.id,
                        "quantity": 1,
                        "unit_price": "80000.00",
                    },
                ],
            },
            format="json",
        )
        assert response.status_code == 201

        sale_number = response.data["sale_number"]
        movements = InventoryMovement.objects.filter(
            reference_number=sale_number,
            movement_type="out",
            reference_type="sale",
        )
        assert movements.count() == 2

    def test_sale_decreases_stock_correctly(
        self, auth_admin_client, product_a, product_b
    ):
        """El stock se decrementa correctamente al confirmar una venta."""
        stock_a_before = Inventory.objects.get(product=product_a).stock
        stock_b_before = Inventory.objects.get(product=product_b).stock

        auth_admin_client.post(
            f"{BASE_URL}/sales/",
            {
                "status": "confirmed",
                "tax_rate": "0.00",
                "items": [
                    {
                        "product": product_a.id,
                        "quantity": 5,
                        "unit_price": "50000.00",
                    },
                    {
                        "product": product_b.id,
                        "quantity": 3,
                        "unit_price": "80000.00",
                    },
                ],
            },
            format="json",
        )

        stock_a_after = Inventory.objects.get(product=product_a).stock
        stock_b_after = Inventory.objects.get(product=product_b).stock

        assert stock_a_after == stock_a_before - 5
        assert stock_b_after == stock_b_before - 3

    def test_sale_cancellation_restores_stock(
        self, auth_admin_client, product_a
    ):
        """Cancelar una venta confirmada restaura el stock al nivel previo."""
        stock_before = Inventory.objects.get(product=product_a).stock

        # Create confirmed sale
        response = auth_admin_client.post(
            f"{BASE_URL}/sales/",
            {
                "status": "confirmed",
                "tax_rate": "0.00",
                "items": [
                    {
                        "product": product_a.id,
                        "quantity": 7,
                        "unit_price": "50000.00",
                    },
                ],
            },
            format="json",
        )
        sale_id = response.data["id"]

        stock_after_sale = Inventory.objects.get(product=product_a).stock
        assert stock_after_sale == stock_before - 7

        # Cancel sale
        auth_admin_client.post(f"{BASE_URL}/sales/{sale_id}/cancel/")

        stock_after_cancel = Inventory.objects.get(product=product_a).stock
        assert stock_after_cancel == stock_before  # Restored

    def test_draft_sale_cancel_does_not_change_stock(
        self, auth_admin_client, product_a
    ):
        """Cancelar una venta en borrador no modifica el stock."""
        stock_before = Inventory.objects.get(product=product_a).stock

        response = auth_admin_client.post(
            f"{BASE_URL}/sales/",
            {
                "status": "draft",
                "tax_rate": "0.00",
                "items": [
                    {
                        "product": product_a.id,
                        "quantity": 3,
                        "unit_price": "50000.00",
                    },
                ],
            },
            format="json",
        )
        sale_id = response.data["id"]

        # Cancel draft
        auth_admin_client.post(f"{BASE_URL}/sales/{sale_id}/cancel/")

        stock_after = Inventory.objects.get(product=product_a).stock
        assert stock_after == stock_before  # No change
