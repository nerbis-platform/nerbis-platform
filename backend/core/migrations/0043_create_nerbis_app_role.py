# backend/core/migrations/0043_create_nerbis_app_role.py
"""
Crear rol PostgreSQL 'nerbis_app' con permisos DML en las tablas tenant-aware.

Este rol se usa en produccion para que la aplicacion Django se conecte sin ser
duena de las tablas, lo que permite que RLS (Row Level Security) se aplique
correctamente. El dueno de las tablas siempre puede bypassear RLS, por lo que
la app DEBE conectar con un rol distinto.

Uso:
1. En PostgreSQL: CREATE USER nerbis_django LOGIN PASSWORD '...' IN ROLE nerbis_app;
2. En settings: DATABASES['default']['USER'] = 'nerbis_django'
"""

from django.db import migrations

# Misma lista de TENANT_TABLES de 0041_enable_row_level_security
TENANT_TABLES = [
    # core
    "core_user",
    "core_banner",
    # ecommerce
    "ecommerce_productcategory",
    "ecommerce_product",
    "ecommerce_productimage",
    "ecommerce_inventory",
    # services
    "services_servicecategory",
    "services_service",
    "services_staffmember",
    # bookings
    "bookings_businesshours",
    "bookings_timeoff",
    "bookings_appointment",
    # cart
    "cart_cart",
    "cart_cartitem",
    # orders
    "orders_paymentgateway",
    "orders_order",
    "orders_orderitem",
    "orders_orderserviceitem",
    "orders_payment",
    # coupons
    "coupons_coupon",
    "coupons_couponusage",
    # reviews
    "reviews_review",
    "reviews_reviewimage",
    "reviews_reviewhelpful",
    # notifications
    "notifications_notification",
    # promotions
    "promotions_promotion",
    "promotions_promotionitem",
    # subscriptions
    "subscriptions_marketplacecategory",
    "subscriptions_marketplaceplan",
    "subscriptions_marketplacecontract",
    # billing
    "billing_subscription",
    # websites
    "websites_websiteconfig",
    "websites_aigenerationlog",
]


def create_role(apps, schema_editor):
    """Crear rol nerbis_app y otorgar permisos DML en tablas tenant-aware."""
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        # Crear rol si no existe (NOLOGIN: no se conecta directamente)
        cursor.execute(
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nerbis_app') THEN "
            "CREATE ROLE nerbis_app NOLOGIN; "
            "END IF; "
            "END $$"
        )
        # GRANT DML en cada tabla tenant-aware
        for table in TENANT_TABLES:
            cursor.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO nerbis_app")
        # GRANT uso de secuencias (necesario para INSERT con campos auto-increment)
        cursor.execute("GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO nerbis_app")


def drop_role(apps, schema_editor):
    """Revertir: revocar permisos y eliminar rol nerbis_app."""
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        for table in TENANT_TABLES:
            cursor.execute(f"REVOKE ALL ON {table} FROM nerbis_app")
        cursor.execute("REVOKE USAGE ON ALL SEQUENCES IN SCHEMA public FROM nerbis_app")
        cursor.execute("DROP ROLE IF EXISTS nerbis_app")


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0042_merge_20260520_1815"),
    ]

    operations = [
        migrations.RunPython(create_role, drop_role),
    ]
