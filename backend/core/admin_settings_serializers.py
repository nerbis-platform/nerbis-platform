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
from websites.models import (
    AIGenerationLog,
    AIModelConfig,
    Industry,
    OnboardingQuestion,
    PromptBlock,
    SectionVariant,
    WebsitePage,
    WebsiteSection,
    WebsiteTemplate,
)

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
# WebsiteSection serializer
# ---------------------------------------------------------------------------


class WebsitePageMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsitePage
        fields = ["id", "key", "label"]


class AdminWebsiteSectionSerializer(serializers.ModelSerializer):
    """CRUD completo de WebsiteSection.

    Patron dual-field para FK ``page``:
    - ``page`` (write): PK para escritura.
    - ``page_detail`` (read): representacion nested para lectura.
    """

    page_detail = WebsitePageMinimalSerializer(source="page", read_only=True)
    page = serializers.PrimaryKeyRelatedField(queryset=WebsitePage.objects.all(), required=False, allow_null=True)

    class Meta:
        model = WebsiteSection
        fields = [
            "id",
            "key",
            "label",
            "description",
            "page",
            "page_detail",
            "is_default",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


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
            raise serializers.ValidationError(f"Formato no permitido: {img.format}. Usa JPG, PNG o WebP.")

        value.seek(0)
        return value

    def validate(self, attrs):
        """Si is_visible=True, debe tener imagen o gradiente."""
        is_visible = attrs.get("is_visible", getattr(self.instance, "is_visible", False) if self.instance else False)
        image = attrs.get("image", getattr(self.instance, "image", None) if self.instance else None)
        gradient = attrs.get("gradient", getattr(self.instance, "gradient", "") if self.instance else "")

        if is_visible and not image and not (gradient and gradient.strip()):
            raise serializers.ValidationError("Una card visible debe tener imagen o gradiente de fondo.")
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


# ---------------------------------------------------------------------------
# Industry relation fields (shared)
# ---------------------------------------------------------------------------


class IndustryRelatedField(serializers.PrimaryKeyRelatedField):
    """Campo relacional que acepta una ``Industry`` por ``id`` o por ``key``.

    Tras la conversión CharField->FK/M2M (issue-262), ``PromptBlock.industry``
    es un FK y ``SectionVariant.industries`` un M2M. Para no romper a los
    clientes admin que enviaban la industria como string (``"beauty"``), este
    campo acepta tanto el PK entero como la ``key`` slug. En lectura devuelve
    la ``key`` (string estable), no el PK opaco.
    """

    default_error_messages = {
        "does_not_exist": "Industria con clave o id '{value}' no encontrada.",
        "invalid": "Valor inválido para industria: se esperaba una clave o un id.",
    }

    def __init__(self, **kwargs):
        kwargs.setdefault("queryset", Industry.objects.all())
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        # id numérico -> resolución por PK (comportamiento estándar).
        if isinstance(data, bool):
            self.fail("invalid")
        if isinstance(data, int) or (isinstance(data, str) and data.isdigit()):
            return super().to_internal_value(int(data))
        # string no-numérico -> resolución por key.
        if isinstance(data, str):
            try:
                return self.get_queryset().get(key=data)
            except Industry.DoesNotExist:
                self.fail("does_not_exist", value=data)
        self.fail("invalid")

    def to_representation(self, value):
        # value puede ser una instancia (M2M / select_related) o un PK (FK pk_only).
        if hasattr(value, "key"):
            return value.key
        industry = Industry.objects.filter(pk=value.pk).only("key").first()
        return industry.key if industry else None


# ---------------------------------------------------------------------------
# SectionVariant serializers
# ---------------------------------------------------------------------------


class WebsiteSectionMinimalSerializer(serializers.ModelSerializer):
    """Representacion minimal de una seccion para uso nested en FK."""

    class Meta:
        model = WebsiteSection
        fields = ["id", "key", "label"]
        read_only_fields = fields


class AdminSectionVariantSerializer(serializers.ModelSerializer):
    """CRUD completo de SectionVariant.

    Patron dual-field para FK ``section``:
    - ``section`` (write): PK para escritura.
    - ``section_detail`` (read): representacion nested para lectura.
    """

    section_detail = WebsiteSectionMinimalSerializer(source="section", read_only=True)
    section = serializers.PrimaryKeyRelatedField(queryset=WebsiteSection.objects.all())
    industries = IndustryRelatedField(many=True, required=False)

    class Meta:
        model = SectionVariant
        fields = [
            "id",
            "section",
            "section_detail",
            "key",
            "label",
            "description",
            "css_class_hint",
            "preview_url",
            "tags",
            "industries",
            "mood",
            "is_default",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


# ---------------------------------------------------------------------------
# PromptBlock serializers
# ---------------------------------------------------------------------------


class WebsiteTemplateMinimalSerializer(serializers.ModelSerializer):
    """Representacion minimal de un template para uso nested en FK."""

    class Meta:
        model = WebsiteTemplate
        fields = ["id", "name", "slug", "industry"]
        read_only_fields = fields


class AdminPromptBlockSerializer(serializers.ModelSerializer):
    """CRUD completo de PromptBlock.

    Patron dual-field para FK ``template``:
    - ``template`` (write): PK para escritura.
    - ``template_detail`` (read): representacion nested para lectura.

    Validacion cruzada:
    - scope=template requiere template.
    - scope=industry requiere industry.
    - scope=global limpia template e industry.
    """

    template_detail = WebsiteTemplateMinimalSerializer(source="template", read_only=True)
    template = serializers.PrimaryKeyRelatedField(
        queryset=WebsiteTemplate.objects.all(),
        required=False,
        allow_null=True,
    )
    industry = IndustryRelatedField(required=False, allow_null=True)

    class Meta:
        model = PromptBlock
        fields = [
            "id",
            "key",
            "label",
            "content",
            "category",
            "scope",
            "template",
            "template_detail",
            "industry",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        scope = attrs.get("scope", getattr(self.instance, "scope", None) if self.instance else None)

        if scope == "template":
            template = attrs.get("template", getattr(self.instance, "template", None) if self.instance else None)
            if template is None:
                raise serializers.ValidationError({"template": "Este campo es requerido cuando scope es 'template'."})
            attrs["industry"] = None
        elif scope == "industry":
            industry = attrs.get("industry", getattr(self.instance, "industry", None) if self.instance else None)
            if not industry:
                raise serializers.ValidationError({"industry": "Este campo es requerido cuando scope es 'industry'."})
            attrs["template"] = None
        elif scope == "global":
            attrs["template"] = None
            attrs["industry"] = None

        return attrs


# ---------------------------------------------------------------------------
# Prompt preview serializer
# ---------------------------------------------------------------------------


class AdminPromptPreviewSerializer(serializers.Serializer):
    """Serializer para previsualizar el prompt construido por la IA."""

    template_id = serializers.IntegerField(required=False)
    industry = serializers.CharField(required=False, default="generic")
    onboarding_responses = serializers.DictField(required=False, default=dict)


# ---------------------------------------------------------------------------
# Industry serializers
# ---------------------------------------------------------------------------


class AdminIndustrySerializer(serializers.ModelSerializer):
    """CRUD completo del catalogo global de industrias.

    Modelo GLOBAL (no tenant-aware). Expone todos los campos incluidos
    ``status`` y ``created_by_ai`` (read-only — la IA los setea al proponer
    una industria durante el onboarding). ``status`` solo cambia via el
    endpoint ``promote`` (proposed_by_model -> reviewed).

    Patron dual-field para FK ``default_template``:
    - ``default_template`` (write): PK para escritura.
    - ``default_template_detail`` (read): representacion nested para lectura.
    """

    default_template_detail = WebsiteTemplateMinimalSerializer(source="default_template", read_only=True)
    default_template = serializers.PrimaryKeyRelatedField(
        queryset=WebsiteTemplate.objects.all(),
        required=False,
        allow_null=True,
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Industry
        fields = [
            "id",
            "key",
            "label",
            "description",
            "icon",
            "default_template",
            "default_template_detail",
            "is_active",
            "sort_order",
            "created_by_ai",
            "status",
            "status_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by_ai", "status", "created_at", "updated_at"]

    def validate(self, attrs):
        # ``default_template`` debe pertenecer a esta industria (o no tener
        # industria asignada — templates genéricos/compartidos). Evita asignar
        # como default un template curado para otra industria.
        template = attrs.get("default_template")
        if template is not None and template.industry_id is not None:
            current_id = self.instance.pk if self.instance else None
            if template.industry_id != current_id:
                raise serializers.ValidationError(
                    {
                        "default_template": (
                            "El template debe pertenecer a esta industria o no tener industria asignada."
                        )
                    }
                )
        return attrs


# ---------------------------------------------------------------------------
# AIModelConfig serializer
# ---------------------------------------------------------------------------


class AdminAIModelConfigSerializer(serializers.ModelSerializer):
    """CRUD (list/update) de la configuracion de modelo IA por tarea.

    Modelo GLOBAL. Las 4 filas (classify_industry, web_content, chat_edit,
    seo) se siembran via migracion; el superadmin solo edita ``model``,
    ``max_tokens``, ``temperature`` e ``is_active``. ``task`` es la clave
    natural y por eso es read-only en updates.
    """

    task_display = serializers.CharField(source="get_task_display", read_only=True)

    class Meta:
        model = AIModelConfig
        fields = [
            "id",
            "task",
            "task_display",
            "model",
            "max_tokens",
            "temperature",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["task", "created_at", "updated_at"]


class AdminAIGenerationLogSerializer(serializers.ModelSerializer):
    """Detalle completo de un ``AIGenerationLog`` para análisis de datos.

    Read-only. Expone TODOS los campos relevantes (tenant que originó la
    consulta, tipo, modelo, tokens, costo, éxito/error, prompt completo,
    respuesta cruda y snapshot del onboarding) para exportar/analizar.
    """

    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    generation_type_display = serializers.CharField(source="get_generation_type_display", read_only=True)
    total_tokens = serializers.IntegerField(read_only=True)
    cost_estimated = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=True, read_only=True)

    class Meta:
        model = AIGenerationLog
        fields = [
            "id",
            "created_at",
            "tenant",
            "tenant_name",
            "tenant_slug",
            "website_config",
            "generation_type",
            "generation_type_display",
            "section_id",
            "model_used",
            "tokens_input",
            "tokens_output",
            "total_tokens",
            "cost_estimated",
            "is_successful",
            "error_message",
            "is_billable",
            "prompt_summary",
            "full_prompt",
            "raw_response",
            "onboarding_snapshot",
        ]
        read_only_fields = fields
