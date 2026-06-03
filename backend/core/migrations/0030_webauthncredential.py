from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0029_fix_tenant_and_user_fk_cascade"),
    ]

    operations = [
        migrations.CreateModel(
            name="WebAuthnCredential",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "credential_id",
                    models.BinaryField(
                        help_text="ID binario de la credencial emitido por el authenticator",
                        unique=True,
                        verbose_name="Credential ID",
                    ),
                ),
                (
                    "public_key",
                    models.BinaryField(
                        help_text="Clave pública COSE de la credencial",
                        verbose_name="Public Key",
                    ),
                ),
                (
                    "sign_count",
                    models.PositiveBigIntegerField(default=0, verbose_name="Sign Count"),
                ),
                (
                    "name",
                    models.CharField(default="Mi passkey", max_length=100, verbose_name="Nombre"),
                ),
                (
                    "transports",
                    models.JSONField(blank=True, default=list, verbose_name="Transports"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Creado"),
                ),
                (
                    "last_used_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="Último uso"),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="webauthn_credentials",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Usuario",
                    ),
                ),
            ],
            options={
                "verbose_name": "Credencial WebAuthn",
                "verbose_name_plural": "Credenciales WebAuthn",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["user"], name="core_webaut_user_id_idx"),
                ],
            },
        ),
    ]
