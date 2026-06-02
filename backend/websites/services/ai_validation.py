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

    # 2. Frases prohibidas según industria
    industry = (template.industry if template else "").lower()
    forbidden = FORBIDDEN_PHRASES_BY_INDUSTRY.get(industry, [])
    if forbidden or FORBIDDEN_CTA_PHRASES:
        content_text = json.dumps(content_data, ensure_ascii=False).lower()
        for phrase in forbidden:
            if phrase.lower() in content_text:
                problems.append(f"Contiene frase prohibida: '{phrase}'.")
        for cta in FORBIDDEN_CTA_PHRASES:
            if cta in content_text:
                problems.append(f"Contiene CTA genérico prohibido: '{cta}'.")

    return problems
