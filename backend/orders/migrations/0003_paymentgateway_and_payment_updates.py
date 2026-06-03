# backend/orders/migrations/0003_paymentgateway_and_payment_updates.py

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0026_add_has_website_field"),
        ("orders", "0002_order_coupon_order_coupon_code_order_discount_amount"),
    ]

    operations = [
        # Crear modelo PaymentGateway
        migrations.CreateModel(
            name="PaymentGateway",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Última actualización")),
                (
                    "provider",
                    models.CharField(
                        choices=[
                            ("stripe", "Stripe"),
                            ("mercadopago", "MercadoPago"),
                            ("wompi", "WOMPI"),
                            ("paypal", "PayPal"),
                        ],
                        max_length=20,
                        verbose_name="Proveedor",
                    ),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="Activa")),
                (
                    "is_default",
                    models.BooleanField(
                        default=False,
                        help_text="Si el tenant tiene múltiples pasarelas, esta es la principal",
                        verbose_name="Pasarela por defecto",
                    ),
                ),
                (
                    "public_key",
                    models.CharField(
                        blank=True,
                        help_text="Publishable key / Public key del merchant",
                        max_length=500,
                        verbose_name="Clave pública",
                    ),
                ),
                (
                    "secret_key",
                    models.CharField(
                        blank=True,
                        help_text="Secret key del merchant (se debe encriptar en producción)",
                        max_length=500,
                        verbose_name="Clave secreta",
                    ),
                ),
                ("webhook_secret", models.CharField(blank=True, max_length=500, verbose_name="Webhook secret")),
                (
                    "extra_config",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Datos específicos del proveedor (merchant_id, access_token, etc.)",
                        verbose_name="Configuración adicional",
                    ),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        help_text="Tenant al que pertenece este registro",
                        on_delete=django.db.models.deletion.CASCADE,
                        to="core.tenant",
                        verbose_name="Cliente",
                    ),
                ),
            ],
            options={
                "verbose_name": "Pasarela de Pago",
                "verbose_name_plural": "Pasarelas de Pago",
                "ordering": ["-is_default", "-created_at"],
                "indexes": [
                    models.Index(fields=["tenant", "provider"], name="orders_paym_tenant__idx_gw_prov"),
                    models.Index(fields=["tenant", "is_active"], name="orders_paym_tenant__idx_gw_act"),
                    models.Index(fields=["tenant", "created_at"], name="orders_paym_tenant__idx_gw_cre"),
                ],
            },
        ),
        # Agregar constraint único
        migrations.AddConstraint(
            model_name="paymentgateway",
            constraint=models.UniqueConstraint(
                fields=("tenant", "provider"),
                name="unique_gateway_per_tenant_provider",
            ),
        ),
        # Agregar campos a Payment
        migrations.AddField(
            model_name="payment",
            name="gateway",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="payments",
                to="orders.paymentgateway",
                verbose_name="Pasarela",
            ),
        ),
        migrations.AddField(
            model_name="payment",
            name="external_id",
            field=models.CharField(
                blank=True,
                help_text="Payment Intent ID (Stripe), Preference ID (MercadoPago), etc.",
                max_length=255,
                verbose_name="ID externo",
            ),
        ),
        # Actualizar choices de payment_method
        migrations.AlterField(
            model_name="payment",
            name="payment_method",
            field=models.CharField(
                choices=[
                    ("stripe", "Stripe"),
                    ("mercadopago", "MercadoPago"),
                    ("wompi", "WOMPI"),
                    ("paypal", "PayPal"),
                    ("transfer", "Transferencia"),
                    ("cash", "Efectivo"),
                ],
                default="stripe",
                max_length=20,
                verbose_name="Método de pago",
            ),
        ),
        # Quitar default de currency (ahora viene del tenant)
        migrations.AlterField(
            model_name="payment",
            name="currency",
            field=models.CharField(max_length=3, verbose_name="Moneda"),
        ),
    ]
