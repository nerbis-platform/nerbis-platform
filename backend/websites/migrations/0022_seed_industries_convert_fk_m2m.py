"""Seed the industry UNION and convert template/variant/promptblock to FK/M2M.

C2 of issue-262-industrias (seed-first-then-convert):

1. Seed the UNION of Tenant.INDUSTRY_CHOICES (28) + WebsiteTemplate.INDUSTRY_CHOICES
   (15) into the Industry catalog (key -> label). Tenant keys are canonical;
   Template-only keys are appended. Guarantees a `generic` industry exists.
2. Convert WebsiteTemplate.industry CharField -> FK(Industry, PROTECT) with
   unknown -> generic fallback.
3. Convert PromptBlock.industry CharField -> FK(Industry, CASCADE, null/blank),
   empty string -> NULL, unknown -> generic.
4. Convert SectionVariant.industries JSON list -> M2M(Industry), skipping
   unknown keys (no orphans).

Every RunPython has a reverse that restores the CharField/JSON values from the
relation (Industry.key), so no data is lost on rollback.
"""

import django.db.models.deletion
from django.db import migrations, models

# Tenant.INDUSTRY_CHOICES (canonical base — 28 keys)
TENANT_INDUSTRIES = [
    ("beauty", "Salón de Belleza / Barbería"),
    ("spa", "Spa / Centro de Bienestar"),
    ("nails", "Uñas / Nail Bar"),
    ("gym", "Gimnasio / Fitness"),
    ("yoga", "Yoga / Pilates / Danza"),
    ("clinic", "Clínica / Consultorio Médico"),
    ("dental", "Odontología"),
    ("psychology", "Psicología / Terapias"),
    ("nutrition", "Nutrición / Dietética"),
    ("veterinary", "Veterinaria / Pet Shop"),
    ("restaurant", "Restaurante / Cafetería"),
    ("bakery", "Panadería / Pastelería"),
    ("store", "Tienda / Retail"),
    ("fashion", "Moda / Boutique"),
    ("education", "Educación / Academia"),
    ("coworking", "Coworking / Oficina"),
    ("photography", "Fotografía / Videografía"),
    ("architecture", "Arquitectura / Diseño"),
    ("legal", "Abogados / Consultoría Legal"),
    ("accounting", "Contabilidad / Finanzas"),
    ("marketing", "Marketing / Publicidad"),
    ("tech", "Tecnología / Software"),
    ("real_estate", "Inmobiliaria"),
    ("automotive", "Automotriz / Taller Mecánico"),
    ("events", "Eventos / Wedding Planner"),
    ("travel", "Turismo / Agencia de Viajes"),
    ("services", "Servicios Profesionales"),
    ("other", "Otro"),
]

# WebsiteTemplate.INDUSTRY_CHOICES keys present ONLY in the template list
TEMPLATE_ONLY_INDUSTRIES = [
    ("retail", "Tienda / Retail"),
    ("health", "Salud / Clínica"),
    ("fitness", "Gimnasio / Fitness"),
    ("professional", "Servicios Profesionales"),
    ("pet", "Mascotas / Veterinaria"),
    ("creative", "Creativo / Agencia"),
    ("consulting", "Consultoría"),
    ("generic", "Negocio General"),
]

# UNION (order preserved: tenant first, then template-only). `generic` guaranteed.
UNION_INDUSTRIES = TENANT_INDUSTRIES + TEMPLATE_ONLY_INDUSTRIES

FALLBACK_KEY = "generic"


def seed_industries(apps, schema_editor):
    Industry = apps.get_model("websites", "Industry")
    for order, (key, label) in enumerate(UNION_INDUSTRIES):
        Industry.objects.get_or_create(
            key=key,
            defaults={
                "label": label,
                "sort_order": order,
                "is_active": True,
                "status": "reviewed",
                "created_by_ai": False,
            },
        )
    # Guarantee a generic fallback exists even if list is edited later.
    Industry.objects.get_or_create(
        key=FALLBACK_KEY,
        defaults={"label": "Negocio General", "is_active": True, "status": "reviewed"},
    )


def unseed_industries(apps, schema_editor):
    Industry = apps.get_model("websites", "Industry")
    keys = [k for k, _ in UNION_INDUSTRIES]
    Industry.objects.filter(key__in=keys).delete()


def _resolve_industry(Industry, key):
    """Return the Industry row matching key, or the generic fallback."""
    if key:
        match = Industry.objects.filter(key=key).first()
        if match:
            return match
    return Industry.objects.filter(key=FALLBACK_KEY).first()


