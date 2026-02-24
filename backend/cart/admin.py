# backend/cart/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import Cart, CartItem
from core.admin_site import gravitify_admin_site
from core.admin import ShopModuleAdmin


class CartItemInline(admin.TabularInline):
    """Inline para items del carrito"""

    model = CartItem
    extra = 0
    readonly_fields = ["total_price"]
    fields = ["item_type", "item", "quantity", "unit_price", "total_price"]


@admin.register(Cart, site=gravitify_admin_site)
class CartAdmin(ShopModuleAdmin):
    """Admin para carritos"""

    list_display = [
        "user_display",
        "tenant",
        "items_count_display",
        "subtotal_display",
        "total_display",
        "created_at",
    ]

    list_filter = [
        "tenant",
        "created_at",
    ]

    search_fields = [
        "user__first_name",
        "user__last_name",
        "user__email",
    ]

    inlines = [CartItemInline]

    readonly_fields = ["items_count", "subtotal", "tax_amount", "total"]

    def user_display(self, obj):
        return obj.user.get_full_name()

    user_display.short_description = "Usuario"

    def items_count_display(self, obj):
        count = obj.items_count
        return format_html("<strong>{}</strong> items", count)

    items_count_display.short_description = "Items"

    def subtotal_display(self, obj):
        return f"€{obj.subtotal}"

    subtotal_display.short_description = "Subtotal"

    def total_display(self, obj):
        return format_html("<strong>€{}</strong>", obj.total)

    total_display.short_description = "Total"


@admin.register(CartItem, site=gravitify_admin_site)
class CartItemAdmin(ShopModuleAdmin):
    """Admin para items del carrito"""

    list_display = [
        "cart",
        "item_type",
        "item_display",
        "quantity",
        "unit_price",
        "total_price_display",
    ]

    list_filter = [
        "item_type",
        "tenant",
    ]

    def item_display(self, obj):
        if obj.item:
            return obj.item.name
        return "-"

    item_display.short_description = "Item"

    def total_price_display(self, obj):
        return format_html("<strong>€{}</strong>", obj.total_price)

    total_price_display.short_description = "Total"
