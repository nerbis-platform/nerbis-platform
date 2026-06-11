"""Add the `suggest_colors` AI task + generation type and seed its config.

Issue #275 (ai-color-suggestion): the onboarding suggests a brand primary color
from the business sector + description using Haiku. This migration:

1. Extends ``AIModelConfig.task`` choices and ``AIGenerationLog.generation_type``
   choices with ``suggest_colors`` (AlterField — no schema change, just choices).
2. Idempotently seeds the ``suggest_colors`` AIModelConfig row so it auto-appears
   in the superadmin panel and the service resolves a model without falling back
   to settings.

The seed uses ``get_or_create`` so re-running the migration (or running it on an
environment where a superadmin already tuned the row) creates the row only if it
is missing, never duplicating it and never overwriting superadmin adjustments
(model / max_tokens / temperature / is_active).
"""

from decimal import Decimal

from django.db import migrations, models

SUGGEST_COLORS_CONFIG = {
    "task": "suggest_colors",
    "model": "claude-haiku-4-5-20251001",
    "max_tokens": 256,
    "temperature": Decimal("0.7"),
    "is_active": True,
}


def seed_suggest_colors_config(apps, schema_editor):
    AIModelConfig = apps.get_model("websites", "AIModelConfig")
    AIModelConfig.objects.get_or_create(
        task=SUGGEST_COLORS_CONFIG["task"],
        defaults={
            "model": SUGGEST_COLORS_CONFIG["model"],
            "max_tokens": SUGGEST_COLORS_CONFIG["max_tokens"],
            "temperature": SUGGEST_COLORS_CONFIG["temperature"],
            "is_active": SUGGEST_COLORS_CONFIG["is_active"],
        },
    )


def reverse_seed_suggest_colors_config(apps, schema_editor):
    AIModelConfig = apps.get_model("websites", "AIModelConfig")
    AIModelConfig.objects.filter(task=SUGGEST_COLORS_CONFIG["task"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("websites", "0028_add_elective_pages"),
    ]

    operations = [
        migrations.AlterField(
            model_name="aimodelconfig",
            name="task",
            field=models.CharField(
                choices=[
                    ("classify_industry", "Clasificar industria"),
                    ("web_content", "Generar contenido web"),
                    ("chat_edit", "Editar por chat"),
                    ("seo", "Optimización SEO"),
                    ("suggest_colors", "Sugerir colores"),
                ],
                help_text="Tarea de IA a la que aplica esta configuración",
                max_length=30,
                unique=True,
                verbose_name="Tarea",
            ),
        ),
        migrations.AlterField(
            model_name="aigenerationlog",
            name="generation_type",
            field=models.CharField(
                choices=[
                    ("initial", "Generación Inicial"),
                    ("quick_start", "Inicio Rápido"),
                    ("regenerate_section", "Regenerar Sección"),
                    ("edit_content", "Editar Contenido"),
                    ("generate_images", "Generar Imágenes"),
                    ("seo_optimization", "Optimización SEO"),
                    ("classify_industry", "Clasificar Industria"),
                    ("suggest_colors", "Sugerir Colores"),
                ],
                max_length=30,
                verbose_name="Tipo de generación",
            ),
        ),
        migrations.RunPython(seed_suggest_colors_config, reverse_seed_suggest_colors_config),
    ]
