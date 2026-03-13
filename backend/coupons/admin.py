# backend/coupons/admin.py

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from unfold.admin import TabularInline
from unfold.decorators import display
from core.admin_site import nerbis_admin_site
from core.admin import MarketingModuleAdmin
from .models import Coupon, CouponUsage


class CouponUsageInline(TabularInline):
    model = CouponUsage
    extra = 0
    readonly_fields = ['user', 'order', 'discount_applied', 'used_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Coupon, site=nerbis_admin_site)
class CouponAdmin(MarketingModuleAdmin):
    list_display = [
        'code',
        'discount_display',
        'status_badge',
        'validity_display',
        'usage_display',
        'is_active',
    ]
    list_filter = [
        'is_active',
        'discount_type',
        'first_purchase_only',
        'valid_from',
        'valid_until',
    ]
    search_fields = ['code', 'description']
    readonly_fields = ['times_used', 'created_at', 'updated_at']
    inlines = [CouponUsageInline]

    fieldsets = (
        ('Información del Cupón', {
            'fields': ('code', 'description', 'is_active')
        }),
        ('Descuento', {
            'fields': ('discount_type', 'discount_value', 'minimum_purchase', 'maximum_discount')
        }),
        ('Vigencia', {
            'fields': ('valid_from', 'valid_until')
        }),
        ('Límites de Uso', {
            'fields': ('max_uses', 'max_uses_per_user', 'times_used', 'first_purchase_only')
        }),
        ('Información del Sistema', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    @display(description='Descuento', ordering='discount_value')
    def discount_display(self, obj):
        return obj.get_discount_display()

    @display(description='Estado')
    def status_badge(self, obj):
        now = timezone.now()

        if not obj.is_active:
            return format_html(
                '<span style="background-color: #6b7280; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Inactivo</span>'
            )

        if now < obj.valid_from:
            return format_html(
                '<span style="background-color: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Próximamente</span>'
            )

        if now > obj.valid_until:
            return format_html(
                '<span style="background-color: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Expirado</span>'
            )

        if obj.max_uses and obj.times_used >= obj.max_uses:
            return format_html(
                '<span style="background-color: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Agotado</span>'
            )

        return format_html(
            '<span style="background-color: #22c55e; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Activo</span>'
        )

    @display(description='Vigencia')
    def validity_display(self, obj):
        return f"{obj.valid_from.strftime('%d/%m/%Y')} - {obj.valid_until.strftime('%d/%m/%Y')}"

    @display(description='Usos')
    def usage_display(self, obj):
        if obj.max_uses:
            percentage = (obj.times_used / obj.max_uses) * 100
            return f"{obj.times_used}/{obj.max_uses} ({percentage:.0f}%)"
        return f"{obj.times_used}/∞"


@admin.register(CouponUsage, site=nerbis_admin_site)
class CouponUsageAdmin(MarketingModuleAdmin):
    list_display = ['coupon', 'user', 'discount_applied', 'order', 'used_at']
    list_filter = ['used_at', 'coupon']
    search_fields = ['coupon__code', 'user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['coupon', 'user', 'order', 'discount_applied', 'used_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
