"""
Fix FK constraints: align PostgreSQL ON DELETE rules with Django on_delete.

Django generates FK constraints with NO ACTION (the PostgreSQL default),
regardless of the on_delete parameter in the model. This means on_delete
only works when Django ORM handles the deletion. Direct SQL DELETEs or
incomplete ORM cascades can leave orphan records or raise IntegrityError.

This migration updates all FK constraints referencing core_tenant and
core_user to match their Django on_delete declarations:

- on_delete=CASCADE  → ON DELETE CASCADE
- on_delete=PROTECT  → ON DELETE RESTRICT
- on_delete=SET_NULL → ON DELETE SET NULL

Only runs on PostgreSQL (SQLite does not support ALTER CONSTRAINT).

See: https://github.com/nerbis-platform/nerbis-platform/issues/88
"""

import logging

from django.db import migrations

logger = logging.getLogger(__name__)

# ── FK → core_tenant (all TenantAwareModel use CASCADE) ─────────────────────

TENANT_FK_TABLES = [
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
    "marketplace_marketplacecategory",
    "marketplace_marketplacecontract",
    "marketplace_marketplaceplan",
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

# ── FK → core_user (mixed on_delete rules) ──────────────────────────────────

# (table, column, desired_pg_action)
USER_FK_RULES = [
    # CASCADE
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
    ("marketplace_marketplacecontract", "customer_id", "CASCADE"),
    ("token_blacklist_outstandingtoken", "user_id", "CASCADE"),
    # PROTECT → RESTRICT
    ("orders_order", "customer_id", "RESTRICT"),
    # SET_NULL → SET NULL
    ("reviews_review", "moderated_by_id", "SET NULL"),
]


def _find_constraint_name(cursor, table, column, ref_table, schema="public"):
    """Find the FK constraint name for a given table/column/ref_table combo."""
    cursor.execute(
        """
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
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


def _alter_fk(cursor, table, column, ref_table, ref_column, action):
    """Drop and recreate an FK constraint with the desired ON DELETE action."""
    constraint_name = _find_constraint_name(cursor, table, column, ref_table)
    if constraint_name is None:
        logger.warning(
            "FK constraint not found: %s.%s → %s (skipping)",
            table,
            column,
            ref_table,
        )
        return

    cursor.execute(f'ALTER TABLE "{table}" DROP CONSTRAINT "{constraint_name}"')
    cursor.execute(
        f'ALTER TABLE "{table}" '
        f'ADD CONSTRAINT "{constraint_name}" '
        f'FOREIGN KEY ("{column}") REFERENCES "{ref_table}" ("{ref_column}") '
        f"ON DELETE {action} DEFERRABLE INITIALLY DEFERRED"
    )


def forward(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    cursor = schema_editor.connection.cursor()

    # Tenant FKs → CASCADE
    for table in TENANT_FK_TABLES:
        _alter_fk(cursor, table, "tenant_id", "core_tenant", "id", "CASCADE")

    # User FKs → mixed rules
    for table, column, action in USER_FK_RULES:
        _alter_fk(cursor, table, column, "core_user", "id", action)


def reverse(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    cursor = schema_editor.connection.cursor()

    # Revert tenant FKs → NO ACTION
    for table in TENANT_FK_TABLES:
        _alter_fk(cursor, table, "tenant_id", "core_tenant", "id", "NO ACTION")

    # Revert user FKs → NO ACTION
    for table, column, _action in USER_FK_RULES:
        _alter_fk(cursor, table, column, "core_user", "id", "NO ACTION")


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0026_add_has_website_field"),
        # Depend on latest migration of each app so all tables exist when we run
        ("billing", "0015_add_trial_annual_ai_fields"),
        ("bookings", "0004_add_expires_at_to_appointment"),
        ("cart", "0002_cart_coupon"),
        ("coupons", "0001_initial"),
        ("ecommerce", "0002_product_average_rating_product_reviews_count"),
        ("notifications", "0001_initial"),
        ("orders", "0002_order_coupon_order_coupon_code_order_discount_amount"),
        ("promotions", "0001_initial"),
        ("reviews", "0001_initial"),
        ("services", "0003_add_rating_fields_to_service_and_category"),
        (
            "subscriptions",
            "0003_rename_subscriptions_tenant__2d28fa_idx_subscriptio_tenant__d827a9_idx_and_more",
        ),
        ("websites", "0014_add_published_data"),
        ("token_blacklist", "0013_alter_blacklistedtoken_options_and_more"),
    ]

    operations = [
        migrations.RunPython(forward, reverse),
    ]
