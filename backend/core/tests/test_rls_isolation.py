"""
Tests de aislamiento RLS (Row Level Security) cross-tenant.

Verifican que las politicas RLS de PostgreSQL impiden que un tenant
vea, modifique o elimine datos de otro tenant a nivel de base de datos,
incluso bypaseando el TenantAwareManager con SQL directo.

Los tests usan SET ROLE nerbis_app para simular un usuario no-owner,
ya que el owner/superuser de PostgreSQL siempre bypassea RLS.

Requisitos:
- PostgreSQL (skip automatico en SQLite)
- Migracion 0041_enable_row_level_security aplicada
- Migracion 0043_create_nerbis_app_role aplicada

Ejecutar:
    python -m pytest core/tests/test_rls_isolation.py -v
"""

import uuid
from decimal import Decimal

import pytest
from django.db import connection
from django.test import TestCase

from core.models import Banner, Tenant, User
from ecommerce.models import Product, ProductCategory
from orders.models import Order, Payment


def _is_postgres() -> bool:
    return connection.vendor == "postgresql"


def _rls_is_enabled() -> bool:
    if not _is_postgres():
        return False
    with connection.cursor() as cursor:
        cursor.execute("SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'core_banner'")
        row = cursor.fetchone()
        return row is not None and row[0] is True


def _role_exists(role_name: str) -> bool:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", [role_name])
        return cursor.fetchone() is not None


def _exec_as_app(sql: str, params=None, tenant_id=None) -> list:
    """
    Ejecuta SQL como rol nerbis_app (no-owner, sujeto a RLS).

    Usa SET (session-level) porque los tests corren en autocommit
    y SET LOCAL no persiste entre statements.
    """
    results = []
    with connection.cursor() as cursor:
        cursor.execute("SET ROLE nerbis_app")
        try:
            if tenant_id:
                cursor.execute(
                    "SELECT set_config('app.current_tenant_id', %s, false)",
                    [str(tenant_id)],
                )
            else:
                cursor.execute("SELECT set_config('app.current_tenant_id', '', false)")
            cursor.execute(sql, params)
            if cursor.description:
                results = cursor.fetchall()
            else:
                # Para UPDATE/DELETE, guardar rowcount
                results = cursor.rowcount
        finally:
            cursor.execute("RESET ROLE")
            cursor.execute("SELECT set_config('app.current_tenant_id', '', false)")
    return results


def _count_as_app(table: str, tenant_id=None) -> int:
    rows = _exec_as_app(f"SELECT count(*) FROM {table}", tenant_id=tenant_id)  # noqa: S608
    return rows[0][0]


@pytest.mark.skipif(not _is_postgres(), reason="RLS solo funciona en PostgreSQL")
class RLSTestMixin:
    """Mixin con setup comun para tests de aislamiento RLS."""

    def setUp(self):
        super().setUp()
        if not _rls_is_enabled():
            self.skipTest("RLS no esta habilitado (migracion RLS pendiente)")
        if not _role_exists("nerbis_app"):
            self.skipTest("Rol nerbis_app no existe (migracion 0043 pendiente)")

        suffix = uuid.uuid4().hex[:8]
        self.tenant_a = Tenant.objects.create(
            name="Tenant A RLS",
            slug=f"rls-a-{suffix}",
        )
        self.tenant_b = Tenant.objects.create(
            name="Tenant B RLS",
            slug=f"rls-b-{suffix}",
        )
        self.user_a = User.objects.create_user(
            email=f"rls-a-{suffix}@test.com",
            password="testpass123",
            username=f"rls_a_{suffix}",
            tenant=self.tenant_a,
        )
        self.user_b = User.objects.create_user(
            email=f"rls-b-{suffix}@test.com",
            password="testpass123",
            username=f"rls_b_{suffix}",
            tenant=self.tenant_b,
        )

    def tearDown(self):
        with connection.cursor() as cursor:
            cursor.execute("RESET ROLE")
            cursor.execute("SELECT set_config('app.current_tenant_id', '', false)")
        super().tearDown()


# ---------------------------------------------------------------------------
# Test 1: Aislamiento SELECT con Banner
# ---------------------------------------------------------------------------
@pytest.mark.django_db(transaction=True)
class TestRLSBannerIsolation(RLSTestMixin, TestCase):
    """Verificar que RLS aisla banners entre tenants."""

    def setUp(self):
        super().setUp()
        self.banner_a = Banner.objects.create(
            tenant=self.tenant_a,
            name="Banner A",
            message="Promo A",
            banner_type="promo",
            position="top",
        )
        self.banner_b = Banner.objects.create(
            tenant=self.tenant_b,
            name="Banner B",
            message="Promo B",
            banner_type="promo",
            position="top",
        )

    def test_tenant_a_only_sees_own_banners(self):
        rows = _exec_as_app(
            "SELECT id, name FROM core_banner",
            tenant_id=self.tenant_a.id,
        )
        ids = [r[0] for r in rows]
        names = [r[1] for r in rows]

        assert self.banner_a.id in ids
        assert self.banner_b.id not in ids
        assert "Banner A" in names
        assert "Banner B" not in names

    def test_tenant_b_only_sees_own_banners(self):
        rows = _exec_as_app(
            "SELECT id, name FROM core_banner",
            tenant_id=self.tenant_b.id,
        )
        ids = [r[0] for r in rows]

        assert self.banner_b.id in ids
        assert self.banner_a.id not in ids


