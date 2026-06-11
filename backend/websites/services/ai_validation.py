# backend/websites/services/ai_validation.py
"""
Reglas de validación de contenido generado por IA.

Las frases prohibidas viven por industria. Fuente de verdad por vertical:
backend/websites/design-references/<industria>.md
"""

import json

from websites.services.ai_constants import MIN_SERVICE_DESCRIPTION_WORDS

# CTAs genéricos prohibidos en cualquier vertical.
FORBIDDEN_CTA_PHRASES = [
    "saber más",
    "descubre más",
    "conoce más",
    "leer más",
    "ver más",
    "haz clic aquí",
    "click aquí",
    "más información",
]

# Frases genéricas prohibidas en CUALQUIER industria (issue #285).
# Copy intercambiable que serviría para cualquier negocio del sector; empuja la
# generación hacia texto específico del negocio. Se comparan en minúsculas,
# coincidencia parcial. Es ADITIVO a FORBIDDEN_PHRASES_BY_INDUSTRY (que mantiene
# las reglas por vertical, p.ej. beauty).
FORBIDDEN_GENERIC_PHRASES = [
    "tu mejor opción",
    "calidad garantizada",
    "atención personalizada",
    "experiencia única",
    "somos especialistas en",
    "con más de",  # "con más de X años de experiencia"
    "años de experiencia",
    "descubre la diferencia",
    "la mejor opción para ti",
    "comprometidos con la calidad",
    "soluciones a tu medida",
    "soluciones a la medida",
    "tu satisfacción es nuestra prioridad",
]

# Frases prohibidas por industria (se comparan en minúsculas, coincidencia parcial).
# Para wellness ver: backend/websites/design-references/wellness.md §5.
FORBIDDEN_PHRASES_BY_INDUSTRY: dict[str, list[str]] = {
    "beauty": [
        "tu belleza, nuestra pasión",
        "tu belleza es importante para nosotros",
        "bienvenido a nuestro centro",
        "bienvenida a nuestro centro",
        "con más de",  # matches "con más de X años de experiencia"
        "somos especialistas en",
        "la mejor opción para ti",
        "cuidado premium",
        "servicio premium",
        "experiencia única",
        "atención personalizada",
        "ofrecemos bienestar",
        "brindamos bienestar",
        "transformamos tu belleza",
        "descubre la diferencia",
        "te invitamos a conocer",
    ],
}


def validate_generated_content(content_data: dict, template) -> list[str]:
    """
    Valida el contenido generado contra las reglas del vertical.

    Devuelve lista de problemas detectados (vacía si todo OK). El caller
    puede decidir si reintenta o solo loggea.

    Reglas aplicadas:
    1. Cada servicio debe tener descripción >= MIN_SERVICE_DESCRIPTION_WORDS.
    2. Si la industria del template tiene frases prohibidas, el contenido
       completo no debe contenerlas (match en minúsculas, parcial).
    3. CTAs genéricos prohibidos en cualquier industria.
    4. Frases genéricas/intercambiables prohibidas en cualquier industria.
    """
    if not content_data:
        return []

    problems: list[str] = []

    # 1. Descripciones de servicios
    services_items = (content_data.get("services") or {}).get("items") or []
    for idx, item in enumerate(services_items, start=1):
        desc = (item.get("description") or "").strip()
        word_count = len(desc.split())
        if word_count < MIN_SERVICE_DESCRIPTION_WORDS:
            name = item.get("name") or f"servicio {idx}"
            problems.append(
                f"Descripción de '{name}' muy corta ({word_count} palabras, mínimo {MIN_SERVICE_DESCRIPTION_WORDS})."
            )

    # 2. Frases prohibidas según industria + 3. CTAs genéricos +
    #    4. frases genéricas globales (todo en un solo pase sobre el texto).
    industry = ((template.industry.key if template and template.industry_id else "") or "").lower()
    forbidden = FORBIDDEN_PHRASES_BY_INDUSTRY.get(industry, [])
    content_text = json.dumps(content_data, ensure_ascii=False).lower()

    for phrase in forbidden:
        if phrase.lower() in content_text:
            problems.append(f"Contiene frase prohibida: '{phrase}'.")
    for cta in FORBIDDEN_CTA_PHRASES:
        if cta in content_text:
            problems.append(f"Contiene CTA genérico prohibido: '{cta}'.")
    for phrase in FORBIDDEN_GENERIC_PHRASES:
        if phrase in content_text:
            problems.append(f"Contiene frase genérica prohibida: '{phrase}'.")

    return problems
