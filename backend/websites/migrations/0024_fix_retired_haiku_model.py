"""Fix the retired Haiku model id seeded in 0021.

Migration 0021 seeded every Haiku-backed AIModelConfig with
``claude-3-haiku-20240307``, which Anthropic has retired. With that id the API
returns 404 and classify-industry silently falls back to the deterministic mock
(always returns ``generic``, confidence 0.0). This migration repoints any config
still pointing at the retired id to the current Haiku ``claude-haiku-4-5-20251001``.

Only rows that still hold the exact retired id are touched, so a superadmin who
already picked a different model from the admin UI is never overridden.
"""

from django.db import migrations

RETIRED_MODEL = "claude-3-haiku-20240307"
CURRENT_HAIKU = "claude-haiku-4-5-20251001"


def fix_model(apps, schema_editor):
    AIModelConfig = apps.get_model("websites", "AIModelConfig")
    AIModelConfig.objects.filter(model=RETIRED_MODEL).update(model=CURRENT_HAIKU)


def revert_model(apps, schema_editor):
    AIModelConfig = apps.get_model("websites", "AIModelConfig")
    AIModelConfig.objects.filter(model=CURRENT_HAIKU).update(model=RETIRED_MODEL)


class Migration(migrations.Migration):

    dependencies = [
        ("websites", "0023_refine_canonical_industries"),
    ]

    operations = [
        migrations.RunPython(fix_model, revert_model),
    ]
