"""Add Industry + AIModelConfig global models and extend AIGenerationLog types.

C1 of issue-262-industrias: introduces the global Industry catalog and the
per-task AIModelConfig, plus the new `classify_industry` / `quick_start`
generation types. Seeds the 4 default AIModelConfig rows (idempotent).
"""

from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models

# Model IDs match backend/config/settings.py + websites/services/ai_pricing.py
HAIKU_MODEL = "claude-3-haiku-20240307"
SONNET_MODEL = "claude-sonnet-4-6"

AI_MODEL_CONFIGS = [
    {
        "task": "classify_industry",
        "model": HAIKU_MODEL,
        "max_tokens": 512,
        "temperature": Decimal("0.0"),
    },
    {
        "task": "web_content",
        "model": SONNET_MODEL,
        "max_tokens": 4096,
        "temperature": Decimal("1.0"),
    },
    {
        "task": "chat_edit",
        "model": HAIKU_MODEL,
        "max_tokens": 4096,
        "temperature": Decimal("1.0"),
    },
    {
        "task": "seo",
        "model": HAIKU_MODEL,
        "max_tokens": 4096,
        "temperature": Decimal("1.0"),
    },
]


def seed_ai_model_configs(apps, schema_editor):
    AIModelConfig = apps.get_model("websites", "AIModelConfig")
    for cfg in AI_MODEL_CONFIGS:
        AIModelConfig.objects.get_or_create(task=cfg["task"], defaults=cfg)


def reverse_seed_ai_model_configs(apps, schema_editor):
    AIModelConfig = apps.get_model("websites", "AIModelConfig")
    tasks = [cfg["task"] for cfg in AI_MODEL_CONFIGS]
    AIModelConfig.objects.filter(task__in=tasks).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("websites", "0020_seed_prompt_blocks_and_variants"),
    ]

    operations = [
        migrations.CreateModel(
            name="Industry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "key",
                    models.SlugField(
                        help_text="Identificador único de la industria (ej: 'beauty', 'restaurant')",
                        max_length=50,
                        unique=True,
                        verbose_name="Clave",
                    ),
                ),
                (
                    "label",
                    models.CharField(
                        help_text="Nombre visible de la industria", max_length=120, verbose_name="Etiqueta"
                    ),
                ),
                (
                    "description",
                    models.TextField(
                        blank=True, help_text="Descripción corta de la industria", verbose_name="Descripción"
                    ),
                ),
                (
                    "icon",
                    models.CharField(
                        blank=True, help_text="Nombre del icono Lucide", max_length=50, verbose_name="Icono"
                    ),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="Activa")),
                ("sort_order", models.PositiveIntegerField(default=0, verbose_name="Orden")),
                (
                    "created_by_ai",
                    models.BooleanField(
                        default=False,
                        help_text="True si la industria fue propuesta por la IA durante el onboarding",
                        verbose_name="Creada por IA",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("proposed_by_model", "Propuesta por IA"), ("reviewed", "Revisada")],
                        default="reviewed",
                        help_text="Las propuestas por IA quedan en revisión hasta que un admin las promueve",
                        max_length=20,
                        verbose_name="Estado",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Creado")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Actualizado")),
                (
                    "default_template",
                    models.ForeignKey(
                        blank=True,
                        help_text="Template que se usa por defecto para esta industria",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="default_for_industries",
                        to="websites.websitetemplate",
                        verbose_name="Template por defecto",
                    ),
                ),
            ],
            options={
                "verbose_name": "Industria",
                "verbose_name_plural": "Industrias",
                "ordering": ["sort_order", "label"],
            },
        ),
        migrations.CreateModel(
            name="AIModelConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "task",
                    models.CharField(
                        choices=[
                            ("classify_industry", "Clasificar industria"),
                            ("web_content", "Generar contenido web"),
                            ("chat_edit", "Editar por chat"),
                            ("seo", "Optimización SEO"),
                        ],
                        help_text="Tarea de IA a la que aplica esta configuración",
                        max_length=30,
                        unique=True,
                        verbose_name="Tarea",
                    ),
                ),
                (
                    "model",
                    models.CharField(
                        help_text="ID del modelo de Anthropic", max_length=80, verbose_name="Modelo"
                    ),
                ),
                ("max_tokens", models.PositiveIntegerField(default=4096, verbose_name="Tokens máximos")),
                (
                    "temperature",
                    models.DecimalField(
                        decimal_places=2, default=Decimal("1.0"), max_digits=3, verbose_name="Temperatura"
                    ),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="Activo")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Creado")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Actualizado")),
            ],
            options={
                "verbose_name": "Configuración de modelo IA",
                "verbose_name_plural": "Configuraciones de modelo IA",
                "ordering": ["task"],
            },
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
                ],
                max_length=30,
                verbose_name="Tipo de generación",
            ),
        ),
        migrations.RunPython(seed_ai_model_configs, reverse_seed_ai_model_configs),
    ]
