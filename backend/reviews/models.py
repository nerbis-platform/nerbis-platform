# backend/reviews/models.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from core.models import TenantAwareModel, User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class Review(TenantAwareModel):
    """
    Review de un producto o servicio.
    """

    STATUS_CHOICES = [
        ("pending", "Pendiente"),
        ("approved", "Aprobado"),
        ("rejected", "Rechazado"),
    ]

    # Usuario que hace la review
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews", verbose_name="Usuario")

    # Item revieweado (producto o servicio) usando GenericForeignKey
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, limit_choices_to={"model__in": ("product", "service")}
    )
    object_id = models.PositiveIntegerField()
    item = GenericForeignKey("content_type", "object_id")

    # Rating y contenido
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Calificación",
        help_text="Calificación de 1 a 5 estrellas",
    )

    title = models.CharField(max_length=200, blank=True, verbose_name="Título", help_text="Título breve de la review")

    comment = models.TextField(blank=True, verbose_name="Comentario", help_text="Comentario detallado")

    # Verificación
    is_verified_purchase = models.BooleanField(
        default=False, verbose_name="Compra verificada", help_text="El usuario compró este producto/servicio"
    )

    # Moderación
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", verbose_name="Estado")

    moderated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderated_reviews",
        verbose_name="Moderado por",
    )

    moderated_at = models.DateTimeField(null=True, blank=True, verbose_name="Moderado en")

    rejection_reason = models.TextField(blank=True, verbose_name="Razón de rechazo")

    # Respuesta del negocio
    business_response = models.TextField(blank=True, verbose_name="Respuesta del negocio")

    business_response_at = models.DateTimeField(null=True, blank=True, verbose_name="Respondido en")

    # Utilidad
    helpful_count = models.PositiveIntegerField(default=0, verbose_name="Votos útiles")

    class Meta:
        verbose_name = "Review"
        verbose_name_plural = "Reviews"
        ordering = ["-created_at"]
        unique_together = [["tenant", "user", "content_type", "object_id"]]
        indexes = [
            models.Index(fields=["tenant", "content_type", "object_id"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["rating"]),
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Guardar el status original para detectar cambios
        self._original_status = self.status if self.pk else None

    def __str__(self):
        return f"{self.user.email} - {self.rating}★ - {self.get_status_display()}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Si el status cambió a "approved", actualizar rating del item
        if self._original_status != "approved" and self.status == "approved":
            self.update_item_average_rating()
        # Actualizar el status original
        self._original_status = self.status

    @property
    def item_name(self):
        """Nombre del item revieweado"""
        if self.item:
            return self.item.name
        return "Item eliminado"

    @property
    def item_type(self):
        """Tipo de item (product o service)"""
        return self.content_type.model

    def approve(self, moderator=None):
        """Aprobar review"""
        from django.utils import timezone

        self.status = "approved"
        self.moderated_by = moderator
        self.moderated_at = timezone.now()
        self.save()

        # Actualizar rating promedio del item
        self.update_item_average_rating()

    def reject(self, reason, moderator=None):
        """Rechazar review"""
        from django.utils import timezone

        self.status = "rejected"
        self.rejection_reason = reason
        self.moderated_by = moderator
        self.moderated_at = timezone.now()
        self.save()

    def add_business_response(self, response):
        """Agregar respuesta del negocio"""
        from django.utils import timezone

        self.business_response = response
        self.business_response_at = timezone.now()
        self.save()

    def update_item_average_rating(self):
        """Actualizar rating promedio del item"""
        # Calcular promedio de reviews aprobadas
        approved_reviews = Review.objects.filter(
            tenant=self.tenant, content_type=self.content_type, object_id=self.object_id, status="approved"
        )

        if approved_reviews.exists():
            from django.db.models import Avg

            avg_rating = approved_reviews.aggregate(Avg("rating"))["rating__avg"]

            # Actualizar en el item
            if self.item:
                self.item.average_rating = round(avg_rating, 2)
                self.item.reviews_count = approved_reviews.count()
                self.item.save()


class ReviewImage(TenantAwareModel):
    """
    Imagen adjunta a una review.
    """

    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="images", verbose_name="Review")

    image = models.ImageField(upload_to="reviews/%Y/%m/", verbose_name="Imagen")

    order = models.PositiveSmallIntegerField(default=0, verbose_name="Orden")

    class Meta:
        verbose_name = "Imagen de Review"
        verbose_name_plural = "Imágenes de Reviews"
        ordering = ["order", "created_at"]
        indexes = [
            models.Index(fields=["review", "order"]),
        ]

    def __str__(self):
        return f"Imagen {self.order} de review {self.review.id}"


class ReviewHelpful(TenantAwareModel):
    """
    Registro de usuarios que marcaron una review como útil.
    """

    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="helpful_votes", verbose_name="Review")

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="helpful_votes", verbose_name="Usuario")

    class Meta:
        verbose_name = "Voto Útil"
        verbose_name_plural = "Votos Útiles"
        unique_together = [["review", "user"]]
        indexes = [
            models.Index(fields=["review", "user"]),
        ]

    def __str__(self):
        return f"{self.user.email} - Review {self.review.id}"
