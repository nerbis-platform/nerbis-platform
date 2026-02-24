"""
Agrega Pinterest como opción en la pregunta de redes sociales.
"""

from django.db import migrations


def add_pinterest(apps, schema_editor):
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')

    try:
        q = OnboardingQuestion.objects.get(question_key='social_media')
        if 'Pinterest' not in q.options:
            q.options.append('Pinterest')
            q.save(update_fields=['options'])
    except OnboardingQuestion.DoesNotExist:
        pass


def remove_pinterest(apps, schema_editor):
    OnboardingQuestion = apps.get_model('websites', 'OnboardingQuestion')

    try:
        q = OnboardingQuestion.objects.get(question_key='social_media')
        if 'Pinterest' in q.options:
            q.options.remove('Pinterest')
            q.save(update_fields=['options'])
    except OnboardingQuestion.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('websites', '0007_replace_content_with_sections'),
    ]

    operations = [
        migrations.RunPython(add_pinterest, remove_pinterest),
    ]
