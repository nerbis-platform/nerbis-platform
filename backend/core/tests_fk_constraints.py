"""
Tests para verificar que las FK constraints a nivel PostgreSQL coinciden
con las reglas on_delete definidas en los modelos Django.

Solo corren en PostgreSQL (se saltan en SQLite).

See: https://github.com/nerbis-platform/nerbis-platform/issues/88
"""

import pytest
from django.db import connection

pytestmark = pytest.mark.skipif(
    connection.vendor != "postgresql",
    reason="FK constraint rules solo se verifican en PostgreSQL",
)


def _get_fk_delete_rule(table, column, ref_table, schema="public"):
    """Consulta information_schema para obtener la regla ON DELETE de una FK."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT rc.delete_rule
            FROM information_schema.table_constraints tc
            JOIN information_schema.referential_constraints rc
                ON tc.constraint_name = rc.constraint_name
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = %s
              AND tc.table_name = %s
              AND kcu.column_name = %s
              AND ccu.table_name = %s
              AND tc.constraint_type = 'FOREIGN KEY'
            LIMIT 1
            """,
            [schema, table, column, ref_table],
        )
        row = cursor.fetchone()
        return row[0] if row else None


# ── Tests: FK → core_tenant deben ser CASCADE ───────────────────────────────

TENANT_CASCADE_TABLES = [
    "billing_subscription",
    "bookings_appointment",
    "bookings_businesshours",
    "bookings_timeoff",
    "cart_cart",
    "cart_cartitem",
    "core_banner",
    "core_user",
    "coupons_coupon",
    "coupons_couponusage",
    "ecommerce_inventory",
    "ecommerce_product",
    "ecommerce_productcategory",
    "ecommerce_productimage",
    "notifications_notification",
    "orders_order",
    "orders_orderitem",
    "orders_orderserviceitem",
    "orders_payment",
    "promotions_promotion",
    "promotions_promotionitem",
    "reviews_review",
    "reviews_reviewhelpful",
    "reviews_reviewimage",
    "services_service",
    "services_servicecategory",
    "services_staffmember",
    "subscriptions_marketplacecategory",
    "subscriptions_marketplacecontract",
    "subscriptions_marketplaceplan",
    "websites_aigenerationlog",
    "websites_websiteconfig",
]


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("table", TENANT_CASCADE_TABLES)
def test_tenant_fk_is_cascade(table):
    """Cada FK tenant_id → core_tenant debe tener ON DELETE CASCADE."""
    rule = _get_fk_delete_rule(table, "tenant_id", "core_tenant")
    assert rule is not None, f"FK {table}.tenant_id → core_tenant no encontrada"
    assert rule == "CASCADE", f"{table}.tenant_id tiene ON DELETE {rule}, esperado CASCADE"


# ── Tests: FK → core_user deben coincidir con on_delete del modelo ──────────

USER_FK_EXPECTED = [
    ("bookings_appointment", "customer_id", "CASCADE"),
    ("cart_cart", "user_id", "CASCADE"),
    ("core_otptoken", "user_id", "CASCADE"),
    ("core_passwordsettoken", "user_id", "CASCADE"),
    ("core_user_groups", "user_id", "CASCADE"),
    ("core_user_user_permissions", "user_id", "CASCADE"),
    ("coupons_couponusage", "user_id", "CASCADE"),
    ("django_admin_log", "user_id", "CASCADE"),
    ("notifications_notification", "user_id", "CASCADE"),
    ("reviews_review", "user_id", "CASCADE"),
    ("reviews_reviewhelpful", "user_id", "CASCADE"),
    ("services_staffmember", "user_id", "CASCADE"),
    ("subscriptions_marketplacecontract", "customer_id", "CASCADE"),
    ("token_blacklist_outstandingtoken", "user_id", "CASCADE"),
    # PROTECT → RESTRICT en PostgreSQL
    ("orders_order", "customer_id", "RESTRICT"),
    # SET_NULL → SET NULL en PostgreSQL
    ("reviews_review", "moderated_by_id", "SET NULL"),
]


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("table,column,expected_rule", USER_FK_EXPECTED)
def test_user_fk_matches_django_on_delete(table, column, expected_rule):
    """Cada FK → core_user debe tener la regla ON DELETE correcta."""
    rule = _get_fk_delete_rule(table, column, "core_user")
    assert rule is not None, f"FK {table}.{column} → core_user no encontrada"
    assert rule == expected_rule, f"{table}.{column} tiene ON DELETE {rule}, esperado {expected_rule}"
