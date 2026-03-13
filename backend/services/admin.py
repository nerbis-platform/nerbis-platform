# backend/services/admin.py

from django import forms
from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import ServiceCategory, Service, StaffMember
from core.admin_site import nerbis_admin_site
from core.admin import BookingsModuleAdmin
from core.widgets import ImagePreviewWidget


class ServiceCategoryForm(forms.ModelForm):
    """Formulario personalizado para ServiceCategory con widget de imagen mejorado"""

    class Meta:
        model = ServiceCategory
        fields = '__all__'
        widgets = {
            'image': ImagePreviewWidget(),
        }


class ServiceForm(forms.ModelForm):
    """Formulario personalizado para Service con widget de imagen mejorado"""

    class Meta:
        model = Service
        fields = '__all__'
        widgets = {
            'image': ImagePreviewWidget(),
        }


class StaffMemberForm(forms.ModelForm):
    """Formulario personalizado para StaffMember con widget de foto mejorado"""

    class Meta:
        model = StaffMember
        fields = '__all__'
        widgets = {
            'photo': ImagePreviewWidget(),
        }


@admin.register(ServiceCategory, site=nerbis_admin_site)
class ServiceCategoryAdmin(BookingsModuleAdmin):
    """Admin para categorías de servicios"""

    form = ServiceCategoryForm

    list_display = [
        "name",
        "tenant",
        "services_count",
        "is_active_badge",
        "order",
    ]

    list_filter = [
        "is_active",
        "tenant",
    ]

    search_fields = [
        "name",
        "description",
    ]

    prepopulated_fields = {"slug": ("name",)}

    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("Información Básica", {"fields": ("tenant", "name", "slug", "icon")}),
        ("Descripción", {"fields": ("description", "image")}),
        ("Configuración", {"fields": ("is_active", "order")}),
        ("Metadata", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def is_active_badge(self, obj):
        if obj.is_active:
            return mark_safe(
                '<span style="background-color: #10b981; color: white; padding: 3px 10px; border-radius: 3px;">Activa</span>'
            )
        return mark_safe(
            '<span style="background-color: #ef4444; color: white; padding: 3px 10px; border-radius: 3px;">Inactiva</span>'
        )

    is_active_badge.short_description = "Estado"

    def services_count(self, obj):
        count = obj.get_services_count()
        return f"{count} servicios"

    services_count.short_description = "Servicios"


@admin.register(Service, site=nerbis_admin_site)
class ServiceAdmin(BookingsModuleAdmin):
    """Admin para servicios"""

    form = ServiceForm

    list_display = [
        "image_preview",
        "name",
        "category",
        "tenant",
        "duration_display",
        "price_display",
        "is_active_badge",
        "is_featured",
    ]

    list_filter = [
        "is_active",
        "is_featured",
        "category",
        "tenant",
        "requires_deposit",
    ]

    search_fields = [
        "name",
        "description",
    ]

    prepopulated_fields = {"slug": ("name",)}

    readonly_fields = ["created_at", "updated_at", "duration_hours", "formatted_duration"]

    filter_horizontal = ["assigned_staff"]

    fieldsets = (
        ("Información Básica", {"fields": ("tenant", "name", "slug", "category")}),
        ("Imagen", {"fields": ("image",)}),
        ("Descripción", {"fields": ("short_description", "description")}),
        ("Duración y Precio", {"fields": ("duration_minutes", "formatted_duration", "price")}),
        ("Depósito", {"fields": ("requires_deposit", "deposit_amount"), "classes": ("collapse",)}),
        (
            "Configuración de Reservas",
            {"fields": ("max_advance_booking_days", "min_advance_booking_hours"), "classes": ("collapse",)},
        ),
        ("Personal", {"fields": ("assigned_staff",)}),
        ("Estado", {"fields": ("is_active", "is_featured")}),
        ("SEO", {"fields": ("meta_title", "meta_description"), "classes": ("collapse",)}),
        ("Metadata", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def duration_display(self, obj):
        return obj.formatted_duration

    duration_display.short_description = "Duración"

    def price_display(self, obj):
        return format_html("<strong>€{}</strong>", obj.price)

    price_display.short_description = "Precio"

    def is_active_badge(self, obj):
        if obj.is_active:
            return mark_safe(
                '<span style="background-color: #10b981; color: white; padding: 3px 10px; border-radius: 3px;">Activo</span>'
            )
        return mark_safe(
            '<span style="background-color: #ef4444; color: white; padding: 3px 10px; border-radius: 3px;">Inactivo</span>'
        )

    is_active_badge.short_description = "Estado"

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" />',
                obj.image.url,
            )
        return mark_safe('<span style="color: #9ca3af;">Sin imagen</span>')

    image_preview.short_description = "Imagen"


@admin.register(StaffMember, site=nerbis_admin_site)
class StaffMemberAdmin(BookingsModuleAdmin):
    """Admin para miembros del staff"""

    form = StaffMemberForm

    list_display = [
        "photo_preview",
        "full_name",
        "position",
        "tenant",
        "is_available_badge",
        "services_count",
    ]

    list_filter = [
        "is_available",
        "is_featured",
        "tenant",
        "accepts_new_clients",
    ]

    search_fields = [
        "user__first_name",
        "user__last_name",
        "user__email",
        "position",
    ]

    filter_horizontal = ["specialties"]

    readonly_fields = ["created_at", "updated_at", "assigned_services_list"]

    fieldsets = (
        ("Usuario", {"fields": ("tenant", "user")}),
        ("Información Profesional", {"fields": ("position", "bio", "photo")}),
        ("Especialidades (Categorías)", {"fields": ("specialties",)}),
        (
            "Servicios Asignados",
            {
                "fields": ("assigned_services_list",),
                "description": "Para asignar servicios, ve a cada Servicio y selecciona este empleado en 'Personal asignado'.",
            },
        ),
        ("Disponibilidad", {"fields": ("is_available", "accepts_new_clients")}),
        ("Configuración", {"fields": ("is_featured", "order")}),
        ("Metadata", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def assigned_services_list(self, obj):
        """Mostrar servicios asignados a este staff member"""
        services = obj.services.filter(is_active=True).order_by('category__name', 'name')

        if not services.exists():
            return mark_safe(
                '<span style="color: #9ca3af; font-style: italic;">No hay servicios asignados. '
                'Ve a Servicios → Servicio y selecciona este empleado en "Personal asignado".</span>'
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

        return mark_safe(''.join(html_parts))

    assigned_services_list.short_description = "Servicios que puede realizar"

    def photo_preview(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;" />',
                obj.photo.url,
            )
        return "-"

    photo_preview.short_description = "Foto"

    def is_available_badge(self, obj):
        if obj.is_available:
            return mark_safe(
                '<span style="background-color: #10b981; color: white; padding: 3px 10px; border-radius: 3px;">Disponible</span>'
            )
        return mark_safe(
            '<span style="background-color: #ef4444; color: white; padding: 3px 10px; border-radius: 3px;">No disponible</span>'
        )

    is_available_badge.short_description = "Disponibilidad"

    def services_count(self, obj):
        count = obj.get_services().count()
        return f"{count} servicios"

    services_count.short_description = "Servicios"
