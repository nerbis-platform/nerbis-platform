# backend/core/admin.py

from django import forms
from django.contrib import admin
from django.db import models
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from unfold.contrib.filters.admin import RangeDateFilter
from unfold.decorators import display
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm as UnfoldUserCreationForm
from unfold.widgets import UnfoldAdminTextareaWidget
from .models import Tenant, TenantConfig, TenantWebsite, User, Banner


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
from .admin_site import gravitify_admin_site
from .widgets import GeographyCascadeWidget, ImagePreviewWidget
from .geography import get_state_choices, get_city_choices
from unfold.widgets import UnfoldAdminSelectWidget


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
        city = ""
        if self.instance and self.instance.pk:
            country = self.instance.country or "Colombia"
            state = self.instance.state or ""
            city = self.instance.city or ""

        # Obtener choices basados en los valores actuales
        state_choices = get_state_choices(country)
        city_choices = get_city_choices(country, state)

        # Usar UnfoldAdminSelectWidget para mantener el mismo estilo que timezone, currency, etc.
        self.fields["state"].widget = UnfoldAdminSelectWidget(
            attrs={"id": "id_state"},
            choices=state_choices
        )

        self.fields["city"].widget = UnfoldAdminSelectWidget(
            attrs={"id": "id_city"},
            choices=city_choices
        )



def is_tenant_admin(user):
    """
    Verificar si el usuario tiene acceso de admin al panel.
    Returns True si es superuser, is_staff, o tiene role='admin'.
    """
    if not user.is_authenticated or not user.is_active:
        return False
    if user.is_superuser:
        return True
    if user.is_staff:
        return True
    if hasattr(user, 'role') and user.role == 'admin':
        return True
    return False


def tenant_has_module(user, module_name):
    """
    Verificar si el tenant del usuario tiene un módulo habilitado.

    Args:
        user: Usuario autenticado
        module_name: 'shop', 'bookings', 'services', o 'marketing'

    Returns:
        True si:
        - El usuario es superusuario (ve todo)
        - El tenant del usuario tiene el módulo habilitado
    """
    if not user.is_authenticated:
        return False

    # Superusuarios ven todo
    if user.is_superuser:
        return True

    # Verificar feature flag del tenant
    tenant = getattr(user, 'tenant', None)
    if not tenant:
        return False

    flag_map = {
        'shop': 'has_shop',
        'bookings': 'has_bookings',
        'services': 'has_services',
        'marketing': 'has_marketing',
    }

    flag_name = flag_map.get(module_name)
    if not flag_name:
        return True  # Módulo desconocido, permitir por defecto

    return getattr(tenant, flag_name, False)


