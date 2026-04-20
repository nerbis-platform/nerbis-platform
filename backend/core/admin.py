# backend/core/admin.py

from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX
from django.db import models
from django.db.models import Q
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from unfold.decorators import display
from unfold.forms import AdminPasswordChangeForm, UserChangeForm
from unfold.forms import UserCreationForm as UnfoldUserCreationForm
from unfold.widgets import UnfoldAdminTextareaWidget

from .models import (
    Banner,
    SocialAccount,
    Tenant,
    TenantConfig,
    TenantWebsite,
    User,
    WebAuthnCredential,
)


class CustomUserCreationForm(UnfoldUserCreationForm):
    """
    Formulario personalizado para crear usuarios.
    No requiere username - se genera automáticamente desde el nombre completo.
    """

    class Meta(UnfoldUserCreationForm.Meta):
        model = User
        fields = ("email",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Hacer que username no sea requerido
        if "username" in self.fields:
            self.fields["username"].required = False

    def save(self, commit=True):
        user = super().save(commit=False)
        # Limpiar username para que el modelo lo genere desde el nombre
        user.username = ""
        if commit:
            user.save()
        return user


from unfold.widgets import UnfoldAdminSelectWidget

from .admin_site import nerbis_admin_site
from .geography import get_city_choices, get_state_choices
from .widgets import GeographyCascadeWidget, ImagePreviewWidget


class TenantAdminForm(forms.ModelForm):
    """
    Formulario personalizado para Tenant con dropdowns en cascada.
    País → Estado/Departamento → Ciudad

    El widget GeographyCascadeWidget inyecta JavaScript que:
    1. Escucha cambios en el campo country
    2. Actualiza dinámicamente los choices de state
    3. Actualiza dinámicamente los choices de city
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
            # Textarea compacto para dirección (con estilos Unfold)
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


def is_superadmin(user):
    """Solo superusuarios tienen acceso al Django admin."""
    return user.is_authenticated and user.is_active and user.is_superuser


class TenantFilteredAdmin(UnfoldModelAdmin):
    """
    Clase base para admins con visibilidad global — solo superadmins.

    Los superusuarios ven todos los datos de todos los tenants.
    Los tenant admins ya no acceden al Django admin (usan /dashboard/ en frontend).
    """

    search_help_text = "Buscar..."

    def has_module_permission(self, request):
        return is_superadmin(request.user)

    def has_view_permission(self, request, obj=None):
        return is_superadmin(request.user)

    def has_add_permission(self, request):
        return is_superadmin(request.user)

    def has_change_permission(self, request, obj=None):
        return is_superadmin(request.user)

    def has_delete_permission(self, request, obj=None):
        return is_superadmin(request.user)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Ocultar botón de view en ForeignKey para mejor UX."""
        formfield = super().formfield_for_foreignkey(db_field, request, **kwargs)
        if formfield and hasattr(formfield, "widget"):
            formfield.widget.can_view_related = False
        return formfield


class ShopModuleAdmin(TenantFilteredAdmin):
    """Admin base para modelos del módulo SHOP."""

    pass


class BookingsModuleAdmin(TenantFilteredAdmin):
    """Admin base para modelos del módulo BOOKINGS."""

    pass


class MarketingModuleAdmin(TenantFilteredAdmin):
    """Admin base para modelos del módulo MARKETING."""

    pass


class ServicesModuleAdmin(TenantFilteredAdmin):
    """Admin base para modelos del módulo SERVICES."""

    pass


# Registrar en el admin site personalizado de NERBIS
@admin.register(Tenant, site=nerbis_admin_site)
class TenantAdmin(UnfoldModelAdmin):
    """
    Panel de administración para Tenants.
    Solo superusuarios pueden ver/editar tenants.
    """

    form = TenantAdminForm

    # Textarea más compacto para dirección
    formfield_overrides = {
        models.TextField: {"widget": forms.Textarea(attrs={"rows": 2})},
    }

    def has_module_permission(self, request):
        """Solo superusuarios pueden ver el módulo de Tenants"""
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
        - schema_name: siempre de solo lectura (se genera automáticamente del slug)
        - slug: de solo lectura al editar un tenant existente
        """
        readonly = list(self.readonly_fields) + ["schema_name"]
        if obj:  # Editando existente
            readonly.append("slug")
        return readonly

    @display(description="Ver suscripción")
    def subscription_link(self, obj):
        if hasattr(obj, "subscription") and obj.subscription:
            from django.urls import reverse

            url = reverse("admin:billing_subscription_change", args=[obj.subscription.pk])
            return format_html('<a href="{}" style="color: #3b82f6;">Gestionar suscripción y módulos →</a>', url)
        return format_html('<span style="color: #6b7280;">Sin suscripción (se creará automáticamente)</span>')

    def get_prepopulated_fields(self, request, obj=None):
        """Solo prepopular slug al crear un nuevo tenant"""
        if obj:  # Editando existente
            return {}
        return {"slug": ("name",)}

    def get_fieldsets(self, request, obj=None):
        """
        - Al crear: formulario simplificado (sin módulos)
        - Al editar: mostrar todo incluyendo módulos contratados
        """
        if obj:  # Editando existente
            basic_fields = ("id", "name", "slug", "schema_name")
            # Incluir todos los fieldsets
            return (
                (
                    "Información Básica",
                    {"fields": basic_fields},
                ),
                *self.fieldsets[1:],  # Resto de fieldsets (incluye Módulos)
            )
        else:  # Creando nuevo
            basic_fields = ("name", "slug")
            # Excluir fieldsets de Módulos y Metadata al crear
            return (
                (
                    "Información Básica",
                    {"fields": basic_fields},
                ),
                self.fieldsets[1],  # Configuración Regional
                self.fieldsets[2],  # Contacto
                # NO incluir Módulos Contratados ni Metadata
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
        """Número de usuarios en este tenant"""
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
        """Badge visual para el estado de suscripción"""
        days = obj.days_remaining

        # Ya expiró (verificar primero)
        if obj.is_expired:
            return mark_safe(
                '<span style="background-color: #ef4444; color: white; '
                'padding: 3px 10px; border-radius: 3px; font-size: 12px;">Expirado</span>'
            )

        # Expira hoy (último día válido, aún no expirado)
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

        # Suscripción activa
        return mark_safe(
            '<span style="background-color: #10b981; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-size: 12px;">Activo</span>'
        )

    subscription_badge.short_description = "Suscripción"

    def days_remaining_display(self, obj):
        """Muestra los días restantes de suscripción/trial"""
        days = obj.days_remaining

        # Sin fecha de fin = indefinido
        if days is None:
            return mark_safe('<span style="color: #6b7280;">∞</span>')

        # Ya expiró
        if obj.is_expired:
            return mark_safe('<span style="color: #ef4444; font-weight: bold;">Expirado</span>')

        # Último día (expira hoy)
        if days == 0:
            return mark_safe('<span style="color: #f59e0b; font-weight: bold;">Expira hoy</span>')

        # Próximo a expirar (7 días o menos)
        if days <= 7:
            return mark_safe(f'<span style="color: #f59e0b; font-weight: bold;">{days} días</span>')

        return f"{days} días"

    days_remaining_display.short_description = "Días restantes"

    def subscription_info(self, obj):
        """Panel informativo del estado de suscripción"""
        status = obj.subscription_status
        days = obj.days_remaining

        # Colores según estado
        if status == "active":
            bg_color = "#d1fae5"
            border_color = "#10b981"
            icon = "✓"
            title = "Suscripción Activa"
        elif status == "trial":
            bg_color = "#dbeafe"
            border_color = "#3b82f6"
            icon = "⏱"
            title = "Periodo de Prueba"
        elif status == "expired":
            bg_color = "#fee2e2"
            border_color = "#ef4444"
            icon = "⚠"
            title = "Suscripción Expirada"
        else:
            bg_color = "#f3f4f6"
            border_color = "#6b7280"
            icon = "✕"
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
    Configuración de tenants — solo superadmins.
    Permite ver y editar la configuración de cualquier tenant.
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


class AuthMethodFilter(admin.SimpleListFilter):
    """Filtrar usuarios por método de autenticación."""

    title = "Método de acceso"
    parameter_name = "auth_method"

    def lookups(self, request, model_admin):
        return [
            ("email_only", "Solo email"),
            ("social_only", "Solo social"),
            ("both", "Email + Social"),
        ]

    def queryset(self, request, queryset):
        has_social = queryset.filter(social_accounts__isnull=False).distinct()
        no_social = queryset.exclude(pk__in=has_social)

        if self.value() == "email_only":
            return no_social.exclude(password__startswith=UNUSABLE_PASSWORD_PREFIX).exclude(password="")
        if self.value() == "social_only":
            # Usuarios sin password usable
            return has_social.filter(Q(password__startswith=UNUSABLE_PASSWORD_PREFIX) | Q(password=""))
        if self.value() == "both":
            # Usuarios con password usable Y social
            return has_social.exclude(password__startswith=UNUSABLE_PASSWORD_PREFIX).exclude(password="")
        return queryset


class SocialAccountInline(admin.TabularInline):
    """Cuentas sociales vinculadas al usuario."""

    model = SocialAccount
    extra = 0
    fields = ["provider", "email", "provider_uid", "created_at"]
    readonly_fields = ["provider", "email", "provider_uid", "created_at"]
    can_delete = True
    show_change_link = False

    verbose_name = "Cuenta social"
    verbose_name_plural = "Cuentas sociales vinculadas"


class WebAuthnCredentialInline(admin.TabularInline):
    """Passkeys (WebAuthn) registrados por el usuario."""

    model = WebAuthnCredential
    extra = 0
    fields = ["name", "transports", "sign_count", "created_at", "last_used_at"]
    readonly_fields = ["name", "transports", "sign_count", "created_at", "last_used_at"]
    can_delete = True
    show_change_link = True

    verbose_name = "Passkey"
    verbose_name_plural = "Passkeys (WebAuthn)"

    def has_add_permission(self, request, obj=None):
        # Los passkeys solo pueden crearse vía flujo WebAuthn del usuario.
        return False


@admin.register(User, site=nerbis_admin_site)
class UserAdmin(UnfoldModelAdmin, BaseUserAdmin):
    """
    Panel de administración para Users.
    - Superusuarios: Ven todos los usuarios
    - Admins de tenant: Solo ven usuarios de su tenant

    Usa formularios de Unfold para UI moderna.
    Nota: UnfoldModelAdmin debe ir primero en el MRO para que funcione correctamente.
    """

    # Formularios de Unfold
    form = UserChangeForm
    add_form = CustomUserCreationForm
    change_password_form = AdminPasswordChangeForm

    inlines = [SocialAccountInline, WebAuthnCredentialInline]

    def has_module_permission(self, request):
        """Permitir ver el módulo Users"""
        return is_superadmin(request.user)

    def has_view_permission(self, request, obj=None):
        return is_superadmin(request.user)

    list_display = [
        "username",
        "email",
        "full_name_display",
        "tenant",
        "role_badge",
        "auth_method_display",
        "is_active",
        "created_at",
    ]

    list_filter = ["role", "is_active", "is_staff", "tenant", AuthMethodFilter, "created_at"]

    def get_actions(self, request):
        return super().get_actions(request)

    search_fields = [
        "username",
        "email",
        "first_name",
        "last_name",
        "tenant__name",
    ]

    search_help_text = "Buscar por nombre, email o usuario"

    # Orden por defecto: más recientes primero
    ordering = ["-created_at"]

    # Permitir ordenar por estas columnas (click en header)
    sortable_by = ["username", "email", "first_name", "created_at", "is_active"]

    @admin.display(description="Nombre completo", ordering="first_name")
    def full_name_display(self, obj):
        """Nombre completo ordenable por first_name"""
        return obj.get_full_name() or "-"

    # Campos para el formulario de EDICIÓN (superusuarios)
    fieldsets = (
        ("Información del Tenant", {"fields": ("tenant",)}),
        ("Credenciales", {"fields": ("username", "password")}),
        (
            "Información Personal",
            {"fields": ("first_name", "last_name", "email", "phone", "avatar")},
        ),
        (
            "Permisos",
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Fechas Importantes",
            {
                "fields": ("last_login", "date_joined", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    # Campos para el formulario de CREACIÓN (superusuarios)
    add_fieldsets = (
        ("Información del Tenant", {"fields": ("tenant",)}),
        (
            "Credenciales",
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2"),
            },
        ),
        (
            "Información Personal",
            {
                "fields": ("first_name", "last_name", "phone"),
            },
        ),
        (
            "Rol",
            {
                "fields": ("role",),
            },
        ),
    )

    readonly_fields = ["created_at", "updated_at", "last_login", "date_joined", "assigned_services_display"]

    def get_fieldsets(self, request, obj=None):
        """Superadmins ven todos los campos."""
        if not obj:
            return self.add_fieldsets
        return super().get_fieldsets(request, obj)

    def get_readonly_fields(self, request, obj=None):
        """Campos de solo lectura."""
        readonly = list(super().get_readonly_fields(request, obj))

        # No permitir que un superadmin se desactive o modifique sus propios permisos
        if obj and obj.pk == request.user.pk:
            for field in ("role", "is_active", "is_superuser", "is_staff"):
                if field not in readonly:
                    readonly.append(field)

        return readonly

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Ocultar botón de view en ForeignKey para mejor UX."""
        formfield = super().formfield_for_foreignkey(db_field, request, **kwargs)
        if formfield and hasattr(formfield, "widget"):
            formfield.widget.can_view_related = False
        return formfield

    def save_model(self, request, obj, form, change):
        """Guardar usuario con protecciones de seguridad."""
        if change:
            original_user = User.objects.get(pk=obj.pk)

            # Prevenir que un superadmin se quite sus propios privilegios
            if obj.pk == request.user.pk:
                obj.is_superuser = original_user.is_superuser
                obj.is_staff = original_user.is_staff
                obj.is_active = original_user.is_active
                obj.role = original_user.role

            # Prevenir que se quite el último admin del tenant
            if obj.tenant and original_user.role == "admin" and obj.role != "admin":
                admin_count = (
                    User.objects.filter(tenant=obj.tenant, role="admin", is_active=True).exclude(pk=obj.pk).count()
                )
                if admin_count == 0:
                    obj.role = "admin"

        super().save_model(request, obj, form, change)

    def has_change_permission(self, request, obj=None):
        return is_superadmin(request.user)

    def has_delete_permission(self, request, obj=None):
        # No permitir que un superadmin se elimine a sí mismo
        if obj and obj.pk == request.user.pk:
            return False
        return is_superadmin(request.user)

    def has_add_permission(self, request):
        return is_superadmin(request.user)

    def role_badge(self, obj):
        """Badge visual para el rol"""
        colors = {
            "admin": "#ef4444",  # Rojo
            "staff": "#3b82f6",  # Azul
            "customer": "#10b981",  # Verde
        }
        color = colors.get(obj.role, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_role_display(),
        )

    role_badge.short_description = "Rol"

    @admin.display(description="Acceso")
    def auth_method_display(self, obj):
        """Indicador visual del método de autenticación."""
        has_password = obj.has_usable_password()
        social_accounts = obj.social_accounts.all()
        providers = [sa.get_provider_display() for sa in social_accounts]

        parts = []
        if has_password:
            parts.append(
                '<span style="background-color: #6366f1; color: white; padding: 2px 8px; '
                'border-radius: 3px; font-size: 11px;">Email</span>'
            )
        for provider in providers:
            colors = {"Google": "#4285F4", "Apple": "#000000", "Facebook": "#1877F2"}
            color = colors.get(provider, "#6b7280")
            parts.append(
                f'<span style="background-color: {color}; color: white; padding: 2px 8px; '
                f'border-radius: 3px; font-size: 11px;">{provider}</span>'
            )

        if not parts:
            return format_html('<span style="color: #9ca3af;">—</span>')
        return format_html(" ".join(parts))

    def assigned_services_display(self, obj):
        """Mostrar servicios asignados al staff (solo lectura)"""
        if not hasattr(obj, "staff_profile"):
            return format_html(
                '<span style="color: #9ca3af; font-style: italic;">No tienes un perfil de empleado configurado. '
                "Contacta al administrador.</span>"
            )

        staff_profile = obj.staff_profile
        services = staff_profile.services.filter(is_active=True).order_by("category__name", "name")

        if not services.exists():
            return format_html(
                '<span style="color: #9ca3af; font-style: italic;">No tienes servicios asignados actualmente.</span>'
            )

        # Agrupar por categoría
        services_by_category = {}
        for service in services:
            cat_name = service.category.name if service.category else "Sin categoría"
            if cat_name not in services_by_category:
                services_by_category[cat_name] = []
            services_by_category[cat_name].append(service)

        # Generar HTML
        html_parts = ['<div style="margin-top: 8px;">']
        for category, cat_services in services_by_category.items():
            html_parts.append(
                f'<div style="margin-bottom: 12px;">'
                f'<strong style="color: #374151; font-size: 0.9em;">{category}</strong>'
                f'<ul style="margin: 4px 0 0 16px; padding: 0; list-style: disc;">'
            )
            for service in cat_services:
                html_parts.append(
                    f'<li style="margin: 2px 0; color: #4b5563;">'
                    f"{service.name} "
                    f'<span style="color: #9ca3af;">({service.formatted_duration} - €{service.price})</span>'
                    f"</li>"
                )
            html_parts.append("</ul></div>")
        html_parts.append("</div>")

        return format_html("".join(html_parts))

    assigned_services_display.short_description = "Servicios que puedo realizar"


@admin.register(SocialAccount, site=nerbis_admin_site)
class SocialAccountAdmin(UnfoldModelAdmin):
    """
    Panel de administración para Cuentas Sociales.
    Permite ver y gestionar las vinculaciones sociales de los usuarios.
    """

    list_display = [
        "avatar_thumbnail",
        "user",
        "provider_badge",
        "provider_name_display",
        "email",
        "tenant",
        "created_at",
    ]
    list_filter = ["provider", "tenant"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "email"]
    search_help_text = "Buscar por email del usuario o email del proveedor"
    readonly_fields = [
        "provider_uid",
        "provider_name_display",
        "provider_avatar_display",
        "extra_data",
        "created_at",
        "updated_at",
    ]
    ordering = ["-created_at"]
    actions = ["disconnect_social_accounts"]

    fieldsets = (
        (
            "Vinculación",
            {"fields": ("user", "tenant", "provider", "email", "provider_uid")},
        ),
        (
            "Datos del proveedor",
            {
                "fields": ("provider_name_display", "provider_avatar_display"),
                "description": "Nombre y avatar obtenidos del proveedor OAuth al momento de la vinculación.",
            },
        ),
        (
            "Datos adicionales (JSON)",
            {
                "fields": ("extra_data", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    @admin.display(description="Avatar")
    def avatar_thumbnail(self, obj):
        """Miniatura del avatar del proveedor en la lista."""
        picture = obj.extra_data.get("picture", "")
        if picture and picture.startswith(("https://", "http://")):
            return format_html(
                '<img src="{}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;" alt="avatar" />',
                picture,
            )
        return format_html(
            '<span style="display:inline-block; width:28px; height:28px; border-radius:50%; '
            'background:#e5e7eb; text-align:center; line-height:28px; font-size:14px; color:#6b7280;">—</span>'
        )

    @admin.display(description="Proveedor")
    def provider_badge(self, obj):
        """Badge visual con color del proveedor."""
        colors = {"google": "#4285F4", "apple": "#000000", "facebook": "#1877F2"}
        color = colors.get(obj.provider, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_provider_display(),
        )

    @admin.display(description="Nombre del proveedor")
    def provider_name_display(self, obj):
        """Nombre completo del usuario según el proveedor OAuth."""
        name = obj.extra_data.get("name", "")
        return name or "—"

    @admin.display(description="Avatar del proveedor")
    def provider_avatar_display(self, obj):
        """Avatar del usuario según el proveedor OAuth."""
        picture = obj.extra_data.get("picture", "")
        if picture and picture.startswith(("https://", "http://")):
            return format_html(
                '<img src="{}" style="width:64px; height:64px; border-radius:50%; object-fit:cover;" alt="avatar" />',
                picture,
            )
        return "Sin avatar"

    @admin.action(description="Desvincular cuentas sociales seleccionadas")
    def disconnect_social_accounts(self, request, queryset):
        """Elimina las vinculaciones seleccionadas verificando que el usuario no pierda acceso."""
        from django.contrib.admin.models import DELETION, LogEntry
        from django.contrib.contenttypes.models import ContentType

        disconnected = 0
        skipped = 0
        ct = ContentType.objects.get_for_model(SocialAccount)

        for social_account in queryset:
            user = social_account.user
            has_password = user.has_usable_password()
            other_social = (
                SocialAccount.objects.filter(user=user, tenant=user.tenant).exclude(pk=social_account.pk).count()
            )
            if not has_password and other_social == 0:
                skipped += 1
                continue

            # Registrar en audit log antes de eliminar
            LogEntry.objects.log_action(
                user_id=request.user.pk,
                content_type_id=ct.pk,
                object_id=str(social_account.pk),
                object_repr=f"{social_account.get_provider_display()} (id={social_account.pk})",
                action_flag=DELETION,
                change_message=f"Desvinculación de cuenta {social_account.get_provider_display()} del usuario id={user.pk}",
            )
            social_account.delete()
            disconnected += 1

        if disconnected:
            self.message_user(request, f"{disconnected} cuenta(s) desvinculada(s) correctamente.")
        if skipped:
            self.message_user(
                request,
                f"{skipped} cuenta(s) omitida(s) porque es el único método de acceso del usuario.",
                level="warning",
            )

    def has_add_permission(self, request):
        """Las cuentas sociales se crean por OAuth, no manualmente."""
        return False

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, "tenant") and request.user.tenant:
            return qs.filter(tenant=request.user.tenant)
        return qs.none()


@admin.register(Banner, site=nerbis_admin_site)
class BannerAdmin(TenantFilteredAdmin):
    """
    Panel de administración para Banners Promocionales.
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


# ═══════════════════════════════════════════════════════════
# WEBAUTHN CREDENTIALS (Passkeys)
# ═══════════════════════════════════════════════════════════


@admin.register(WebAuthnCredential, site=nerbis_admin_site)
class WebAuthnCredentialAdmin(UnfoldModelAdmin):
    """
    Panel de administración para Passkeys (WebAuthn).
    Permite ver y revocar credenciales registradas por los usuarios.
    Solo lectura de los campos criptográficos por seguridad.
    """

    list_display = [
        "name",
        "user",
        "tenant_display",
        "transports_display",
        "sign_count",
        "created_at",
        "last_used_display",
    ]
    list_filter = ["created_at", "last_used_at", "user__tenant"]
    search_fields = ["name", "user__email", "user__first_name", "user__last_name"]
    search_help_text = "Buscar por nombre del passkey o email del usuario"
    readonly_fields = [
        "user",
        "credential_id_display",
        "public_key_display",
        "sign_count",
        "transports",
        "created_at",
        "last_used_at",
    ]
    ordering = ["-created_at"]
    actions = ["revoke_passkeys"]

    fieldsets = (
        (
            "Identificación",
            {"fields": ("user", "name", "transports")},
        ),
        (
            "Datos criptográficos (solo lectura)",
            {
                "fields": ("credential_id_display", "public_key_display", "sign_count"),
                "description": (
                    "Estos valores son generados por el authenticator del usuario y no "
                    "deben modificarse. Si están comprometidos, revoca el passkey."
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Auditoría",
            {"fields": ("created_at", "last_used_at"), "classes": ("collapse",)},
        ),
    )

    @admin.display(description="Tenant", ordering="user__tenant")
    def tenant_display(self, obj):
        return obj.user.tenant.name if obj.user.tenant_id else "—"

    @admin.display(description="Transports")
    def transports_display(self, obj):
        if not obj.transports:
            return "—"
        return ", ".join(obj.transports)

    @admin.display(description="Último uso", ordering="last_used_at")
    def last_used_display(self, obj):
        if not obj.last_used_at:
            return format_html('<span style="color:#9ca3af;">Nunca</span>')
        return obj.last_used_at.strftime("%Y-%m-%d %H:%M")

    @admin.display(description="Credential ID")
    def credential_id_display(self, obj):
        # Mostrar solo primeros/últimos bytes en hex para identificación
        raw = bytes(obj.credential_id)
        hex_str = raw.hex()
        if len(hex_str) > 32:
            hex_str = f"{hex_str[:16]}…{hex_str[-16:]}"
        return format_html('<code style="font-size:11px;">{}</code>', hex_str)

    @admin.display(description="Public key")
    def public_key_display(self, obj):
        size = len(bytes(obj.public_key))
        return format_html('<span style="color:#6b7280;">{} bytes (binario COSE)</span>', size)

    @admin.action(description="Revocar passkeys seleccionados")
    def revoke_passkeys(self, request, queryset):
        count = queryset.count()
        queryset.delete()
        self.message_user(
            request,
            f"Se revocaron {count} passkey(s). Los usuarios deberán registrar uno nuevo.",
        )

    def has_add_permission(self, request):
        # Los passkeys solo pueden crearse vía flujo WebAuthn del usuario.
        return False

    def get_queryset(self, request):
        """Aislar passkeys por tenant para admins no-superusuarios."""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, "tenant") and request.user.tenant:
            return qs.filter(user__tenant=request.user.tenant)
        return qs.none()
