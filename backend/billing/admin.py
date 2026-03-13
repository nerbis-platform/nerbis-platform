# backend/billing/admin.py
"""
Configuración del Admin para el sistema de Billing Modular.

Usa Unfold para una UI moderna con:
- Gestión de módulos independientes
- Configuración de precios modular
- Visualización clara de suscripciones con módulos activos
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils import timezone
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display
from core.admin_site import nerbis_admin_site
from .models import (
    PricingConfig, Module, Subscription, SubscriptionModule,
    UsageRecord, Invoice, InvoiceLineItem, Plan
)


# ===================================
# CONFIGURACIÓN DE PRECIOS (Singleton)
# ===================================

@admin.register(PricingConfig, site=nerbis_admin_site)
class PricingConfigAdmin(ModelAdmin):
    """Admin para configuración global del sistema (solo trial)."""

    list_display = ['__str__', 'trial_days']

    fieldsets = (
        ('Período de Prueba', {
            'fields': ('trial_days',),
            'description': 'Días de prueba gratis para nuevas suscripciones. Los precios de extras están configurados en cada servicio.',
        }),
    )

    def has_add_permission(self, request):
        return not PricingConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


# ===================================
# SERVICIOS/MÓDULOS (PRECIOS)
# ===================================

@admin.register(Module, site=nerbis_admin_site)
class ModuleAdmin(ModelAdmin):
    """Admin para gestionar los servicios/módulos de NERBIS y sus precios."""

    list_display = [
        'display_module',
        'display_price',
        'version',
        'effective_date',
        'is_base',
        'is_active',
        'sort_order',
    ]
    list_filter = ['is_active', 'is_visible', 'is_base']
    list_editable = ['sort_order', 'is_active']
    search_fields = ['name', 'slug', 'description']
    ordering = ['sort_order']
    readonly_fields = ['slug']

    filter_horizontal = ['requires_modules']

    # Campos de límites y extras por tipo de módulo
    # Formato: (límites_fields, extras_fields)
    FIELDS_BY_MODULE = {
        'web': {
            'limits': (
                ('included_storage_gb',),
                ('included_ai_requests',),
            ),
            'extras': (
                ('extra_storage_price',),
                ('extra_ai_request_price',),
            ),
            'trial': (
                ('trial_days', 'trial_included_ai_requests'),
            ),
            'annual': (
                ('annual_included_ai_requests', 'annual_extra_ai_request_price'),
            ),
        },
        'shop': {
            'limits': (
                ('included_products', 'included_employees'),
                ('included_storage_gb',),
            ),
            'extras': (
                ('extra_product_price', 'extra_employee_price'),
                ('extra_storage_price',),
            ),
        },
        'bookings': {
            'limits': (
                ('included_appointments', 'included_employees'),
                ('included_services',),
                ('included_sms', 'included_whatsapp'),
            ),
            'extras': (
                ('extra_appointment_price', 'extra_employee_price'),
                ('extra_sms_price', 'extra_whatsapp_price'),
            ),
        },
        'services': {
            'limits': (('included_services',),),
            'extras': (),
        },
        'marketing': {
            'limits': (),
            'extras': (),
        },
    }

    def get_fieldsets(self, request, obj=None):
        """Retorna fieldsets dinámicos según el tipo de módulo."""

        # Fieldsets base (siempre presentes)
        fieldsets = [
            ('Configuración del Servicio', {
                'fields': ('slug', 'name', 'description', 'is_base'),
            }),
            ('Precio y Vigencia', {
                'fields': (
                    ('monthly_price', 'annual_discount_months'),
                    ('version', 'effective_date'),
                ),
                'description': 'El precio anual se calcula automáticamente: mensual × (12 - meses_descuento).',
            }),
        ]

        # Agregar límites y extras según el módulo
        if obj and obj.slug:
            module_fields = self.FIELDS_BY_MODULE.get(obj.slug, {})
            limit_fields = module_fields.get('limits', ())
            extra_fields = module_fields.get('extras', ())

            if limit_fields or extra_fields:
                # Límites y extras del plan mensual
                all_fields = list(limit_fields) + list(extra_fields)
                if all_fields:
                    fieldsets.append(
                        ('Límites Plan Mensual', {
                            'fields': tuple(all_fields),
                            'description': 'Límites y precios extra que aplican en el plan mensual.',
                        })
                    )

            # Configuración Trial (si aplica)
            trial_fields = module_fields.get('trial', ())
            if trial_fields:
                fieldsets.append(
                    ('Configuración Trial', {
                        'fields': tuple(trial_fields),
                        'description': 'Límites que aplican durante el período de prueba.',
                    })
                )

            # Configuración Plan Anual (si aplica)
            annual_fields = module_fields.get('annual', ())
            if annual_fields:
                fieldsets.append(
                    ('Configuración Plan Anual', {
                        'fields': tuple(annual_fields),
                        'description': 'Límites para plan anual. Si se deja en 0, usa los valores del plan mensual.',
                    })
                )
        else:
            # Para nuevo módulo, mostrar todos los campos
            fieldsets.append(
                ('Límites Incluidos', {
                    'fields': (
                        ('included_appointments', 'included_employees'),
                        ('included_products', 'included_services'),
                        ('included_sms', 'included_whatsapp'),
                        ('included_storage_gb', 'included_ai_requests'),
                    ),
                })
            )
            fieldsets.append(
                ('Precios de Extras', {
                    'fields': (
                        ('extra_appointment_price', 'extra_employee_price'),
                        ('extra_product_price', 'extra_storage_price'),
                        ('extra_sms_price', 'extra_whatsapp_price'),
                        ('extra_ai_request_price',),
                    ),
                })
            )

        # Fieldsets adicionales
        fieldsets.extend([
            ('Features Especiales', {
                'fields': ('has_analytics', 'has_api_access'),
                'classes': ('collapse',),
            }),
            ('Dependencias', {
                'fields': ('requires_modules',),
                'classes': ('collapse',),
            }),
            ('Visibilidad', {
                'fields': ('is_active', 'is_visible', 'sort_order'),
            }),
        ])

        return fieldsets

    @display(description='Servicio')
    def display_module(self, obj):
        base_badge = mark_safe(' <span style="background: #3b82f6; color: white; padding: 1px 6px; border-radius: 4px; font-size: 10px;">BASE</span>') if obj.is_base else ''
        return format_html(
            '<strong>{}</strong>{}',
            obj.name, base_badge
        )

    @display(description='Precio', ordering='monthly_price')
    def display_price(self, obj):
        monthly = f"${obj.monthly_price:,.0f}"
        yearly = f"${obj.yearly_price:,.0f}"
        savings = f"${obj.annual_savings:,.0f}"
        prefix = "" if obj.is_base else "+"
        return format_html(
            '<strong>{}{}/mes</strong><br>'
            '<small class="text-muted">{}{}/año (ahorra {})</small>',
            prefix, monthly, prefix, yearly, savings
        )

    @display(description='Límites')
    def display_limits(self, obj):
        parts = []
        if obj.included_appointments:
            parts.append(f'📅 {obj.included_appointments}')
        if obj.included_employees:
            parts.append(f'👥 {obj.included_employees}')
        if obj.included_products:
            val = '∞' if obj.included_products == 0 else obj.included_products
            parts.append(f'📦 {val}')
        return ' · '.join(parts) if parts else '-'

    @display(description='Features')
    def display_features(self, obj):
        features = []
        if obj.has_analytics:
            features.append('📊')
        if obj.has_api_access:
            features.append('🔌')
        return ' '.join(features) if features else '-'

    def has_add_permission(self, request):
        """Los 5 servicios están predefinidos, no se pueden crear nuevos."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Los servicios no se pueden eliminar, solo desactivar."""
        return False