class TenantFilteredAdmin(UnfoldModelAdmin):
    """
    Clase base para admins que filtran por tenant.

    - Superusuarios (is_superuser=True): Ven todo
    - Admins de tenant (is_staff=True o role=admin): Solo ven su tenant

    Esta clase sobrescribe todos los métodos de permisos para permitir
    acceso a usuarios con role='admin' aunque no tengan permisos Django asignados.

    Extiende UnfoldModelAdmin para obtener la UI moderna de Unfold.
    """

    # Placeholder de búsqueda en español para todos los admins
    search_help_text = "Buscar..."

    def has_module_permission(self, request):
        """Permitir ver el módulo en el index del admin"""
        return is_tenant_admin(request.user)

    def has_view_permission(self, request, obj=None):
        """Permitir ver objetos"""
        if not is_tenant_admin(request.user):
            return False
        if request.user.is_superuser:
            return True
        # Admins de tenant solo pueden ver objetos de su tenant
        if obj and hasattr(obj, 'tenant'):
            return obj.tenant == getattr(request.user, 'tenant', None)
        return True

    def has_add_permission(self, request):
        """Permitir agregar objetos"""
        return is_tenant_admin(request.user)

    def has_change_permission(self, request, obj=None):
        """Verificar permiso de edición"""
        if not is_tenant_admin(request.user):
            return False
        if request.user.is_superuser:
            return True
        if obj and hasattr(obj, 'tenant'):
            return obj.tenant == getattr(request.user, 'tenant', None)
        return True

    def has_delete_permission(self, request, obj=None):
        """Verificar permiso de eliminación"""
        if not is_tenant_admin(request.user):
            return False
        if request.user.is_superuser:
            return True
        if obj and hasattr(obj, 'tenant'):
            return obj.tenant == getattr(request.user, 'tenant', None)
        return True

    def get_queryset(self, request):
        """Filtrar queryset por tenant del usuario"""
        qs = super().get_queryset(request)

        # Superusuarios ven todo
        if request.user.is_superuser:
            return qs

        # Admins de tenant solo ven su tenant
        if hasattr(request.user, 'tenant') and request.user.tenant:
            return qs.filter(tenant=request.user.tenant)

        return qs.none()

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Limitar opciones de FK de tenant y ocultar botón de view"""
        if db_field.name == "tenant":
            if not request.user.is_superuser:
                # Solo mostrar el tenant del usuario
                if hasattr(request.user, 'tenant') and request.user.tenant:
                    kwargs["queryset"] = Tenant.objects.filter(id=request.user.tenant.id)

        formfield = super().formfield_for_foreignkey(db_field, request, **kwargs)

        # Ocultar el botón de "view related" (ojo) en todos los ForeignKey
        # Solo dejar el lápiz (change) y el + (add) para mejor UX
        if formfield and hasattr(formfield, 'widget'):
            formfield.widget.can_view_related = False

        return formfield

    def save_model(self, request, obj, form, change):
        """Asignar tenant automáticamente si no es superuser"""
        if not request.user.is_superuser:
            # Siempre forzar el tenant del usuario (crear y editar)
            # Esto previene que un usuario malicioso intente cambiar el tenant
            if hasattr(request.user, 'tenant') and request.user.tenant:
                obj.tenant = request.user.tenant
        super().save_model(request, obj, form, change)

    def get_exclude(self, request, obj=None):
        """Ocultar campo tenant para usuarios no-superusuarios"""
        exclude = list(super().get_exclude(request, obj) or [])
        if not request.user.is_superuser:
            # Ocultar el campo tenant - se asigna automáticamente
            if 'tenant' not in exclude:
                exclude.append('tenant')
        return exclude

    def get_list_display(self, request):
        """Ocultar columna tenant en la lista para usuarios no-superusuarios"""
        list_display = list(super().get_list_display(request))
        if not request.user.is_superuser:
            # Remover tenant de la lista si está presente
            if 'tenant' in list_display:
                list_display.remove('tenant')
        return list_display

    def get_list_filter(self, request):
        """Ocultar filtro de tenant para usuarios no-superusuarios"""
        list_filter = list(super().get_list_filter(request))
        if not request.user.is_superuser:
            # Remover tenant del filtro si está presente
            if 'tenant' in list_filter:
                list_filter.remove('tenant')
        return list_filter

    def get_fieldsets(self, request, obj=None):
        """Ocultar campo tenant de fieldsets para usuarios no-superusuarios"""
        fieldsets = super().get_fieldsets(request, obj)
        if not request.user.is_superuser and fieldsets:
            # Crear una copia modificada de fieldsets sin el campo tenant
            new_fieldsets = []
            for name, options in fieldsets:
                fields = list(options.get('fields', []))
                if 'tenant' in fields:
                    fields.remove('tenant')
                # Solo agregar el fieldset si aún tiene campos
                if fields:
                    new_options = options.copy()
                    new_options['fields'] = tuple(fields)
                    new_fieldsets.append((name, new_options))
            return new_fieldsets
        return fieldsets


# ===================================
# CLASES BASE PARA MÓDULOS CON FEATURE FLAGS
# ===================================

class ShopModuleAdmin(TenantFilteredAdmin):
    """
    Admin base para modelos del módulo SHOP.
    Solo visible si el tenant tiene has_shop=True.

    Usar para: Product, ProductCategory, Order, Cart, etc.
    """

    def has_module_permission(self, request):
        if not super().has_module_permission(request):
            return False
        return tenant_has_module(request.user, 'shop')

    def has_view_permission(self, request, obj=None):
        if not tenant_has_module(request.user, 'shop'):
            return False
        return super().has_view_permission(request, obj)

    def has_add_permission(self, request):
        if not tenant_has_module(request.user, 'shop'):
            return False
        return super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        if not tenant_has_module(request.user, 'shop'):
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if not tenant_has_module(request.user, 'shop'):
            return False
        return super().has_delete_permission(request, obj)


class BookingsModuleAdmin(TenantFilteredAdmin):
    """
    Admin base para modelos del módulo BOOKINGS.
    Solo visible si el tenant tiene has_bookings=True.

    Usar para: Service, ServiceCategory, Appointment, StaffMember, etc.
    """

    def has_module_permission(self, request):
        if not super().has_module_permission(request):
            return False
        return tenant_has_module(request.user, 'bookings')

    def has_view_permission(self, request, obj=None):
        if not tenant_has_module(request.user, 'bookings'):
            return False
        return super().has_view_permission(request, obj)

    def has_add_permission(self, request):
        if not tenant_has_module(request.user, 'bookings'):
            return False
        return super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        if not tenant_has_module(request.user, 'bookings'):
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if not tenant_has_module(request.user, 'bookings'):
            return False
        return super().has_delete_permission(request, obj)


class MarketingModuleAdmin(TenantFilteredAdmin):
    """
    Admin base para modelos del módulo MARKETING.
    Solo visible si el tenant tiene has_marketing=True.

    Usar para: Coupon, Promotion, Review, etc.
    """

    def has_module_permission(self, request):
        if not super().has_module_permission(request):
            return False
        return tenant_has_module(request.user, 'marketing')

    def has_view_permission(self, request, obj=None):
        if not tenant_has_module(request.user, 'marketing'):
            return False
        return super().has_view_permission(request, obj)

    def has_add_permission(self, request):
        if not tenant_has_module(request.user, 'marketing'):
            return False
        return super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        if not tenant_has_module(request.user, 'marketing'):
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if not tenant_has_module(request.user, 'marketing'):
            return False
        return super().has_delete_permission(request, obj)


class ServicesModuleAdmin(TenantFilteredAdmin):
    """
    Admin base para modelos del módulo SERVICES.
    Solo visible si el tenant tiene has_services=True.

    Usar para: ServicePlan, ServiceContract, Insurance, Membership, etc.
    Servicios que se venden directamente sin necesidad de agendar cita.
    """

    def has_module_permission(self, request):
        if not super().has_module_permission(request):
            return False
        return tenant_has_module(request.user, 'services')

    def has_view_permission(self, request, obj=None):
        if not tenant_has_module(request.user, 'services'):
            return False
        return super().has_view_permission(request, obj)

    def has_add_permission(self, request):
        if not tenant_has_module(request.user, 'services'):
            return False
        return super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        if not tenant_has_module(request.user, 'services'):
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if not tenant_has_module(request.user, 'services'):
            return False
        return super().has_delete_permission(request, obj)


# Registrar en el admin site personalizado de GRAVITIFY
@admin.register(Tenant, site=gravitify_admin_site)
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
        if hasattr(obj, 'subscription') and obj.subscription:
            from django.urls import reverse
            url = reverse('admin:billing_subscription_change', args=[obj.subscription.pk])
            return format_html(
                '<a href="{}" style="color: #3b82f6;">Gestionar suscripción y módulos →</a>',
                url
            )
        return format_html(
            '<span style="color: #6b7280;">Sin suscripción (se creará automáticamente)</span>'
        )

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
                "fields": (
                    "subscription_link",
                ),
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
            return mark_safe(
                '<span style="color: #9ca3af; font-size: 12px;">—</span>'
            )
        status = getattr(obj, 'website_config', None)
        status = status.status if status else 'not_started'
        labels = {
            'not_started': ('Sin iniciar', '#9ca3af'),
            'draft': ('Plantilla', '#f59e0b'),
            'onboarding': ('Onboarding', '#3b82f6'),
            'generating': ('Generando', '#8b5cf6'),
            'review': ('En revisión', '#10b981'),
            'published': ('Publicado', '#059669'),
        }
        label, color = labels.get(status, (status, '#6b7280'))
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
            return mark_safe(
                '<span style="color: #ef4444; font-weight: bold;">Expirado</span>'
            )

        # Último día (expira hoy)
        if days == 0:
            return mark_safe(
                '<span style="color: #f59e0b; font-weight: bold;">Expira hoy</span>'
            )

        # Próximo a expirar (7 días o menos)
        if days <= 7:
            return mark_safe(
                f'<span style="color: #f59e0b; font-weight: bold;">{days} días</span>'
            )

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
            f'<strong>{title}</strong></div>'
            f'<div style="font-size: 14px; color: #374151;">{info_html}</div>'
            f'</div>'
        )

    subscription_info.short_description = "Estado de Suscripción"


@admin.register(TenantConfig, site=gravitify_admin_site)
class TenantConfigAdmin(UnfoldModelAdmin):
    """
    Panel "Mi Negocio" para que el admin del tenant edite
    su propia configuración (métricas, contacto, logo).
    Solo ve su propio tenant, sin poder crear ni eliminar.
    """

    form = TenantAdminForm

    def has_module_permission(self, request):
        if request.user.is_superuser:
            return False  # Superusuarios usan TenantAdmin
        return is_tenant_admin(request.user)

    def has_view_permission(self, request, obj=None):
        if not is_tenant_admin(request.user):
            return False
        if obj and hasattr(request.user, 'tenant'):
            return obj.pk == request.user.tenant_id
        return True

    def has_change_permission(self, request, obj=None):
        if not is_tenant_admin(request.user) or request.user.role != 'admin':
            return False
        if obj and hasattr(request.user, 'tenant'):
            return obj.pk == request.user.tenant_id
        return True

    def has_add_permission(self, request):
        return False  # No se pueden crear tenants desde aquí

    def has_delete_permission(self, request, obj=None):
        return False  # No se pueden eliminar tenants desde aquí

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if hasattr(request.user, 'tenant') and request.user.tenant:
            return qs.filter(pk=request.user.tenant_id)
        return qs.none()

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


@admin.register(TenantWebsite, site=gravitify_admin_site)
class TenantWebsiteAdmin(UnfoldModelAdmin):
    """
    Panel "Mi Sitio Web" para que el admin del tenant configure
    la apariencia y contenido de su sitio web.
    """

    form = TenantWebsiteForm

    def has_module_permission(self, request):
        if request.user.is_superuser:
            return False  # Superusuarios no necesitan esto
        return is_tenant_admin(request.user)

    def has_view_permission(self, request, obj=None):
        if not is_tenant_admin(request.user):
            return False
        if obj and hasattr(request.user, 'tenant'):
            return obj.pk == request.user.tenant_id
        return True

    def has_change_permission(self, request, obj=None):
        if not is_tenant_admin(request.user) or request.user.role != 'admin':
            return False
        if obj and hasattr(request.user, 'tenant'):
            return obj.pk == request.user.tenant_id
        return True

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if hasattr(request.user, 'tenant') and request.user.tenant:
            return qs.filter(pk=request.user.tenant_id)
        return qs.none()

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


@admin.register(User, site=gravitify_admin_site)
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

    def has_module_permission(self, request):
        """Permitir ver el módulo Users"""
        return is_tenant_admin(request.user)

    def has_view_permission(self, request, obj=None):
        """Permitir ver usuarios"""
        if not is_tenant_admin(request.user):
            return False
        if request.user.is_superuser:
            return True
        if obj and hasattr(obj, 'tenant'):
            return obj.tenant == getattr(request.user, 'tenant', None)
        return True

    list_display = [
        "username",
        "email",
        "full_name_display",
        "tenant",
        "role_badge",
        "is_active",
        "created_at",
    ]

    list_filter = [
        "role",
        "is_active",
    ]

    def get_list_filter(self, request):
        """Mostrar más filtros solo a superusuarios"""
        if request.user.is_superuser:
            return ["role", "is_active", "is_staff", "tenant", "created_at"]
        return ["role", "is_active"]

    def get_list_display_links(self, request, list_display):
        """
        Staff no puede hacer clic para editar usuarios (excepto desde su perfil).
        Solo ve la lista sin enlaces.
        """
        if request.user.role == 'staff':
            return None  # Sin enlaces en la lista
        return super().get_list_display_links(request, list_display)

    def has_delete_permission_for_changelist(self, request):
        """Helper para verificar permiso de delete en la lista"""
        if request.user.role == 'staff':
            return False
        return True

    def get_actions(self, request):
        """
        Staff no tiene acciones disponibles.
        """
        actions = super().get_actions(request)
        if request.user.role == 'staff':
            # Remover todas las acciones para staff
            return {}
        return actions

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

    def get_add_fieldsets(self, request):
        """Personalizar formulario de creación según tipo de usuario"""
        if request.user.is_superuser:
            return self.add_fieldsets
        # Para admins de tenant: sin campo tenant (se asigna automáticamente)
        return (
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

    def get_fieldsets(self, request, obj=None):
        """Personalizar fieldsets según contexto"""
        # Para CREACIÓN de usuarios
        if not obj:
            return self.get_add_fieldsets(request)

        # Para EDICIÓN de usuarios
        if not request.user.is_superuser:
            # Staff editando su propio perfil
            if request.user.role == 'staff' and obj and obj.pk == request.user.pk:
                fieldsets = [
                    (
                        "Información Personal",
                        {"fields": ("email", "first_name", "last_name", "phone", "avatar")},
                    ),
                ]
                # Agregar sección de servicios si tiene perfil de staff
                if hasattr(obj, 'staff_profile'):
                    fieldsets.append(
                        (
                            "Mis Servicios Asignados",
                            {
                                "fields": ("assigned_services_display",),
                                "description": "Servicios que puedes realizar según tu perfil de empleado.",
                            },
                        )
                    )
                return fieldsets

            # Versión simplificada para admins de tenant
            return (
                (
                    "Información Personal",
                    {"fields": ("email", "first_name", "last_name", "phone", "avatar")},
                ),
                (
                    "Permisos",
                    {
                        "fields": ("role", "is_active"),
                    },
                ),
            )
        # Superusuarios ven todos los campos
        return super().get_fieldsets(request, obj)

    def get_queryset(self, request):
        """Filtrar usuarios por tenant"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'tenant') and request.user.tenant:
            return qs.filter(tenant=request.user.tenant)
        return qs.none()

    def get_readonly_fields(self, request, obj=None):
        """Campos de solo lectura según permisos"""
        readonly = list(super().get_readonly_fields(request, obj))

        if not request.user.is_superuser:
            # Admins de tenant no pueden cambiar el tenant
            readonly.append("tenant")
            # No pueden crear superusuarios
            if obj and obj.is_superuser:
                readonly.extend(["is_staff", "is_superuser"])

        # Nadie puede cambiar su propio rol ni desactivarse
        if obj and obj.pk == request.user.pk:
            if "role" not in readonly:
                readonly.append("role")
            if "is_active" not in readonly:
                readonly.append("is_active")

        # Staff NO puede cambiar roles de ningún usuario (solo admin puede)
        # Solo admins (role='admin') y superusuarios pueden cambiar roles
        if not request.user.is_superuser and request.user.role != 'admin':
            if "role" not in readonly:
                readonly.append("role")

        return readonly

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Limitar opciones de tenant y ocultar botón de view"""
        if db_field.name == "tenant" and not request.user.is_superuser:
            if hasattr(request.user, 'tenant') and request.user.tenant:
                kwargs["queryset"] = Tenant.objects.filter(id=request.user.tenant.id)

        formfield = super().formfield_for_foreignkey(db_field, request, **kwargs)

        # Ocultar el botón de "view related" (ojo) en todos los ForeignKey
        # Solo dejar el lápiz (change) y el + (add) para mejor UX
        if formfield and hasattr(formfield, 'widget'):
            formfield.widget.can_view_related = False

        return formfield

    def save_model(self, request, obj, form, change):
        """Asignar tenant y limitar permisos"""
        if not request.user.is_superuser:
            # Siempre asignar el tenant del admin
            if hasattr(request.user, 'tenant') and request.user.tenant:
                obj.tenant = request.user.tenant
            # No permitir crear superusuarios
            obj.is_superuser = False
            # Solo permitir roles admin, staff, customer
            if obj.role not in ['admin', 'staff', 'customer']:
                obj.role = 'customer'

        # Si es edición, obtener el usuario original para comparar
        if change:
            original_user = User.objects.get(pk=obj.pk)

            # Nadie puede cambiar su propio rol
            if obj.pk == request.user.pk and original_user.role != obj.role:
                obj.role = original_user.role

            # Staff NO puede cambiar roles (solo admin y superuser pueden)
            if not request.user.is_superuser and request.user.role != 'admin':
                if original_user.role != obj.role:
                    obj.role = original_user.role  # Revertir cambio de rol

            # Prevenir que se quite el último admin del tenant
            if obj.tenant and original_user.role == 'admin' and obj.role != 'admin':
                admin_count = User.objects.filter(
                    tenant=obj.tenant,
                    role='admin',
                    is_active=True
                ).exclude(pk=obj.pk).count()
                if admin_count == 0:
                    obj.role = 'admin'  # No permitir quitar el último admin

        super().save_model(request, obj, form, change)

    def has_change_permission(self, request, obj=None):
        """Verificar permisos de edición"""
        if not is_tenant_admin(request.user):
            return False
        if request.user.is_superuser:
            return True

        # Staff solo puede editar su propio perfil
        if request.user.role == 'staff':
            if obj and obj.pk == request.user.pk:
                return True  # Puede editar su propio perfil
            return False  # No puede editar a otros

        if obj:
            # No permitir editar superusuarios
            if obj.is_superuser:
                return False
            # Solo editar usuarios del mismo tenant
            return obj.tenant == request.user.tenant
        # Sin obj específico, permitir si es admin del tenant
        return request.user.role == 'admin'

    def has_delete_permission(self, request, obj=None):
        """Verificar permisos de eliminación"""
        if request.user.is_superuser:
            return True

        # Staff NO puede eliminar usuarios
        if request.user.role == 'staff':
            return False

        # Solo admins pueden eliminar
        if request.user.role != 'admin':
            return False

        if obj:
            # No permitir eliminar superusuarios
            if obj.is_superuser:
                return False
            # No permitir eliminar admins (proteger a otros admins)
            if obj.role == 'admin':
                return False
            # No permitir eliminarse a sí mismo
            if obj == request.user:
                return False
            # Solo eliminar usuarios del mismo tenant
            return obj.tenant == request.user.tenant
        return False

    def has_add_permission(self, request):
        """Solo admins y superusuarios pueden crear usuarios"""
        if request.user.is_superuser:
            return True
        # Staff NO puede crear usuarios
        if request.user.role == 'staff':
            return False
        return request.user.role == 'admin'

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

    def assigned_services_display(self, obj):
        """Mostrar servicios asignados al staff (solo lectura)"""
        if not hasattr(obj, 'staff_profile'):
            return format_html(
                '<span style="color: #9ca3af; font-style: italic;">No tienes un perfil de empleado configurado. '
                'Contacta al administrador.</span>'
            )

        staff_profile = obj.staff_profile
        services = staff_profile.services.filter(is_active=True).order_by('category__name', 'name')

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
                    f'{service.name} '
                    f'<span style="color: #9ca3af;">({service.formatted_duration} - €{service.price})</span>'
                    f'</li>'
                )
            html_parts.append('</ul></div>')
        html_parts.append('</div>')

        return format_html(''.join(html_parts))

    assigned_services_display.short_description = "Servicios que puedo realizar"


@admin.register(Banner, site=gravitify_admin_site)
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
            '<span>{}</span>'
            '{}'
            '</div>',
            obj.background_color,
            obj.text_color,
            obj.message[:100] + "..." if len(obj.message) > 100 else obj.message,
            format_html(
                ' <a href="{}" style="color: {}; text-decoration: underline; margin-left: 10px;">{}</a>',
                obj.link_url or "#",
                obj.text_color,
                obj.link_text or "Ver más",
            ) if obj.link_url else "",
        )

    preview_banner.short_description = "Vista Previa"
