# billing/migrations/0005_update_plans_with_modules.py
"""
Data migration para actualizar los planes con los módulos incluidos.

Estructura de módulos por plan:
- Starter: Reservas (servicios básicos de citas)
- Pro: Reservas + Tienda (para negocios que también venden productos)
- Business: Todos los módulos
- Enterprise: Todos los módulos
"""

from django.db import migrations


def update_plans_with_modules(apps, schema_editor):
    Plan = apps.get_model('billing', 'Plan')

    # Starter: Solo reservas (servicios de citas)
    Plan.objects.filter(slug='starter').update(
        includes_shop=False,
        includes_bookings=True,
        includes_services=False,
        includes_marketing=False,
    )

    # Pro: Reservas + Tienda
    Plan.objects.filter(slug='pro').update(
        includes_shop=True,
        includes_bookings=True,
        includes_services=False,
        includes_marketing=True,  # Marketing básico
    )

    # Business: Todos los módulos
    Plan.objects.filter(slug='business').update(
        includes_shop=True,
        includes_bookings=True,
        includes_services=True,
        includes_marketing=True,
    )

    # Enterprise: Todos los módulos
    Plan.objects.filter(slug='enterprise').update(
        includes_shop=True,
        includes_bookings=True,
        includes_services=True,
        includes_marketing=True,
    )


def reverse_modules(apps, schema_editor):
    Plan = apps.get_model('billing', 'Plan')
    Plan.objects.all().update(
        includes_shop=False,
        includes_bookings=False,
        includes_services=False,
        includes_marketing=False,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0004_add_module_flags_to_plan'),
    ]

    operations = [
        migrations.RunPython(update_plans_with_modules, reverse_modules),
    ]
