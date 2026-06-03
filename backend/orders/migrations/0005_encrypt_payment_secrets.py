# Generated manually — converts secret_key and webhook_secret to EncryptedCharField

from django.db import migrations

import core.fields


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_remove_paymentgateway_orders_paym_tenant__idx_gw_cre_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="paymentgateway",
            name="secret_key",
            field=core.fields.EncryptedCharField(
                blank=True,
                help_text="Secret key del merchant (encriptada automáticamente)",
                verbose_name="Clave secreta",
            ),
        ),
        migrations.AlterField(
            model_name="paymentgateway",
            name="webhook_secret",
            field=core.fields.EncryptedCharField(
                blank=True,
                help_text="Webhook secret del merchant (encriptado automáticamente)",
                verbose_name="Webhook secret",
            ),
        ),
    ]
