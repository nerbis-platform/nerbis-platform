"""
Migración de datos: saca la pregunta de páginas (pipe_pages) del chat de Pipe.

Las páginas ahora se derivan automáticamente en el frontend a partir de:
- páginas obligatorias / por defecto (Inicio, Contacto, Sobre nosotros)
- páginas cuyo módulo esté activo (Servicios → has_services, Catálogo →
  has_shop, Reservas → has_bookings) vía auto_include_modules.

El usuario refina las páginas en el editor (paso 2). Esto reduce un paso de
fricción al final del chat sin degradar la generación (website_sections sigue
recibiendo las páginas derivadas). Reversible.
"""

from django.db import migrations


def apply(apps, schema_editor):
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')
    OnboardingQuestion.objects.filter(question_key='pipe_pages').update(is_active=False)


def reverse(apps, schema_editor):
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')
    OnboardingQuestion.objects.filter(question_key='pipe_pages').update(is_active=True)


class Migration(migrations.Migration):

    dependencies = [
        ('websites', '0026_reorder_tone_color_remove_style'),
    ]

    operations = [
        migrations.RunPython(apply, reverse),
    ]
