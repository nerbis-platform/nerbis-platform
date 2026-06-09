"""Agrega las páginas electivas/industria al catálogo global WebsitePage.

Issue #262 — AI-Inferred Elective Pages in Quick-Start Onboarding.

Añade tres páginas al catálogo global (``WebsitePage``):
- ``portfolio`` — electiva, decidida por la IA (selected_pages).
- ``pricing``   — electiva, decidida por la IA (selected_pages).
- ``menu``      — gateada por la vertical gastronómica (NO por módulo, NO por IA).

Es una migración de DATOS idempotente: usa ``update_or_create`` keyeado por
``key``, así que correrla contra una DB de producción ya sembrada por el comando
``seed_onboarding`` NO duplica filas ni sobreescribe las 7 originales más allá de
los 3 keys que ella misma gestiona. La reversión elimina ÚNICAMENTE esos 3 keys,
dejando intactas las páginas originales.

Nota sobre PAGE_META: la renderización en runtime (``rendering.resolve_page``)
resuelve nombre/slug de página desde ``pages_data``/``content_data`` + la fila
``WebsitePage``, no desde ``PAGE_META`` (que vive sólo en la migración 0013 como
transformación de datos de una sola vez). Por eso esta migración sólo necesita
añadir filas de catálogo, sin tocar metadata de render en runtime.
"""

from django.db import migrations

# Filas a añadir. Los sort_order continúan tras los existentes (home..blog = 0..6)
# sin colisionar: portfolio=7, pricing=8, menu=9.
NEW_PAGES = [
    {
        "key": "portfolio",
        "label": "Portafolio",
        "description": "Muestra tu trabajo",
        "icon": "image",
        "is_mandatory": False,
        "is_default": False,
        "sort_order": 7,
    },
    {
        "key": "pricing",
        "label": "Precios",
        "description": "Planes y precios",
        "icon": "tag",
        "is_mandatory": False,
        "is_default": False,
        "sort_order": 8,
    },
    {
        "key": "menu",
        "label": "Menú",
        "description": "Tu carta digital",
        "icon": "utensils",
        "is_mandatory": False,
        "is_default": False,
        "sort_order": 9,
    },
]

NEW_PAGE_KEYS = [p["key"] for p in NEW_PAGES]


def add_elective_pages(apps, schema_editor):
    """Añade portfolio/pricing/menu de forma idempotente (update_or_create)."""
    WebsitePage = apps.get_model("websites", "WebsitePage")
    for data in NEW_PAGES:
        WebsitePage.objects.update_or_create(
            key=data["key"],
            defaults=data,
        )


def remove_elective_pages(apps, schema_editor):
    """Elimina ÚNICAMENTE las 3 páginas añadidas; deja intactas las originales."""
    WebsitePage = apps.get_model("websites", "WebsitePage")
    WebsitePage.objects.filter(key__in=NEW_PAGE_KEYS).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("websites", "0027_deactivate_pages_question"),
    ]

    operations = [
        migrations.RunPython(add_elective_pages, remove_elective_pages),
    ]
