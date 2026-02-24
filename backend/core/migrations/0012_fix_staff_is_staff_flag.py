from django.db import migrations


def fix_staff_is_staff(apps, schema_editor):
    """
    Corregir is_staff para usuarios con rol 'staff'.
    Solo los administradores deben tener is_staff=True.
    """
    User = apps.get_model('core', 'User')
    User.objects.filter(role='staff', is_staff=True).update(is_staff=False)


def reverse_fix(apps, schema_editor):
    """Revertir: dar is_staff=True a los staff de nuevo."""
    User = apps.get_model('core', 'User')
    User.objects.filter(role='staff').update(is_staff=True)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_add_otp_token'),
    ]

    operations = [
        migrations.RunPython(fix_staff_is_staff, reverse_fix),
    ]
