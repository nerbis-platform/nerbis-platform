"""Migración de datos: replantea la pregunta de WhatsApp como opcional y saltable.

El número de WhatsApp no aporta al copy/diseño que genera la IA — es un dato de
contacto. Su valor real está en el sitio renderizado (botón "Escríbeme por
WhatsApp"), por lo que no debe frenar el onboarding ni forzar un dato falso. La
generación ya degrada con gracia: ``business_whatsapp or tenant.phone or ""``.

Esta migración:
- Reformula ``message`` con tono cálido de Pipe, enmarcando la pregunta como
  opcional ("puedes omitirlo y agregarlo más tarde").
- Aclara el ``hint`` para reforzar que se puede editar luego desde el editor.
- Asegura ``is_required=False`` (idempotente; ya lo estaba en la mayoría de
  entornos).

Patrón filter+update (como 0026/0027): no-op si la fila no existe, sin duplicar.
Reversible al copy previo.
"""

from django.db import migrations

NEW_MESSAGE = (
    "¿Quieres dejar tu WhatsApp para que tus clientes y visitantes te escriban "
    "directo? Si prefieres, puedes omitirlo y agregarlo más tarde."
)
NEW_HINT = "Es opcional — lo agregas o cambias cuando quieras desde el editor."

OLD_MESSAGE = "¿Cuál es tu WhatsApp de contacto?"
OLD_HINT = "Para que tus clientes te escriban directo."


def apply(apps, schema_editor):
    OnboardingQuestion = apps.get_model("websites", "OnboardingQuestion")
    OnboardingQuestion.objects.filter(question_key="pipe_whatsapp").update(
        message=NEW_MESSAGE,
        hint=NEW_HINT,
        is_required=False,
    )


def reverse(apps, schema_editor):
    OnboardingQuestion = apps.get_model("websites", "OnboardingQuestion")
    OnboardingQuestion.objects.filter(question_key="pipe_whatsapp").update(
        message=OLD_MESSAGE,
        hint=OLD_HINT,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("websites", "0029_seed_suggest_colors_config"),
    ]

    operations = [
        migrations.RunPython(apply, reverse),
    ]
