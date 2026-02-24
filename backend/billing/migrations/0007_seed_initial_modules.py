# billing/migrations/0007_seed_initial_modules.py
"""
Data migration para crear los módulos iniciales y configuración de precios.

Estructura de precios:
- Base (Web estática): $25,000 COP/mes
- Módulo Tienda: +$29,900 COP/mes
- Módulo Reservas: +$24,900 COP/mes
- Módulo Planes/Contratos: +$19,900 COP/mes
- Módulo Marketing: +$14,900 COP/mes

Ejemplos de combinaciones:
- Solo web: $25,000/mes
- Web + Tienda: $54,900/mes
- Web + Tienda + Reservas: $79,800/mes
- Todos los módulos: $114,600/mes
"""

from django.db import migrations
from decimal import Decimal


def create_pricing_config(apps, schema_editor):
    """Crea la configuración de precios base."""
    PricingConfig = apps.get_model('billing', 'PricingConfig')

    PricingConfig.objects.get_or_create(
        pk=1,
        defaults={
            'base_monthly_price': Decimal('25000.00'),
            'base_annual_discount_months': 2,
            'trial_days': 14,
            'extra_employee_price': Decimal('25000.00'),
            'extra_sms_price': Decimal('180.00'),
            'extra_whatsapp_price': Decimal('250.00'),
            'extra_appointment_price': Decimal('800.00'),
        }
    )


def create_initial_modules(apps, schema_editor):
    """Crea los módulos iniciales con sus precios."""
    Module = apps.get_model('billing', 'Module')

    modules = [
        {
            'slug': 'shop',
            'name': 'Tienda',
            'description': 'Vende productos online. Incluye catálogo, carrito de compras, gestión de inventario y procesamiento de órdenes.',
            'icon': '🛒',
            'monthly_price': Decimal('29900.00'),
            'annual_discount_months': 2,
            'included_products': 100,  # 100 productos incluidos
            'included_employees': 1,
            'has_analytics': True,
            'is_active': True,
            'is_visible': True,
            'sort_order': 1,
        },
        {
            'slug': 'bookings',
            'name': 'Reservas',
            'description': 'Sistema de citas y reservas. Incluye agenda online, gestión de staff, recordatorios automáticos y horarios configurables.',
            'icon': '📅',
            'monthly_price': Decimal('24900.00'),
            'annual_discount_months': 2,
            'included_appointments': 100,  # 100 citas/mes incluidas
            'included_employees': 2,
            'included_services': 20,
            'included_sms': 50,
            'included_whatsapp': 25,
            'has_analytics': True,
            'is_active': True,
            'is_visible': True,
            'sort_order': 2,
        },
        {
            'slug': 'services',
            'name': 'Planes y Contratos',
            'description': 'Vende servicios recurrentes, membresías y contratos. Ideal para gimnasios, seguros, suscripciones y planes de servicios.',
            'icon': '📋',
            'monthly_price': Decimal('19900.00'),
            'annual_discount_months': 2,
            'included_services': 50,
            'has_analytics': True,
            'has_api_access': False,
            'is_active': True,
            'is_visible': True,
            'sort_order': 3,
        },
        {
            'slug': 'marketing',
            'name': 'Marketing',
            'description': 'Herramientas de marketing: cupones de descuento, promociones, reseñas de clientes, banners promocionales y más.',
            'icon': '📢',
            'monthly_price': Decimal('14900.00'),
            'annual_discount_months': 2,
            'has_analytics': True,
            'is_active': True,
            'is_visible': True,
            'sort_order': 4,
        },
    ]

    for module_data in modules:
        Module.objects.update_or_create(
            slug=module_data['slug'],
            defaults=module_data
        )


def reverse_modules(apps, schema_editor):
    """Elimina los módulos y configuración."""
    Module = apps.get_model('billing', 'Module')
    PricingConfig = apps.get_model('billing', 'PricingConfig')

    Module.objects.filter(
        slug__in=['shop', 'bookings', 'services', 'marketing']
    ).delete()
    PricingConfig.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0006_modular_billing_system'),
    ]

    operations = [
        migrations.RunPython(create_pricing_config, migrations.RunPython.noop),
        migrations.RunPython(create_initial_modules, reverse_modules),
    ]
