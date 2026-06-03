# backend/core/admin/tenant.py
"""
Admin para Tenant, TenantConfig y TenantWebsite.
"""

from django import forms
from django.contrib import admin
from django.db import models
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from unfold.decorators import display
from unfold.widgets import UnfoldAdminSelectWidget, UnfoldAdminTextareaWidget

from ..admin_site import nerbis_admin_site
from ..geography import get_city_choices, get_state_choices
from ..models import Tenant, TenantConfig, TenantWebsite
from ..widgets import GeographyCascadeWidget, ImagePreviewWidget
from .base import is_superadmin


class TenantAdminForm(forms.ModelForm):
    """
    Formulario personalizado para Tenant con dropdowns en cascada.
    Pais -> Estado/Departamento -> Ciudad

    El widget GeographyCascadeWidget inyecta JavaScript que:
    1. Escucha cambios en el campo country
    2. Actualiza dinamicamente los choices de state
    3. Actualiza dinamicamente los choices de city
    """

    class Meta:
        model = Tenant
        fields = "__all__"
        widgets = {
            # Solo country usa el widget especial (inyecta el JS)
            "country": GeographyCascadeWidget(field_type="country"),
            # Widgets de imagen con preview
            "logo": ImagePreviewWidget(),
            "hero_image_home": ImagePreviewWidget(),
            "hero_image_services": ImagePreviewWidget(),
            # Textarea compacto para direccion (con estilos Unfold)
            "address": UnfoldAdminTextareaWidget(attrs={"rows": 1}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Obtener valores actuales del instance (si existe)
        country = "Colombia"  # Default
        state = ""
        if self.instance and self.instance.pk:
            country = self.instance.country or "Colombia"
            state = self.instance.state or ""

        # Obtener choices basados en los valores actuales
        state_choices = get_state_choices(country)
        city_choices = get_city_choices(country, state)

        # Usar UnfoldAdminSelectWidget para mantener el mismo estilo que timezone, currency, etc.
        self.fields["state"].widget = UnfoldAdminSelectWidget(attrs={"id": "id_state"}, choices=state_choices)

        self.fields["city"].widget = UnfoldAdminSelectWidget(attrs={"id": "id_city"}, choices=city_choices)


# Registrar en el admin site personalizado de NERBIS
@admin.register(Tenant, site=nerbis_admin_site)
class TenantAdmin(UnfoldModelAdmin):
    """
    Panel de administracion para Tenants.
    Solo superusuarios pueden ver/editar tenants.
    """

    form = TenantAdminForm

    # Textarea mas compacto para direccion
    formfield_overrides = {
        models.TextField: {"widget": forms.Textarea(attrs={"rows": 2})},
    }

    def has_module_permission(self, request):
        """Solo superusuarios pueden ver el modulo de Tenants"""
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    list_display = [
        "name",
        "slug",
        "country",
        "website_phase",
        "user_count",
        "created_at",
    ]

    list_filter = [
        "country",
        "created_at",
    ]

    search_fields = [
        "name",
        "slug",
        "email",
        "schema_name",
    ]

    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "get_url",
        "subscription_link",
    ]

    def get_readonly_fields(self, request, obj=None):
        """
        - schema_name: siempre de solo lectura (se genera automaticamente del slug)
        - slug: de solo lectura al editar un tenant existente
        """
        readonly = list(self.readonly_fields) + ["schema_name"]
        if obj:  # Editando existente
            readonly.append("slug")
        return readonly

    @display(description="Ver suscripcion")
    def subscription_link(self, obj):
        if hasattr(obj, "subscription") and obj.subscription:
            from django.urls import reverse

            url = reverse("admin:billing_subscription_change", args=[obj.subscription.pk])
            return format_html('<a href="{}" style="color: #3b82f6;">Gestionar suscripcion y modulos -></a>', url)
        return format_html('<span style="color: #6b7280;">Sin suscripcion (se creara automaticamente)</span>')

    def get_prepopulated_fields(self, request, obj=None):
        """Solo prepopular slug al crear un nuevo tenant"""
        if obj:  # Editando existente
            return {}
        return {"slug": ("name",)}

    def get_fieldsets(self, request, obj=None):
        """
        - Al crear: formulario simplificado (sin modulos)
        - Al editar: mostrar todo incluyendo modulos contratados
        """
        if obj:  # Editando existente
            basic_fields = ("id", "name", "slug", "schema_name")
            # Incluir todos los fieldsets
            return (
                (
                    "Informacion Basica",
                    {"fields": basic_fields},
                ),
                *self.fieldsets[1:],  # Resto de fieldsets (incluye Modulos)
            )
        else:  # Creando nuevo
            basic_fields = ("name", "slug")
            # Excluir fieldsets de Modulos y Metadata al crear
            return (
                (
                    "Informacion Basica",
                    {"fields": basic_fields},
                ),
                self.fieldsets[1],  # Configuracion Regional
                self.fieldsets[2],  # Contacto
                # NO incluir Modulos Contratados ni Metadata
            )

    fieldsets = (
        (
            "Información Básica",
            {
                "fields": (
                    "id",
                    "name",
                    "slug",
                    "schema_name",
                )
            },
        ),
        (
            "Configuración Regional",
            {
                "fields": (
                    "country",
                    "timezone",
                    "currency",
                    "language",
                ),
                "description": "Configura primero el país para establecer la zona horaria correcta.",
            },
        ),
        (
            "Contacto",
            {
                "fields": (
                    "email",
                    "phone",
                    "address",
                    "state",
                    "city",
                    "postal_code",
                )
            },
        ),
        (
            "Suscripción",
            {
                "fields": ("subscription_link",),
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                    "get_url",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def is_active_badge(self, obj):
        """Badge visual para is_active"""
        if obj.is_active:
            return mark_safe(
                '<span style="background-color: #10b981; color: white; padding: 3px 10px; border-radius: 3px;">Activo</span>'
            )
        return mark_safe(
            '<span style="background-color: #ef4444; color: white; padding: 3px 10px; border-radius: 3px;">Inactivo</span>'
        )

    is_active_badge.short_description = "Estado"

    def user_count(self, obj):
        """Numero de usuarios en este tenant"""
        count = obj.users.count()
        return f"{count} usuarios"

    user_count.short_description = "Usuarios"

    def get_url(self, obj):
        """URL del tenant"""
        url = obj.get_absolute_url()
        return format_html('<a href="{}" target="_blank">{}</a>', url, url)

    get_url.short_description = "URL del tenant"

    @display(description="Fase Web")
    def website_phase(self, obj):
        """Badge visual para el estado del website builder"""
        if not obj.has_website:
            return mark_safe('<span style="color: #9ca3af; font-size: 12px;">—</span>')
        status = getattr(obj, "website_config", None)
        status = status.status if status else "not_started"
        labels = {
            "not_started": ("Sin iniciar", "#9ca3af"),
            "draft": ("Plantilla", "#f59e0b"),
            "onboarding": ("Onboarding", "#3b82f6"),
            "generating": ("Generando", "#8b5cf6"),
            "review": ("En revisión", "#10b981"),
            "published": ("Publicado", "#059669"),
        }
        label, color = labels.get(status, (status, "#6b7280"))
        return mark_safe(
            f'<span style="background-color: {color}; color: white; '
            f'padding: 3px 10px; border-radius: 3px; font-size: 12px;">{label}</span>'
        )

    def subscription_badge(self, obj):
        """Badge visual para el estado de suscripcion"""
        days = obj.days_remaining

        # Ya expiro (verificar primero)
        if obj.is_expired:
            return mark_safe(
                '<span style="background-color: #ef4444; color: white; '
                'padding: 3px 10px; border-radius: 3px; font-size: 12px;">Expirado</span>'
            )

        # Expira hoy (ultimo dia valido, aun no expirado)
        if days == 0:
            return mark_safe(
                '<span style="background-color: #f59e0b; color: white; '
                'padding: 3px 10px; border-radius: 3px; font-size: 12px;">Expira hoy</span>'
            )

        # Desactivado manualmente
        if not obj.is_active:
            return mark_safe(
                '<span style="background-color: #6b7280; color: white; '
                'padding: 3px 10px; border-radius: 3px; font-size: 12px;">Desactivado</span>'
            )

        # Trial activo
        if obj.is_trial:
            return mark_safe(
                '<span style="background-color: #3b82f6; color: white; '
                'padding: 3px 10px; border-radius: 3px; font-size: 12px;">Prueba</span>'
            )

        # Suscripcion activa
        return mark_safe(
            '<span style="background-color: #10b981; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-size: 12px;">Activo</span>'
        )

    subscription_badge.short_description = "Suscripción"

    def days_remaining_display(self, obj):
        """Muestra los dias restantes de suscripcion/trial"""
        days = obj.days_remaining

        # Sin fecha de fin = indefinido
        if days is None:
            return mark_safe('<span style="color: #6b7280;">&#8734;</span>')

        # Ya expiro
        if obj.is_expired:
            return mark_safe('<span style="color: #ef4444; font-weight: bold;">Expirado</span>')

        # Ultimo dia (expira hoy)
        if days == 0:
            return mark_safe('<span style="color: #f59e0b; font-weight: bold;">Expira hoy</span>')

        # Proximo a expirar (7 dias o menos)
        if days <= 7:
            return mark_safe(f'<span style="color: #f59e0b; font-weight: bold;">{days} días</span>')

        return f"{days} días"

    days_remaining_display.short_description = "Días restantes"

    def subscription_info(self, obj):
        """Panel informativo del estado de suscripcion"""
        status = obj.subscription_status
        days = obj.days_remaining

        # Colores segun estado
        if status == "active":
            bg_color = "#d1fae5"
            border_color = "#10b981"
            icon = "&#10003;"
            title = "Suscripción Activa"
        elif status == "trial":
            bg_color = "#dbeafe"
            border_color = "#3b82f6"
            icon = "&#9201;"
            title = "Periodo de Prueba"
        elif status == "expired":
            bg_color = "#fee2e2"
            border_color = "#ef4444"
            icon = "&#9888;"
            title = "Suscripción Expirada"
        else:
            bg_color = "#f3f4f6"
            border_color = "#6b7280"
            icon = "&#10005;"
            title = "Tenant Desactivado"

        # Info adicional
        info_lines = [f"<strong>Plan:</strong> {obj.get_plan_display()}"]

        if obj.subscription_ends_at:
            label = "Trial termina" if obj.is_trial else "Suscripción termina"
            info_lines.append(f"<strong>{label}:</strong> {obj.subscription_ends_at}")

        if days is not None:
            if days == 0:
                info_lines.append("<strong style='color: #ef4444;'>¡Expira hoy!</strong>")
            elif days <= 7:
                info_lines.append(f"<strong style='color: #f59e0b;'>{days} días restantes</strong>")
            else:
                info_lines.append(f"<strong>{days} días restantes</strong>")

        info_html = "<br>".join(info_lines)

        return mark_safe(
            f'<div style="background: {bg_color}; border-left: 4px solid {border_color}; '
            f'padding: 15px; border-radius: 4px; max-width: 400px;">'
            f'<div style="font-size: 16px; margin-bottom: 8px;">'
            f'<span style="margin-right: 8px;">{icon}</span>'
            f"<strong>{title}</strong></div>"
            f'<div style="font-size: 14px; color: #374151;">{info_html}</div>'
            f"</div>"
        )

    subscription_info.short_description = "Estado de Suscripción"


@admin.register(TenantConfig, site=nerbis_admin_site)
class TenantConfigAdmin(UnfoldModelAdmin):
    """
    Configuracion de tenants — solo superadmins.
    Permite ver y editar la configuracion de cualquier tenant.
    """

    form = TenantAdminForm

    def has_module_permission(self, request):
        return is_superadmin(request.user)

    def has_view_permission(self, request, obj=None):
        return is_superadmin(request.user)

    def has_change_permission(self, request, obj=None):
        return is_superadmin(request.user)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    list_display = [
        "name",
        "email",
        "phone",
        "city",
    ]

    readonly_fields = ["slug", "schema_name"]

    fieldsets = (
        (
            "Perfil",
            {
                "fields": (
                    "name",
                    "logo",
                ),
            },
        ),
        (
            "Contacto",
            {
                "fields": (
                    "email",
                    "phone",
                ),
            },
        ),
        (
            "Ubicación",
            {
                "fields": (
                    "country",
                    "address",
                    "city",
                    "state",
                    "postal_code",
                ),
            },
        ),
        (
            "Regional",
            {
                "fields": (
                    "timezone",
                    "currency",
                    "language",
                ),
            },
        ),
        (
            "Avanzado",
            {
                "fields": (
                    "slug",
                    "schema_name",
                ),
                "classes": ("collapse",),
            },
        ),
    )


class TenantWebsiteForm(forms.ModelForm):
    """Formulario para Mi Sitio Web con widgets personalizados."""

    class Meta:
        model = TenantWebsite
        fields = "__all__"
        widgets = {
            "logo": ImagePreviewWidget(),
            "hero_image_home": ImagePreviewWidget(),
            "hero_image_services": ImagePreviewWidget(),
        }


@admin.register(TenantWebsite, site=nerbis_admin_site)
class TenantWebsiteAdmin(UnfoldModelAdmin):
    """
    Panel "Mi Sitio Web" para que el admin del tenant configure
    la apariencia y contenido de su sitio web.
    """

    form = TenantWebsiteForm

    def has_module_permission(self, request):
        return is_superadmin(request.user)

    def has_view_permission(self, request, obj=None):
        return is_superadmin(request.user)

    def has_change_permission(self, request, obj=None):
        return is_superadmin(request.user)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    list_display = ["name", "primary_color", "secondary_color"]

    fieldsets = (
        (
            "Identidad Visual",
            {
                "fields": (
                    "logo",
                    "primary_color",
                    "secondary_color",
                ),
                "description": "Logo y colores de tu marca.",
            },
        ),
        (
            "Imágenes de Portada",
            {
                "fields": (
                    "hero_image_home",
                    "hero_image_services",
                ),
                "description": "Imágenes de fondo para las secciones principales de tu sitio.",
            },
        ),
        (
            "Métricas del Negocio",
            {
                "fields": (
                    "years_experience",
                    "clients_count",
                    "treatments_count",
                    "average_rating",
                ),
                "description": "Estadísticas que se muestran en la sección '¿Por qué elegirnos?'.",
            },
        ),
    )
