"""Catálogo completo de variantes de sección (issue #296).

Siembra el catálogo `SectionVariant` para las 9 secciones canónicas del home,
de forma que la IA elija el diseño desde la BD (no por `random.choice`).

Es una migración de DATOS idempotente y REVERSIBLE:

1. Crea PRIMERO las 9 filas canónicas `WebsiteSection` (get_or_create por `key`)
   con las claves que el catálogo de variantes necesita: hero, services,
   products, about, testimonials, pricing, gallery, faq, contact. Estas claves
   coinciden 1:1 con los dispatchers del renderer backend
   (`_render_<section>_<variant>` en `rendering.py`) y los `switch (variant)`
   del frontend (`components/website/sections/*.tsx`).

2. Renombra IN-PLACE las claves de hero `hero-*` -> token base (`hero-centered`
   -> `centered`, etc.) vía `.update()` keyeado por la clave vieja. NUNCA borra
   y recrea (la clave es UNIQUE; un delete+create podría perder relaciones).

3. Hace get_or_create de las variantes del resto de secciones usando los tokens
   base EXACTOS verificados contra el renderer/frontend.

4. Desactiva (`is_active=False`) las variantes `glassmorphism` (hero) y
   `bento-grid` (services/products): existen en el código pero se retiran del
   catálogo que la IA puede elegir.

5. Cura `mood` e `industries` (M2M) por variante.

La reversión restaura las claves de hero a `hero-*`, reactiva glassmorphism y
bento-grid, y elimina las variantes/sections creadas por esta migración. No se
borran filas preexistentes que no haya creado esta migración.
"""

from django.db import migrations

# ── 1. Secciones canónicas (key -> meta) ────────────────────────────────────
# Claves alineadas con los dispatchers del renderer y los switches del frontend.
CANONICAL_SECTIONS = [
    {"key": "hero", "label": "Hero", "description": "Encabezado principal", "is_default": True, "sort_order": 0},
    {"key": "services", "label": "Servicios", "description": "Lo que hacemos", "is_default": True, "sort_order": 1},
    {"key": "products", "label": "Productos", "description": "Nuestros productos", "is_default": False, "sort_order": 2},
    {"key": "about", "label": "Sobre nosotros", "description": "Quiénes somos", "is_default": True, "sort_order": 3},
    {
        "key": "testimonials",
        "label": "Testimonios",
        "description": "Lo que dicen nuestros clientes",
        "is_default": True,
        "sort_order": 4,
    },
    {"key": "pricing", "label": "Precios", "description": "Planes y precios", "is_default": False, "sort_order": 5},
    {"key": "gallery", "label": "Galería", "description": "Nuestro trabajo", "is_default": False, "sort_order": 6},
    {"key": "faq", "label": "Preguntas frecuentes", "description": "Dudas comunes", "is_default": False, "sort_order": 7},
    {"key": "contact", "label": "Contacto", "description": "Cómo contactarnos", "is_default": True, "sort_order": 8},
]

# ── 2. Rename de hero `hero-*` -> token base ────────────────────────────────
# (clave vieja -> token base). El token base coincide con el switch del frontend
# y con `_render_hero_<token>` del backend.
HERO_RENAMES = {
    "hero-split-image": "split-image",
    "hero-fullwidth-image": "fullwidth-image",
    "hero-diagonal-split": "diagonal-split",
    "hero-centered": "centered",
    "hero-bold-typography": "bold-typography",
    "hero-glassmorphism": "glassmorphism",
}

# Variantes a desactivar (existen en código pero salen del catálogo de la IA).
DEACTIVATED_KEYS = ["glassmorphism", "bento-grid"]

# ── 3. Curaduría de hero tras el rename (mood + default + industrias) ────────
# El default canónico del hero es `centered` (coincide con el `default:` del
# switch del frontend cuando no hay imagen).
HERO_CURATION = {
    "centered": {"mood": "minimal", "is_default": True, "sort_order": 0, "industries": []},
    "split-image": {"mood": "professional", "is_default": False, "sort_order": 1, "industries": []},
    "fullwidth-image": {
        "mood": "bold",
        "is_default": False,
        "sort_order": 2,
        "industries": ["restaurant", "cafe", "events", "wedding", "travel"],
    },
    "diagonal-split": {
        "mood": "elegant",
        "is_default": False,
        "sort_order": 3,
        "industries": ["beauty", "spa", "fashion", "architecture"],
    },
    "bold-typography": {
        "mood": "bold",
        "is_default": False,
        "sort_order": 4,
        "industries": ["gym", "marketing", "creative", "tech"],
    },
}

