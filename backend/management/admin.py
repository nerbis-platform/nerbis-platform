# backend/management/admin.py

from django.contrib import admin
from django.utils.safestring import mark_safe

from core.admin import TenantFilteredAdmin
from core.admin_site import nerbis_admin_site

from .models import (
    Expense,
    ExpenseCategory,
    InventoryMovement,
    PurchaseOrder,
    PurchaseOrderItem,
    Sale,
    SaleItem,
    Supplier,
)


@admin.register(ExpenseCategory, site=nerbis_admin_site)
class ExpenseCategoryAdmin(TenantFilteredAdmin):
    list_display = ["name", "tenant", "is_active_badge"]
    list_filter = ["is_active", "tenant"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]

    def is_active_badge(self, obj):
        if obj.is_active:
            return mark_safe(
                '<span style="background-color: #10b981; color: white;'
                ' padding: 3px 10px; border-radius: 3px;">Activa</span>'
            )
        return mark_safe(
            '<span style="background-color: #ef4444; color: white;'
            ' padding: 3px 10px; border-radius: 3px;">Inactiva</span>'
        )

    is_active_badge.short_description = "Estado"


@admin.register(Supplier, site=nerbis_admin_site)
class SupplierAdmin(TenantFilteredAdmin):
    list_display = ["name", "tenant", "email", "phone", "city", "is_active_badge"]
    list_filter = ["is_active", "tenant", "country"]
    search_fields = ["name", "tax_id", "email"]
    readonly_fields = ["created_at", "updated_at"]

    def is_active_badge(self, obj):
        if obj.is_active:
            return mark_safe(
                '<span style="background-color: #10b981; color: white;'
                ' padding: 3px 10px; border-radius: 3px;">Activo</span>'
            )
        return mark_safe(
            '<span style="background-color: #ef4444; color: white;'
            ' padding: 3px 10px; border-radius: 3px;">Inactivo</span>'
        )

    is_active_badge.short_description = "Estado"


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1
    fields = ["product", "quantity", "unit_cost", "total"]
    readonly_fields = ["total"]


@admin.register(PurchaseOrder, site=nerbis_admin_site)
class PurchaseOrderAdmin(TenantFilteredAdmin):
    list_display = ["order_number", "supplier", "tenant", "status", "total", "ordered_at"]
    list_filter = ["status", "tenant", "supplier"]
    search_fields = ["order_number", "supplier__name"]
    readonly_fields = ["order_number", "created_at", "updated_at"]
    inlines = [PurchaseOrderItemInline]

    def save_formset(self, request, form, formset, change):
        """Asignar tenant de la orden a los items inline."""
        instances = formset.save(commit=False)
        for instance in instances:
            if hasattr(instance, "tenant_id") and not instance.tenant_id:
                instance.tenant = form.instance.tenant
            instance.save()
        formset.save_m2m()


@admin.register(PurchaseOrderItem, site=nerbis_admin_site)
class PurchaseOrderItemAdmin(TenantFilteredAdmin):
    list_display = ["purchase_order", "product", "tenant", "quantity", "unit_cost", "total"]
    list_filter = ["tenant"]
    search_fields = ["purchase_order__order_number", "product__name"]
    readonly_fields = ["total", "created_at", "updated_at"]


@admin.register(InventoryMovement, site=nerbis_admin_site)
class InventoryMovementAdmin(TenantFilteredAdmin):
    list_display = [
        "product",
        "tenant",
        "movement_type",
        "quantity",
        "reference_type",
        "reference_number",
        "moved_at",
    ]
    list_filter = ["movement_type", "reference_type", "tenant"]
    search_fields = ["product__name", "reference_number"]
    readonly_fields = ["created_at", "updated_at"]


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 1
    fields = ["product", "quantity", "unit_price", "cost_price_at_sale", "total"]
    readonly_fields = ["total"]


@admin.register(Sale, site=nerbis_admin_site)
class SaleAdmin(TenantFilteredAdmin):
    list_display = [
        "sale_number",
        "tenant",
        "customer_name",
        "status",
        "payment_method",
        "total",
        "sold_at",
    ]
    list_filter = ["status", "payment_method", "tenant"]
    search_fields = ["sale_number", "customer_name", "customer_email"]
    readonly_fields = ["sale_number", "created_at", "updated_at"]
    inlines = [SaleItemInline]

    def save_formset(self, request, form, formset, change):
        """Asignar tenant de la venta a los items inline."""
        instances = formset.save(commit=False)
        for instance in instances:
            if hasattr(instance, "tenant_id") and not instance.tenant_id:
                instance.tenant = form.instance.tenant
            instance.save()
        formset.save_m2m()


@admin.register(SaleItem, site=nerbis_admin_site)
class SaleItemAdmin(TenantFilteredAdmin):
    list_display = ["sale", "product", "tenant", "quantity", "unit_price", "total"]
    list_filter = ["tenant"]
    search_fields = ["sale__sale_number", "product__name"]
    readonly_fields = ["total", "created_at", "updated_at"]


@admin.register(Expense, site=nerbis_admin_site)
class ExpenseAdmin(TenantFilteredAdmin):
    list_display = [
        "description",
        "tenant",
        "category",
        "supplier",
        "amount",
        "payment_method",
        "date",
    ]
    list_filter = ["category", "payment_method", "tenant"]
    search_fields = ["description", "reference_number", "supplier__name"]
    readonly_fields = ["created_at", "updated_at"]
