"""Unicidad COMPUESTA (section, key) para SectionVariant — ESQUEMA (issue #296).

Fix del blocker crítico: las 8 secciones no-hero se sembraron en 0036 con claves
PREFIJADAS por sección (`services-grid-cards`, `about-split-image`, ...), pero el
renderer (`rendering.py` -> `_render_<section>_<token>`) y el frontend
(`sections/*.tsx` -> `switch (variant)`) consumen el token BARE. Con la clave
prefijada, `resolve_section_variant` escribía `_variant = "about-split-image"` y
el renderer buscaba `_render_about_about_split_image` (inexistente) -> caía al
default. Toda variante no-hero elegida por la IA renderizaba el default.

Causa raíz: `SectionVariant.key` era globalmente UNIQUE, pero los tokens bare
colisionan entre secciones (`grid-cards` en services+products, `split-image` en
hero+about, `cards-grid` en testimonials+contact, etc.). El prefijo era un
workaround equivocado.

Esta migración hace SÓLO el cambio de ESQUEMA: quita el UNIQUE global de `key` y
añade unicidad COMPUESTA (section, key). El rename de datos a tokens bare vive en
la migración SIGUIENTE (0038), separado a propósito para que ni el forward ni el
reverse mezclen DDL y DML sobre la misma tabla en una transacción (evita el error
de PostgreSQL "pending trigger events" al revertir).

No modifica migraciones existentes (0036 etc.).
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("websites", "0036_seed_section_variants"),
    ]

    operations = [
        # Liberar el UNIQUE global de `key` (la unicidad pasa a ser compuesta).
        migrations.AlterField(
            model_name="sectionvariant",
            name="key",
            field=models.SlugField(max_length=80, verbose_name="Clave"),
        ),
        # Unicidad compuesta (section, key).
        migrations.AddConstraint(
            model_name="sectionvariant",
            constraint=models.UniqueConstraint(
                fields=["section", "key"],
                name="uq_sectionvariant_section_key",
            ),
        ),
    ]
