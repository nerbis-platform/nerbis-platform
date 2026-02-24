"""
Migración de datos: crea templates iniciales para el Website Builder.
"""

from django.db import migrations


def create_templates(apps, schema_editor):
    WebsiteTemplate = apps.get_model('websites', 'WebsiteTemplate')

    templates = [
        {
            "name": "Belleza Elegante",
            "slug": "belleza-elegante",
            "industry": "beauty",
            "description": "Diseño sofisticado para salones de belleza, spas y centros de estética. Perfecto para destacar tus servicios con elegancia.",
            "structure_schema": {
                "sections": [
                    {"id": "hero", "name": "Encabezado Principal", "required": True},
                    {"id": "about", "name": "Sobre Nosotros", "required": True},
                    {"id": "services", "name": "Servicios", "required": True},
                    {"id": "testimonials", "name": "Testimonios", "required": False},
                    {"id": "contact", "name": "Contacto", "required": True},
                ]
            },
            "ai_system_prompt": (
                "Eres un experto en marketing para salones de belleza y spas. "
                "Genera contenido elegante, sofisticado y enfocado en bienestar. "
                "Usa un tono cálido, profesional y acogedor. "
                "Destaca la experiencia del cliente y la calidad de los servicios."
            ),
            "default_theme": {
                "primary_color": "#1C3B57",
                "secondary_color": "#95D0C9",
                "font_heading": "Playfair Display",
                "font_body": "Inter",
                "style": "elegant",
            },
            "is_active": True,
            "is_premium": False,
            "sort_order": 1,
        },
        {
            "name": "Restaurante Moderno",
            "slug": "restaurante-moderno",
            "industry": "restaurant",
            "description": "Diseño moderno para restaurantes, cafeterías y servicios de comida. Menú visual, reservas y ubicación.",
            "structure_schema": {
                "sections": [
                    {"id": "hero", "name": "Encabezado Principal", "required": True},
                    {"id": "about", "name": "Nuestra Historia", "required": True},
                    {"id": "services", "name": "Menú Destacado", "required": True},
                    {"id": "testimonials", "name": "Reseñas", "required": False},
                    {"id": "contact", "name": "Ubicación y Reservas", "required": True},
                ]
            },
            "ai_system_prompt": (
                "Eres un experto en marketing gastronómico. "
                "Genera contenido que despierte el apetito y transmita la experiencia culinaria. "
                "Usa un tono cercano, apasionado y auténtico. "
                "Destaca los ingredientes, la tradición y el ambiente del lugar."
            ),
            "default_theme": {
                "primary_color": "#2D2D2D",
                "secondary_color": "#E8A838",
                "font_heading": "Poppins",
                "font_body": "Inter",
                "style": "modern",
            },
            "is_active": True,
            "is_premium": False,
            "sort_order": 2,
        },
        {
            "name": "Fitness Energético",
            "slug": "fitness-energetico",
            "industry": "fitness",
            "description": "Diseño dinámico para gimnasios, entrenadores personales y centros de fitness. Transmite energía y motivación.",
            "structure_schema": {
                "sections": [
                    {"id": "hero", "name": "Encabezado Principal", "required": True},
                    {"id": "about", "name": "Sobre Nosotros", "required": True},
                    {"id": "services", "name": "Programas y Clases", "required": True},
                    {"id": "testimonials", "name": "Transformaciones", "required": False},
                    {"id": "contact", "name": "Contacto", "required": True},
                ]
            },
            "ai_system_prompt": (
                "Eres un experto en marketing para fitness y bienestar. "
                "Genera contenido motivador, enérgico y orientado a resultados. "
                "Usa un tono inspirador y directo. "
                "Destaca los beneficios de salud, las transformaciones y la comunidad."
            ),
            "default_theme": {
                "primary_color": "#1A1A2E",
                "secondary_color": "#E94560",
                "font_heading": "Montserrat",
                "font_body": "Inter",
                "style": "bold",
            },
            "is_active": True,
            "is_premium": False,
            "sort_order": 3,
        },
        {
            "name": "Negocio Profesional",
            "slug": "negocio-profesional",
            "industry": "professional",
            "description": "Diseño limpio y profesional para consultorías, abogados, contadores y servicios profesionales en general.",
            "structure_schema": {
                "sections": [
                    {"id": "hero", "name": "Encabezado Principal", "required": True},
                    {"id": "about", "name": "Sobre Nosotros", "required": True},
                    {"id": "services", "name": "Servicios", "required": True},
                    {"id": "testimonials", "name": "Testimonios", "required": False},
                    {"id": "contact", "name": "Contacto", "required": True},
                ]
            },
            "ai_system_prompt": (
                "Eres un experto en marketing para servicios profesionales. "
                "Genera contenido serio, confiable y orientado a la autoridad profesional. "
                "Usa un tono formal pero accesible. "
                "Destaca la experiencia, credenciales y resultados para clientes."
            ),
            "default_theme": {
                "primary_color": "#0F172A",
                "secondary_color": "#3B82F6",
                "font_heading": "Inter",
                "font_body": "Inter",
                "style": "clean",
            },
            "is_active": True,
            "is_premium": False,
            "sort_order": 4,
        },
    ]

    for t in templates:
        WebsiteTemplate.objects.get_or_create(
            slug=t["slug"],
            defaults=t,
        )


def remove_templates(apps, schema_editor):
    WebsiteTemplate = apps.get_model('websites', 'WebsiteTemplate')
    WebsiteTemplate.objects.filter(
        slug__in=[
            "belleza-elegante",
            "restaurante-moderno",
            "fitness-energetico",
            "negocio-profesional",
        ]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('websites', '0003_chatmessage'),
    ]

    operations = [
        migrations.RunPython(create_templates, remove_templates),
    ]
