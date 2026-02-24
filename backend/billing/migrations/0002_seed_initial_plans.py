# billing/migrations/0002_seed_initial_plans.py
"""
Data migration para crear los planes iniciales de GRAVITI.

Pricing híbrido:
- Starter: $49,000 COP/mes - 50 citas, 1 empleado
- Pro: $99,000 COP/mes - 200 citas, 3 empleados
- Business: $189,000 COP/mes - 500 citas, 10 empleados
- Enterprise: $349,000 COP/mes - ilimitado
"""

from django.db import migrations
from decimal import Decimal


def create_initial_plans(apps, schema_editor):
    Plan = apps.get_model('billing', 'Plan')

    plans = [
        {
            'slug': 'starter',
            'name': 'Starter',
            'description': 'Ideal para emprendedores y negocios pequeños que inician.',
            'monthly_price': Decimal('49000.00'),
            'yearly_price': Decimal('490000.00'),  # 2 meses gratis
            'included_appointments': 50,
            'included_employees': 1,
            'included_sms': 50,
            'included_whatsapp': 20,
            'included_products': 50,
            'included_services': 10,
            'extra_appointment_price': Decimal('800.00'),
            'extra_employee_price': Decimal('29000.00'),
            'extra_sms_price': Decimal('180.00'),
            'extra_whatsapp_price': Decimal('250.00'),
            'has_analytics': False,
            'has_api_access': False,
            'has_custom_domain': False,
            'has_priority_support': False,
            'has_white_label': False,
            'is_active': True,
            'is_public': True,
            'sort_order': 1,
        },
        {
            'slug': 'pro',
            'name': 'Pro',
            'description': 'Para negocios en crecimiento que necesitan más capacidad.',
            'monthly_price': Decimal('99000.00'),
            'yearly_price': Decimal('990000.00'),  # 2 meses gratis
            'included_appointments': 200,
            'included_employees': 3,
            'included_sms': 150,
            'included_whatsapp': 75,
            'included_products': 200,
            'included_services': 30,
            'extra_appointment_price': Decimal('700.00'),
            'extra_employee_price': Decimal('25000.00'),
            'extra_sms_price': Decimal('160.00'),
            'extra_whatsapp_price': Decimal('220.00'),
            'has_analytics': True,
            'has_api_access': False,
            'has_custom_domain': False,
            'has_priority_support': False,
            'has_white_label': False,
            'is_active': True,
            'is_public': True,
            'sort_order': 2,
        },
        {
            'slug': 'business',
            'name': 'Business',
            'description': 'Solución completa para negocios establecidos con múltiples empleados.',
            'monthly_price': Decimal('189000.00'),
            'yearly_price': Decimal('1890000.00'),  # 2 meses gratis
            'included_appointments': 500,
            'included_employees': 10,
            'included_sms': 400,
            'included_whatsapp': 200,
            'included_products': 500,
            'included_services': 50,
            'extra_appointment_price': Decimal('600.00'),
            'extra_employee_price': Decimal('22000.00'),
            'extra_sms_price': Decimal('140.00'),
            'extra_whatsapp_price': Decimal('200.00'),
            'has_analytics': True,
            'has_api_access': True,
            'has_custom_domain': True,
            'has_priority_support': True,
            'has_white_label': False,
            'is_active': True,
            'is_public': True,
            'sort_order': 3,
        },
        {
            'slug': 'enterprise',
            'name': 'Enterprise',
            'description': 'Sin límites. Para cadenas y franquicias con necesidades avanzadas.',
            'monthly_price': Decimal('349000.00'),
            'yearly_price': Decimal('3490000.00'),  # 2 meses gratis
            'included_appointments': 0,  # 0 = ilimitado
            'included_employees': 0,  # 0 = ilimitado
            'included_sms': 1000,
            'included_whatsapp': 500,
            'included_products': 0,  # 0 = ilimitado
            'included_services': 0,  # 0 = ilimitado
            'extra_appointment_price': Decimal('0.00'),  # N/A - ilimitado
            'extra_employee_price': Decimal('0.00'),  # N/A - ilimitado
            'extra_sms_price': Decimal('120.00'),
            'extra_whatsapp_price': Decimal('180.00'),
            'has_analytics': True,
            'has_api_access': True,
            'has_custom_domain': True,
            'has_priority_support': True,
            'has_white_label': True,
            'is_active': True,
            'is_public': True,
            'sort_order': 4,
        },
    ]

    for plan_data in plans:
        Plan.objects.update_or_create(
            slug=plan_data['slug'],
            defaults=plan_data
        )


def remove_initial_plans(apps, schema_editor):
    Plan = apps.get_model('billing', 'Plan')
    Plan.objects.filter(
        slug__in=['starter', 'pro', 'business', 'enterprise']
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_initial_plans, remove_initial_plans),
    ]
