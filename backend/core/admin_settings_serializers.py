# backend/core/admin_settings_serializers.py
"""
Serializers para el panel de superadmin — configuracion global de la plataforma.

Gestiona los catálogos globales que no pertenecen a ningún tenant:
- PlatformModule: módulos de la plataforma (has_services, has_shop, etc.)
- WebsitePage: páginas disponibles en el onboarding
- OnboardingQuestion: preguntas del cuestionario de onboarding

Contrato de sub-agente SDD ``sdd/admin-onboarding-config`` (Phases 1 + 2).
"""

from __future__ import annotations

from rest_framework import serializers

from core.models import IndustryGalleryCard, MarketingSection, PlatformModule
from websites.models import OnboardingQuestion, WebsitePage

# ---------------------------------------------------------------------------
# PlatformModule serializers
# ---------------------------------------------------------------------------


class AdminPlatformModuleMinimalSerializer(serializers.ModelSerializer):
    """Representacion minimal de un modulo para uso nested en M2M."""

    class Meta:
        model = PlatformModule
        fields = ["id", "key", "label"]
        read_only_fields = fields


class AdminPlatformModuleSerializer(serializers.ModelSerializer):
    """CRUD completo de PlatformModule.

    Patrón dual-field para M2M:
    - ``dependencies`` (write_only): lista de PKs para escritura.
    - ``dependencies_detail`` (read_only): representación nested para lectura.
    """

    dependencies = serializers.PrimaryKeyRelatedField(
        queryset=PlatformModule.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    dependencies_detail = AdminPlatformModuleMinimalSerializer(
        source="dependencies",
        many=True,
        read_only=True,
    )

    class Meta:
        model = PlatformModule
        fields = [
            "id",
            "key",
            "label",
            "description",
            "icon",
            "accent_color",
            "is_active",
            "sort_order",
            "dependencies",
            "dependencies_detail",
        ]


# ---------------------------------------------------------------------------
# WebsitePage serializer
# ---------------------------------------------------------------------------


class AdminWebsitePageSerializer(serializers.ModelSerializer):
    """CRUD completo de WebsitePage.

    Patrón dual-field para M2M ``auto_include_modules``.
    """

    auto_include_modules = serializers.PrimaryKeyRelatedField(
        queryset=PlatformModule.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    auto_include_modules_detail = AdminPlatformModuleMinimalSerializer(
        source="auto_include_modules",
        many=True,
        read_only=True,
    )

    class Meta:
        model = WebsitePage
        fields = [
            "id",
            "key",
            "label",
            "description",
            "icon",
            "is_mandatory",
            "is_default",
            "sort_order",
            "is_active",
            "auto_include_modules",
            "auto_include_modules_detail",
        ]


# ---------------------------------------------------------------------------
# OnboardingQuestion serializer
# ---------------------------------------------------------------------------


class AdminOnboardingQuestionSerializer(serializers.ModelSerializer):
    """CRUD completo de OnboardingQuestion.

    Patrón dual-field para M2M ``required_modules``.
    ``template`` es FK nullable (null = pregunta genérica para todos los templates).
    """

    required_modules = serializers.PrimaryKeyRelatedField(
        queryset=PlatformModule.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    required_modules_detail = AdminPlatformModuleMinimalSerializer(
        source="required_modules",
        many=True,
        read_only=True,
    )

    class Meta:
        model = OnboardingQuestion
        fields = [
            "id",
            "question_key",
            "question_text",
            "question_type",
            "message",
            "input_type",
            "hint",
            "placeholder",
            "help_text",
            "options",
            "ai_context",
            "section",
            "sort_order",
            "is_active",
            "is_required",
            "min_length",
            "max_length",
            "template",
            "required_modules",
            "required_modules_detail",
        ]


# ---------------------------------------------------------------------------
# MarketingSection serializer
# ---------------------------------------------------------------------------


class AdminMarketingSectionSerializer(serializers.ModelSerializer):
    """CRUD de MarketingSection para el panel de superadmin.

    ``updated_by`` se setea automaticamente en la vista (perform_update),
    por eso es read_only aqui. ``updated_at`` es auto_now en el modelo.
    """

    updated_by_email = serializers.EmailField(source="updated_by.email", read_only=True, default=None)

    class Meta:
        model = MarketingSection
        fields = [
            "id",
            "section_key",
            "content",
            "is_visible",
            "sort_order",
            "updated_at",
            "updated_by",
            "updated_by_email",
        ]
        read_only_fields = ["id", "section_key", "sort_order", "updated_at", "updated_by"]


# ---------------------------------------------------------------------------
# IndustryGalleryCard serializers
# ---------------------------------------------------------------------------

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


class AdminIndustryGalleryCardSerializer(serializers.ModelSerializer):
    """CRUD completo de IndustryGalleryCard para el panel de superadmin."""

    class Meta:
        model = IndustryGalleryCard
        fields = [
            "id",
            "name",
            "image",
            "gradient",
            "row",
            "sort_order",
            "is_visible",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_image(self, value):
        """Valida tamano maximo (5MB) y formato real con Pillow."""
        if value is None:
            return value

        if value.size > MAX_IMAGE_SIZE:
            raise serializers.ValidationError(
                f"La imagen no puede superar 5 MB (recibido: {value.size / 1024 / 1024:.1f} MB)."
            )

        from PIL import Image, UnidentifiedImageError

        pillow_to_mime = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
        try:
            img = Image.open(value)
            img.verify()
        except (UnidentifiedImageError, OSError):
            raise serializers.ValidationError("El archivo no es una imagen válida.")

        detected_mime = pillow_to_mime.get(img.format)
        if detected_mime not in ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                f"Formato no permitido: {img.format}. Usa JPG, PNG o WebP."
            )

        value.seek(0)
        return value

    def validate(self, attrs):
        """Si is_visible=True, debe tener imagen o gradiente."""
        is_visible = attrs.get("is_visible", getattr(self.instance, "is_visible", False) if self.instance else False)
        image = attrs.get("image", getattr(self.instance, "image", None) if self.instance else None)
        gradient = attrs.get("gradient", getattr(self.instance, "gradient", "") if self.instance else "")

        if is_visible and not image and not (gradient and gradient.strip()):
            raise serializers.ValidationError(
                "Una card visible debe tener imagen o gradiente de fondo."
            )
        return attrs


class IndustryGalleryReorderItemSerializer(serializers.Serializer):
    """Un item dentro del payload de reordenamiento."""

    id = serializers.IntegerField()
    row = serializers.IntegerField(min_value=1, max_value=2)
    sort_order = serializers.IntegerField(min_value=0)


class IndustryGalleryReorderSerializer(serializers.Serializer):
    """Acepta una lista de {id, row, sort_order} para reordenar cards."""

    items = IndustryGalleryReorderItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("La lista de items no puede estar vacia.")

        ids = [item["id"] for item in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("IDs duplicados en la lista.")

        existing_ids = set(IndustryGalleryCard.objects.filter(id__in=ids).values_list("id", flat=True))
        missing = set(ids) - existing_ids
        if missing:
            raise serializers.ValidationError(f"Cards no encontradas: {sorted(missing)}")

        return value