# ===================================
# SUSCRIPCIONES
# ===================================

class SubscriptionModuleInline(TabularInline):
    """Inline para ver/editar módulos de una suscripción."""

    model = SubscriptionModule
    extra = 0
    fields = ['module', 'is_active', 'price_locked', 'activated_at']
    readonly_fields = ['activated_at']
    autocomplete_fields = ['module']


class InvoiceInline(TabularInline):
    """Inline para ver facturas de una suscripción."""

    model = Invoice
    extra = 0
    fields = ['number', 'period_start', 'period_end', 'total', 'status']
    readonly_fields = ['number', 'period_start', 'period_end', 'total', 'status']
    show_change_link = True
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Subscription, site=nerbis_admin_site)
class SubscriptionAdmin(ModelAdmin):
    """Admin para gestionar suscripciones de tenants."""

    list_display = [
        'tenant',
        'display_modules',
        'display_pricing',
        'display_status',
        'display_period',
        'billing_period',
    ]
    list_filter = ['status', 'billing_period']
    search_fields = ['tenant__name', 'tenant__slug']
    raw_id_fields = ['tenant']
    readonly_fields = ['created_at', 'updated_at', 'display_total_breakdown']
    inlines = [SubscriptionModuleInline, InvoiceInline]

    fieldsets = (
        ('Tenant', {
            'fields': ('tenant',),
        }),
        ('Facturación', {
            'fields': ('billing_period', 'display_total_breakdown'),
        }),
        ('Estado', {
            'fields': ('status',),
        }),
        ('Fechas', {
            'fields': (
                'started_at',
                ('current_period_start', 'current_period_end'),
                'trial_ends_at',
                'canceled_at',
            ),
        }),
        ('Features Adicionales', {
            'fields': (
                ('has_custom_domain', 'has_priority_support'),
                'has_white_label',
            ),
        }),
        ('Extras Contratados', {
            'fields': ('extra_employees',),
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @display(description='Módulos')
    def display_modules(self, obj):
        modules = obj.subscription_modules.filter(is_active=True)
        if not modules:
            return format_html(
                '<span style="color: #6b7280;">Solo Web Base</span>'
            )
        names = [sm.module.name for sm in modules]
        return ', '.join(names)

    @display(description='Precio', ordering='billing_period')
    def display_pricing(self, obj):
        total = f"${obj.monthly_total:,.0f}"
        return format_html(
            '<strong>{}/mes</strong>',
            total
        )

    @display(description='Estado', ordering='status')
    def display_status(self, obj):
        colors = {
            'trial': '#3b82f6',      # blue
            'active': '#22c55e',     # green
            'past_due': '#f59e0b',   # amber
            'canceled': '#6b7280',   # gray
            'expired': '#ef4444',    # red
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 9999px; font-size: 11px; font-weight: 500;">{}</span>',
            color, obj.get_status_display()
        )

    @display(description='Período')
    def display_period(self, obj):
        if obj.status == 'trial' and obj.trial_ends_at:
            days = obj.trial_days_remaining
            if days is not None:
                return format_html('🎁 {} días de prueba', days)
        if obj.days_remaining is not None:
            return format_html('{} días restantes', obj.days_remaining)
        return '-'

    def display_total_breakdown(self, obj):
        """Muestra desglose del precio total."""
        if not obj or not obj.pk:
            return '-'

        config = PricingConfig.get_current()
        modules = obj.subscription_modules.filter(is_active=True)

        html = '<table style="border-collapse: collapse; width: 100%;">'

        # Módulos contratados
        has_non_base = obj._has_non_base_modules
        for sm in modules:
            price = sm.price_locked or sm.module.monthly_price
            if has_non_base and sm.module.is_base:
                # Web incluido gratis cuando hay otros módulos
                html += f'''
                <tr>
                    <td style="padding: 4px 8px; color: #059669;">{sm.module.name}</td>
                    <td style="padding: 4px 8px; text-align: right; color: #059669;">Incluido</td>
                </tr>
                '''
            else:
                prefix = "" if sm.module.is_base else "+"
                html += f'''
                <tr>
                    <td style="padding: 4px 8px;">{sm.module.name}</td>
                    <td style="padding: 4px 8px; text-align: right;">{prefix}${price:,.0f}</td>
                </tr>
                '''

        # Extras
        if obj.extra_employees > 0:
            extras_price = obj.extra_employees * config.extra_employee_price
            html += f'''
            <tr>
                <td style="padding: 4px 8px;">{obj.extra_employees} empleado(s) extra</td>
                <td style="padding: 4px 8px; text-align: right;">+${extras_price:,.0f}</td>
            </tr>
            '''

        # Total
        html += f'''
        <tr style="border-top: 1px solid #e5e7eb; font-weight: bold;">
            <td style="padding: 8px;">TOTAL MENSUAL</td>
            <td style="padding: 8px; text-align: right; color: #059669;">${obj.monthly_total:,.0f}</td>
        </tr>
        '''

        # Anual
        if obj.billing_period == 'yearly':
            html += f'''
            <tr>
                <td style="padding: 4px 8px; color: #6b7280;">Total Anual</td>
                <td style="padding: 4px 8px; text-align: right; color: #6b7280;">${obj.yearly_total:,.0f}</td>
            </tr>
            '''

        html += '</table>'
        return mark_safe(html)
    display_total_breakdown.short_description = 'Desglose de Precio'


# ===================================
# USO Y FACTURACIÓN
# ===================================

@admin.register(UsageRecord, site=nerbis_admin_site)
class UsageRecordAdmin(ModelAdmin):
    """Admin para ver registros de uso."""

    list_display = [
        'subscription',
        'resource',
        'quantity',
        'display_billable',
        'recorded_at',
        'description',
    ]
    list_filter = ['resource', 'is_billable', 'period_start']
    search_fields = ['subscription__tenant__name', 'description']
    raw_id_fields = ['subscription', 'invoice']
    readonly_fields = ['created_at']
    date_hierarchy = 'recorded_at'

    fieldsets = (
        (None, {
            'fields': ('subscription', 'resource', 'quantity'),
        }),
        ('Período', {
            'fields': ('recorded_at', 'period_start', 'period_end'),
        }),
        ('Facturación', {
            'fields': ('is_billable', 'unit_price', 'invoice'),
        }),
        ('Referencia', {
            'fields': ('content_type', 'object_id', 'description'),
            'classes': ('collapse',),
        }),
    )

    @display(description='Facturable', boolean=True)
    def display_billable(self, obj):
        return obj.is_billable


class InvoiceLineItemInline(TabularInline):
    """Inline para líneas de factura."""

    model = InvoiceLineItem
    extra = 0
    fields = ['line_type', 'description', 'quantity', 'unit_price', 'total']


@admin.register(Invoice, site=nerbis_admin_site)
class InvoiceAdmin(ModelAdmin):
    """Admin para gestionar facturas."""

    list_display = [
        'number',
        'subscription',
        'display_period',
        'display_amounts',
        'display_status',
        'issued_at',
    ]
    list_filter = ['status', 'period_start']
    search_fields = ['number', 'subscription__tenant__name']
    raw_id_fields = ['subscription']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'period_start'
    inlines = [InvoiceLineItemInline]

    fieldsets = (
        ('Identificación', {
            'fields': ('number', 'subscription'),
        }),
        ('Período', {
            'fields': (('period_start', 'period_end'),),
        }),
        ('Montos', {
            'fields': (
                ('subtotal_base', 'subtotal_modules'),
                ('subtotal_extras', 'subtotal_usage'),
                ('discount', 'tax'),
                'total',
            ),
        }),
        ('Estado y Fechas', {
            'fields': (
                'status',
                ('issued_at', 'due_at', 'paid_at'),
            ),
        }),
        ('Pago', {
            'fields': ('payment_method', 'payment_reference'),
            'classes': ('collapse',),
        }),
        ('Notas', {
            'fields': ('notes',),
            'classes': ('collapse',),
        }),
    )

    @display(description='Período')
    def display_period(self, obj):
        return format_html(
            '{} → {}',
            obj.period_start.strftime('%d/%m/%Y'),
            obj.period_end.strftime('%d/%m/%Y')
        )

    @display(description='Montos')
    def display_amounts(self, obj):
        parts = [f'Base: ${obj.subtotal_base:,.0f}']
        if obj.subtotal_modules > 0:
            parts.append(f'Módulos: ${obj.subtotal_modules:,.0f}')
        if obj.subtotal_extras > 0:
            parts.append(f'Extras: ${obj.subtotal_extras:,.0f}')
        if obj.subtotal_usage > 0:
            parts.append(f'Uso: ${obj.subtotal_usage:,.0f}')

        total = f"${obj.total:,.0f}"
        details = ' + '.join(parts)
        return format_html(
            '<strong>{}</strong><br><small class="text-muted">{}</small>',
            total, details
        )

    @display(description='Estado', ordering='status')
    def display_status(self, obj):
        colors = {
            'draft': '#6b7280',
            'pending': '#f59e0b',
            'paid': '#22c55e',
            'failed': '#ef4444',
            'void': '#6b7280',
            'refunded': '#8b5cf6',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 9999px; font-size: 11px; font-weight: 500;">{}</span>',
            color, obj.get_status_display()
        )

    actions = ['mark_as_paid', 'mark_as_pending']

    @admin.action(description='Marcar como pagada')
    def mark_as_paid(self, request, queryset):
        updated = queryset.filter(status='pending').update(
            status='paid',
            paid_at=timezone.now()
        )
        self.message_user(request, f'{updated} factura(s) marcada(s) como pagada(s).')

    @admin.action(description='Marcar como pendiente')
    def mark_as_pending(self, request, queryset):
        updated = queryset.filter(status='draft').update(
            status='pending',
            issued_at=timezone.now()
        )
        self.message_user(request, f'{updated} factura(s) marcada(s) como pendiente(s).')


# ===================================
# PLAN (DEPRECATED)
# ===================================

@admin.register(Plan, site=nerbis_admin_site)
class PlanAdmin(ModelAdmin):
    """[DEPRECATED] Admin para planes fijos - Solo para migración."""

    list_display = ['name', 'slug', 'monthly_price', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'slug']

    fieldsets = (
        ('⚠️ MODELO DEPRECADO', {
            'fields': (),
            'description': '''
                Este modelo está deprecado. El nuevo sistema usa Módulos individuales
                en lugar de Planes fijos. Este admin se mantiene solo para migración.
            ''',
        }),
        ('Información', {
            'fields': ('name', 'slug', 'description', 'monthly_price'),
        }),
        ('Estado', {
            'fields': ('is_active', 'is_public'),
        }),
    )

    def has_add_permission(self, request):
        return False  # No permitir crear nuevos planes
