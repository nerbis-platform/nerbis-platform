"""Rename de claves a tokens BARE por sección — DATOS (issue #296).

Continúa 0037 (que ya cambió el esquema a unicidad compuesta (section, key)).
Aquí se renombra cada variante no-hero de `<section>-<token>` -> `<token>`, de
modo que la clave del catálogo sea EXACTAMENTE el token que consume el renderer
(`_render_<section>_<token>`) y el frontend (`switch (variant)`).

Las claves de hero ya eran bare (centered, split-image, ...). Además garantizamos
que el hero `glassmorphism` EXISTE pero queda INACTIVO (en una BD fresca, 0020 no
lo sembró porque la sección hero aún no existía en ese punto, así que 0036 no tuvo
nada que desactivar).

Migración de DATOS pura (RunPython), idempotente y reversible. Separada del
cambio de esquema de 0037 a propósito: así ni el forward ni el reverse mezclan
DDL y DML sobre `websites_sectionvariant` en una misma transacción.

Tras el rename, para cada sección las claves ACTIVAS igualan EXACTAMENTE los
tokens del renderer/frontend (re-verificados contra rendering.py y sections/*.tsx).
"""

from django.db import migrations

# Mapa de rename por sección: clave prefijada (sembrada en 0036) -> token bare.
# Verificado 1:1 contra los dispatchers `_render_<section>_<token>` de
# rendering.py y los `case '<token>'` de frontend/.../sections/*.tsx.
NON_HERO_RENAMES = {
    "services": {
        "services-grid-cards": "grid-cards",
        "services-grid-cards-image": "grid-cards-image",
        "services-list-detailed": "list-detailed",
        "services-featured-highlight": "featured-highlight",
        "services-horizontal-scroll": "horizontal-scroll",
        "services-icon-minimal": "icon-minimal",
        "services-bento-grid": "bento-grid",
    },
    "products": {
        "products-grid-cards": "grid-cards",
        "products-grid-cards-image": "grid-cards-image",
        "products-showcase-large": "showcase-large",
        "products-catalog-compact": "catalog-compact",
        "products-masonry-staggered": "masonry-staggered",
        "products-price-table": "price-table",
        "products-bento-grid": "bento-grid",
    },
    "about": {
        "about-text-only": "text-only",
        "about-split-image": "split-image",
        "about-stats-banner": "stats-banner",
        "about-timeline": "timeline",
        "about-overlapping-cards": "overlapping-cards",
        "about-fullwidth-banner": "fullwidth-banner",
        "about-asymmetric": "asymmetric",
    },
    "testimonials": {
        "testimonials-cards-grid": "cards-grid",
        "testimonials-carousel": "carousel",
        "testimonials-single-highlight": "single-highlight",
    },
    "pricing": {
        "pricing-cards": "cards",
        "pricing-comparison-table": "comparison-table",
        "pricing-minimal-list": "minimal-list",
    },
    "gallery": {
        "gallery-masonry": "masonry",
        "gallery-grid-uniform": "grid-uniform",
        "gallery-slider": "slider",
    },
    "faq": {
        "faq-classic": "classic",
        "faq-side-by-side": "side-by-side",
        "faq-cards": "cards",
    },
    "contact": {
        "contact-cards-grid": "cards-grid",
        "contact-split-form": "split-form",
        "contact-centered-minimal": "centered-minimal",
    },
}


def rename_to_bare_tokens(apps, schema_editor):
    """Renombra `<section>-<token>` -> `<token>` por sección (idempotente)."""
    SectionVariant = apps.get_model("websites", "SectionVariant")
    WebsiteSection = apps.get_model("websites", "WebsiteSection")

    for section_key, renames in NON_HERO_RENAMES.items():
        for prefixed_key, bare_key in renames.items():
            SectionVariant.objects.filter(
                section__key=section_key,
                key=prefixed_key,
            ).update(key=bare_key)

    # En una BD fresca, 0020 no sembró el hero `glassmorphism` (la sección hero
    # aún no existía entonces), así que 0036 no tenía nada que desactivar.
    # Garantizamos aquí que glassmorphism EXISTE pero queda INACTIVA, para que el
    # catálogo sea completo y la desactivación sea determinista en cualquier BD.
    hero_section = WebsiteSection.objects.filter(key="hero").first()
    if hero_section is not None:
        SectionVariant.objects.update_or_create(
            section=hero_section,
            key="glassmorphism",
            defaults={
                "label": "Glassmorphism",
                "description": "Efecto cristal con fondo difuminado. Retirado del catálogo de la IA.",
                "css_class_hint": "hero--glassmorphism",
                "mood": "elegant",
                "is_default": False,
                "is_active": False,
                "sort_order": 5,
            },
        )


def restore_prefixed_keys(apps, schema_editor):
    """Reversa: `<token>` -> `<section>-<token>` por sección (idempotente)."""
    SectionVariant = apps.get_model("websites", "SectionVariant")

    # Eliminar el glassmorphism creado en BD fresca (sólo la fila inactiva).
    SectionVariant.objects.filter(section__key="hero", key="glassmorphism", is_active=False).delete()

    for section_key, renames in NON_HERO_RENAMES.items():
        for prefixed_key, bare_key in renames.items():
            SectionVariant.objects.filter(
                section__key=section_key,
                key=bare_key,
            ).update(key=prefixed_key)


class Migration(migrations.Migration):
    dependencies = [
        ("websites", "0037_sectionvariant_composite_key_bare_tokens"),
    ]

    operations = [
        migrations.RunPython(rename_to_bare_tokens, restore_prefixed_keys),
    ]