# ── 4. Catálogo de variantes para el resto de secciones ─────────────────────
# Tokens base verificados contra `rendering.py` y `sections/*.tsx`.
SECTION_VARIANTS = {
    "services": [
        {
            "key": "services-grid-cards",
            "token": "grid-cards",
            "label": "Tarjetas en grilla",
            "description": "Servicios en tarjetas limpias y uniformes. Default versátil.",
            "css_class_hint": "services--grid-cards",
            "mood": "professional",
            "is_default": True,
            "sort_order": 0,
            "industries": [],
        },
        {
            "key": "services-grid-cards-image",
            "token": "grid-cards-image",
            "label": "Tarjetas con imagen",
            "description": "Cada servicio con foto. Ideal cuando hay buenas imágenes.",
            "css_class_hint": "services--grid-cards-image",
            "mood": "elegant",
            "is_default": False,
            "sort_order": 1,
            "industries": ["beauty", "spa", "restaurant", "fashion"],
        },
        {
            "key": "services-list-detailed",
            "token": "list-detailed",
            "label": "Lista detallada",
            "description": "Lista vertical con descripciones largas. Para servicios complejos.",
            "css_class_hint": "services--list-detailed",
            "mood": "professional",
            "is_default": False,
            "sort_order": 2,
            "industries": ["legal", "accounting", "consulting", "services"],
        },
        {
            "key": "services-featured-highlight",
            "token": "featured-highlight",
            "label": "Destacado principal",
            "description": "Un servicio grande destacado más una columna de apoyo.",
            "css_class_hint": "services--featured-highlight",
            "mood": "bold",
            "is_default": False,
            "sort_order": 3,
            "industries": [],
        },
        {
            "key": "services-horizontal-scroll",
            "token": "horizontal-scroll",
            "label": "Scroll horizontal",
            "description": "Carrusel horizontal de servicios. Moderno y compacto.",
            "css_class_hint": "services--horizontal-scroll",
            "mood": "playful",
            "is_default": False,
            "sort_order": 4,
            "industries": ["creative", "marketing", "tech"],
        },
        {
            "key": "services-icon-minimal",
            "token": "icon-minimal",
            "label": "Iconos minimal",
            "description": "Iconos con texto corto. Limpio y directo.",
            "css_class_hint": "services--icon-minimal",
            "mood": "minimal",
            "is_default": False,
            "sort_order": 5,
            "industries": [],
        },
        # bento-grid: presente en código, desactivada del catálogo.
        {
            "key": "services-bento-grid",
            "token": "bento-grid",
            "label": "Bento grid",
            "description": "Grilla tipo bento. Retirada del catálogo de la IA.",
            "css_class_hint": "services--bento-grid",
            "mood": "playful",
            "is_default": False,
            "sort_order": 6,
            "industries": [],
        },
    ],
    "products": [
        {
            "key": "products-grid-cards",
            "token": "grid-cards",
            "label": "Tarjetas en grilla",
            "description": "Productos en tarjetas uniformes. Default versátil.",
            "css_class_hint": "products--grid-cards",
            "mood": "professional",
            "is_default": True,
            "sort_order": 0,
            "industries": [],
        },
        {
            "key": "products-grid-cards-image",
            "token": "grid-cards-image",
            "label": "Tarjetas con imagen",
            "description": "Productos con foto destacada por tarjeta.",
            "css_class_hint": "products--grid-cards-image",
            "mood": "elegant",
            "is_default": False,
            "sort_order": 1,
            "industries": ["store", "fashion", "bakery"],
        },
        {
            "key": "products-showcase-large",
            "token": "showcase-large",
            "label": "Showcase grande",
            "description": "Producto principal a gran escala. Alto impacto visual.",
            "css_class_hint": "products--showcase-large",
            "mood": "bold",
            "is_default": False,
            "sort_order": 2,
            "industries": ["fashion", "creative"],
        },
        {
            "key": "products-catalog-compact",
            "token": "catalog-compact",
            "label": "Catálogo compacto",
            "description": "Muchos productos en poco espacio. Para catálogos amplios.",
            "css_class_hint": "products--catalog-compact",
            "mood": "minimal",
            "is_default": False,
            "sort_order": 3,
            "industries": ["store"],
        },
        {
            "key": "products-masonry-staggered",
            "token": "masonry-staggered",
            "label": "Masonry escalonado",
            "description": "Mosaico con alturas variables. Dinámico y editorial.",
            "css_class_hint": "products--masonry-staggered",
            "mood": "playful",
            "is_default": False,
            "sort_order": 4,
            "industries": ["fashion", "photography", "creative"],
        },
        {
            "key": "products-price-table",
            "token": "price-table",
            "label": "Tabla de precios",
            "description": "Listado con precios visibles. Para venta directa.",
            "css_class_hint": "products--price-table",
            "mood": "professional",
            "is_default": False,
            "sort_order": 5,
            "industries": [],
        },
        # bento-grid: presente en código, desactivada del catálogo.
        {
            "key": "products-bento-grid",
            "token": "bento-grid",
            "label": "Bento grid",
            "description": "Grilla tipo bento. Retirada del catálogo de la IA.",
            "css_class_hint": "products--bento-grid",
            "mood": "playful",
            "is_default": False,
            "sort_order": 6,
            "industries": [],
        },
    ],
    "about": [
        {
            "key": "about-text-only",
            "token": "text-only",
            "label": "Solo texto",
            "description": "Narrativa limpia sin imagen. Default cuando no hay foto.",
            "css_class_hint": "about--text-only",
            "mood": "minimal",
            "is_default": True,
            "sort_order": 0,
            "industries": [],
        },
        {
            "key": "about-split-image",
            "token": "split-image",
            "label": "Split con imagen",
            "description": "Texto e imagen lado a lado. Clásico y cálido.",
            "css_class_hint": "about--split-image",
            "mood": "professional",
            "is_default": False,
            "sort_order": 1,
            "industries": [],
        },
        {
            "key": "about-stats-banner",
            "token": "stats-banner",
            "label": "Banner de cifras",
            "description": "Destaca métricas y logros. Genera confianza.",
            "css_class_hint": "about--stats-banner",
            "mood": "bold",
            "is_default": False,
            "sort_order": 2,
            "industries": ["consulting", "tech", "marketing", "gym"],
        },
        {
            "key": "about-timeline",
            "token": "timeline",
            "label": "Línea de tiempo",
            "description": "Historia del negocio paso a paso. Narrativa con trayectoria.",
            "css_class_hint": "about--timeline",
            "mood": "elegant",
            "is_default": False,
            "sort_order": 3,
            "industries": ["legal", "accounting", "architecture"],
        },
        {
            "key": "about-overlapping-cards",
            "token": "overlapping-cards",
            "label": "Tarjetas superpuestas",
            "description": "Tarjetas con profundidad. Moderno y dinámico.",
            "css_class_hint": "about--overlapping-cards",
            "mood": "playful",
            "is_default": False,
            "sort_order": 4,
            "industries": ["creative", "marketing"],
        },
        {
            "key": "about-fullwidth-banner",
            "token": "fullwidth-banner",
            "label": "Banner a ancho completo",
            "description": "Imagen amplia con texto superpuesto. Alto impacto.",
            "css_class_hint": "about--fullwidth-banner",
            "mood": "bold",
            "is_default": False,
            "sort_order": 5,
            "industries": ["restaurant", "events", "travel"],
        },
        {
            "key": "about-asymmetric",
            "token": "asymmetric",
            "label": "Asimétrico",
            "description": "Composición asimétrica editorial. Elegante y distintivo.",
            "css_class_hint": "about--asymmetric",
            "mood": "elegant",
            "is_default": False,
            "sort_order": 6,
            "industries": ["fashion", "architecture", "photography"],
        },
    ],
    "testimonials": [
        {
            "key": "testimonials-cards-grid",
            "token": "cards-grid",
            "label": "Tarjetas en grilla",
            "description": "Varios testimonios en tarjetas. Default equilibrado.",
            "css_class_hint": "testimonials--cards-grid",
            "mood": "professional",
            "is_default": True,
            "sort_order": 0,
            "industries": [],
        },
        {
            "key": "testimonials-carousel",
            "token": "carousel",
            "label": "Carrusel",
            "description": "Testimonios en carrusel rotatorio. Compacto.",
            "css_class_hint": "testimonials--carousel",
            "mood": "playful",
            "is_default": False,
            "sort_order": 1,
            "industries": [],
        },
        {
            "key": "testimonials-single-highlight",
            "token": "single-highlight",
            "label": "Testimonio destacado",
            "description": "Un testimonio grande y protagonista. Para una reseña potente.",
            "css_class_hint": "testimonials--single-highlight",
            "mood": "elegant",
            "is_default": False,
            "sort_order": 2,
            "industries": ["beauty", "spa", "consulting"],
        },
    ],
    "pricing": [
        {
            "key": "pricing-cards",
            "token": "cards",
            "label": "Tarjetas de planes",
            "description": "Planes en tarjetas comparables. Default claro.",
            "css_class_hint": "pricing--cards",
            "mood": "professional",
            "is_default": True,
            "sort_order": 0,
            "industries": [],
        },
        {
            "key": "pricing-comparison-table",
            "token": "comparison-table",
            "label": "Tabla comparativa",
            "description": "Comparación detallada feature por feature. Para planes ricos.",
            "css_class_hint": "pricing--comparison-table",
            "mood": "professional",
            "is_default": False,
            "sort_order": 1,
            "industries": ["tech", "consulting"],
        },
        {
            "key": "pricing-minimal-list",
            "token": "minimal-list",
            "label": "Lista minimal",
            "description": "Precios en lista simple. Directo y sin ruido.",
            "css_class_hint": "pricing--minimal-list",
            "mood": "minimal",
            "is_default": False,
            "sort_order": 2,
            "industries": ["beauty", "barberia", "nails"],
        },
    ],
    "gallery": [
        {
            "key": "gallery-masonry",
            "token": "masonry",
            "label": "Masonry",
            "description": "Mosaico de alturas variables. Default visual y editorial.",
            "css_class_hint": "gallery--masonry",
            "mood": "elegant",
            "is_default": True,
            "sort_order": 0,
            "industries": [],
        },
        {
            "key": "gallery-grid-uniform",
            "token": "grid-uniform",
            "label": "Grilla uniforme",
            "description": "Cuadrícula pareja. Ordenado y limpio.",
            "css_class_hint": "gallery--grid-uniform",
            "mood": "minimal",
            "is_default": False,
            "sort_order": 1,
            "industries": [],
        },
        {
            "key": "gallery-slider",
            "token": "slider",
            "label": "Slider",
            "description": "Carrusel de imágenes a ancho completo. Inmersivo.",
            "css_class_hint": "gallery--slider",
            "mood": "bold",
            "is_default": False,
            "sort_order": 2,
            "industries": ["photography", "travel", "events"],
        },
    ],
    "faq": [
        {
            "key": "faq-classic",
            "token": "classic",
            "label": "Acordeón clásico",
            "description": "Preguntas en acordeón expandible. Default conocido.",
            "css_class_hint": "faq--classic",
            "mood": "professional",
            "is_default": True,
            "sort_order": 0,
            "industries": [],
        },
        {
            "key": "faq-side-by-side",
            "token": "side-by-side",
            "label": "Dos columnas",
            "description": "FAQs en dos columnas. Aprovecha el ancho.",
            "css_class_hint": "faq--side-by-side",
            "mood": "minimal",
            "is_default": False,
            "sort_order": 1,
            "industries": [],
        },
        {
            "key": "faq-cards",
            "token": "cards",
            "label": "Tarjetas",
            "description": "Cada pregunta en su tarjeta. Más visual.",
            "css_class_hint": "faq--cards",
            "mood": "playful",
            "is_default": False,
            "sort_order": 2,
            "industries": [],
        },
    ],
    "contact": [
        {
            "key": "contact-cards-grid",
            "token": "cards-grid",
            "label": "Tarjetas de contacto",
            "description": "Canales de contacto en tarjetas. Default completo.",
            "css_class_hint": "contact--cards-grid",
            "mood": "professional",
            "is_default": True,
            "sort_order": 0,
            "industries": [],
        },
        {
            "key": "contact-split-form",
            "token": "split-form",
            "label": "Formulario split",
            "description": "Formulario más datos lado a lado. Para captar leads.",
            "css_class_hint": "contact--split-form",
            "mood": "professional",
            "is_default": False,
            "sort_order": 1,
            "industries": ["consulting", "legal", "real_estate", "marketing"],
        },
        {
            "key": "contact-centered-minimal",
            "token": "centered-minimal",
            "label": "Centrado minimal",
            "description": "Datos de contacto centrados y limpios. Sin formulario.",
            "css_class_hint": "contact--centered-minimal",
            "mood": "minimal",
            "is_default": False,
            "sort_order": 2,
            "industries": ["beauty", "barberia", "cafe"],
        },
    ],
}