# ---------------------------------------------------------------------------
# Test 2: Aislamiento SELECT con Product + ProductCategory
# ---------------------------------------------------------------------------
@pytest.mark.django_db(transaction=True)
class TestRLSProductIsolation(RLSTestMixin, TestCase):
    """Verificar aislamiento RLS con Product y ProductCategory."""

    def setUp(self):
        super().setUp()
        self.cat_a = ProductCategory.objects.create(tenant=self.tenant_a, name="Cat A")
        self.cat_b = ProductCategory.objects.create(tenant=self.tenant_b, name="Cat B")
        self.product_a = Product.objects.create(
            tenant=self.tenant_a,
            name="Producto A",
            category=self.cat_a,
            price=Decimal("10.00"),
            is_active=True,
        )
        self.product_b = Product.objects.create(
            tenant=self.tenant_b,
            name="Producto B",
            category=self.cat_b,
            price=Decimal("20.00"),
            is_active=True,
        )

    def test_rls_filters_products_by_tenant(self):
        rows = _exec_as_app(
            "SELECT name FROM ecommerce_product",
            tenant_id=self.tenant_a.id,
        )
        names = [r[0] for r in rows]

        assert "Producto A" in names
        assert "Producto B" not in names

    def test_rls_filters_categories_by_tenant(self):
        rows = _exec_as_app(
            "SELECT name FROM ecommerce_productcategory",
            tenant_id=self.tenant_b.id,
        )
        names = [r[0] for r in rows]

        assert "Cat B" in names
        assert "Cat A" not in names


# ---------------------------------------------------------------------------
# Test 3: Aislamiento SELECT con Order + Payment
# ---------------------------------------------------------------------------
@pytest.mark.django_db(transaction=True)
class TestRLSOrderIsolation(RLSTestMixin, TestCase):
    """Verificar aislamiento RLS con Order y Payment."""

    def setUp(self):
        super().setUp()
        self.order_a = Order.objects.create(
            tenant=self.tenant_a,
            customer=self.user_a,
            subtotal=Decimal("100.00"),
            tax_rate=Decimal("0.21"),
            tax_amount=Decimal("21.00"),
            total=Decimal("121.00"),
            billing_name="User A",
            billing_email=self.user_a.email,
        )
        self.order_b = Order.objects.create(
            tenant=self.tenant_b,
            customer=self.user_b,
            subtotal=Decimal("200.00"),
            tax_rate=Decimal("0.21"),
            tax_amount=Decimal("42.00"),
            total=Decimal("242.00"),
            billing_name="User B",
            billing_email=self.user_b.email,
        )
        self.payment_a = Payment.objects.create(
            tenant=self.tenant_a,
            order=self.order_a,
            amount=Decimal("121.00"),
            status="succeeded",
            payment_method="stripe",
        )
        self.payment_b = Payment.objects.create(
            tenant=self.tenant_b,
            order=self.order_b,
            amount=Decimal("242.00"),
            status="succeeded",
            payment_method="stripe",
        )

    def test_rls_isolates_orders(self):
        rows = _exec_as_app(
            "SELECT id FROM orders_order",
            tenant_id=self.tenant_a.id,
        )
        ids = [r[0] for r in rows]

        assert self.order_a.id in ids
        assert self.order_b.id not in ids

    def test_rls_isolates_payments(self):
        rows = _exec_as_app(
            "SELECT id FROM orders_payment",
            tenant_id=self.tenant_b.id,
        )
        ids = [r[0] for r in rows]

        assert self.payment_b.id in ids
        assert self.payment_a.id not in ids


