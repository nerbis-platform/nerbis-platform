"""Change ``PromptBlock.industry`` on_delete from CASCADE to SET_NULL.

Issue #270 (CodeRabbit follow-up of PR #265): ``PromptBlock.industry`` is a
classification relation (``null=True, blank=True``). With ``CASCADE``, deleting
an industry silently deletes every prompt block scoped to it — losing curated
content. ``SET_NULL`` keeps the prompt blocks and just clears the industry link,
which matches the field already being optional.

Schema-only change (``ALTER ... ON DELETE``); no data migration needed.
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("websites", "0029_seed_suggest_colors_config"),
    ]

    operations = [
        migrations.AlterField(
            model_name="promptblock",
            name="industry",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="prompt_blocks",
                to="websites.industry",
                verbose_name="Industria",
            ),
        ),
    ]
