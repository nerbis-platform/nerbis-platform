"""
Tests de API endpoints del modulo de Gestion Comercial.

Verifica CRUD, acciones custom (receive, cancel), permisos y dashboard.
"""


import pytest
from django.utils import timezone

from ecommerce.models import Inventory
from management.models import (
    Expense,
    InventoryMovement,
    Sale,
    Supplier,
)

BASE_URL = "/api/management"


# ===================================
# PROVEEDORES
# ===================================


@pytest.mark.django_db
class TestSupplierEndpoints:
    def test_create_supplier(self, auth_admin_client):
        response = auth_admin_client.post(
            f"{BASE_URL}/suppliers/",
            {
                "name": "Nuevo Proveedor",
                "tax_id": "123456789",
                "email": "nuevo@proveedor.com",
                "phone": "3009876543",
            },
            format="json",
        )
        assert response.status_code == 201
        assert response.data["name"] == "Nuevo Proveedor"

    def test_list_suppliers(self, auth_admin_client, supplier):
        response = auth_admin_client.get(f"{BASE_URL}/suppliers/")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_retrieve_supplier(self, auth_admin_client, supplier):
        response = auth_admin_client.get(
            f"{BASE_URL}/suppliers/{supplier.id}/"
        )
        assert response.status_code == 200
        assert response.data["name"] == "Distribuidora ABC"
        # Detail serializer includes extra fields
        assert "address" in response.data

    def test_update_supplier(self, auth_admin_client, supplier):
        response = auth_admin_client.patch(
            f"{BASE_URL}/suppliers/{supplier.id}/",
            {"name": "Distribuidora XYZ"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["name"] == "Distribuidora XYZ"

    def test_delete_supplier(self, auth_admin_client, supplier):
        response = auth_admin_client.delete(
            f"{BASE_URL}/suppliers/{supplier.id}/"
        )
        assert response.status_code == 204
        assert Supplier.objects.filter(id=supplier.id).count() == 0

    def test_search_by_name(self, auth_admin_client, supplier):
        response = auth_admin_client.get(
            f"{BASE_URL}/suppliers/?search=Distribuidora"
        )
        assert response.status_code == 200
        assert response.data["count"] == 1

        response = auth_admin_client.get(
            f"{BASE_URL}/suppliers/?search=NoExiste"
        )
        assert response.data["count"] == 0

    def test_filter_by_is_active(self, auth_admin_client, supplier):
        response = auth_admin_client.get(
            f"{BASE_URL}/suppliers/?is_active=true"
        )
        assert response.data["count"] == 1

        response = auth_admin_client.get(
            f"{BASE_URL}/suppliers/?is_active=false"
        )
        assert response.data["count"] == 0


# ===================================
# ORDENES DE COMPRA
# ===================================


@pytest.mark.django_db
class TestPurchaseOrderEndpoints:
    def test_create_purchase_order(
        self, auth_admin_client, supplier, product_a, product_b
    ):
        response = auth_admin_client.post(
            f"{BASE_URL}/purchase-orders/",
            {
                "supplier": supplier.id,
                "tax_rate": "19.00",
                "items": [
                    {
                        "product": product_a.id,
                        "quantity": 10,
                        "unit_cost": "25000.00",
                    },
                    {
                        "product": product_b.id,
                        "quantity": 5,
                        "unit_cost": "40000.00",
                    },
                ],
            },
            format="json",
        )
        assert response.status_code == 201
        assert response.data["status"] == "draft"
        assert response.data["order_number"].startswith("OC-")

    def test_list_purchase_orders(self, auth_admin_client, purchase_order):
        response = auth_admin_client.get(f"{BASE_URL}/purchase-orders/")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_retrieve_purchase_order(self, auth_admin_client, purchase_order):
        response = auth_admin_client.get(
            f"{BASE_URL}/purchase-orders/{purchase_order.id}/"
        )
        assert response.status_code == 200
        assert len(response.data["items"]) == 2

    def test_receive_purchase_order(self, auth_admin_client, purchase_order):
        product_a = purchase_order.items.first().product
        inv_before = Inventory.objects.get(product=product_a).stock

        response = auth_admin_client.post(
            f"{BASE_URL}/purchase-orders/{purchase_order.id}/receive/"
        )
        assert response.status_code == 200
        assert response.data["status"] == "received"
        assert response.data["received_at"] is not None

        # Verify inventory movements were created
        movements = InventoryMovement.objects.filter(
            reference_number=purchase_order.order_number,
            movement_type="in",
            reference_type="purchase",
        )
        assert movements.count() == 2

        # Verify stock was updated
        inv_after = Inventory.objects.get(product=product_a).stock
        item_qty = purchase_order.items.filter(product=product_a).first().quantity
        assert inv_after == inv_before + item_qty

    def test_cannot_receive_already_received(
        self, auth_admin_client, purchase_order
    ):
        # First receive
        auth_admin_client.post(
            f"{BASE_URL}/purchase-orders/{purchase_order.id}/receive/"
        )
        # Second receive should fail
        response = auth_admin_client.post(
            f"{BASE_URL}/purchase-orders/{purchase_order.id}/receive/"
        )
        assert response.status_code == 400
        assert "ya fue recibida" in response.data["error"]

    def test_delete_purchase_order(self, auth_admin_client, purchase_order):
        response = auth_admin_client.delete(
            f"{BASE_URL}/purchase-orders/{purchase_order.id}/"
        )
        assert response.status_code == 204


# ===================================
# VENTAS
# ===================================


@pytest.mark.django_db
class TestSaleEndpoints:
    def test_create_sale_confirmed(
        self, auth_admin_client, product_a, product_b
    ):
        inv_a_before = Inventory.objects.get(product=product_a).stock
        inv_b_before = Inventory.objects.get(product=product_b).stock

        response = auth_admin_client.post(
            f"{BASE_URL}/sales/",
            {
                "customer_name": "Maria Garcia",
                "status": "confirmed",
                "payment_method": "cash",
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
        assert response.data["sale_number"].startswith("VTA-")
        assert response.data["status"] == "confirmed"

        # Verify stock was decremented
        inv_a_after = Inventory.objects.get(product=product_a).stock
        inv_b_after = Inventory.objects.get(product=product_b).stock
        assert inv_a_after == inv_a_before - 2
        assert inv_b_after == inv_b_before - 1

    def test_create_sale_draft_no_stock_change(
        self, auth_admin_client, product_a
    ):
        inv_before = Inventory.objects.get(product=product_a).stock

        response = auth_admin_client.post(
            f"{BASE_URL}/sales/",
            {
                "status": "draft",
                "tax_rate": "0.00",
                "items": [
                    {
                        "product": product_a.id,
                        "quantity": 5,
                        "unit_price": "50000.00",
                    },
                ],
            },
            format="json",
        )
        assert response.status_code == 201

        inv_after = Inventory.objects.get(product=product_a).stock
        assert inv_after == inv_before  # No stock change for draft

    def test_list_sales(self, auth_admin_client, sale):
        response = auth_admin_client.get(f"{BASE_URL}/sales/")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_retrieve_sale(self, auth_admin_client, sale):
        response = auth_admin_client.get(f"{BASE_URL}/sales/{sale.id}/")
        assert response.status_code == 200
        assert len(response.data["items"]) == 2

    def test_cancel_sale_restores_stock(
        self, auth_admin_client, product_a, product_b
    ):
        # Create a confirmed sale first
        auth_admin_client.post(
            f"{BASE_URL}/sales/",
            {
                "status": "confirmed",
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
        sale_obj = Sale.objects.order_by("-created_at").first()
        inv_after_sale = Inventory.objects.get(product=product_a).stock

        # Cancel the sale
        response = auth_admin_client.post(
            f"{BASE_URL}/sales/{sale_obj.id}/cancel/"
        )
        assert response.status_code == 200
        assert response.data["status"] == "cancelled"

        # Verify stock was restored
        inv_after_cancel = Inventory.objects.get(product=product_a).stock
        assert inv_after_cancel == inv_after_sale + 3

        # Verify return movements were created
        return_movements = InventoryMovement.objects.filter(
            reference_number=sale_obj.sale_number,
            reference_type="return",
            movement_type="in",
        )
        assert return_movements.count() == 1

    def test_cannot_cancel_already_cancelled(
        self, auth_admin_client, product_a
    ):
        # Create and cancel a sale
        auth_admin_client.post(
            f"{BASE_URL}/sales/",
            {
                "status": "confirmed",
                "tax_rate": "0.00",
                "items": [
                    {
                        "product": product_a.id,
                        "quantity": 1,
                        "unit_price": "50000.00",
                    },
                ],
            },
            format="json",
        )
        sale_obj = Sale.objects.order_by("-created_at").first()
        auth_admin_client.post(f"{BASE_URL}/sales/{sale_obj.id}/cancel/")

        # Try to cancel again
        response = auth_admin_client.post(
            f"{BASE_URL}/sales/{sale_obj.id}/cancel/"
        )
        assert response.status_code == 400
        assert "ya esta cancelada" in response.data["error"]

    def test_delete_sale(self, auth_admin_client, sale):
        response = auth_admin_client.delete(f"{BASE_URL}/sales/{sale.id}/")
        assert response.status_code == 204


# ===================================
# GASTOS
# ===================================


@pytest.mark.django_db
class TestExpenseEndpoints:
    def test_create_expense(
        self, auth_admin_client, expense_category, supplier
    ):
        response = auth_admin_client.post(
            f"{BASE_URL}/expenses/",
            {
                "category": expense_category.id,
                "supplier": supplier.id,
                "description": "Compra de materiales",
                "amount": "250000.00",
                "payment_method": "cash",
            },
            format="json",
        )
        assert response.status_code == 201
        assert response.data["description"] == "Compra de materiales"

    def test_list_expenses(self, auth_admin_client, expense):
        response = auth_admin_client.get(f"{BASE_URL}/expenses/")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_retrieve_expense(self, auth_admin_client, expense):
        response = auth_admin_client.get(
            f"{BASE_URL}/expenses/{expense.id}/"
        )
        assert response.status_code == 200
        assert "category_name" in response.data

    def test_update_expense(self, auth_admin_client, expense):
        response = auth_admin_client.patch(
            f"{BASE_URL}/expenses/{expense.id}/",
            {"amount": "200000.00"},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["amount"] == "200000.00"

    def test_delete_expense(self, auth_admin_client, expense):
        response = auth_admin_client.delete(
            f"{BASE_URL}/expenses/{expense.id}/"
        )
        assert response.status_code == 204
        assert Expense.objects.filter(id=expense.id).count() == 0


# ===================================
# CATEGORIAS DE GASTOS
# ===================================


@pytest.mark.django_db
class TestExpenseCategoryEndpoints:
    def test_create_category(self, auth_admin_client):
        response = auth_admin_client.post(
            f"{BASE_URL}/expense-categories/",
            {"name": "Servicios", "description": "Servicios publicos"},
            format="json",
        )
        assert response.status_code == 201
        assert response.data["name"] == "Servicios"
        assert response.data["slug"] == "servicios"

    def test_list_categories(self, auth_admin_client, expense_category):
        response = auth_admin_client.get(f"{BASE_URL}/expense-categories/")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_retrieve_category(self, auth_admin_client, expense_category):
        response = auth_admin_client.get(
            f"{BASE_URL}/expense-categories/{expense_category.id}/"
        )
        assert response.status_code == 200

    def test_update_category(self, auth_admin_client, expense_category):
        response = auth_admin_client.patch(
            f"{BASE_URL}/expense-categories/{expense_category.id}/",
            {"name": "Insumos Actualizados"},
            format="json",
        )
        assert response.status_code == 200

    def test_delete_category(self, auth_admin_client, expense_category):
        response = auth_admin_client.delete(
            f"{BASE_URL}/expense-categories/{expense_category.id}/"
        )
        assert response.status_code == 204


# ===================================
# MOVIMIENTOS DE INVENTARIO (read-only)
# ===================================


@pytest.mark.django_db
class TestInventoryMovementEndpoints:
    def test_list_movements(self, auth_admin_client, tenant_context, product_a):
        InventoryMovement.objects.create(
            tenant=tenant_context,
            product=product_a,
            movement_type="in",
            quantity=10,
            reference_type="purchase",
            reference_number="OC-TEST-001",
        )
        response = auth_admin_client.get(f"{BASE_URL}/inventory-movements/")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_retrieve_movement(
        self, auth_admin_client, tenant_context, product_a
    ):
        mov = InventoryMovement.objects.create(
            tenant=tenant_context,
            product=product_a,
            movement_type="out",
            quantity=5,
            reference_type="sale",
        )
        response = auth_admin_client.get(
            f"{BASE_URL}/inventory-movements/{mov.id}/"
        )
        assert response.status_code == 200
        assert response.data["movement_type"] == "out"

    def test_cannot_create_movement(self, auth_admin_client, product_a):
        response = auth_admin_client.post(
            f"{BASE_URL}/inventory-movements/",
            {
                "product": product_a.id,
                "movement_type": "in",
                "quantity": 10,
                "reference_type": "purchase",
            },
            format="json",
        )
        assert response.status_code == 405  # Method Not Allowed

    def test_cannot_delete_movement(
        self, auth_admin_client, tenant_context, product_a
    ):
        mov = InventoryMovement.objects.create(
            tenant=tenant_context,
            product=product_a,
            movement_type="in",
            quantity=10,
            reference_type="adjustment",
        )
        response = auth_admin_client.delete(
            f"{BASE_URL}/inventory-movements/{mov.id}/"
        )
        assert response.status_code == 405


# ===================================
# DASHBOARD
# ===================================


@pytest.mark.django_db
class TestDashboardEndpoint:
    def test_dashboard_returns_kpis(self, auth_admin_client):
        response = auth_admin_client.get(f"{BASE_URL}/dashboard/")
        assert response.status_code == 200
        assert "total_sales" in response.data
        assert "total_expenses" in response.data
        assert "gross_margin" in response.data
        assert "sales_count" in response.data
        assert "low_stock_products" in response.data
        assert "top_products" in response.data

    def test_dashboard_with_date_range(self, auth_admin_client):
        today = timezone.now().date()
        response = auth_admin_client.get(
            f"{BASE_URL}/dashboard/",
            {
                "start_date": today.isoformat(),
                "end_date": today.isoformat(),
            },
        )
        assert response.status_code == 200

    def test_dashboard_invalid_date(self, auth_admin_client):
        response = auth_admin_client.get(
            f"{BASE_URL}/dashboard/?start_date=invalid"
        )
        assert response.status_code == 400

    def test_dashboard_start_after_end(self, auth_admin_client):
        response = auth_admin_client.get(
            f"{BASE_URL}/dashboard/?start_date=2026-12-31&end_date=2026-01-01"
        )
        assert response.status_code == 400


# ===================================
# PERMISOS
# ===================================


@pytest.mark.django_db
class TestPermissions:
    def test_customer_gets_403(self, auth_customer_client):
        endpoints = [
            f"{BASE_URL}/suppliers/",
            f"{BASE_URL}/purchase-orders/",
            f"{BASE_URL}/sales/",
            f"{BASE_URL}/expenses/",
            f"{BASE_URL}/expense-categories/",
            f"{BASE_URL}/inventory-movements/",
            f"{BASE_URL}/dashboard/",
        ]
        for url in endpoints:
            response = auth_customer_client.get(url)
            assert response.status_code == 403, (
                f"Expected 403 for customer on {url}, got {response.status_code}"
            )

    def test_unauthenticated_gets_401(self, api_client):
        endpoints = [
            f"{BASE_URL}/suppliers/",
            f"{BASE_URL}/purchase-orders/",
            f"{BASE_URL}/sales/",
            f"{BASE_URL}/expenses/",
            f"{BASE_URL}/expense-categories/",
            f"{BASE_URL}/inventory-movements/",
            f"{BASE_URL}/dashboard/",
        ]
        for url in endpoints:
            response = api_client.get(url)
            assert response.status_code == 401, (
                f"Expected 401 for unauthenticated on {url}, "
                f"got {response.status_code}"
            )
