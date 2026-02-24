# Generated migration for hero images

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0013_add_tenant_metrics"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="hero_image_home",
            field=models.ImageField(
                blank=True,
                help_text="Imagen de fondo para el hero de la página principal",
                null=True,
                upload_to="tenants/hero/",
                verbose_name="Imagen Hero - Inicio",
            ),
        ),
        migrations.AddField(
            model_name="tenant",
            name="hero_image_services",
            field=models.ImageField(
                blank=True,
                help_text="Imagen de fondo para el hero de la página de servicios",
                null=True,
                upload_to="tenants/hero/",
                verbose_name="Imagen Hero - Servicios",
            ),
        ),
    ]
