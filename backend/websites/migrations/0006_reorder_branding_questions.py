"""
Migración de datos: reordena preguntas de branding para que el logo
aparezca antes de los colores (así la extracción automática de colores
pre-rellena los campos que el usuario ve después).
"""

from django.db import migrations


def reorder_branding(apps, schema_editor):
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')

    # logo_upload primero (sort_order 2), luego colores (3 y 4)
    order = {
        'logo_upload': 2,
        'primary_color': 3,
        'secondary_color': 4,
    }

    for key, new_order in order.items():
        OnboardingQuestion.objects.filter(
            question_key=key,
            section='branding',
        ).update(sort_order=new_order)


def reverse_branding(apps, schema_editor):
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')

    order = {
        'primary_color': 2,
        'secondary_color': 3,
        'logo_upload': 4,
    }

    for key, new_order in order.items():
        OnboardingQuestion.objects.filter(
            question_key=key,
            section='branding',
        ).update(sort_order=new_order)


class Migration(migrations.Migration):

    dependencies = [
        ('websites', '0005_seed_more_templates'),
    ]

    operations = [
        migrations.RunPython(reorder_branding, reverse_branding),
    ]
