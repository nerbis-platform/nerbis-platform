# backend/websites/services/ai_constants.py
"""
Constantes compartidas por los submódulos del servicio de IA.
"""

# Mínimo de palabras aceptable para la descripción de un servicio.
# Menos que esto se considera genérico ("Servicio 1 -- Descripcion del servicio").
MIN_SERVICE_DESCRIPTION_WORDS = 15

# Mapeo: opción del multi_choice -> IDs de sección del template
SECTION_OPTION_MAP: dict[str, list[str]] = {
    "Sobre nosotros": ["about"],
    "Servicios": ["services"],
    "Productos": ["products"],
    "Servicios / Productos": ["services", "products"],  # backwards compat
    "Galería de fotos": ["gallery"],
    "Testimonios / Reseñas": ["testimonials"],
    "Precios / Tarifas": ["pricing"],
    "Preguntas frecuentes": ["faq"],
}
