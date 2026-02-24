from django.db import migrations, models


def populate_enabled_pages(apps, schema_editor):
    """Deriva enabled_pages de content_data keys para registros existentes."""
    WebsiteConfig = apps.get_model('websites', 'WebsiteConfig')
    for config in WebsiteConfig.objects.filter(content_data__isnull=False):
        content = config.content_data or {}
        pages = [
            k for k in content.keys()
            if not k.startswith('_') and k != 'hero'
        ]
        if pages:
            config.enabled_pages = pages
            config.save(update_fields=['enabled_pages'])


class Migration(migrations.Migration):

    dependencies = [
        ('websites', '0010_add_prompt_response_to_ai_log'),
    ]

    operations = [
        migrations.AddField(
            model_name='websiteconfig',
            name='enabled_pages',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='IDs de páginas habilitadas. Ej: ["about","services","faq"]',
                verbose_name='Páginas habilitadas',
            ),
        ),
        migrations.RunPython(populate_enabled_pages, migrations.RunPython.noop),
    ]
