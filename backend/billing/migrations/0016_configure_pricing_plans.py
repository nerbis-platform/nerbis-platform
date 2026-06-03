# backend/billing/migrations/0016_configure_pricing_plans.py
"""
Configurar precios de módulos para los planes de NERBIS.

Precios en COP (moneda base). Los tenants de otros países ven precios
en su moneda — la conversión se hace en el frontend.

Planes resultantes (combinaciones de módulos):
- Trial: $0 (14 días, Web incluido)
- Starter: $24,900/mes (Web + 1 módulo)
- Pro: $79,900/mes (Web + todos los módulos)
- Business: $149,900/mes (Web + todos + premium features)

Margen mínimo: 35% con 7/10 tenants pagando en EC2 ($22/mes infra).

Equivalencias aproximadas:
- COP $24,900 ≈ USD $5 ≈ EUR €5 ≈ MXN $99
- COP $79,900 ≈ USD $19 ≈ EUR €17 ≈ MXN $349
- COP $149,900 ≈ USD $39 ≈ EUR €35 ≈ MXN $699
"""

from decimal import Decimal

from django.db import migrations


def configure_modules(apps, schema_editor):
    Module = apps.get_model("billing", "Module")
    PricingConfig = apps.get_model("billing", "PricingConfig")

    # ── Configuración global ──────────────────────────────
    config, _ = PricingConfig.objects.get_or_create(pk=1)
    config.trial_days = 14
    config.extra_employee_price = Decimal("15000.00")
    config.extra_sms_price = Decimal("150.00")
    config.extra_whatsapp_price = Decimal("200.00")
    config.extra_appointment_price = Decimal("500.00")
    config.extra_storage_price = Decimal("3000.00")
    config.extra_ai_request_price = Decimal("400.00")
    config.save()

    # ── Módulo Web (base, requerido) ──────────────────────
    web, _ = Module.objects.update_or_create(
        slug="web",
        defaults={
            "name": "Sitio Web con IA",
            "description": "Sitio web profesional generado con inteligencia artificial. "
            "Incluye dominio personalizado, SSL, SEO optimizado y editor visual.",
            "icon": "🌐",
            "is_base": True,
            "monthly_price": Decimal("24900.00"),
            "annual_discount_months": 2,
            # Límites
            "included_storage_gb": 5,
            "included_ai_requests": 5,
            "included_sms": 0,
            "included_whatsapp": 0,
            "included_appointments": 0,
            "included_employees": 1,
            "included_products": 0,
            "included_services": 0,
            # Trial
            "trial_days": 14,
            "trial_included_ai_requests": 10,
            # Features
            "has_analytics": False,
            "has_api_access": False,
            # Estado
            "is_active": True,
            "is_visible": True,
            "sort_order": 0,
        },
    )

    # ── Módulo Shop (ecommerce) ───────────────────────────
    shop, _ = Module.objects.update_or_create(
        slug="shop",
        defaults={
            "name": "Tienda Online",
            "description": "Vende productos con carrito de compras, inventario, "
            "cupones, pasarela de pagos y gestión de órdenes.",
            "icon": "🛒",
            "is_base": False,
            "monthly_price": Decimal("55000.00"),
            "annual_discount_months": 2,
            # Límites
            "included_products": 100,
            "included_storage_gb": 10,
            "included_sms": 50,
            "included_whatsapp": 50,
            "included_ai_requests": 3,
            "included_appointments": 0,
            "included_employees": 2,
            "included_services": 0,
            # Trial
            "trial_days": 14,
            "trial_included_ai_requests": 5,
            # Features
            "has_analytics": True,
            "has_api_access": False,
            # Estado
            "is_active": True,
            "is_visible": True,
            "sort_order": 1,
        },
    )

    # ── Módulo Bookings (reservas) ────────────────────────
    bookings, _ = Module.objects.update_or_create(
        slug="bookings",
        defaults={
            "name": "Reservas y Citas",
            "description": "Sistema de agendamiento online con calendario, "
            "gestión de staff, horarios y confirmación automática.",
            "icon": "📅",
            "is_base": False,
            "monthly_price": Decimal("55000.00"),
            "annual_discount_months": 2,
            # Límites
            "included_appointments": 200,
            "included_employees": 3,
            "included_services": 20,
            "included_sms": 100,
            "included_whatsapp": 100,
            "included_storage_gb": 5,
            "included_ai_requests": 3,
            "included_products": 0,
            # Trial
            "trial_days": 14,
            "trial_included_ai_requests": 5,
            # Features
            "has_analytics": True,
            "has_api_access": False,
            # Estado
            "is_active": True,
            "is_visible": True,
            "sort_order": 2,
        },
    )

    # ── Módulo Services (planes/contratos) ────────────────
    services, _ = Module.objects.update_or_create(
        slug="services",
        defaults={
            "name": "Planes y Membresías",
            "description": "Vende planes, membresías y contratos recurrentes. "
            "Ideal para gimnasios, academias y servicios por suscripción.",
            "icon": "📋",
            "is_base": False,
            "monthly_price": Decimal("45000.00"),
            "annual_discount_months": 2,
            # Límites
            "included_services": 15,
            "included_employees": 2,
            "included_sms": 50,
            "included_whatsapp": 50,
            "included_storage_gb": 5,
            "included_ai_requests": 2,
            "included_appointments": 0,
            "included_products": 0,
            # Trial
            "trial_days": 14,
            "trial_included_ai_requests": 3,
            # Features
            "has_analytics": False,
            "has_api_access": False,
            # Estado
            "is_active": True,
            "is_visible": True,
            "sort_order": 3,
        },
    )

    # ── Módulo Marketing ──────────────────────────────────
    marketing, _ = Module.objects.update_or_create(
        slug="marketing",
        defaults={
            "name": "Marketing y Promociones",
            "description": "Cupones, promociones, reseñas de clientes y "
            "herramientas de fidelización para hacer crecer tu negocio.",
            "icon": "📣",
            "is_base": False,
            "monthly_price": Decimal("35000.00"),
            "annual_discount_months": 2,
            # Límites
            "included_sms": 200,
            "included_whatsapp": 200,
            "included_storage_gb": 2,
            "included_ai_requests": 2,
            "included_appointments": 0,
            "included_employees": 0,
            "included_products": 0,
            "included_services": 0,
            # Trial
            "trial_days": 14,
            "trial_included_ai_requests": 3,
            # Features
            "has_analytics": True,
            "has_api_access": False,
            # Estado
            "is_active": True,
            "is_visible": True,
            "sort_order": 4,
        },
    )


def reverse_modules(apps, schema_editor):
    # No revertimos — solo se pierden los precios actualizados
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0015_add_trial_annual_ai_fields"),
    ]

    operations = [
        migrations.RunPython(configure_modules, reverse_modules),
    ]
