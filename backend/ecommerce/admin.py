# backend/ecommerce/admin.py

from django import forms
from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from unfold.admin import TabularInline, StackedInline
from .models import ProductCategory, Product, ProductImage, Inventory
from core.admin_site import gravitify_admin_site
from core.admin import ShopModuleAdmin
from core.widgets import ImagePreviewWidget


class ProductCategoryForm(forms.ModelForm):
    """Formulario personalizado para ProductCategory con widget de imagen mejorado"""

    class Meta:
        model = ProductCategory
        fields = '__all__'
        widgets = {
            'image': ImagePreviewWidget(),
        }


class ProductImageForm(forms.ModelForm):
    """Formulario personalizado para ProductImage con widget de imagen mejorado"""

    class Meta:
        model = ProductImage
        fields = '__all__'
        widgets = {
            'image': ImagePreviewWidget(),
        }


@admin.register(ProductCategory, site=gravitify_admin_site)
class ProductCategoryAdmin(ShopModuleAdmin):
    """
    Admin para categorías de productos.
    """

    form = ProductCategoryForm

    list_display = [
        "name",
        "parent",
        "tenant",
        "products_count",
        "is_active_badge",
        "order",
    ]

    list_filter = [
        "is_active",
        "tenant",
        "parent",
    ]

    search_fields = [
        "name",
        "description",
    ]

    prepopulated_fields = {"slug": ("name",)}

    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("Información Básica", {"fields": ("tenant", "name", "slug", "parent")}),
        ("Descripción", {"fields": ("description", "image")}),
        ("Configuración", {"fields": ("is_active", "order")}),
        ("Metadata", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def is_active_badge(self, obj):
        """Badge visual para is_active"""
        if obj.is_active:
            return mark_safe(
                '<span style="background-color: #10b981; color: white; padding: 3px 10px; border-radius: 3px;">Activa</span>'
            )
        return mark_safe(
            '<span style="background-color: #ef4444; color: white; padding: 3px 10px; border-radius: 3px;">Inactiva</span>'
        )

    is_active_badge.short_description = "Estado"

    def products_count(self, obj):
        """Contar productos"""
        count = obj.get_products_count()
        return f"{count} productos"

    products_count.short_description = "Productos"


class ProductImageInline(TabularInline):
    """
    Inline para agregar imágenes dentro del admin de Product.
    """

    model = ProductImage
    form = ProductImageForm
    extra = 1
    fields = ["image", "alt_text", "is_primary", "order"]


class InventoryInline(StackedInline):
    """
    Inline para gestionar inventario dentro del admin de Product.
    """

    model = Inventory
    can_delete = False
    fields = [
        "stock",
        "low_stock_threshold",
        "track_inventory",
        "allow_backorders",
        "total_sold",
    ]
    readonly_fields = ["total_sold"]


@admin.register(Product, site=gravitify_admin_site)
class ProductAdmin(ShopModuleAdmin):
    """
    Admin para productos.
    """

    list_display = [
        "name",
        "category",
        "tenant",
        "price_display",
        "stock_display",
        "is_active_badge",
        "is_featured",
    ]

    list_filter = [
        "is_active",
        "is_featured",
        "category",
        "tenant",
        "brand",
    ]

    search_fields = [
        "name",
        "sku",
        "description",
        "brand",
    ]

    prepopulated_fields = {"slug": ("name",)}

    readonly_fields = ["created_at", "updated_at", "discount_percentage"]

    inlines = [ProductImageInline, InventoryInline]

    fieldsets = (
        ("Información Básica", {"fields": ("tenant", "name", "slug", "sku", "category", "brand")}),
        ("Descripción", {"fields": ("short_description", "description")}),
        ("Precios", {"fields": ("price", "compare_at_price", "cost_price", "discount_percentage")}),
        ("Características", {"fields": ("weight", "requires_shipping"), "classes": ("collapse",)}),
        ("Estado", {"fields": ("is_active", "is_featured")}),
        ("SEO", {"fields": ("meta_title", "meta_description"), "classes": ("collapse",)}),
        ("Metadata", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
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

    def price_display(self, obj):
        """Mostrar precio con descuento"""
        if obj.discount_percentage:
            return format_html(
                '<strong>€{}</strong> <s>€{}</s> <span style="color: #ef4444;">-{}%</span>',
                obj.price,
                obj.compare_at_price,
                obj.discount_percentage,
            )
        return f"€{obj.price}"

    price_display.short_description = "Precio"

    def stock_display(self, obj):
        """Mostrar stock con colores"""
        try:
            inventory = obj.inventory
            stock = inventory.stock

            if not inventory.track_inventory:
                return mark_safe('<span style="color: #6b7280;">Sin control</span>')

            if stock == 0:
                color = "#ef4444"  # Rojo
                text = "SIN STOCK"
            elif inventory.is_low_stock:
                color = "#f59e0b"  # Naranja
                text = f"{stock} unidades (BAJO)"
            else:
                color = "#10b981"  # Verde
                text = f"{stock} unidades"

            return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, text)
        except:
            return "-"

    stock_display.short_description = "Stock"

    def save_formset(self, request, form, formset, change):
        """Asignar tenant del producto a los inlines (Inventory, ProductImage)"""
        instances = formset.save(commit=False)
        for instance in instances:
            if hasattr(instance, 'tenant_id') and not instance.tenant_id:
                instance.tenant = form.instance.tenant
            instance.save()
        formset.save_m2m()


@admin.register(ProductImage, site=gravitify_admin_site)
class ProductImageAdmin(ShopModuleAdmin):
    """
    Admin para imágenes de productos.
    """

    form = ProductImageForm

    list_display = ["image_preview", "product", "tenant", "is_primary", "order"]
    list_filter = ["is_primary", "tenant"]
    search_fields = ["product__name", "alt_text"]

    def image_preview(self, obj):
        """Preview de la imagen"""
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;" />',
                obj.image.url,
            )
        return "-"

    image_preview.short_description = "Preview"


@admin.register(Inventory, site=gravitify_admin_site)
class InventoryAdmin(ShopModuleAdmin):
    """
    Admin para inventario.
    """

    list_display = [
        "product",
        "tenant",
        "stock_display",
        "track_inventory",
        "total_sold",
        "last_restock_date",
    ]

    list_filter = [
        "track_inventory",
        "allow_backorders",
        "tenant",
    ]

    search_fields = ["product__name"]

    readonly_fields = ["total_sold", "last_restock_date", "last_restock_quantity"]

    def stock_display(self, obj):
        """Mostrar stock con colores"""
        if not obj.track_inventory:
            return mark_safe('<span style="color: #6b7280;">Sin control</span>')

        if obj.is_out_of_stock:
            color = "#ef4444"
            text = f"{obj.stock} - SIN STOCK"
        elif obj.is_low_stock:
            color = "#f59e0b"
            text = f"{obj.stock} - STOCK BAJO"
        else:
            color = "#10b981"
            text = f"{obj.stock}"

        return format_html('<strong style="color: {};">{}</strong>', color, text)

    stock_display.short_description = "Stock"
