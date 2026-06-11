import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("websites", "0032_update_whatsapp_copy"),
    ]

    operations = [
        migrations.AlterField(
            model_name="aigenerationlog",
            name="website_config",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="ai_logs",
                to="websites.websiteconfig",
            ),
        ),
    ]
