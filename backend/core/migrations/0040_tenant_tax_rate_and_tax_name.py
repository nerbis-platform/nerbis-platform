# backend/core/migrations/0040_tenant_tax_rate_and_tax_name.py

from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0039_merge_0038"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="tax_rate",
            field=models.DecimalField(
                decimal_places=4,
                default=Decimal("0.21"),
                help_text="Ej: 0.21 para 21% (España), 0.19 para 19% (Colombia), 0.16 para 16% (México)",
                max_digits=5,
                verbose_name="Tasa de impuesto",
            ),
        ),
        migrations.AddField(
            model_name="tenant",
            name="tax_name",
            field=models.CharField(
                default="IVA",
                help_text="IVA (España/Colombia), IGV (Perú), ITBMS (Panamá)",
                max_length=20,
                verbose_name="Nombre del impuesto",
            ),
        ),
    ]
