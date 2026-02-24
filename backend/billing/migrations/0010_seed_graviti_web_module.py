# billing/migrations/0010_seed_graviti_web_module.py
"""
Data migration para agregar GRAVITI Web como módulo base y actualizar módulos existentes.

GRAVITI Web es el módulo base requerido para todas las suscripciones.
Los otros módulos son opcionales y se agregan al precio base.

Estructura de precios actualizada:
- GRAVITI Web (base): $25,000 COP/mes (requerido)
- GRAVITI Shop: +$29,900 COP/mes
- GRAVITI Bookings: +$24,900 COP/mes
- GRAVITI Services: +$19,900 COP/mes
- GRAVITI Marketing: +$14,900 COP/mes
"""

from django.db import migrations
from decimal import Decimal
from django.utils import timezone


def create_graviti_web_module(apps, schema_editor):
    """Crea el módulo GRAVITI Web como base y actualiza los demás módulos."""
    Module = apps.get_model('billing', 'Module')

    today = timezone.now().date()

    # Crear o actualizar GRAVITI Web (módulo base)
    Module.objects.update_or_create(
        slug='web',
        defaults={
            'name': 'GRAVITI Web',
            'description': 'Tu presencia web profesional. Incluye sitio web responsive, dominio gratuito, SSL, hosting y panel de administración.',
            'icon': '🌐',
            'is_base': True,
            'version': '1.0',
            'effective_date': today,
            'monthly_price': Decimal('25000.00'),
            'annual_discount_months': 2,
            'has_analytics': False,
            'has_api_access': False,
            'is_active': True,
            'is_visible': True,
            'sort_order': 0,
        }
    )

    # Actualizar módulos existentes con version y effective_date
    modules_update = [
        {
            'slug': 'shop',
            'name': 'GRAVITI Shop',
            'description': 'Vende productos online. Incluye catálogo, carrito de compras, gestión de inventario y procesamiento de órdenes.',
            'icon': '🛒',
            'is_base': False,
            'version': '1.0',
            'effective_date': today,
            'monthly_price': Decimal('29900.00'),
            'annual_discount_months': 2,
            'included_products': 100,
            'included_employees': 1,
            'has_analytics': True,
            'is_active': True,
            'is_visible': True,
            'sort_order': 1,
        },
        {
            'slug': 'bookings',
            'name': 'GRAVITI Bookings',
            'description': 'Sistema de citas y reservas. Incluye agenda online, gestión de staff, recordatorios automáticos y horarios configurables.',
            'icon': '📅',
            'is_base': False,
            'version': '1.0',
            'effective_date': today,
            'monthly_price': Decimal('24900.00'),
            'annual_discount_months': 2,
            'included_appointments': 100,
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
            'name': 'GRAVITI Services',
            'description': 'Vende servicios recurrentes, membresías y contratos. Ideal para gimnasios, seguros, suscripciones y planes de servicios.',
            'icon': '📋',
            'is_base': False,
            'version': '1.0',
            'effective_date': today,
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
            'name': 'GRAVITI Marketing',
            'description': 'Herramientas de marketing: cupones de descuento, promociones, reseñas de clientes, banners promocionales y más.',
            'icon': '📢',
            'is_base': False,
            'version': '1.0',
            'effective_date': today,
            'monthly_price': Decimal('14900.00'),
            'annual_discount_months': 2,
            'has_analytics': True,
            'is_active': True,
            'is_visible': True,
            'sort_order': 4,
        },
    ]

    for module_data in modules_update:
        Module.objects.update_or_create(
            slug=module_data['slug'],
            defaults=module_data
        )


def reverse_graviti_web(apps, schema_editor):
    """Elimina el módulo GRAVITI Web."""
    Module = apps.get_model('billing', 'Module')
    Module.objects.filter(slug='web').delete()
    # Revertir is_base en otros módulos
    Module.objects.filter(slug__in=['shop', 'bookings', 'services', 'marketing']).update(
        is_base=False,
        version='1.0',
        effective_date=None
    )


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0009_alter_pricingconfig_options_and_more'),
    ]

    operations = [
        migrations.RunPython(create_graviti_web_module, reverse_graviti_web),
    ]
