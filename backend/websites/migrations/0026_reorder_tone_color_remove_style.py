"""
Migración de datos: prioriza las preguntas universales del onboarding de Pipe.

Fija el orden completo de las preguntas pipe_* de forma determinista (sin
depender del estado previo de cada base):

- tono (#3) y colores (#4) suben justo después de la descripción, ya que todos
  los negocios las responden y el generador las consume (brand_tone +
  primary/secondary_color).
- las preguntas por módulo (servicios/productos/reservas) y de contacto/páginas
  quedan después.
- desactiva la pregunta de estilo visual (pipe_style): el generador nunca la lee
  y se solapa conceptualmente con el tono. Reversible.
"""

from django.db import migrations

# Orden canónico del flujo de Pipe.
CANONICAL_ORDER = {
    'pipe_modules': 10,
    'pipe_description': 20,
    'pipe_tone': 30,      # #3 — universal, consumida (brand_tone)
    'pipe_colors': 40,    # #4 — universal, consumida (primary/secondary_color)
    'pipe_services': 50,
    'pipe_products': 60,
    'pipe_bookings': 70,
    'pipe_whatsapp': 80,
    'pipe_pages': 90,
}


def apply(apps, schema_editor):
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')
    for key, order in CANONICAL_ORDER.items():
        OnboardingQuestion.objects.filter(question_key=key).update(sort_order=order)
    OnboardingQuestion.objects.filter(question_key='pipe_style').update(is_active=False)


def reverse(apps, schema_editor):
    # Restaura el estilo visual; el orden previo no se reconstruye campo a campo
    # porque difería entre entornos. Reactivar pipe_style es lo único con efecto
    # funcional reversible.
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')
    OnboardingQuestion.objects.filter(question_key='pipe_style').update(is_active=True)


class Migration(migrations.Migration):

    dependencies = [
        ('websites', '0025_industryclassification'),
    ]

    operations = [
        migrations.RunPython(apply, reverse),
    ]
