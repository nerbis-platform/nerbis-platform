# Generated manually for issue #58 — 2FA (TOTP)

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0030_webauthncredential"),
    ]

    operations = [
        migrations.CreateModel(
            name="TOTPDevice",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "secret_encrypted",
                    models.BinaryField(
                        help_text="Secreto base32 cifrado con Fernet",
                        verbose_name="Secreto TOTP cifrado",
                    ),
                ),
                (
                    "confirmed",
                    models.BooleanField(
                        default=False,
                        help_text="True cuando el usuario ha verificado el primer código",
                        verbose_name="Confirmado",
                    ),
                ),
                (
                    "backup_codes",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text="Lista de hashes (make_password) de los backup codes restantes",
                        verbose_name="Backup codes hasheados",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Creado")),
                (
                    "last_used_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="Último uso"),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="totp_device",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Usuario",
                    ),
                ),
            ],
            options={
                "verbose_name": "Dispositivo TOTP",
                "verbose_name_plural": "Dispositivos TOTP",
            },
        ),
    ]