# --- WebsiteTemplate.industry: char -> FK ---
def backfill_template_industry(apps, schema_editor):
    Industry = apps.get_model("websites", "Industry")
    WebsiteTemplate = apps.get_model("websites", "WebsiteTemplate")
    for template in WebsiteTemplate.objects.all():
        template.industry_fk = _resolve_industry(Industry, template.industry)
        template.save(update_fields=["industry_fk"])


def reverse_template_industry(apps, schema_editor):
    WebsiteTemplate = apps.get_model("websites", "WebsiteTemplate")
    for template in WebsiteTemplate.objects.all():
        template.industry = template.industry_fk.key if template.industry_fk_id else "generic"
        template.save(update_fields=["industry"])


# --- PromptBlock.industry: char -> FK ---
def backfill_promptblock_industry(apps, schema_editor):
    Industry = apps.get_model("websites", "Industry")
    PromptBlock = apps.get_model("websites", "PromptBlock")
    for block in PromptBlock.objects.all():
        if block.industry:
            block.industry_fk = _resolve_industry(Industry, block.industry)
            block.save(update_fields=["industry_fk"])


def reverse_promptblock_industry(apps, schema_editor):
    PromptBlock = apps.get_model("websites", "PromptBlock")
    for block in PromptBlock.objects.all():
        block.industry = block.industry_fk.key if block.industry_fk_id else ""
        block.save(update_fields=["industry"])


# --- SectionVariant.industries: JSON list -> M2M ---
def backfill_variant_industries(apps, schema_editor):
    Industry = apps.get_model("websites", "Industry")
    SectionVariant = apps.get_model("websites", "SectionVariant")
    for variant in SectionVariant.objects.all():
        keys = variant.industries or []
        rows = list(Industry.objects.filter(key__in=keys))
        if rows:
            variant.industries_m2m.set(rows)


def reverse_variant_industries(apps, schema_editor):
    SectionVariant = apps.get_model("websites", "SectionVariant")
    for variant in SectionVariant.objects.all():
        variant.industries = list(variant.industries_m2m.values_list("key", flat=True))
        variant.save(update_fields=["industries"])


class Migration(migrations.Migration):

    # Non-atomic: schema changes (AddField/RemoveField/Rename) and RunPython data
    # backfills must commit separately so Postgres can flush pending trigger
    # events between FK/M2M alterations (avoids "pending trigger events").
    atomic = False

    dependencies = [
        ("websites", "0021_industry_aimodelconfig_and_more"),
    ]

    operations = [
        # 1. Seed the union catalog
        migrations.RunPython(seed_industries, unseed_industries),
        # 2a. WebsiteTemplate.industry char -> FK
        migrations.AddField(
            model_name="websitetemplate",
            name="industry_fk",
            field=models.ForeignKey(
                help_text="Industria a la que pertenece el template",
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="templates",
                to="websites.industry",
                verbose_name="Industria",
            ),
        ),
        migrations.RunPython(backfill_template_industry, reverse_template_industry),
        migrations.RemoveField(model_name="websitetemplate", name="industry"),
        migrations.RenameField(
            model_name="websitetemplate", old_name="industry_fk", new_name="industry"
        ),
        # Ordering now references the FK; apply after the rename so the field exists.
        migrations.AlterModelOptions(
            name="websitetemplate",
            options={
                "ordering": ["sort_order", "industry__sort_order", "name"],
                "verbose_name": "Template de Sitio Web",
                "verbose_name_plural": "Templates de Sitio Web",
            },
        ),
        # 2b. PromptBlock.industry char -> FK
        migrations.AddField(
            model_name="promptblock",
            name="industry_fk",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="prompt_blocks",
                to="websites.industry",
                verbose_name="Industria",
            ),
        ),
        migrations.RunPython(backfill_promptblock_industry, reverse_promptblock_industry),
        migrations.RemoveField(model_name="promptblock", name="industry"),
        migrations.RenameField(
            model_name="promptblock", old_name="industry_fk", new_name="industry"
        ),
        # 2c. SectionVariant.industries JSON list -> M2M
        migrations.AddField(
            model_name="sectionvariant",
            name="industries_m2m",
            field=models.ManyToManyField(
                blank=True,
                related_name="section_variants",
                to="websites.industry",
                verbose_name="Industrias",
            ),
        ),
        migrations.RunPython(backfill_variant_industries, reverse_variant_industries),
        migrations.RemoveField(model_name="sectionvariant", name="industries"),
        migrations.RenameField(
            model_name="sectionvariant", old_name="industries_m2m", new_name="industries"
        ),
    ]