def _set_industries(variant, industry_keys, Industry):
    """Asigna el M2M industries para una variante (sólo industrias existentes)."""
    if not industry_keys:
        variant.industries.clear()
        return
    industries = list(Industry.objects.filter(key__in=industry_keys))
    variant.industries.set(industries)


def seed_variants(apps, schema_editor):
    WebsiteSection = apps.get_model("websites", "WebsiteSection")
    SectionVariant = apps.get_model("websites", "SectionVariant")
    Industry = apps.get_model("websites", "Industry")

    # 1. Secciones canónicas PRIMERO.
    sections = {}
    for data in CANONICAL_SECTIONS:
        section, _ = WebsiteSection.objects.get_or_create(
            key=data["key"],
            defaults={
                "label": data["label"],
                "description": data["description"],
                "is_default": data["is_default"],
                "sort_order": data["sort_order"],
                "is_active": True,
            },
        )
        sections[data["key"]] = section

    hero_section = sections["hero"]

    # 2. Rename hero `hero-*` -> token base (in-place, keyeado por clave vieja).
    for old_key, new_key in HERO_RENAMES.items():
        SectionVariant.objects.filter(key=old_key).update(key=new_key, section=hero_section)

    # 3. Curaduría de hero (asegura que existan aunque falte el seed previo).
    for token, meta in HERO_CURATION.items():
        variant, _ = SectionVariant.objects.get_or_create(
            key=token,
            defaults={
                "section": hero_section,
                "label": token.replace("-", " ").title(),
                "mood": meta["mood"],
                "is_default": meta["is_default"],
                "is_active": True,
                "sort_order": meta["sort_order"],
            },
        )
        SectionVariant.objects.filter(pk=variant.pk).update(
            section=hero_section,
            mood=meta["mood"],
            is_default=meta["is_default"],
            sort_order=meta["sort_order"],
            is_active=True,
        )
        variant.refresh_from_db()
        _set_industries(variant, meta["industries"], Industry)

    # 4. Variantes del resto de secciones.
    for section_key, variants in SECTION_VARIANTS.items():
        section = sections[section_key]
        for data in variants:
            variant, _ = SectionVariant.objects.get_or_create(
                key=data["key"],
                defaults={
                    "section": section,
                    "label": data["label"],
                    "description": data["description"],
                    "css_class_hint": data["css_class_hint"],
                    "mood": data["mood"],
                    "is_default": data["is_default"],
                    "is_active": True,
                    "sort_order": data["sort_order"],
                },
            )
            SectionVariant.objects.filter(pk=variant.pk).update(
                section=section,
                label=data["label"],
                description=data["description"],
                css_class_hint=data["css_class_hint"],
                mood=data["mood"],
                is_default=data["is_default"],
                sort_order=data["sort_order"],
                is_active=True,
            )
            variant.refresh_from_db()
            _set_industries(variant, data["industries"], Industry)

    # 5. Desactivar glassmorphism (hero) y bento-grid (services/products).
    SectionVariant.objects.filter(key="glassmorphism").update(is_active=False)
    SectionVariant.objects.filter(key__in=["services-bento-grid", "products-bento-grid"]).update(is_active=False)


