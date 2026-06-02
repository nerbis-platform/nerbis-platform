# backend/core/admin/user.py
"""
Admin para User — incluye formularios personalizados, filtros e inlines.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX
from django.db.models import Q
from django.utils.html import format_html
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from unfold.forms import AdminPasswordChangeForm, UserChangeForm
from unfold.forms import UserCreationForm as UnfoldUserCreationForm

from ..admin_site import nerbis_admin_site
from ..models import SocialAccount, User, WebAuthnCredential
from .base import is_superadmin


class CustomUserCreationForm(UnfoldUserCreationForm):
    """
    Formulario personalizado para crear usuarios.
    No requiere username - se genera automaticamente desde el nombre completo.
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


class AuthMethodFilter(admin.SimpleListFilter):
    """Filtrar usuarios por metodo de autenticacion."""

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
        # Los passkeys solo pueden crearse via flujo WebAuthn del usuario.
        return False


@admin.register(User, site=nerbis_admin_site)
class UserAdmin(UnfoldModelAdmin, BaseUserAdmin):
    """
    Panel de administracion para Users.
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

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("social_accounts")

    def has_module_permission(self, request):
        """Permitir ver el modulo Users"""
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

    # Orden por defecto: mas recientes primero
    ordering = ["-created_at"]

    # Permitir ordenar por estas columnas (click en header)
    sortable_by = ["username", "email", "first_name", "created_at", "is_active"]

    @admin.display(description="Nombre completo", ordering="first_name")
    def full_name_display(self, obj):
        """Nombre completo ordenable por first_name"""
        return obj.get_full_name() or "-"

    # Campos para el formulario de EDICION (superusuarios)
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

    # Campos para el formulario de CREACION (superusuarios)
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
        """Ocultar boton de view en ForeignKey para mejor UX."""
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

            # Prevenir que se quite el ultimo admin del tenant
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
        # No permitir que un superadmin se elimine a si mismo
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
        """Indicador visual del metodo de autenticacion."""
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

        # Agrupar por categoria
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
