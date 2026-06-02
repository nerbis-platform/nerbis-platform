# backend/websites/services/ai_prompts.py
"""
System prompts, templates de prompt y formateo de contexto para la IA.
"""


def format_business_context(responses: dict) -> str:
    """Formatea las respuestas del onboarding como contexto."""
    context_lines = []

    # Mapeo de claves a descripciones legibles
    key_labels = {
        "business_name": "Nombre del negocio",
        "business_tagline": "Slogan",
        "business_description": "Descripción",
        "target_audience": "Audiencia objetivo",
        "unique_selling_point": "Propuesta de valor única",
        "brand_tone": "Tono de comunicación",
        "website_sections": "Secciones seleccionadas para el sitio",
        "business_address": "Dirección",
        "business_phone": "Teléfono",
        "business_email": "Email",
        "business_whatsapp": "WhatsApp",
        "business_hours": "Horario de atención",
    }

    for key, value in responses.items():
        if value:  # Solo incluir si tiene valor
            label = key_labels.get(key, key.replace("_", " ").title())
            if isinstance(value, list):
                value = ", ".join(str(v) for v in value)
            context_lines.append(f"- {label}: {value}")

    return "\n".join(context_lines) if context_lines else "No se proporcionó información adicional."


def format_visual_config(template, onboarding_responses: dict) -> str:
    """Formatea paleta + tipografía del template para el prompt."""
    if not template or not template.default_theme:
        return "Sin configuración visual específica. Usa un tono neutro."

    theme = dict(template.default_theme)
    # El onboarding puede sobrescribir los colores; usarlos si están
    if onboarding_responses.get("primary_color"):
        theme["primary_color"] = onboarding_responses["primary_color"]
    if onboarding_responses.get("secondary_color"):
        theme["secondary_color"] = onboarding_responses["secondary_color"]

    lines = []
    if theme.get("primary_color"):
        lines.append(f"- Color primario: {theme['primary_color']}")
    if theme.get("secondary_color"):
        lines.append(f"- Color secundario: {theme['secondary_color']}")
    if theme.get("accent_color"):
        lines.append(f"- Color de acento: {theme['accent_color']}")
    if theme.get("font_heading"):
        lines.append(f"- Tipografía de títulos: {theme['font_heading']}")
    if theme.get("font_body"):
        lines.append(f"- Tipografía de texto: {theme['font_body']}")
    if theme.get("style"):
        lines.append(f"- Estilo visual: {theme['style']}")

    if not lines:
        return "Sin configuración visual específica."

    lines.append(
        "\nEl copy generado debe armonizar con esta identidad visual "
        "(tono, ritmo y vocabulario coherentes con los colores y tipografía)."
    )
    return "\n".join(lines)


def build_system_prompt(template, onboarding_responses: dict) -> str:
    """
    Construye el prompt del sistema basado en el template y respuestas.

    Args:
        template: WebsiteTemplate seleccionado
        onboarding_responses: dict de respuestas del onboarding

    Returns:
        String con el prompt del sistema
    """
    # Prompt base del template (si existe)
    template_prompt = template.ai_system_prompt if template else ""

    # Construir contexto del negocio desde las respuestas
    business_context = format_business_context(onboarding_responses)

    # Configuración visual del template (paleta + tipografía)
    visual_context = format_visual_config(template, onboarding_responses)

    return f"""Eres un experto en crear contenido para sitios web de negocios.
Tu objetivo es generar contenido profesional, atractivo y personalizado.

## Información del Negocio
{business_context}

## Configuración Visual
{visual_context}

## Instrucciones del Template
{template_prompt}

## Reglas Generales
1. Escribe en español (España/Latinoamérica según el contexto)
2. Usa un tono {onboarding_responses.get("brand_tone", "profesional y cercano")}
3. Sé conciso pero impactante
4. Incluye llamadas a la acción claras
5. Personaliza el contenido según la industria y audiencia
6. No inventes información que no se haya proporcionado
7. Si falta información, usa placeholders descriptivos como "[Tu teléfono]"

## Formato de Respuesta
Responde SIEMPRE en formato JSON válido con la estructura solicitada.
No incluyas explicaciones fuera del JSON.
"""