def reverse_variants(apps, schema_editor):
    WebsiteSection = apps.get_model("websites", "WebsiteSection")
    SectionVariant = apps.get_model("websites", "SectionVariant")

    # Reactivar glassmorphism y bento-grid.
    SectionVariant.objects.filter(key="glassmorphism").update(is_active=True)
    SectionVariant.objects.filter(key__in=["services-bento-grid", "products-bento-grid"]).update(is_active=True)

    # Eliminar las variantes de las secciones no-hero creadas por esta migración.
    non_hero_keys = [d["key"] for variants in SECTION_VARIANTS.values() for d in variants]
    SectionVariant.objects.filter(key__in=non_hero_keys).delete()

    # Restaurar las claves de hero a `hero-*`.
    reverse_renames = {new_key: old_key for old_key, new_key in HERO_RENAMES.items()}
    for new_key, old_key in reverse_renames.items():
        SectionVariant.objects.filter(key=new_key).update(key=old_key)

    # Eliminar las secciones canónicas creadas por esta migración que no tengan
    # ya variantes activas asociadas (defensivo: sólo las que existan vacías).
    created_section_keys = [d["key"] for d in CANONICAL_SECTIONS]
    for key in created_section_keys:
        section = WebsiteSection.objects.filter(key=key).first()
        if section and not section.variants.exists():
            section.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("websites", "0035_slim_rules_general_block"),
    ]

    operations = [
        migrations.RunPython(seed_variants, reverse_variants),
    ]
