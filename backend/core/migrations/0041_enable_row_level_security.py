# backend/core/migrations/0041_enable_row_level_security.py
"""
Habilitar Row-Level Security (RLS) en PostgreSQL para todas las tablas con tenant_id.

RLS es la última línea de defensa en multi-tenancy: incluso si un bug en el código
se salta el TenantAwareManager, la base de datos misma impide ver datos de otro tenant.

Requisitos:
- La app Django debe conectarse con un rol que NO sea el dueño de las tablas
  (el dueño siempre puede bypassear RLS).
- El middleware debe ejecutar SET app.current_tenant_id = <id> en cada request.

Para desarrollo local con un solo rol, RLS se aplica pero se puede bypassear
si el usuario es superuser de PostgreSQL. En producción se debe crear un rol
separado (ver docs/SDD.md para instrucciones de setup).
"""

from django.db import migrations

# Todas las tablas que tienen columna tenant_id
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


def enable_rls(apps, schema_editor):
    """Habilitar RLS y crear políticas de aislamiento por tenant."""
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        for table in TENANT_TABLES:
            # Habilitar RLS en la tabla
            cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
            cursor.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")

            # Idempotencia: eliminar política existente antes de crear
            cursor.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")

            # Crear política: solo ver/escribir filas donde tenant_id coincide con la variable de sesión
            # Nota: tenant_id es UUID (Tenant.id = UUIDField)
            cursor.execute(
                f"""
                CREATE POLICY tenant_isolation ON {table}
                    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
                    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
                """
            )


def disable_rls(apps, schema_editor):
    """Revertir: deshabilitar RLS y eliminar políticas."""
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        for table in TENANT_TABLES:
            cursor.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
            cursor.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY;")
            cursor.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0040_tenant_tax_rate_and_tax_name"),
        ("ecommerce", "0002_product_average_rating_product_reviews_count"),
        ("services", "0003_add_rating_fields_to_service_and_category"),
        ("bookings", "0004_add_expires_at_to_appointment"),
        ("cart", "0002_cart_coupon"),
        ("orders", "0003_paymentgateway_and_payment_updates"),
        ("coupons", "0001_initial"),
        ("reviews", "0001_initial"),
        ("notifications", "0001_initial"),
        ("promotions", "0001_initial"),
        ("subscriptions", "0003_rename_subscriptions_tenant__2d28fa_idx_subscriptio_tenant__d827a9_idx_and_more"),
        ("billing", "0016_configure_pricing_plans"),
        ("websites", "0015_websiteconfig_generation_task_id_and_more"),
    ]

    operations = [
        migrations.RunPython(enable_rls, disable_rls),
    ]
