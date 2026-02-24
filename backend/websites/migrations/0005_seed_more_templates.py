"""
Migración de datos: crea templates adicionales para cubrir más industrias.
"""

from django.db import migrations


TEMPLATES = [
    {
        "name": "Tienda Online",
        "slug": "tienda-online",
        "industry": "retail",
        "description": "Diseño atractivo para tiendas, ecommerce y negocios de venta de productos. Catálogo visual, promociones y compra fácil.",
        "structure_schema": {
            "sections": [
                {"id": "hero", "name": "Encabezado Principal", "required": True},
                {"id": "about", "name": "Nuestra Historia", "required": True},
                {"id": "services", "name": "Productos Destacados", "required": True},
                {"id": "gallery", "name": "Galería", "required": False},
                {"id": "testimonials", "name": "Reseñas de Clientes", "required": False},
                {"id": "contact", "name": "Contacto y Envíos", "required": True},
            ]
        },
        "ai_system_prompt": (
            "Eres un experto en marketing para ecommerce y tiendas online. "
            "Genera contenido que destaque los productos, su calidad y la experiencia de compra. "
            "Usa un tono cercano, confiable y orientado a la conversión. "
            "Destaca las ventajas de comprar aquí: calidad, envíos, atención personalizada."
        ),
        "default_theme": {
            "primary_color": "#6F4E37",
            "secondary_color": "#F5E6D3",
            "font_heading": "Poppins",
            "font_body": "Inter",
            "style": "warm",
        },
        "is_active": True,
        "is_premium": False,
        "sort_order": 5,
    },
    {
        "name": "Clínica Salud",
        "slug": "clinica-salud",
        "industry": "health",
        "description": "Diseño confiable para clínicas, consultorios médicos y profesionales de la salud. Transmite confianza y profesionalismo.",
        "structure_schema": {
            "sections": [
                {"id": "hero", "name": "Encabezado Principal", "required": True},
                {"id": "about", "name": "Sobre Nosotros", "required": True},
                {"id": "services", "name": "Especialidades", "required": True},
                {"id": "testimonials", "name": "Testimonios de Pacientes", "required": False},
                {"id": "contact", "name": "Agendar Cita", "required": True},
            ]
        },
        "ai_system_prompt": (
            "Eres un experto en marketing para clínicas y servicios de salud. "
            "Genera contenido que transmita confianza, profesionalismo y cuidado. "
            "Usa un tono empático, serio pero accesible. "
            "Destaca la experiencia del equipo médico, tecnología y atención al paciente."
        ),
        "default_theme": {
            "primary_color": "#0E4D6B",
            "secondary_color": "#56B4A9",
            "font_heading": "Poppins",
            "font_body": "Inter",
            "style": "clean",
        },
        "is_active": True,
        "is_premium": False,
        "sort_order": 6,
    },
    {
        "name": "Educación Creativa",
        "slug": "educacion-creativa",
        "industry": "education",
        "description": "Diseño inspirador para academias, centros educativos y cursos. Muestra tus programas y motiva a nuevos estudiantes.",
        "structure_schema": {
            "sections": [
                {"id": "hero", "name": "Encabezado Principal", "required": True},
                {"id": "about", "name": "Sobre la Academia", "required": True},
                {"id": "services", "name": "Programas y Cursos", "required": True},
                {"id": "testimonials", "name": "Lo que dicen nuestros alumnos", "required": False},
                {"id": "contact", "name": "Inscripciones", "required": True},
            ]
        },
        "ai_system_prompt": (
            "Eres un experto en marketing educativo. "
            "Genera contenido inspirador que motive al aprendizaje. "
            "Usa un tono motivador, cercano y profesional. "
            "Destaca la metodología, los resultados de los alumnos y las oportunidades."
        ),
        "default_theme": {
            "primary_color": "#2D3A8C",
            "secondary_color": "#F59E0B",
            "font_heading": "Montserrat",
            "font_body": "Inter",
            "style": "modern",
        },
        "is_active": True,
        "is_premium": False,
        "sort_order": 7,
    },
    {
        "name": "Mascotas y Veterinaria",
        "slug": "mascotas-veterinaria",
        "industry": "pet",
        "description": "Diseño amigable para veterinarias, pet shops y servicios para mascotas. Cálido y confiable.",
        "structure_schema": {
            "sections": [
                {"id": "hero", "name": "Encabezado Principal", "required": True},
                {"id": "about", "name": "Quiénes Somos", "required": True},
                {"id": "services", "name": "Servicios", "required": True},
                {"id": "gallery", "name": "Nuestros Pacientes", "required": False},
                {"id": "testimonials", "name": "Testimonios", "required": False},
                {"id": "contact", "name": "Contacto y Emergencias", "required": True},
            ]
        },
        "ai_system_prompt": (
            "Eres un experto en marketing para veterinarias y servicios para mascotas. "
            "Genera contenido cálido, empático y que transmita amor por los animales. "
            "Usa un tono cercano y confiable. "
            "Destaca el cuidado profesional, el bienestar animal y la experiencia del equipo."
        ),
        "default_theme": {
            "primary_color": "#2E7D52",
            "secondary_color": "#F9C74F",
            "font_heading": "Poppins",
            "font_body": "Inter",
            "style": "friendly",
        },
        "is_active": True,
        "is_premium": False,
        "sort_order": 8,
    },
    {
        "name": "Tecnología Innovadora",
        "slug": "tecnologia-innovadora",
        "industry": "tech",
        "description": "Diseño moderno para startups, empresas de software y servicios tecnológicos. Limpio, futurista y confiable.",
        "structure_schema": {
            "sections": [
                {"id": "hero", "name": "Encabezado Principal", "required": True},
                {"id": "about", "name": "Sobre Nosotros", "required": True},
                {"id": "services", "name": "Soluciones", "required": True},
                {"id": "testimonials", "name": "Casos de Éxito", "required": False},
                {"id": "contact", "name": "Contacto", "required": True},
            ]
        },
        "ai_system_prompt": (
            "Eres un experto en marketing para empresas de tecnología. "
            "Genera contenido innovador, claro y orientado a soluciones. "
            "Usa un tono profesional pero moderno. "
            "Destaca la innovación, la eficiencia y los resultados medibles."
        ),
        "default_theme": {
            "primary_color": "#0F172A",
            "secondary_color": "#6366F1",
            "font_heading": "Inter",
            "font_body": "Inter",
            "style": "minimal",
        },
        "is_active": True,
        "is_premium": False,
        "sort_order": 9,
    },
    {
        "name": "Estudio Creativo",
        "slug": "estudio-creativo",
        "industry": "creative",
        "description": "Diseño visual para fotógrafos, diseñadores, artistas y estudios creativos. Portfolio, galería y proyectos.",
        "structure_schema": {
            "sections": [
                {"id": "hero", "name": "Encabezado Principal", "required": True},
                {"id": "about", "name": "Sobre Mí / Nosotros", "required": True},
                {"id": "gallery", "name": "Portfolio", "required": True},
                {"id": "services", "name": "Servicios", "required": True},
                {"id": "testimonials", "name": "Testimonios", "required": False},
                {"id": "contact", "name": "Contacto", "required": True},
            ]
        },
        "ai_system_prompt": (
            "Eres un experto en marketing para profesionales creativos. "
            "Genera contenido artístico, inspirador y que destaque el trabajo visual. "
            "Usa un tono auténtico y apasionado. "
            "Destaca el estilo único, la visión artística y la calidad del trabajo."
        ),
        "default_theme": {
            "primary_color": "#1A1A1A",
            "secondary_color": "#E11D48",
            "font_heading": "Playfair Display",
            "font_body": "Inter",
            "style": "artistic",
        },
        "is_active": True,
        "is_premium": False,
        "sort_order": 10,
    },
    {
        "name": "Consultoría Experta",
        "slug": "consultoria-experta",
        "industry": "consulting",
        "description": "Diseño autoridad para consultores, coaches y asesores. Genera confianza y demuestra experiencia.",
        "structure_schema": {
            "sections": [
                {"id": "hero", "name": "Encabezado Principal", "required": True},
                {"id": "about", "name": "Sobre el Consultor", "required": True},
                {"id": "services", "name": "Áreas de Consultoría", "required": True},
                {"id": "testimonials", "name": "Resultados con Clientes", "required": False},
                {"id": "contact", "name": "Agendar Consulta", "required": True},
            ]
        },
        "ai_system_prompt": (
            "Eres un experto en marketing para consultores y coaches. "
            "Genera contenido que posicione como autoridad en la materia. "
            "Usa un tono confiable, experto y orientado a resultados. "
            "Destaca la experiencia, metodología y resultados comprobables."
        ),
        "default_theme": {
            "primary_color": "#1E293B",
            "secondary_color": "#0EA5E9",
            "font_heading": "Poppins",
            "font_body": "Inter",
            "style": "corporate",
        },
        "is_active": True,
        "is_premium": False,
        "sort_order": 11,
    },
    {
        "name": "Automotriz Pro",
        "slug": "automotriz-pro",
        "industry": "automotive",
        "description": "Diseño robusto para talleres mecánicos, concesionarios y servicios automotrices. Confianza y experiencia.",
        "structure_schema": {
            "sections": [
                {"id": "hero", "name": "Encabezado Principal", "required": True},
                {"id": "about", "name": "Sobre el Taller", "required": True},
                {"id": "services", "name": "Servicios", "required": True},
                {"id": "testimonials", "name": "Opiniones de Clientes", "required": False},
                {"id": "contact", "name": "Ubicación y Contacto", "required": True},
            ]
        },
        "ai_system_prompt": (
            "Eres un experto en marketing para negocios automotrices. "
            "Genera contenido que transmita confianza técnica y experiencia. "
            "Usa un tono directo, profesional y honesto. "
            "Destaca la experiencia, la calidad del trabajo y la garantía del servicio."
        ),
        "default_theme": {
            "primary_color": "#1C1C1C",
            "secondary_color": "#DC2626",
            "font_heading": "Montserrat",
            "font_body": "Inter",
            "style": "bold",
        },
        "is_active": True,
        "is_premium": False,
        "sort_order": 12,
    },
    {
        "name": "Inmobiliaria Moderna",
        "slug": "inmobiliaria-moderna",
        "industry": "real_estate",
        "description": "Diseño elegante para inmobiliarias y agentes de bienes raíces. Propiedades, búsqueda y contacto directo.",
        "structure_schema": {
            "sections": [
                {"id": "hero", "name": "Encabezado Principal", "required": True},
                {"id": "about", "name": "Sobre la Inmobiliaria", "required": True},
                {"id": "services", "name": "Propiedades Destacadas", "required": True},
                {"id": "testimonials", "name": "Clientes Satisfechos", "required": False},
                {"id": "contact", "name": "Contacto", "required": True},
            ]
        },
        "ai_system_prompt": (
            "Eres un experto en marketing inmobiliario. "
            "Genera contenido que inspire confianza y transmita profesionalismo. "
            "Usa un tono aspiracional pero accesible. "
            "Destaca la experiencia en el mercado, el portafolio y la atención personalizada."
        ),
        "default_theme": {
            "primary_color": "#1A365D",
            "secondary_color": "#C59D5F",
            "font_heading": "Playfair Display",
            "font_body": "Inter",
            "style": "elegant",
        },
        "is_active": True,
        "is_premium": False,
        "sort_order": 13,
    },
    {
        "name": "Eventos y Celebraciones",
        "slug": "eventos-celebraciones",
        "industry": "events",
        "description": "Diseño festivo para organizadores de eventos, wedding planners y servicios de celebración.",
        "structure_schema": {
            "sections": [
                {"id": "hero", "name": "Encabezado Principal", "required": True},
                {"id": "about", "name": "Quiénes Somos", "required": True},
                {"id": "services", "name": "Nuestros Servicios", "required": True},
                {"id": "gallery", "name": "Eventos Realizados", "required": True},
                {"id": "testimonials", "name": "Lo que dicen nuestros clientes", "required": False},
                {"id": "contact", "name": "Cotizar Evento", "required": True},
            ]
        },
        "ai_system_prompt": (
            "Eres un experto en marketing para eventos y celebraciones. "
            "Genera contenido emotivo, elegante y que inspire momentos especiales. "
            "Usa un tono cálido, soñador pero profesional. "
            "Destaca la creatividad, la atención al detalle y eventos memorables."
        ),
        "default_theme": {
            "primary_color": "#4A1942",
            "secondary_color": "#E8B4B8",
            "font_heading": "Playfair Display",
            "font_body": "Inter",
            "style": "romantic",
        },
        "is_active": True,
        "is_premium": False,
        "sort_order": 14,
    },
    {
        "name": "Universal Adaptable",
        "slug": "universal-adaptable",
        "industry": "generic",
        "description": "Diseño versátil que se adapta a cualquier tipo de negocio. La IA personalizará todo según tu industria.",
        "structure_schema": {
            "sections": [
                {"id": "hero", "name": "Encabezado Principal", "required": True},
                {"id": "about", "name": "Sobre Nosotros", "required": True},
                {"id": "services", "name": "Servicios / Productos", "required": True},
                {"id": "gallery", "name": "Galería", "required": False},
                {"id": "testimonials", "name": "Testimonios", "required": False},
                {"id": "contact", "name": "Contacto", "required": True},
            ]
        },
        "ai_system_prompt": (
            "Eres un experto en marketing digital versátil. "
            "Genera contenido profesional adaptado al tipo de negocio del usuario. "
            "Usa un tono que se ajuste a la industria específica. "
            "Destaca los valores del negocio, su experiencia y lo que lo hace especial."
        ),
        "default_theme": {
            "primary_color": "#1C3B57",
            "secondary_color": "#95D0C9",
            "font_heading": "Poppins",
            "font_body": "Inter",
            "style": "modern",
        },
        "is_active": True,
        "is_premium": False,
        "sort_order": 15,
    },
]

SLUGS = [t["slug"] for t in TEMPLATES]


def create_templates(apps, schema_editor):
    WebsiteTemplate = apps.get_model('websites', 'WebsiteTemplate')

    for t in TEMPLATES:
        WebsiteTemplate.objects.get_or_create(
            slug=t["slug"],
            defaults=t,
        )

    print(f"✓ Creados {len(TEMPLATES)} templates adicionales")


def remove_templates(apps, schema_editor):
    WebsiteTemplate = apps.get_model('websites', 'WebsiteTemplate')
    WebsiteTemplate.objects.filter(slug__in=SLUGS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('websites', '0004_seed_templates'),
    ]

    operations = [
        migrations.RunPython(create_templates, remove_templates),
    ]
