# backend/websites/services/ai_prompts.py
"""
System prompts, templates de prompt y formateo de contexto para la IA.
"""

# Instrucciones para que la IA decida las páginas electivas (selected_pages).
# Universo cerrado: about/blog/portfolio/pricing. NUNCA home/contact/services/
# products/bookings/menu (esas las decide el servidor por reglas).
SELECTED_PAGES_INSTRUCTIONS = """## Páginas electivas (selected_pages)
Además del contenido, decide qué páginas electivas necesita este negocio como
página propia y devuélvelas en el campo `selected_pages`. El universo cerrado es
exactamente:
- "about"     — incluye cuando el negocio tiene una historia/equipo/valores que contar.
- "blog"      — incluye cuando el negocio publicará artículos, novedades o contenido educativo.
- "portfolio" — incluye para creativos / negocios visuales que muestran trabajos previos.
- "pricing"   — incluye cuando hay planes/tarifas claras que conviene transparentar.
NUNCA incluyas "home", "contact", "services", "products", "bookings" ni "menu" en
`selected_pages`. Si ninguna electiva aplica, devuelve una lista vacía. Sólo
selecciona una electiva si además generas su sección de contenido correspondiente."""


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


def _get_active_blocks(template=None, industry: str = "") -> list:
    """Query active PromptBlocks with scope filtering."""
    from websites.models import PromptBlock

    blocks = list(PromptBlock.objects.filter(is_active=True).order_by("category", "sort_order"))
    if not blocks:
        return []

    result = []
    for block in blocks:
        if block.scope == "global":
            result.append(block)
        elif block.scope == "template" and template and block.template_id == template.id:
            result.append(block)
        elif block.scope == "industry" and industry and block.industry_id and block.industry.key == industry:
            result.append(block)
    return result


def _build_variant_instructions(section_keys: list[str]) -> str:
    """Build variant instruction text for the prompt from active SectionVariants."""
    from websites.models import SectionVariant

    variants = (
        SectionVariant.objects.filter(is_active=True, section__key__in=section_keys)
        .select_related("section")
        .order_by("section__key", "sort_order")
    )
    if not variants:
        return ""

    lines = ["## Variantes de Diseno Disponibles", ""]
    current_section = None
    for v in variants:
        if v.section.key != current_section:
            current_section = v.section.key
            lines.append(f"### {v.section.label} ({current_section})")
        default_marker = " [DEFAULT]" if v.is_default else ""
        lines.append(f"- **{v.key}**: {v.label}{default_marker}")
        if v.description:
            lines.append(f"  {v.description}")
        if v.css_class_hint:
            lines.append(f"  CSS: `{v.css_class_hint}`")
        if v.mood:
            lines.append(f"  Mood: {v.get_mood_display()}")

    lines.append("")
    lines.append('Para cada seccion, elige UNA variante y devuelvela en el campo `"_variant"` del JSON de esa seccion.')
    return "\n".join(lines)


def _build_legacy_prompt(template, onboarding_responses: dict) -> str:
    """Legacy hardcoded prompt — exact copy of previous behavior."""
    template_prompt = template.ai_system_prompt if template else ""
    business_context = format_business_context(onboarding_responses)
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

{SELECTED_PAGES_INSTRUCTIONS}

## Formato de Respuesta
Responde SIEMPRE en formato JSON válido con la estructura solicitada.
No incluyas explicaciones fuera del JSON.
"""


def build_system_prompt(template, onboarding_responses: dict) -> str:
    """
    Construye el prompt del sistema.

    Strategy:
    1. Try dynamic assembly from PromptBlock records
    2. If no blocks exist, fall back to legacy hardcoded prompt
    """
    from collections import defaultdict

    industry = (template.industry.key if template and template.industry_id else "generic") or "generic"
    blocks = _get_active_blocks(template=template, industry=industry)

    if not blocks:
        return _build_legacy_prompt(template, onboarding_responses)

    # Build context values for placeholder replacement
    business_context = format_business_context(onboarding_responses)
    visual_context = format_visual_config(template, onboarding_responses)
    template_prompt = template.ai_system_prompt if template else ""
    brand_tone = onboarding_responses.get("brand_tone", "profesional y cercano")

    # Build variant instructions from selected sections
    selected_sections = onboarding_responses.get("website_sections", [])
    section_keys = set(selected_sections) if selected_sections else set()
    section_keys.update(["hero", "contact"])
    variant_instructions = _build_variant_instructions(list(section_keys))

    placeholders = defaultdict(
        str,
        {
            "business_context": business_context,
            "visual_context": visual_context,
            "template_prompt": template_prompt,
            "brand_tone": brand_tone,
            "variant_instructions": variant_instructions,
            "selected_pages_instructions": SELECTED_PAGES_INSTRUCTIONS,
        },
    )

    parts = []
    for block in blocks:
        try:
            rendered = block.content.format_map(placeholders)
        except (KeyError, ValueError):
            rendered = block.content
        parts.append(rendered)

    return "\n\n".join(parts)
