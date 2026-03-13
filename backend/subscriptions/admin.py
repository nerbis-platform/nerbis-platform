# backend/subscriptions/admin.py

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from unfold.admin import TabularInline
from .models import MarketplaceCategory, MarketplacePlan, MarketplaceContract
from core.admin_site import nerbis_admin_site
from core.admin import ServicesModuleAdmin


@admin.register(MarketplaceCategory, site=nerbis_admin_site)
class MarketplaceCategoryAdmin(ServicesModuleAdmin):
    """Admin para categorías de servicios vendibles"""

    list_display = [
        "name",
        "tenant",
        "plans_count",
        "is_active_badge",
        "order",
        "created_at",
    ]

    list_filter = [
        "is_active",
        "created_at",
    ]

    search_fields = [
        "name",
        "description",
    ]

    prepopulated_fields = {"slug": ("name",)}

    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (
            "Información Básica",
            {
                "fields": (
                    "tenant",
                    "name",
                    "slug",
                    "description",
                )
            },
        ),
        (
            "Apariencia",
            {
                "fields": (
                    "icon",
                    "image",
                )
            },
        ),
        (
            "Configuración",
            {
                "fields": (
                    "is_active",
                    "order",
                )
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def plans_count(self, obj):
        """Número de planes en esta categoría"""
        count = obj.service_plans.count()
        return f"{count} planes"

    plans_count.short_description = "Planes"

    def is_active_badge(self, obj):
        """Badge visual para is_active"""
        if obj.is_active:
            return mark_safe(
                '<span style="background-color: #10b981; color: white; '
                'padding: 3px 10px; border-radius: 3px;">Activa</span>'
            )
        return mark_safe(
            '<span style="background-color: #6b7280; color: white; '
            'padding: 3px 10px; border-radius: 3px;">Inactiva</span>'
        )

    is_active_badge.short_description = "Estado"


@admin.register(MarketplacePlan, site=nerbis_admin_site)
class MarketplacePlanAdmin(ServicesModuleAdmin):
    """Admin para planes de servicios vendibles"""

    list_display = [
        "name",
        "category",
        "tenant",
        "price_display",
        "billing_period",
        "contracts_count",
        "is_active_badge",
        "is_featured",
        "created_at",
    ]

    list_filter = [
        "category",
        "billing_period",
        "is_active",
        "is_featured",
        "created_at",
    ]

    search_fields = [
        "name",
        "description",
        "full_description",
    ]

    prepopulated_fields = {"slug": ("name",)}

    readonly_fields = [
        "created_at",
        "updated_at",
        "active_contracts_count",
        "is_available",
    ]

    fieldsets = (
        (
            "Información Básica",
            {
                "fields": (
                    "tenant",
                    "category",
                    "name",
                    "slug",
                    "description",
                    "full_description",
                )
            },
        ),
        (
            "Precio y Facturación",
            {
                "fields": (
                    "price",
                    "billing_period",
                )
            },
        ),
        (
            "Características",
            {
                "fields": (
                    "features",
                ),
                "description": "Lista de características en formato JSON. "
                               "Ejemplo: [\"Característica 1\", \"Característica 2\"]"
            },
        ),
        (
            "Apariencia",
            {
                "fields": (
                    "image",
                    "is_featured",
                )
            },
        ),
        (
            "Configuración",
            {
                "fields": (
                    "is_active",
                    "max_contracts",
                    "order",
                )
            },
        ),
        (
            "Información",
            {
                "fields": (
                    "active_contracts_count",
                    "is_available",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def price_display(self, obj):
        """Precio formateado"""
        return obj.formatted_price

    price_display.short_description = "Precio"

    def contracts_count(self, obj):
        """Número de contratos activos"""
        count = obj.active_contracts_count
        max_contracts = obj.max_contracts or "∞"
        return f"{count} / {max_contracts}"

    contracts_count.short_description = "Contratos"

    def is_active_badge(self, obj):
        """Badge visual para is_active"""
        if obj.is_active:
            return mark_safe(
                '<span style="background-color: #10b981; color: white; '
                'padding: 3px 10px; border-radius: 3px;">Activo</span>'
            )
        return mark_safe(
            '<span style="background-color: #6b7280; color: white; '
            'padding: 3px 10px; border-radius: 3px;">Inactivo</span>'
        )

    is_active_badge.short_description = "Estado"


@admin.register(MarketplaceContract, site=nerbis_admin_site)
class MarketplaceContractAdmin(ServicesModuleAdmin):
    """Admin para contratos de servicios"""

    list_display = [
        "id",
        "service_plan",
        "customer",
        "tenant",
        "status_badge",
        "start_date",
        "end_date",
        "days_remaining_display",
        "created_at",
    ]

    list_filter = [
        "status",
        "start_date",
        "created_at",
    ]

    search_fields = [
        "service_plan__name",
        "customer__email",
        "customer__first_name",
        "customer__last_name",
        "notes",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
        "is_active",
        "is_expired",
        "days_remaining",
    ]

    autocomplete_fields = ["customer"]

    fieldsets = (
        (
            "Información del Contrato",
            {
                "fields": (
                    "tenant",
                    "service_plan",
                    "customer",
                    "order",
                )
            },
        ),
        (
            "Estado y Vigencia",
            {
                "fields": (
                    "status",
                    "start_date",
                    "end_date",
                    "next_billing_date",
                )
            },
        ),
        (
            "Pago",
            {
                "fields": (
                    "price_paid",
                )
            },
        ),
        (
            "Notas",
            {
                "fields": (
                    "notes",
                )
            },
        ),
        (
            "Información",
            {
                "fields": (
                    "is_active",
                    "is_expired",
                    "days_remaining",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def status_badge(self, obj):
        """Badge visual para el estado"""
        colors = {
            'pending': '#f59e0b',   # amarillo
            'active': '#10b981',    # verde
            'suspended': '#6b7280', # gris
            'cancelled': '#ef4444', # rojo
            'expired': '#dc2626',   # rojo oscuro
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )

    status_badge.short_description = "Estado"

    def days_remaining_display(self, obj):
        """Días restantes de vigencia"""
        days = obj.days_remaining

        if days is None:
            return mark_safe('<span style="color: #6b7280;">Vitalicio</span>')

        if obj.is_expired:
            return mark_safe(
                '<span style="color: #ef4444; font-weight: bold;">Expirado</span>'
            )

        if days == 0:
            return mark_safe(
                '<span style="color: #f59e0b; font-weight: bold;">Expira hoy</span>'
            )

        if days <= 30:
            return mark_safe(
                f'<span style="color: #f59e0b; font-weight: bold;">{days} días</span>'
            )

        return f"{days} días"

    days_remaining_display.short_description = "Vigencia"
