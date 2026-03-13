# backend/reviews/admin.py

from django.utils.html import format_html
from unfold.admin import TabularInline
from core.admin import MarketingModuleAdmin
from core.admin_site import nerbis_admin_site
from .models import Review, ReviewImage, ReviewHelpful


class ReviewImageInline(TabularInline):
    """Inline para imágenes de review"""

    model = ReviewImage
    extra = 1
    fields = ["image", "order"]


class ReviewAdmin(MarketingModuleAdmin):
    """Admin para reviews"""

    list_display = [
        "id",
        "user",
        "item_display",
        "rating_stars",
        "verified_badge",
        "status_badge",
        "created_at",
    ]

    list_filter = [
        "status",
        "rating",
        "is_verified_purchase",
        "tenant",
        "content_type",
        "created_at",
    ]

    search_fields = [
        "user__email",
        "title",
        "comment",
    ]

    readonly_fields = [
        "user",
        "content_type",
        "object_id",
        "item_name",
        "item_type",
        "is_verified_purchase",
        "helpful_count",
        "moderated_by",
        "moderated_at",
        "business_response_at",
        "created_at",
        "updated_at",
    ]

    fieldsets = (
        (
            "Información del Review",
            {
                "fields": (
                    "tenant",
                    "user",
                    "item_type",
                    "item_name",
                    "is_verified_purchase",
                )
            },
        ),
        (
            "Calificación y Contenido",
            {
                "fields": (
                    "rating",
                    "title",
                    "comment",
                )
            },
        ),
        (
            "Moderación",
            {
                "fields": (
                    "status",
                    "rejection_reason",
                    "moderated_by",
                    "moderated_at",
                )
            },
        ),
        (
            "Respuesta del Negocio",
            {
                "fields": (
                    "business_response",
                    "business_response_at",
                )
            },
        ),
        (
            "Estadísticas",
            {
                "fields": (
                    "helpful_count",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    inlines = [ReviewImageInline]

    actions = ["approve_reviews", "reject_reviews", "recalculate_ratings"]

    def item_display(self, obj):
        return f"{obj.item_type.title()}: {obj.item_name}"

    item_display.short_description = "Item"

    def rating_stars(self, obj):
        stars = "⭐" * obj.rating + "☆" * (5 - obj.rating)
        return format_html('<span style="font-size: 16px;">{}</span>', stars)

    rating_stars.short_description = "Rating"

    def verified_badge(self, obj):
        if obj.is_verified_purchase:
            return format_html(
                '<span style="background-color: #10b981; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">✓ Verificado</span>'
            )
        return format_html(
            '<span style="background-color: #6b7280; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">No verificado</span>'
        )

    verified_badge.short_description = "Verificación"

    def status_badge(self, obj):
        colors = {
            "pending": "#f59e0b",
            "approved": "#10b981",
            "rejected": "#ef4444",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Estado"

    def approve_reviews(self, request, queryset):
        """Aprobar reviews seleccionadas"""
        count = 0
        for review in queryset.filter(status="pending"):
            review.approve(moderator=request.user)
            count += 1

        self.message_user(request, f"{count} review(s) aprobada(s).")

    approve_reviews.short_description = "Aprobar reviews seleccionadas"

    def reject_reviews(self, request, queryset):
        """Rechazar reviews seleccionadas"""
        count = 0
        for review in queryset.filter(status="pending"):
            review.reject(reason="Rechazado por el administrador", moderator=request.user)
            count += 1

        self.message_user(request, f"{count} review(s) rechazada(s).")

    reject_reviews.short_description = "Rechazar reviews seleccionadas"

    def recalculate_ratings(self, request, queryset):
        """Recalcular ratings de productos/servicios"""
        updated_items = set()
        for review in queryset.filter(status="approved"):
            review.update_item_average_rating()
            updated_items.add(f"{review.item_type}: {review.item_name}")

        self.message_user(request, f"Ratings recalculados para: {', '.join(updated_items)}")

    recalculate_ratings.short_description = "Recalcular ratings de items"


class ReviewImageAdmin(MarketingModuleAdmin):
    """Admin para imágenes de reviews"""

    list_display = ["id", "review", "image", "order", "created_at"]
    list_filter = ["tenant", "created_at"]
    search_fields = ["review__user__email"]


class ReviewHelpfulAdmin(MarketingModuleAdmin):
    """Admin para votos útiles"""

    list_display = ["id", "review", "user", "created_at"]
    list_filter = ["tenant", "created_at"]
    search_fields = ["user__email", "review__id"]


# Registrar en el admin site personalizado
nerbis_admin_site.register(Review, ReviewAdmin)
nerbis_admin_site.register(ReviewImage, ReviewImageAdmin)
nerbis_admin_site.register(ReviewHelpful, ReviewHelpfulAdmin)
