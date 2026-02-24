# billing/migrations/0006_modular_billing_system.py
"""
Migración para el nuevo sistema de billing modular.

Cambios:
1. Crea PricingConfig (configuración global de precios)
2. Crea Module (módulos individuales con precios)
3. Crea SubscriptionModule (through table)
4. Actualiza Subscription (agrega ManyToMany a modules, nuevos campos)
5. Actualiza Invoice (subtotal_base y subtotal_modules)
6. Mantiene Plan como deprecated
"""

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0005_update_plans_with_modules'),
    ]

    operations = [
        # ===================================
        # 1. CREAR PRICINGCONFIG
        # ===================================
        migrations.CreateModel(
            name='PricingConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('base_monthly_price', models.DecimalField(
                    decimal_places=2,
                    default=Decimal('25000.00'),
                    help_text='Precio mensual base en COP (web estática)',
                    max_digits=10,
                    verbose_name='Precio base mensual'
                )),
                ('base_annual_discount_months', models.PositiveIntegerField(
                    default=2,
                    help_text='Meses gratis al pagar anual para precio base',
                    verbose_name='Meses de descuento anual (base)'
                )),
                ('trial_days', models.PositiveIntegerField(
                    default=14,
                    help_text='Días de prueba gratis para nuevas suscripciones',
                    verbose_name='Días de prueba'
                )),
                ('extra_employee_price', models.DecimalField(
                    decimal_places=2,
                    default=Decimal('25000.00'),
                    help_text='Precio mensual por empleado adicional',
                    max_digits=8,
                    verbose_name='Precio empleado extra'
                )),
                ('extra_sms_price', models.DecimalField(
                    decimal_places=2,
                    default=Decimal('180.00'),
                    help_text='Precio por SMS adicional',
                    max_digits=8,
                    verbose_name='Precio SMS extra'
                )),
                ('extra_whatsapp_price', models.DecimalField(
                    decimal_places=2,
                    default=Decimal('250.00'),
                    help_text='Precio por mensaje WhatsApp adicional',
                    max_digits=8,
                    verbose_name='Precio WhatsApp extra'
                )),
                ('extra_appointment_price', models.DecimalField(
                    decimal_places=2,
                    default=Decimal('800.00'),
                    help_text='Precio por cita adicional (sobre límite)',
                    max_digits=8,
                    verbose_name='Precio cita extra'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Configuración de Precios',
                'verbose_name_plural': 'Configuración de Precios',
            },
        ),

        # ===================================
        # 2. CREAR MODULE
        # ===================================
        migrations.CreateModel(
            name='Module',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.SlugField(
                    choices=[
                        ('shop', 'Tienda'),
                        ('bookings', 'Reservas'),
                        ('services', 'Planes/Contratos'),
                        ('marketing', 'Marketing'),
                    ],
                    help_text='Identificador único del módulo',
                    unique=True,
                    verbose_name='Identificador'
                )),
                ('name', models.CharField(
                    help_text='Nombre visible del módulo',
                    max_length=100,
                    verbose_name='Nombre'
                )),
                ('description', models.TextField(
                    help_text='Descripción del módulo para mostrar al cliente',
                    verbose_name='Descripción'
                )),
                ('icon', models.CharField(
                    default='📦',
                    help_text='Emoji o clase de ícono',
                    max_length=50,
                    verbose_name='Ícono'
                )),
                ('monthly_price', models.DecimalField(
                    decimal_places=2,
                    help_text='Precio mensual adicional en COP',
                    max_digits=10,
                    validators=[django.core.validators.MinValueValidator(Decimal('0'))],
                    verbose_name='Precio Mensual'
                )),
                ('annual_discount_months', models.PositiveIntegerField(
                    default=2,
                    help_text='Meses gratis al pagar anual',
                    verbose_name='Meses de descuento (anual)'
                )),
                ('included_appointments', models.PositiveIntegerField(
                    default=0,
                    help_text='Citas mensuales incluidas con este módulo (0 = no aplica)',
                    verbose_name='Citas incluidas'
                )),
                ('included_employees', models.PositiveIntegerField(
                    default=0,
                    help_text='Empleados incluidos (0 = no aplica)',
                    verbose_name='Empleados incluidos'
                )),
                ('included_products', models.PositiveIntegerField(
                    default=0,
                    help_text='Productos en catálogo (0 = no aplica/ilimitado)',
                    verbose_name='Productos incluidos'
                )),
                ('included_services', models.PositiveIntegerField(
                    default=0,
                    help_text='Servicios configurables (0 = no aplica/ilimitado)',
                    verbose_name='Servicios incluidos'
                )),
                ('included_sms', models.PositiveIntegerField(
                    default=0,
                    help_text='SMS incluidos por mes',
                    verbose_name='SMS incluidos'
                )),
                ('included_whatsapp', models.PositiveIntegerField(
                    default=0,
                    help_text='Mensajes WhatsApp incluidos por mes',
                    verbose_name='WhatsApp incluidos'
                )),
                ('has_analytics', models.BooleanField(
                    default=False,
                    help_text='Incluye analytics avanzados',
                    verbose_name='Analytics avanzados'
                )),
                ('has_api_access', models.BooleanField(
                    default=False,
                    help_text='Incluye acceso a API',
                    verbose_name='Acceso a API'
                )),
                ('is_active', models.BooleanField(
                    default=True,
                    help_text='¿Módulo disponible para contratar?',
                    verbose_name='Activo'
                )),
                ('is_visible', models.BooleanField(
                    default=True,
                    help_text='¿Visible en la página de precios?',
                    verbose_name='Visible'
                )),
                ('sort_order', models.PositiveIntegerField(
                    default=0,
                    help_text='Orden de aparición en la página de precios',
                    verbose_name='Orden'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('requires_modules', models.ManyToManyField(
                    blank=True,
                    help_text='Módulos requeridos para habilitar este',
                    related_name='required_by',
                    to='billing.module'
                )),
            ],
            options={
                'verbose_name': 'Módulo',
                'verbose_name_plural': 'Módulos',
                'ordering': ['sort_order', 'monthly_price'],
            },
        ),

        # ===================================
        # 3. CREAR SUBSCRIPTIONMODULE
        # ===================================
        migrations.CreateModel(
            name='SubscriptionModule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('price_locked', models.DecimalField(
                    blank=True,
                    decimal_places=2,
                    help_text='Precio mensual al momento de contratar (para grandfathering)',
                    max_digits=10,
                    null=True,
                    verbose_name='Precio bloqueado'
                )),
                ('is_active', models.BooleanField(default=True, verbose_name='Activo')),
                ('activated_at', models.DateTimeField(auto_now_add=True, verbose_name='Fecha de activación')),
                ('deactivated_at', models.DateTimeField(
                    blank=True,
                    null=True,
                    verbose_name='Fecha de desactivación'
                )),
                ('module', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='subscription_modules',
                    to='billing.module'
                )),
                ('subscription', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='subscription_modules',
                    to='billing.subscription'
                )),
            ],
            options={
                'verbose_name': 'Módulo de Suscripción',
                'verbose_name_plural': 'Módulos de Suscripción',
                'unique_together': {('subscription', 'module')},
            },
        ),

        # ===================================
        # 4. AGREGAR CAMPOS A SUBSCRIPTION
        # ===================================
        migrations.AddField(
            model_name='subscription',
            name='modules',
            field=models.ManyToManyField(
                blank=True,
                help_text='Módulos adicionales contratados',
                related_name='subscriptions',
                through='billing.SubscriptionModule',
                to='billing.module'
            ),
        ),
        migrations.AddField(
            model_name='subscription',
            name='has_custom_domain',
            field=models.BooleanField(
                default=False,
                help_text='Dominio personalizado contratado',
                verbose_name='Dominio personalizado'
            ),
        ),
        migrations.AddField(
            model_name='subscription',
            name='has_priority_support',
            field=models.BooleanField(
                default=False,
                help_text='Soporte prioritario contratado',
                verbose_name='Soporte prioritario'
            ),
        ),
        migrations.AddField(
            model_name='subscription',
            name='has_white_label',
            field=models.BooleanField(
                default=False,
                help_text='Sin branding de GRAVITI',
                verbose_name='Sin branding (White Label)'
            ),
        ),

        # ===================================
        # 5. ACTUALIZAR INVOICE
        # ===================================
        # Renombrar subtotal_plan a subtotal_base
        migrations.RenameField(
            model_name='invoice',
            old_name='subtotal_plan',
            new_name='subtotal_base',
        ),
        migrations.AlterField(
            model_name='invoice',
            name='subtotal_base',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0'),
                help_text='Cargo por web estática (base)',
                max_digits=12,
                verbose_name='Cargo base'
            ),
        ),
        # Agregar subtotal_modules
        migrations.AddField(
            model_name='invoice',
            name='subtotal_modules',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0'),
                help_text='Cargo por módulos adicionales',
                max_digits=12,
                verbose_name='Cargo módulos'
            ),
        ),

        # ===================================
        # 6. AGREGAR REFERENCIA A MODULE EN INVOICELINEITEM
        # ===================================
        migrations.AddField(
            model_name='invoicelineitem',
            name='module',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='billing.module'
            ),
        ),
        # Actualizar choices de line_type
        migrations.AlterField(
            model_name='invoicelineitem',
            name='line_type',
            field=models.CharField(
                choices=[
                    ('base', 'Web Base'),
                    ('module', 'Módulo'),
                    ('extra_employee', 'Empleado Adicional'),
                    ('usage_appointment', 'Citas Adicionales'),
                    ('usage_sms', 'SMS Adicionales'),
                    ('usage_whatsapp', 'WhatsApp Adicionales'),
                    ('discount', 'Descuento'),
                    ('tax', 'Impuesto'),
                ],
                max_length=50
            ),
        ),

        # ===================================
        # 7. HACER PLAN FK NULLABLE EN SUBSCRIPTION (para deprecación gradual)
        # ===================================
        migrations.AlterField(
            model_name='subscription',
            name='plan',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='subscriptions',
                to='billing.plan'
            ),
        ),
    ]