# ---------------------------------------------------------------------------
# Test 4: Proteccion contra UPDATE/DELETE cross-tenant
# ---------------------------------------------------------------------------
@pytest.mark.django_db(transaction=True)
class TestRLSCrossTenantMutation(RLSTestMixin, TestCase):
    """Verificar que UPDATE/DELETE cross-tenant no afecta filas."""

    def setUp(self):
        super().setUp()
        self.banner_a = Banner.objects.create(
            tenant=self.tenant_a,
            name="Inmutable",
            message="No me toques",
            banner_type="info",
            position="top",
        )

    def test_update_cross_tenant_has_no_effect(self):
        rows_affected = _exec_as_app(
            "UPDATE core_banner SET name = 'HACKEADO' WHERE id = %s",
            [self.banner_a.id],
            tenant_id=self.tenant_b.id,
        )

        assert rows_affected == 0, f"UPDATE cross-tenant afecto {rows_affected} filas"

        self.banner_a.refresh_from_db()
        assert self.banner_a.name == "Inmutable"

    def test_delete_cross_tenant_has_no_effect(self):
        rows_affected = _exec_as_app(
            "DELETE FROM core_banner WHERE id = %s",
            [self.banner_a.id],
            tenant_id=self.tenant_b.id,
        )

        assert rows_affected == 0, f"DELETE cross-tenant afecto {rows_affected} filas"
        assert Banner.objects.filter(id=self.banner_a.id).exists()


# ---------------------------------------------------------------------------
# Test 5: Sin tenant_id no se ven filas
# ---------------------------------------------------------------------------
@pytest.mark.django_db(transaction=True)
class TestRLSNoTenantContext(RLSTestMixin, TestCase):
    """Verificar que sin app.current_tenant_id no se devuelven filas."""

    def test_no_tenant_id_returns_no_rows(self):
        Banner.objects.create(
            tenant=self.tenant_a,
            name="Fantasma",
            message="Invisible",
            banner_type="info",
            position="top",
        )

        count = _count_as_app("core_banner", tenant_id=None)
        assert count == 0, "Sin tenant_id, no deberia haber filas visibles"

    def test_fake_uuid_returns_no_rows(self):
        Banner.objects.create(
            tenant=self.tenant_a,
            name="Real",
            message="Existe",
            banner_type="info",
            position="top",
        )

        count = _count_as_app("core_banner", tenant_id=uuid.uuid4())
        assert count == 0, "UUID falso no deberia ver filas"


# ---------------------------------------------------------------------------
# Test 6: Verificar RLS habilitado en TODAS las tablas criticas
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestRLSAllCriticalTables(TestCase):
    """Verificar que RLS esta habilitado en todas las tablas con tenant_id."""

    # Las 36 tablas de la migracion 0041_enable_row_level_security
    CRITICAL_TABLES = [
        "core_user",
        "core_banner",
        "ecommerce_productcategory",
        "ecommerce_product",
        "ecommerce_productimage",
        "ecommerce_inventory",
        "services_servicecategory",
        "services_service",
        "services_staffmember",
        "bookings_businesshours",
        "bookings_timeoff",
        "bookings_appointment",
        "cart_cart",
        "cart_cartitem",
        "orders_paymentgateway",
        "orders_order",
        "orders_orderitem",
        "orders_orderserviceitem",
        "orders_payment",
        "coupons_coupon",
        "coupons_couponusage",
        "reviews_review",
        "reviews_reviewimage",
        "reviews_reviewhelpful",
        "notifications_notification",
        "promotions_promotion",
        "promotions_promotionitem",
        "subscriptions_marketplacecategory",
        "subscriptions_marketplaceplan",
        "subscriptions_marketplacecontract",
        "billing_subscription",
        "websites_websiteconfig",
        "websites_aigenerationlog",
    ]

    @pytest.mark.skipif(not _is_postgres(), reason="RLS solo funciona en PostgreSQL")
    def test_all_critical_tables_have_rls_enabled(self):
        if not _is_postgres():
            self.skipTest("RLS solo funciona en PostgreSQL")

        missing = []
        with connection.cursor() as cursor:
            for table in self.CRITICAL_TABLES:
                cursor.execute(
                    "SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = %s",
                    [table],
                )
                row = cursor.fetchone()
                if row is None:
                    missing.append(f"{table} (no existe)")
                elif not row[0]:
                    missing.append(f"{table} (RLS deshabilitado)")

        assert not missing, "Tablas sin RLS:\n" + "\n".join(f"  - {t}" for t in missing)

    @pytest.mark.skipif(not _is_postgres(), reason="RLS solo funciona en PostgreSQL")
    def test_all_critical_tables_have_tenant_isolation_policy(self):
        if not _is_postgres():
            self.skipTest("RLS solo funciona en PostgreSQL")

        missing = []
        with connection.cursor() as cursor:
            for table in self.CRITICAL_TABLES:
                cursor.execute(
                    "SELECT COUNT(*) FROM pg_policies "
                    "WHERE schemaname = 'public' AND tablename = %s "
                    "AND policyname = 'tenant_isolation'",
                    [table],
                )
                if cursor.fetchone()[0] == 0:
                    missing.append(table)

        assert not missing, "Tablas sin policy 'tenant_isolation':\n" + "\n".join(f"  - {t}" for t in missing)
