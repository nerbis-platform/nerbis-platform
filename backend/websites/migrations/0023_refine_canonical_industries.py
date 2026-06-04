"""Refine the industry catalog into a canonical, single-business-per-row list.

Follow-up to 0022 (which seeded the raw UNION of Tenant + Template keys). Product
decision: one industry == one specific business. This migration:

1. Creates 11 new industries (splits + new event sub-verticals).
2. Renames labels to drop the legacy "A / B" synonym slashes.
3. Re-assigns sort_order by vertical so the admin + onboarding group nicely.
4. Merges 6 duplicate keys into their canonical twin, repointing every relation
   (WebsiteTemplate.industry, PromptBlock.industry, SectionVariant.industries)
   and the Tenant.industry CharField, then deleting the duplicate row.

The reverse restores the original labels, deletes the 11 new rows and recreates
the 6 merged duplicates. Relation/Tenant repointing is forward-only (the original
owner of each relation is not recoverable) — standard for a merge.
"""

from django.db import migrations

# ── New industries (key -> label) ──────────────────────────────────────────
NEW_INDUSTRIES = [
    ("barberia", "Barbería"),
    ("cafe", "Cafetería"),
    ("petshop", "Pet Shop"),
    ("danza", "Danza"),
    ("pole_dance", "Estudio de Pole Dance"),
    ("wedding", "Wedding Planner"),
    ("dj", "DJ"),
    ("catering", "Catering"),
    ("decoracion", "Decoración y Ambientación"),
    ("alquiler_eventos", "Alquiler para Eventos"),
    ("animacion", "Animación y Shows"),
]

# ── Merge: duplicate key -> canonical key ───────────────────────────────────
MERGE_MAP = {
    "fitness": "gym",
    "health": "clinic",
    "pet": "veterinary",
    "retail": "store",
    "professional": "services",
    "other": "generic",
}

# ── Canonical order by vertical (drives sort_order) ─────────────────────────
CANONICAL_ORDER = [
    # Bienestar y Belleza
    "beauty", "barberia", "spa", "nails",
    # Movimiento y Fitness
    "gym", "yoga", "danza", "pole_dance",
    # Salud
    "clinic", "dental", "psychology", "nutrition", "veterinary", "petshop",
    # Gastronomía
    "restaurant", "cafe", "bakery",
    # Comercio
    "store", "fashion",
    # Servicios profesionales
    "legal", "accounting", "consulting", "services", "real_estate",
    # Creatividad y tecnología
    "tech", "marketing", "creative", "photography", "architecture",
    # Eventos
    "events", "wedding", "dj", "catering", "decoracion", "alquiler_eventos", "animacion",
    # Otros
    "education", "coworking", "automotive", "travel",
    # Fallback
    "generic",
]

# ── Final canonical labels (no synonym slashes) ─────────────────────────────
CANONICAL_LABELS = {
    "beauty": "Salón de Belleza",
    "barberia": "Barbería",
    "spa": "Spa",
    "nails": "Uñas",
    "gym": "Gimnasio",
    "yoga": "Estudio de Yoga",
    "danza": "Danza",
    "pole_dance": "Estudio de Pole Dance",
    "clinic": "Clínica Médica",
    "dental": "Odontología",
    "psychology": "Psicología",
    "nutrition": "Nutrición",
    "veterinary": "Veterinaria",
    "petshop": "Pet Shop",
    "restaurant": "Restaurante",
    "cafe": "Cafetería",
    "bakery": "Panadería y Pastelería",
    "store": "Tienda",
    "fashion": "Moda",
    "legal": "Abogados",
    "accounting": "Contabilidad",
    "consulting": "Consultoría",
    "services": "Servicios Profesionales",
    "real_estate": "Inmobiliaria",
    "tech": "Tecnología",
    "marketing": "Marketing",
    "creative": "Agencia Creativa",
    "photography": "Fotografía",
    "architecture": "Arquitectura",
    "events": "Organización de Eventos",
    "wedding": "Wedding Planner",
    "dj": "DJ",
    "catering": "Catering",
    "decoracion": "Decoración y Ambientación",
    "alquiler_eventos": "Alquiler para Eventos",
    "animacion": "Animación y Shows",
    "education": "Academia",
    "coworking": "Coworking",
    "automotive": "Taller Automotriz",
    "travel": "Agencia de Viajes",
    "generic": "Negocio General",
}

