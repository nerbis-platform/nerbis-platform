# Generated migration to rename app from marketplace to subscriptions

from django.db import migrations


def rename_app_label(apps, schema_editor):
    """Rename the app label from marketplace to subscriptions in ContentType"""
    ContentType = apps.get_model('contenttypes', 'ContentType')

    # Update all content types from marketplace to subscriptions
    ContentType.objects.filter(app_label='marketplace').update(app_label='subscriptions')


def reverse_rename_app_label(apps, schema_editor):
    """Reverse: rename back from subscriptions to marketplace"""
    ContentType = apps.get_model('contenttypes', 'ContentType')

    # Update all content types from subscriptions back to marketplace
    ContentType.objects.filter(app_label='subscriptions').update(app_label='marketplace')


class Migration(migrations.Migration):

    dependencies = [
        ('subscriptions', '0001_initial'),
        ('contenttypes', '__latest__'),
    ]

    operations = [
        migrations.RunPython(rename_app_label, reverse_rename_app_label),
    ]
