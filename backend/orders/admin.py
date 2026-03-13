# backend/orders/admin.py

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from unfold.admin import TabularInline, StackedInline
from .models import Order, OrderItem, OrderServiceItem, Payment
from core.admin_site import nerbis_admin_site
from core.admin import ShopModuleAdmin


class OrderItemInline(TabularInline):
    """Inline para productos en la orden"""

    model = OrderItem
    extra = 0
    readonly_fields = ["total_price"]
    fields = ["product", "product_name", "quantity", "unit_price", "total_price"]


class OrderServiceItemInline(TabularInline):
    """Inline para servicios/citas en la orden"""

    model = OrderServiceItem
    extra = 0
    fields = ["service", "service_name", "staff_member_name", "appointment_datetime", "price"]


class PaymentInline(StackedInline):
    """Inline para pagos"""

    model = Payment
    extra = 0
    readonly_fields = ["stripe_payment_intent_id", "processed_at"]
    fields = ["payment_method", "amount", "currency", "status", "stripe_payment_intent_id", "processed_at"]


@admin.register(Order, site=nerbis_admin_site)
class OrderAdmin(ShopModuleAdmin):
    """Admin para órdenes"""

    list_display = [
        "order_number",
        "customer_display",
        "tenant",
        "total_display",
        "status_badge",
        "created_at",
    ]

    list_filter = [
        "status",
        "tenant",
        "created_at",
        "paid_at",
    ]

    search_fields = [
        "order_number",
        "customer__first_name",
        "customer__last_name",
        "customer__email",
        "billing_email",
    ]

    date_hierarchy = "created_at"

    inlines = [OrderItemInline, OrderServiceItemInline, PaymentInline]

    readonly_fields = [
        "order_number",
        "created_at",
        "updated_at",
        "paid_at",
        "completed_at",
        "cancelled_at",
    ]

    fieldsets = (
        (
            "Información de la Orden",
            {
                "fields": (
                    "order_number",
                    "tenant",
                    "customer",
                    "status",
                )
            },
        ),
        (
            "Montos",
            {
                "fields": (
                    "subtotal",
                    "tax_rate",
                    "tax_amount",
                    "shipping_cost",
                    "total",
                )
            },
        ),
        (
            "Facturación",
            {
                "fields": (
                    "billing_name",
                    "billing_email",
                    "billing_phone",
                    "billing_address",
                    "billing_city",
                    "billing_postal_code",
                    "billing_country",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Envío",
            {
                "fields": (
                    "shipping_name",
                    "shipping_address",
                    "shipping_city",
                    "shipping_postal_code",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Notas",
            {
                "fields": (
                    "customer_notes",
                    "internal_notes",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Fechas",
            {
                "fields": (
                    "created_at",
                    "paid_at",
                    "completed_at",
                    "cancelled_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    actions = ["mark_as_paid", "mark_as_completed", "cancel_orders"]

    def customer_display(self, obj):
        return obj.customer.get_full_name()

    customer_display.short_description = "Cliente"

    def total_display(self, obj):
        return format_html("<strong>€{}</strong>", obj.total)

    total_display.short_description = "Total"

    def status_badge(self, obj):
        colors = {
            "pending": "#f59e0b",  # Naranja
            "processing": "#3b82f6",  # Azul
            "paid": "#8b5cf6",  # Púrpura
            "confirmed": "#10b981",  # Verde
            "completed": "#059669",  # Verde oscuro
            "cancelled": "#ef4444",  # Rojo
            "refunded": "#6b7280",  # Gris
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Estado"

    def mark_as_paid(self, request, queryset):
        queryset.update(status="paid", paid_at=timezone.now())
        self.message_user(request, f"{queryset.count()} órdenes marcadas como pagadas")

    mark_as_paid.short_description = "Marcar como pagadas"

    def mark_as_completed(self, request, queryset):
        queryset.update(status="completed", completed_at=timezone.now())
        self.message_user(request, f"{queryset.count()} órdenes completadas")

    mark_as_completed.short_description = "Marcar como completadas"

    def cancel_orders(self, request, queryset):
        queryset.update(status="cancelled", cancelled_at=timezone.now())
        self.message_user(request, f"{queryset.count()} órdenes canceladas")

    cancel_orders.short_description = "Cancelar órdenes"


@admin.register(Payment, site=nerbis_admin_site)
class PaymentAdmin(ShopModuleAdmin):
    """Admin para pagos"""

    list_display = [
        "id",
        "order",
        "amount_display",
        "payment_method",
        "status_badge",
        "created_at",
    ]

    list_filter = [
        "status",
        "payment_method",
        "tenant",
        "created_at",
    ]

    search_fields = [
        "order__order_number",
        "stripe_payment_intent_id",
        "stripe_charge_id",
    ]

    readonly_fields = [
        "stripe_payment_intent_id",
        "stripe_charge_id",
        "processed_at",
        "metadata",
    ]

    def amount_display(self, obj):
        return format_html("<strong>€{}</strong>", obj.amount)

    amount_display.short_description = "Monto"

    def status_badge(self, obj):
        colors = {
            "pending": "#f59e0b",
            "processing": "#3b82f6",
            "succeeded": "#10b981",
            "failed": "#ef4444",
            "cancelled": "#6b7280",
            "refunded": "#8b5cf6",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Estado"
