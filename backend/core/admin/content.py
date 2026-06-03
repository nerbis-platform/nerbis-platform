# backend/core/admin/content.py
"""
Admin para Banner y PlatformModule.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from unfold.decorators import display

from ..admin_site import nerbis_admin_site
from ..models import Banner, PlatformModule
from .base import TenantFilteredAdmin


@admin.register(Banner, site=nerbis_admin_site)
class BannerAdmin(TenantFilteredAdmin):
    """
    Panel de administracion para Banners Promocionales.
    - Superusuarios: Ven todos los banners
    - Admins de tenant: Solo ven banners de su tenant
    """

    list_display = [
        "name",
        "banner_type",
        "position",
        "status_badge",
        "priority",
        "start_date",
        "end_date",
        "tenant",
    ]

    list_filter = [
        "banner_type",
        "position",
        "is_active",
        "tenant",
        "created_at",
    ]

    search_fields = [
        "name",
        "message",
        "tenant__name",
    ]

    ordering = ["-priority", "-created_at"]

    readonly_fields = [
        "created_at",
        "updated_at",
        "preview_banner",
    ]

    fieldsets = (
        (
            "Información Básica",
            {
                "fields": (
                    "tenant",
                    "name",
                    "banner_type",
                    "position",
                    "priority",
                )
            },
        ),
        (
            "Contenido",
            {
                "fields": (
                    "message",
                    "link_url",
                    "link_text",
                )
            },
        ),
        (
            "Apariencia",
            {
                "fields": (
                    "background_color",
                    "text_color",
                    "preview_banner",
                )
            },
        ),
        (
            "Programación",
            {
                "fields": (
                    "is_active",
                    "is_dismissible",
                    "start_date",
                    "end_date",
                    "rotation_interval",
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

    def status_badge(self, obj):
        """Badge visual para el estado actual del banner"""
        if obj.is_currently_active:
            return mark_safe(
                '<span style="background-color: #10b981; color: white; padding: 3px 10px; border-radius: 3px;">Activo</span>'
            )
        elif not obj.is_active:
            return mark_safe(
                '<span style="background-color: #6b7280; color: white; padding: 3px 10px; border-radius: 3px;">Desactivado</span>'
            )
        else:
            return mark_safe(
                '<span style="background-color: #f59e0b; color: white; padding: 3px 10px; border-radius: 3px;">Programado</span>'
            )

    status_badge.short_description = "Estado"

    def preview_banner(self, obj):
        """Vista previa del banner"""
        if not obj.pk:
            return "Guarda el banner para ver la vista previa"

        return format_html(
            '<div style="background-color: {}; color: {}; padding: 12px 20px; border-radius: 4px; display: inline-block; max-width: 500px;">'
            "<span>{}</span>"
            "{}"
            "</div>",
            obj.background_color,
            obj.text_color,
            obj.message[:100] + "..." if len(obj.message) > 100 else obj.message,
            format_html(
                ' <a href="{}" style="color: {}; text-decoration: underline; margin-left: 10px;">{}</a>',
                obj.link_url or "#",
                obj.text_color,
                obj.link_text or "Ver más",
            )
            if obj.link_url
            else "",
        )

    preview_banner.short_description = "Vista Previa"


# ---------------------------------------------------------------
# MODULOS DE PLATAFORMA
# ---------------------------------------------------------------


@admin.register(PlatformModule, site=nerbis_admin_site)
class PlatformModuleAdmin(UnfoldModelAdmin):
    """Admin para gestionar modulos de la plataforma."""

    list_display = [
        "label",
        "key",
        "display_color",
        "is_active",
        "sort_order",
    ]
    list_filter = ["is_active"]
    list_editable = ["sort_order", "is_active"]
    search_fields = ["key", "label", "description"]
    ordering = ["sort_order", "label"]
    filter_horizontal = ["dependencies"]

    fieldsets = (
        (
            "Identificacion",
            {
                "fields": ("key", "label", "description"),
            },
        ),
        (
            "Apariencia",
            {
                "fields": ("icon", "accent_color"),
            },
        ),
        (
            "Configuracion",
            {
                "fields": ("is_active", "sort_order", "dependencies"),
            },
        ),
    )

    @display(description="Color")
    def display_color(self, obj):
        return format_html(
            '<span style="display:inline-block;width:16px;height:16px;'
            'border-radius:4px;background:{};vertical-align:middle;margin-right:6px;"></span>{}',
            obj.accent_color,
            obj.accent_color,
        )
