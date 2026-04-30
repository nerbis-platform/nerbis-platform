"""
Fixtures especificas del modulo de Gestion Comercial.

Provee datos de prueba para categorias de gastos, proveedores,
ordenes de compra, ventas, gastos e inventario.
"""

from decimal import Decimal

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.context import clear_current_tenant, set_current_tenant
from core.models import Tenant, User
from ecommerce.models import Inventory, Product, ProductCategory
from management.models import (
    Expense,
    ExpenseCategory,
    PurchaseOrder,
    PurchaseOrderItem,
    Sale,
    SaleItem,
    Supplier,
)

# ===================================
# TENANT B (para tests de aislamiento)
# ===================================


@pytest.fixture()
def other_tenant(db):
    """Segundo tenant para tests de aislamiento multi-tenant."""
    return Tenant.objects.create(
        name="Other Tenant",
        slug="other-tenant",
        schema_name="other_tenant_db",
        industry="gym",
        email="other@tenant.com",
        phone="987654321",
        country="Colombia",
        plan="trial",
    )


@pytest.fixture()
def other_tenant_admin(other_tenant):
    """Usuario admin del segundo tenant."""
    return User.objects.create_user(
        email="admin@other.com",
        password="Admin123!",
        username="admin_other",
        first_name="Admin",
        last_name="Other",
        tenant=other_tenant,
        role="admin",
    )


@pytest.fixture()
def other_tenant_client(other_tenant, other_tenant_admin):
    """APIClient autenticado como admin del segundo tenant."""
    set_current_tenant(other_tenant)
    client = APIClient()
    client.defaults["HTTP_X_TENANT_SLUG"] = other_tenant.slug
    refresh = RefreshToken.for_user(other_tenant_admin)
    refresh["tenant_id"] = str(other_tenant.id)
    refresh["tenant_slug"] = other_tenant.slug
    refresh["role"] = other_tenant_admin.role
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    yield client
    clear_current_tenant()


# ===================================
# CATEGORIAS Y PROVEEDORES
# ===================================


@pytest.fixture()
def expense_category(tenant_context):
    """Categoria de gasto para el tenant de prueba."""
    return ExpenseCategory.objects.create(
        tenant=tenant_context,
        name="Insumos",
        description="Insumos del negocio",
    )


@pytest.fixture()
def supplier(tenant_context):
    """Proveedor para el tenant de prueba."""
    return Supplier.objects.create(
        tenant=tenant_context,
        name="Distribuidora ABC",
        tax_id="900123456-1",
        email="ventas@abc.com",
        phone="3001234567",
        address="Calle 123",
        city="Bogota",
        country="Colombia",
        notes="Proveedor principal",
    )


@pytest.fixture()
def other_tenant_supplier(other_tenant):
    """Proveedor del segundo tenant (para tests de aislamiento)."""
    return Supplier.objects.create(
        tenant=other_tenant,
        name="Proveedor Otro Tenant",
        tax_id="800111222-3",
        email="otro@proveedor.com",
    )


# ===================================
# PRODUCTOS E INVENTARIO
# ===================================


@pytest.fixture()
def product_category(tenant_context):
    """Categoria de producto para el tenant de prueba."""
    return ProductCategory.objects.create(
        tenant=tenant_context,
        name="Cosmeticos",
        slug="cosmeticos",
    )


@pytest.fixture()
def product_a(tenant_context, product_category):
    """Producto A con inventario."""
    product = Product.objects.create(
        tenant=tenant_context,
        name="Crema Hidratante",
        slug="crema-hidratante",
        sku="PROD-A",
        category=product_category,
        price=Decimal("50000.00"),
        cost_price=Decimal("25000.00"),
    )
    Inventory.objects.create(
        tenant=tenant_context,
        product=product,
        stock=100,
        low_stock_threshold=10,
        track_inventory=True,
    )
    return product


@pytest.fixture()
def product_b(tenant_context, product_category):
    """Producto B con inventario."""
    product = Product.objects.create(
        tenant=tenant_context,
        name="Serum Vitamina C",
        slug="serum-vitamina-c",
        sku="PROD-B",
        category=product_category,
        price=Decimal("80000.00"),
        cost_price=Decimal("40000.00"),
    )
    Inventory.objects.create(
        tenant=tenant_context,
        product=product,
        stock=50,
        low_stock_threshold=5,
        track_inventory=True,
    )
    return product


# ===================================
# ORDENES DE COMPRA
# ===================================


@pytest.fixture()
def purchase_order(tenant_context, supplier, product_a, product_b):
    """Orden de compra con 2 items."""
    po = PurchaseOrder.objects.create(
        tenant=tenant_context,
        supplier=supplier,
        status="draft",
        subtotal=Decimal("500000.00"),
        total=Decimal("500000.00"),
    )
    PurchaseOrderItem.objects.create(
        tenant=tenant_context,
        purchase_order=po,
        product=product_a,
        quantity=10,
        unit_cost=Decimal("25000.00"),
    )
    PurchaseOrderItem.objects.create(
        tenant=tenant_context,
        purchase_order=po,
        product=product_b,
        quantity=5,
        unit_cost=Decimal("40000.00"),
    )
    return po


# ===================================
# VENTAS
# ===================================


@pytest.fixture()
def sale(tenant_context, product_a, product_b):
    """Venta con 2 items (status=confirmed, stock ya decrementado)."""
    s = Sale.objects.create(
        tenant=tenant_context,
        status="confirmed",
        customer_name="Juan Perez",
        customer_email="juan@example.com",
        payment_method="cash",
        subtotal=Decimal("210000.00"),
        total=Decimal("210000.00"),
    )
    SaleItem.objects.create(
        tenant=tenant_context,
        sale=s,
        product=product_a,
        quantity=2,
        unit_price=Decimal("50000.00"),
        cost_price_at_sale=Decimal("25000.00"),
    )
    SaleItem.objects.create(
        tenant=tenant_context,
        sale=s,
        product=product_b,
        quantity=1,
        unit_price=Decimal("80000.00"),
        cost_price_at_sale=Decimal("40000.00"),
    )
    return s


# ===================================
# GASTOS
# ===================================


@pytest.fixture()
def expense(tenant_context, expense_category, supplier):
    """Gasto de prueba con categoria y proveedor."""
    return Expense.objects.create(
        tenant=tenant_context,
        category=expense_category,
        supplier=supplier,
        description="Compra de insumos",
        amount=Decimal("150000.00"),
        payment_method="transfer",
    )
