"""Migración de datos: ajusta el copy de la pregunta de WhatsApp (pipe_whatsapp).

Refina el mensaje de Pipe para hablar de "visitantes" (más amplio que "clientes")
y mantener el encuadre opcional. Solo cambia ``message``; el resto (hint,
is_required) ya quedó fijado en 0031.

Patrón filter+update (como 0031): no-op si la fila no existe, sin duplicar.
Reversible al copy de 0031.
"""

from django.db import migrations

NEW_MESSAGE = (
    "¿Quieres dejar tu WhatsApp para que tus visitantes te escriban? "
    "Si prefieres, puedes omitirlo y agregarlo más tarde."
)

OLD_MESSAGE = (
    "¿Quieres dejar tu WhatsApp para que tus clientes y visitantes te escriban "
    "directo? Si prefieres, puedes omitirlo y agregarlo más tarde."
)


def apply(apps, schema_editor):
    OnboardingQuestion = apps.get_model("websites", "OnboardingQuestion")
    OnboardingQuestion.objects.filter(question_key="pipe_whatsapp").update(message=NEW_MESSAGE)


def reverse(apps, schema_editor):
    OnboardingQuestion = apps.get_model("websites", "OnboardingQuestion")
    OnboardingQuestion.objects.filter(question_key="pipe_whatsapp").update(message=OLD_MESSAGE)


class Migration(migrations.Migration):

    dependencies = [
        ("websites", "0031_optional_whatsapp_copy"),
    ]

    operations = [
        migrations.RunPython(apply, reverse),
    ]