# ── Reverse data: original labels (from 0022) for renamed keys ──────────────
ORIGINAL_LABELS = {
    "beauty": "Salón de Belleza / Barbería",
    "spa": "Spa / Centro de Bienestar",
    "nails": "Uñas / Nail Bar",
    "gym": "Gimnasio / Fitness",
    "yoga": "Yoga / Pilates / Danza",
    "clinic": "Clínica / Consultorio Médico",
    "psychology": "Psicología / Terapias",
    "nutrition": "Nutrición / Dietética",
    "veterinary": "Veterinaria / Pet Shop",
    "restaurant": "Restaurante / Cafetería",
    "bakery": "Panadería / Pastelería",
    "store": "Tienda / Retail",
    "fashion": "Moda / Boutique",
    "education": "Educación / Academia",
    "coworking": "Coworking / Oficina",
    "photography": "Fotografía / Videografía",
    "architecture": "Arquitectura / Diseño",
    "legal": "Abogados / Consultoría Legal",
    "accounting": "Contabilidad / Finanzas",
    "marketing": "Marketing / Publicidad",
    "tech": "Tecnología / Software",
    "automotive": "Automotriz / Taller Mecánico",
    "events": "Eventos / Wedding Planner",
    "travel": "Turismo / Agencia de Viajes",
    "creative": "Creativo / Agencia",
}

# ── Reverse data: original labels for the merged duplicates (from 0022) ─────
DUP_ORIGINAL_LABELS = {
    "retail": "Tienda / Retail",
    "health": "Salud / Clínica",
    "fitness": "Gimnasio / Fitness",
    "professional": "Servicios Profesionales",
    "pet": "Mascotas / Veterinaria",
    "other": "Otro",
}


def apply_canonical(apps, schema_editor):
    Industry = apps.get_model("websites", "Industry")
    WebsiteTemplate = apps.get_model("websites", "WebsiteTemplate")
    PromptBlock = apps.get_model("websites", "PromptBlock")
    Tenant = apps.get_model("core", "Tenant")

    order_index = {key: i for i, key in enumerate(CANONICAL_ORDER)}

    # 1. Create the new industries (idempotent).
    for key, label in NEW_INDUSTRIES:
        Industry.objects.get_or_create(
            key=key,
            defaults={
                "label": label,
                "sort_order": order_index.get(key, 99),
                "is_active": True,
                "status": "reviewed",
                "created_by_ai": False,
            },
        )

    # 2. Merge each duplicate into its canonical twin, repointing all relations.
    for dup_key, canon_key in MERGE_MAP.items():
        dup = Industry.objects.filter(key=dup_key).first()
        if not dup:
            continue
        canon = Industry.objects.filter(key=canon_key).first()
        if not canon:
            continue

        WebsiteTemplate.objects.filter(industry=dup).update(industry=canon)
        PromptBlock.objects.filter(industry=dup).update(industry=canon)
        for variant in dup.section_variants.all():
            variant.industries.remove(dup)
            variant.industries.add(canon)
        Tenant.objects.filter(industry=dup_key).update(industry=canon_key)

        dup.delete()

    # 3. Apply canonical labels + sort_order to every surviving industry.
    for key, label in CANONICAL_LABELS.items():
        Industry.objects.filter(key=key).update(
            label=label,
            sort_order=order_index[key],
            is_active=True,
        )


def reverse_canonical(apps, schema_editor):
    Industry = apps.get_model("websites", "Industry")

    # Remove the new industries.
    Industry.objects.filter(key__in=[k for k, _ in NEW_INDUSTRIES]).delete()

    # Restore the pre-refine labels.
    for key, label in ORIGINAL_LABELS.items():
        Industry.objects.filter(key=key).update(label=label)

    # Recreate the merged duplicates (relations stay on the canonical twin).
    for key, label in DUP_ORIGINAL_LABELS.items():
        Industry.objects.get_or_create(
            key=key,
            defaults={
                "label": label,
                "is_active": True,
                "status": "reviewed",
                "created_by_ai": False,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("websites", "0022_seed_industries_convert_fk_m2m"),
        ("core", "0048_add_data_consent_ip"),
    ]

    operations = [
        migrations.RunPython(apply_canonical, reverse_canonical),
    ]
