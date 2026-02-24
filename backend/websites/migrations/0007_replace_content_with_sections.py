"""
Reemplaza las 4 preguntas de contenido (main_services, price_range,
gallery_images, testimonials_available) por una sola multi_choice:
website_sections.

El usuario elige qué secciones incluir → la IA genera solo esas →
menos tokens, más rápido.
"""

from django.db import migrations


def replace_content_questions(apps, schema_editor):
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')
    OnboardingResponse = apps.get_model('websites', 'OnboardingResponse')

    old_keys = ['main_services', 'price_range', 'gallery_images', 'testimonials_available']

    # Primero eliminar respuestas vinculadas (FK PROTECT)
    OnboardingResponse.objects.filter(question__question_key__in=old_keys).delete()

    # Luego eliminar las preguntas
    OnboardingQuestion.objects.filter(
        section='content',
        question_key__in=old_keys,
    ).delete()

    # Crear la nueva pregunta unificada
    OnboardingQuestion.objects.create(
        question_key='website_sections',
        question_text='¿Qué secciones quieres en tu sitio?',
        question_type='multi_choice',
        options=[
            'Sobre nosotros',
            'Servicios / Productos',
            'Galería de fotos',
            'Testimonios / Reseñas',
            'Precios / Tarifas',
            'Preguntas frecuentes',
        ],
        help_text='Selecciona las secciones que deseas. Hero y Contacto se incluyen siempre.',
        ai_context=(
            'Secciones seleccionadas por el usuario. '
            'SOLO generar contenido para estas secciones más hero y contacto (obligatorios). '
            'No generar secciones que el usuario no seleccionó.'
        ),
        placeholder='',
        is_required=True,
        section='content',
        sort_order=1,
        min_length=0,
        max_length=0,
    )


def reverse_content_questions(apps, schema_editor):
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')

    # Eliminar la nueva pregunta
    OnboardingQuestion.objects.filter(
        section='content',
        question_key='website_sections',
    ).delete()

    # Restaurar las 4 preguntas originales
    original_questions = [
        {
            'question_key': 'main_services',
            'question_text': '¿Cuáles son tus servicios o productos principales?',
            'question_type': 'textarea',
            'options': [],
            'placeholder': 'Ej: Corte de cabello, Tratamientos faciales...',
            'help_text': 'Lista tus servicios principales.',
            'ai_context': 'Servicios principales del negocio.',
            'is_required': True,
            'section': 'content',
            'sort_order': 1,
        },
        {
            'question_key': 'price_range',
            'question_text': '¿Quieres mostrar precios en tu sitio?',
            'question_type': 'choice',
            'options': [
                'Sí, mostrar precios exactos',
                'Mostrar rango de precios (desde $X)',
                'No mostrar precios, solo "Consultar"',
            ],
            'placeholder': '',
            'help_text': 'Decide cómo manejar la información de precios.',
            'ai_context': 'Estrategia de precios.',
            'is_required': True,
            'section': 'content',
            'sort_order': 2,
        },
        {
            'question_key': 'gallery_images',
            'question_text': '¿Tienes fotos de tu negocio o trabajo para mostrar?',
            'question_type': 'multi_choice',
            'options': [
                'Fotos del local/establecimiento',
                'Fotos de trabajos realizados',
                'Fotos del equipo',
                'No tengo fotos aún',
            ],
            'placeholder': '',
            'help_text': 'Podrás subirlas después.',
            'ai_context': 'Tipo de contenido visual disponible.',
            'is_required': False,
            'section': 'content',
            'sort_order': 3,
        },
        {
            'question_key': 'testimonials_available',
            'question_text': '¿Tienes testimonios o reseñas de clientes?',
            'question_type': 'choice',
            'options': [
                'Sí, tengo testimonios escritos',
                'Tengo reseñas en Google/redes sociales',
                'No tengo testimonios aún',
            ],
            'placeholder': '',
            'help_text': 'Los testimonios aumentan la confianza.',
            'ai_context': 'Disponibilidad de testimonios.',
            'is_required': False,
            'section': 'content',
            'sort_order': 4,
        },
    ]

    for q in original_questions:
        OnboardingQuestion.objects.create(**q)


class Migration(migrations.Migration):

    dependencies = [
        ('websites', '0006_reorder_branding_questions'),
    ]

    operations = [
        migrations.RunPython(replace_content_questions, reverse_content_questions),
    ]
