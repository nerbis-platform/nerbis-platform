# Generated migration to unify trial_ends_at and subscription_ends_at

from django.db import migrations, models


def migrate_trial_to_subscription(apps, schema_editor):
    """
    Migrar datos de trial_ends_at a subscription_ends_at.
    Solo migra si subscription_ends_at está vacío y trial_ends_at tiene valor.
    """
    Tenant = apps.get_model('core', 'Tenant')

    # Migrar tenants que tienen trial_ends_at pero no subscription_ends_at
    tenants_to_update = Tenant.objects.filter(
        trial_ends_at__isnull=False,
        subscription_ends_at__isnull=True
    )

    for tenant in tenants_to_update:
        tenant.subscription_ends_at = tenant.trial_ends_at
        tenant.save(update_fields=['subscription_ends_at'])

    count = tenants_to_update.count()
    if count > 0:
        print(f"  Migrados {count} tenants de trial_ends_at a subscription_ends_at")


def reverse_migration(apps, schema_editor):
    """
    Revertir: mover datos de subscription_ends_at a trial_ends_at
    para tenants en plan trial.
    """
    Tenant = apps.get_model('core', 'Tenant')

    tenants_to_update = Tenant.objects.filter(
        plan='trial',
        subscription_ends_at__isnull=False,
        trial_ends_at__isnull=True
    )

    for tenant in tenants_to_update:
        tenant.trial_ends_at = tenant.subscription_ends_at
        tenant.save(update_fields=['trial_ends_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_add_feature_flags_to_tenant'),
    ]

    operations = [
        # 1. Migrar datos de trial_ends_at a subscription_ends_at
        migrations.RunPython(migrate_trial_to_subscription, reverse_migration),

        # 2. Eliminar el campo trial_ends_at
        migrations.RemoveField(
            model_name='tenant',
            name='trial_ends_at',
        ),

        # 3. Actualizar help_text del campo subscription_ends_at
        migrations.AlterField(
            model_name='tenant',
            name='subscription_ends_at',
            field=models.DateField(
                blank=True,
                null=True,
                verbose_name='Fin de la suscripción',
                help_text='Fecha en que expira la suscripción o el trial. Dejar vacío para acceso indefinido.',
            ),
        ),
    ]
