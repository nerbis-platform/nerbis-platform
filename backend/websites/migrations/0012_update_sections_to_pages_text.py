"""
Actualiza el texto de la pregunta website_sections para reflejar
que ahora seleccionan PÁGINAS, no secciones.
El question_key no se renombra para no romper datos existentes.
"""

from django.db import migrations


def update_question_text(apps, schema_editor):
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')

    try:
        question = OnboardingQuestion.objects.get(question_key='website_sections')
    except OnboardingQuestion.DoesNotExist:
        return

    question.question_text = '¿Qué páginas quieres en tu sitio web?'
    question.help_text = 'Selecciona las páginas. Inicio y contacto se incluyen siempre.'
    question.ai_context = (
        'Páginas seleccionadas por el usuario para su sitio web. '
        'SOLO generar contenido para estas páginas más hero y contacto (obligatorios). '
        'No generar contenido para páginas que el usuario no seleccionó.'
    )
    question.save(update_fields=['question_text', 'help_text', 'ai_context'])


def revert_question_text(apps, schema_editor):
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')

    try:
        question = OnboardingQuestion.objects.get(question_key='website_sections')
    except OnboardingQuestion.DoesNotExist:
        return

    question.question_text = '¿Qué secciones quieres en tu sitio?'
    question.help_text = 'Selecciona las secciones que deseas. Hero y Contacto se incluyen siempre.'
    question.ai_context = (
        'Secciones seleccionadas por el usuario. '
        'SOLO generar contenido para estas secciones más hero y contacto (obligatorios). '
        'No generar secciones que el usuario no seleccionó.'
    )
    question.save(update_fields=['question_text', 'help_text', 'ai_context'])


class Migration(migrations.Migration):

    dependencies = [
        ('websites', '0011_websiteconfig_enabled_pages'),
    ]

    operations = [
        migrations.RunPython(update_question_text, revert_question_text),
    ]
