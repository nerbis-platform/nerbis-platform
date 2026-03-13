# backend/promotions/admin.py

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils import timezone
from unfold.admin import TabularInline
from core.admin import MarketingModuleAdmin
from core.admin_site import nerbis_admin_site
from .models import Promotion, PromotionItem


class PromotionItemInline(TabularInline):
    """Inline para items de promoción"""
    model = PromotionItem
    extra = 1
    fields = ['service', 'product', 'quantity', 'order']
    autocomplete_fields = ['service', 'product']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if not request.user.is_superuser and hasattr(request.user, 'tenant'):
            return qs.filter(tenant=request.user.tenant)
        return qs


@admin.register(Promotion, site=nerbis_admin_site)
class PromotionAdmin(MarketingModuleAdmin):
    """
    Panel de administración para Promociones.
    """

    list_display = [
        'name',
        'promotion_type_badge',
        'discount_display',
        'status_badge',
        'date_range',
        'times_used',
        'priority',
        'tenant',
    ]

    list_filter = [
        'promotion_type',
        'discount_type',
        'is_active',
        'is_featured',
        'tenant',
        'start_date',
        'end_date',
    ]

    search_fields = [
        'name',
        'description',
        'slug',
        'tenant__name',
    ]

    ordering = ['-priority', '-is_featured', '-created_at']

    readonly_fields = [
        'times_used',
        'created_at',
        'updated_at',
        'promotion_preview',
        'price_summary',
    ]

    prepopulated_fields = {'slug': ('name',)}

    inlines = [PromotionItemInline]

    fieldsets = (
        (
            'Información Básica',
            {
                'fields': (
                    'tenant',
                    'name',
                    'slug',
                    'short_description',
                    'description',
                    'image',
                )
            },
        ),
        (
            'Tipo y Descuento',
            {
                'fields': (
                    'promotion_type',
                    'discount_type',
                    'discount_value',
                    'fixed_price',
                )
            },
        ),
        (
            'Configuración',
            {
                'fields': (
                    'minimum_purchase',
                    'max_uses',
                    'max_uses_per_customer',
                    'times_used',
                )
            },
        ),
        (
            'Vigencia',
            {
                'fields': (
                    'start_date',
                    'end_date',
                ),
                'description': 'Define cuándo estará activa la promoción'
            },
        ),
        (
            'Visualización',
            {
                'fields': (
                    'badge_text',
                    'cta_text',
                    'is_active',
                    'is_featured',
                    'priority',
                )
            },
        ),
        (
            'Vista Previa',
            {
                'fields': (
                    'promotion_preview',
                    'price_summary',
                ),
                'classes': ('collapse',),
            },
        ),
        (
            'Metadata',
            {
                'fields': (
                    'created_at',
                    'updated_at',
                ),
                'classes': ('collapse',),
            },
        ),
    )

    def promotion_type_badge(self, obj):
        """Badge visual para el tipo de promoción"""
        colors = {
            'bundle': '#8b5cf6',    # Violeta
            'discount': '#3b82f6',  # Azul
            'fixed': '#10b981',     # Verde
        }
        color = colors.get(obj.promotion_type, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-size: 0.75rem;">{}</span>',
            color,
            obj.get_promotion_type_display()
        )
    promotion_type_badge.short_description = 'Tipo'

    def discount_display(self, obj):
        """Mostrar el descuento de forma legible"""
        if obj.promotion_type == 'fixed' and obj.fixed_price:
            return format_html(
                '<span style="color: #10b981; font-weight: 600;">€{}</span>',
                obj.fixed_price
            )

        if obj.discount_type == 'percentage':
            return format_html(
                '<span style="color: #ef4444; font-weight: 600;">{}% OFF</span>',
                int(obj.discount_value)
            )
        else:
            return format_html(
                '<span style="color: #ef4444; font-weight: 600;">-€{}</span>',
                obj.discount_value
            )
    discount_display.short_description = 'Descuento'

    def status_badge(self, obj):
        """Badge visual para el estado"""
        if obj.is_currently_active:
            return mark_safe(
                '<span style="background-color: #10b981; color: white; padding: 3px 10px; border-radius: 3px;">Activa</span>'
            )
        elif obj.is_upcoming:
            return mark_safe(
                '<span style="background-color: #f59e0b; color: white; padding: 3px 10px; border-radius: 3px;">Programada</span>'
            )
        elif obj.is_expired:
            return mark_safe(
                '<span style="background-color: #6b7280; color: white; padding: 3px 10px; border-radius: 3px;">Expirada</span>'
            )
        else:
            return mark_safe(
                '<span style="background-color: #ef4444; color: white; padding: 3px 10px; border-radius: 3px;">Inactiva</span>'
            )
    status_badge.short_description = 'Estado'

    def date_range(self, obj):
        """Mostrar rango de fechas"""
        start = obj.start_date.strftime('%d/%m/%Y')
        end = obj.end_date.strftime('%d/%m/%Y')
        return f'{start} - {end}'
    date_range.short_description = 'Vigencia'

    def promotion_preview(self, obj):
        """Vista previa de la promoción"""
        if not obj.pk:
            return "Guarda la promoción para ver la vista previa"

        items_html = ""
        for item in obj.items.all():
            item_name = item.service.name if item.service else (item.product.name if item.product else "?")
            item_price = item.item_price
            qty = f" x{item.quantity}" if item.quantity > 1 else ""
            items_html += f'<li style="margin: 4px 0;">{item_name}{qty} - €{item_price}</li>'

        if not items_html:
            items_html = '<li style="color: #9ca3af;">No hay items agregados</li>'

        return format_html(
            '''
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                        border-radius: 12px; padding: 20px; max-width: 400px;
                        border: 1px solid #f59e0b;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="background-color: #ef4444; color: white; padding: 4px 12px;
                                 border-radius: 20px; font-size: 0.75rem; font-weight: 600;">
                        {}
                    </span>
                </div>
                <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 1.25rem;">{}</h3>
                <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 0.875rem;">{}</p>
                <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #374151; font-size: 0.875rem;">
                    {}
                </ul>
                <button style="background-color: #e3e54e; color: #1f2937; border: none;
                               padding: 10px 20px; border-radius: 8px; font-weight: 600;
                               cursor: pointer;">
                    {}
                </button>
            </div>
            ''',
            obj.badge_text or f'{int(obj.discount_value)}% OFF',
            obj.name,
            obj.short_description or obj.description[:100] if obj.description else '',
            mark_safe(items_html),
            obj.cta_text
        )
    promotion_preview.short_description = 'Vista Previa'

    def price_summary(self, obj):
        """Resumen de precios"""
        if not obj.pk or not obj.items.exists():
            return "Agrega items para ver el resumen de precios"

        original = obj.original_total_price
        discounted = obj.discounted_price
        savings = obj.savings_amount

        return format_html(
            '''
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; max-width: 300px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #6b7280;">Precio original:</span>
                    <span style="text-decoration: line-through; color: #9ca3af;">€{}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #10b981; font-weight: 600;">Precio promoción:</span>
                    <span style="color: #10b981; font-weight: 600; font-size: 1.25rem;">€{}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #d1d5db;">
                    <span style="color: #ef4444;">Ahorro:</span>
                    <span style="color: #ef4444; font-weight: 600;">€{}</span>
                </div>
            </div>
            ''',
            original,
            discounted,
            savings
        )
    price_summary.short_description = 'Resumen de Precios'

    def save_formset(self, request, form, formset, change):
        """Asignar tenant a los items inline"""
        instances = formset.save(commit=False)
        for instance in instances:
            if not request.user.is_superuser:
                if hasattr(request.user, 'tenant') and request.user.tenant:
                    instance.tenant = request.user.tenant
            instance.save()
        formset.save_m2m()
