# backend/websites/services/ai_constants.py
"""
Constantes compartidas por los submódulos del servicio de IA.
"""

# Mínimo de palabras aceptable para la descripción de un servicio.
# Menos que esto se considera genérico ("Servicio 1 -- Descripcion del servicio").
MIN_SERVICE_DESCRIPTION_WORDS = 15

# Mapeo: opción del multi_choice / page key -> IDs de sección del template.
#
# El frontend envía page KEYS ("about", "blog", ...) como ``website_sections``,
# así que la fuente primaria de llaves son las page keys. Se conservan las
# etiquetas en español como aliases de backward-compat para cualquier payload
# legacy que aún envíe labels.
SECTION_OPTION_MAP: dict[str, list[str]] = {
    # Page keys (lo que el frontend realmente envía hoy)
    "about": ["about"],
    "blog": ["blog"],
    "services": ["services"],
    "products": ["products"],
    "gallery": ["gallery"],
    "testimonials": ["testimonials"],
    "pricing": ["pricing"],
    "faq": ["faq"],
    "portfolio": ["portfolio"],
    # Etiquetas en español — aliases de backward-compat (legacy)
    "Sobre nosotros": ["about"],
    "Servicios": ["services"],
    "Productos": ["products"],
    "Servicios / Productos": ["services", "products"],  # backwards compat
    "Galería de fotos": ["gallery"],
    "Testimonios / Reseñas": ["testimonials"],
    "Precios / Tarifas": ["pricing"],
    "Preguntas frecuentes": ["faq"],
}
