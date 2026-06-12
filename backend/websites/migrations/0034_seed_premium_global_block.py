"""Seed a global premium anti-cliché / specificity PromptBlock (issue #285).

`mejora-calidad-ia-promptblocks` (Option C): mejorar la calidad del copy generado
por la IA añadiendo un bloque GLOBAL de reglas premium que empuja a la IA hacia
copy específico del negocio y lejos de frases cliché intercambiables.

Detalles del bloque:
- key:        rules-premium-anticliche
- scope:      global  (aplica a todas las industrias/templates)
- category:   rules
- sort_order: 5  (entre rules-general (0) y rules-json-format (10))

IMPORTANTE — escape de llaves:
``ai_prompts.build_system_prompt`` renderiza ``block.content`` con
``str.format_map(placeholders)``. Por eso, cada ``{`` / ``}`` LITERAL de los
ejemplos few-shot en JSON debe ir DOBLADO (``{{`` / ``}}``) en el código fuente
de esta migración, para que el modelo reciba una sola llave. El bloque no usa
placeholders ``{nombre}``, así que toda llave simple debe ser literal -> doblada.

Idempotente: usa ``get_or_create`` por ``key`` para no duplicar ni sobrescribir
ajustes que un superadmin haya hecho desde el panel.
"""

from django.db import migrations

PREMIUM_BLOCK = {
    "key": "rules-premium-anticliche",
    "label": "Reglas premium / anti-cliché",
    "content": (
        "## Calidad premium (anti-cliché) — OBLIGATORIO\n\n"
        "Escribes para un sitio que debe verse hecho a mano por un profesional, no "
        "autogenerado. Reglas no negociables:\n\n"
        "1. Especificidad sobre adjetivos. Nombra productos, técnicas, materiales, "
        "procesos y datos concretos del negocio. Prohibido rellenar con adjetivos "
        'vacíos ("calidad", "compromiso", "excelencia", "pasión").\n'
        "2. Hero: la promesa, no la bienvenida. Heading de 4-8 palabras con un "
        'beneficio tangible. Nunca "Bienvenido a...". Subtítulo de 1 frase '
        "(15-25 palabras) que diga QUÉ hace y PARA QUIÉN.\n"
        '3. CTAs con verbo concreto ("Reservar cita", "Pedir cotización", '
        '"Ver catálogo"). Prohibido "Saber más", "Descubre más", "Conoce más".\n'
        "4. Servicios: cada uno comunica beneficio tangible + detalle concreto. "
        'Mínimo 15 palabras de descripción. Nada de "Servicio 1 — descripción '
        'del servicio".\n'
        "5. About: hechos, no historia corporativa abstracta. Años, especialidad, "
        "productos/herramientas que usan. Si no hay datos, no inventes.\n"
        "6. Testimonios: solo si son reales y específicos. Si no hay, omite la "
        "sección antes que inventar reseñas genéricas.\n"
        "7. Sin gritos: nada de MAYÚSCULAS para énfasis, sin emojis en el copy del "
        "sitio, sin exclamaciones múltiples.\n\n"
        "### Frases PROHIBIDAS (no las uses en ninguna forma)\n"
        '"soluciones a tu medida", "calidad y compromiso", "los mejores precios", '
        '"tu mejor aliado", "amplia experiencia", "atención personalizada", '
        '"experiencia única", "comprometidos con la excelencia", "tu satisfacción '
        'es nuestra prioridad", "donde tus sueños se hacen realidad", "saber más", '
        '"descubre más", "conoce más".\n\n'
        "### Minado de diferenciadores\n"
        "Antes de escribir, extrae de la información del negocio: (a) productos/"
        "servicios concretos, (b) técnicas o materiales mencionados, (c) si es B2B "
        "o B2C, (d) ubicación, (e) público objetivo. Úsalos literalmente en el "
        "copy.\n\n"
        "### Mini-ejemplos (Bien vs Mal)\n\n"
        "HERO — Mal:\n"
        '{{"title": "Tu mejor aliado en impresión", "subtitle": "Bienvenido, '
        'ofrecemos soluciones a tu medida con calidad y compromiso.", '
        '"cta_text": "Saber más"}}\n\n'
        "HERO — Bien:\n"
        '{{"title": "Estampados DTF en 24 horas", "subtitle": "Personalizamos '
        "camisetas y uniformes para empresas y eventos en Bogotá, con sublimación "
        'y vinilo textil.", "cta_text": "Pedir cotización"}}\n\n'
        "SERVICIOS — Mal:\n"
        '{{"name": "Servicio 1", "description": "Ofrecemos un servicio de calidad '
        'pensado para ti."}}\n\n'
        "SERVICIOS — Bien:\n"
        '{{"name": "Impresión DTF textil", "description": "Transfer digital de alta '
        "durabilidad sobre algodón y poliéster. Colores plenos sin tacto plástico, "
        'ideal para tirajes cortos y diseños con degradados. Entrega en 2-3 días."}}'
    ),
    "category": "rules",
    "scope": "global",
    "sort_order": 5,
}


def seed_premium_block(apps, schema_editor):
    PromptBlock = apps.get_model("websites", "PromptBlock")
    PromptBlock.objects.get_or_create(
        key=PREMIUM_BLOCK["key"],
        defaults=PREMIUM_BLOCK,
    )


def reverse_seed_premium_block(apps, schema_editor):
    PromptBlock = apps.get_model("websites", "PromptBlock")
    # Reverse conservador: solo borra si el bloque sigue idéntico al sembrado,
    # para no eliminar ajustes que un superadmin haya hecho desde el panel.
    PromptBlock.objects.filter(
        key=PREMIUM_BLOCK["key"],
        content=PREMIUM_BLOCK["content"],
        category=PREMIUM_BLOCK["category"],
        scope=PREMIUM_BLOCK["scope"],
        sort_order=PREMIUM_BLOCK["sort_order"],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("websites", "0033_alter_aigenerationlog_website_config"),
    ]

    operations = [
        migrations.RunPython(seed_premium_block, reverse_seed_premium_block),
    ]
