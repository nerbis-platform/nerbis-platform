# billing/migrations/0017_seed_management_module.py
"""
Data migration para crear el modulo de Gestion Comercial.

Precio: $19,900 COP/mes (mismo que Services/Planes).
Incluye gestion de ventas, compras, gastos, proveedores y movimientos de inventario.
"""

from decimal import Decimal

from django.db import migrations


def create_management_module(apps, schema_editor):
    """Crea el modulo de Gestion Comercial."""
    Module = apps.get_model("billing", "Module")

    Module.objects.update_or_create(
        slug="management",
        defaults={
            "name": "Gestion Comercial",
            "description": (
                "Gestion integral del negocio: ventas directas, ordenes de compra, "
                "control de gastos, proveedores y movimientos de inventario."
            ),
            "icon": "📊",
            "monthly_price": Decimal("19900.00"),
            "annual_discount_months": 2,
            "included_employees": 1,
            "has_analytics": True,
            "has_api_access": False,
            "is_active": True,
            "is_visible": True,
            "sort_order": 5,
        },
    )


def reverse_management_module(apps, schema_editor):
    """Elimina el modulo de Gestion Comercial."""
    Module = apps.get_model("billing", "Module")
    Module.objects.filter(slug="management").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0016_alter_module_slug_and_more"),
    ]

    operations = [
        migrations.RunPython(create_management_module, reverse_management_module),
    ]
