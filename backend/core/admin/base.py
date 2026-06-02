# backend/core/admin/base.py
"""
Clases base de admin reutilizadas por otros modulos del proyecto.

- TenantFilteredAdmin: admin con permisos solo para superadmins
- ShopModuleAdmin, BookingsModuleAdmin, MarketingModuleAdmin, ServicesModuleAdmin:
  clases base importadas por ecommerce, bookings, subscriptions, coupons, etc.
"""

from unfold.admin import ModelAdmin as UnfoldModelAdmin


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
        """Ocultar boton de view en ForeignKey para mejor UX."""
        formfield = super().formfield_for_foreignkey(db_field, request, **kwargs)
        if formfield and hasattr(formfield, "widget"):
            formfield.widget.can_view_related = False
        return formfield


class ShopModuleAdmin(TenantFilteredAdmin):
    """Admin base para modelos del modulo SHOP."""

    pass


class BookingsModuleAdmin(TenantFilteredAdmin):
    """Admin base para modelos del modulo BOOKINGS."""

    pass


class MarketingModuleAdmin(TenantFilteredAdmin):
    """Admin base para modelos del modulo MARKETING."""

    pass


class ServicesModuleAdmin(TenantFilteredAdmin):
    """Admin base para modelos del modulo SERVICES."""

    pass
