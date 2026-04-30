"""
Tests de aislamiento multi-tenant del modulo de Gestion Comercial.

Verifica que los datos de un tenant NO son visibles para otro tenant.
"""

from decimal import Decimal

import pytest

from management.models import (
    Expense,
    InventoryMovement,
    Sale,
    SaleItem,
)

BASE_URL = "/api/management"


@pytest.mark.django_db
class TestTenantIsolation:
    """Datos creados en tenant A no deben ser visibles desde tenant B."""

    def test_supplier_isolation(
        self, auth_admin_client, supplier, other_tenant_client
    ):
        # Tenant A sees its supplier
        response = auth_admin_client.get(f"{BASE_URL}/suppliers/")
        assert response.data["count"] == 1

        # Tenant B cannot see tenant A's supplier
        response = other_tenant_client.get(f"{BASE_URL}/suppliers/")
        assert response.data["count"] == 0

        # Tenant B cannot retrieve tenant A's supplier by ID
        response = other_tenant_client.get(
            f"{BASE_URL}/suppliers/{supplier.id}/"
        )
        assert response.status_code == 404

    def test_purchase_order_isolation(
        self, auth_admin_client, purchase_order, other_tenant_client
    ):
        response = auth_admin_client.get(f"{BASE_URL}/purchase-orders/")
        assert response.data["count"] == 1

        response = other_tenant_client.get(f"{BASE_URL}/purchase-orders/")
        assert response.data["count"] == 0

        response = other_tenant_client.get(
            f"{BASE_URL}/purchase-orders/{purchase_order.id}/"
        )
        assert response.status_code == 404

    def test_sale_isolation(
        self, auth_admin_client, sale, other_tenant_client
    ):
        response = auth_admin_client.get(f"{BASE_URL}/sales/")
        assert response.data["count"] == 1

        response = other_tenant_client.get(f"{BASE_URL}/sales/")
        assert response.data["count"] == 0

        response = other_tenant_client.get(
            f"{BASE_URL}/sales/{sale.id}/"
        )
        assert response.status_code == 404

    def test_expense_isolation(
        self, auth_admin_client, expense, other_tenant_client
    ):
        response = auth_admin_client.get(f"{BASE_URL}/expenses/")
        assert response.data["count"] == 1

        response = other_tenant_client.get(f"{BASE_URL}/expenses/")
        assert response.data["count"] == 0

        response = other_tenant_client.get(
            f"{BASE_URL}/expenses/{expense.id}/"
        )
        assert response.status_code == 404

    def test_inventory_movement_isolation(
        self, auth_admin_client, tenant_context, product_a, other_tenant_client
    ):
        InventoryMovement.objects.create(
            tenant=tenant_context,
            product=product_a,
            movement_type="in",
            quantity=10,
            reference_type="purchase",
        )

        response = auth_admin_client.get(f"{BASE_URL}/inventory-movements/")
        assert response.data["count"] == 1

        response = other_tenant_client.get(
            f"{BASE_URL}/inventory-movements/"
        )
        assert response.data["count"] == 0

    def test_dashboard_only_shows_own_tenant_data(
        self, auth_admin_client, other_tenant_client, other_tenant,
        tenant_context, expense_category, product_a,
    ):
        # Create a confirmed sale in tenant A
        sale_a = Sale.objects.create(
            tenant=tenant_context,
            status="confirmed",
            total=Decimal("100000.00"),
        )
        SaleItem.objects.create(
            tenant=tenant_context,
            sale=sale_a,
            product=product_a,
            quantity=1,
            unit_price=Decimal("100000.00"),
            cost_price_at_sale=Decimal("50000.00"),
        )

        # Create expense in tenant A
        cat_a = expense_category
        Expense.objects.create(
            tenant=tenant_context,
            category=cat_a,
            description="Gasto tenant A",
            amount=Decimal("50000.00"),
        )

        # Tenant A dashboard should show data
        response_a = auth_admin_client.get(f"{BASE_URL}/dashboard/")
        assert response_a.status_code == 200
        assert Decimal(response_a.data["total_sales"]) > 0

        # Tenant B dashboard should show zeros
        # Need to create category in tenant B for the query to work
        response_b = other_tenant_client.get(f"{BASE_URL}/dashboard/")
        assert response_b.status_code == 200
        assert Decimal(response_b.data["total_sales"]) == 0
        assert Decimal(response_b.data["total_expenses"]) == 0
