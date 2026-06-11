"""Slim the `rules-general` PromptBlock to remove redundancy (issue #285).

`mejora-calidad-ia-promptblocks`: tras añadir el bloque premium
(`rules-premium-anticliche`, migración 0033), varias reglas de `rules-general`
quedaron duplicadas o cubiertas mejor por el bloque premium:

- "3. Sé conciso pero impactante"        -> vago; premium #2/#4 dan límites concretos.
- "4. Incluye llamadas a la acción claras" -> premium #3 lo dice mejor (verbo concreto).
- "6. No inventes información..."         -> premium #5/#6 ya lo prohíben; se fusiona en
                                            la regla de placeholders.

`rules-general` se queda con su rol propio: idioma, tono ({brand_tone}),
personalización por industria/audiencia y placeholders para datos faltantes.
Así cada bloque tiene una función distinta y el prompt deja de repetir reglas
(menos tokens, menos ruido para el modelo).

Escape de llaves: el único `{` es el placeholder `{brand_tone}`, que SÍ debe
quedar como llave simple para que ``build_system_prompt`` lo resuelva con
``format_map``. No hay llaves literales que doblar.

Idempotente y conservadora: solo reescribe el bloque si su contenido sigue
siendo EXACTAMENTE el sembrado por 0020. Si un superadmin ya lo editó desde el
panel, no se toca. El reverse restaura el contenido original.
"""

from django.db import migrations

BLOCK_KEY = "rules-general"

OLD_CONTENT = (
    "## Reglas Generales\n"
    "1. Escribe en español (España/Latinoamérica según el contexto)\n"
    "2. Usa un tono {brand_tone}\n"
    "3. Sé conciso pero impactante\n"
    "4. Incluye llamadas a la acción claras\n"
    "5. Personaliza el contenido según la industria y audiencia\n"
    "6. No inventes información que no se haya proporcionado\n"
    '7. Si falta información, usa placeholders descriptivos como "[Tu teléfono]"'
)

NEW_CONTENT = (
    "## Reglas Generales\n"
    "1. Escribe en español (España/Latinoamérica según el contexto).\n"
    "2. Usa un tono {brand_tone}.\n"
    "3. Personaliza el contenido según la industria y la audiencia objetivo.\n"
    "4. Si falta un dato (teléfono, dirección, email), usa un placeholder "
    'descriptivo como "[Tu teléfono]" en vez de inventarlo.'
)


def slim_rules_general(apps, schema_editor):
    PromptBlock = apps.get_model("websites", "PromptBlock")
    PromptBlock.objects.filter(key=BLOCK_KEY, content=OLD_CONTENT).update(
        content=NEW_CONTENT
    )


def restore_rules_general(apps, schema_editor):
    PromptBlock = apps.get_model("websites", "PromptBlock")
    PromptBlock.objects.filter(key=BLOCK_KEY, content=NEW_CONTENT).update(
        content=OLD_CONTENT
    )


class Migration(migrations.Migration):

    dependencies = [
        ("websites", "0033_seed_premium_global_block"),
    ]

    operations = [
        migrations.RunPython(slim_rules_general, restore_rules_general),
    ]
