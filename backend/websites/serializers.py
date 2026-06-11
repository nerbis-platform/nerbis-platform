# backend/websites/serializers.py
"""
Serializers para el Website Builder API.

Maneja la serialización de templates, onboarding, y chat con IA.
"""

from rest_framework import serializers

from .models import (
    AIGenerationLog,
    OnboardingQuestion,
    OnboardingResponse,
    WebsiteConfig,
    WebsitePage,
    WebsiteSection,
    WebsiteTemplate,
)

# ===================================
# TEMPLATES
# ===================================


class WebsiteTemplateListSerializer(serializers.ModelSerializer):
    """Serializer para listar templates disponibles."""

    industry = serializers.CharField(source="industry.key", read_only=True, default=None)
    industry_display = serializers.CharField(source="industry.label", read_only=True, default=None)
    preview_image_url = serializers.SerializerMethodField()

    class Meta:
        model = WebsiteTemplate
        fields = [
            "id",
            "name",
            "slug",
            "industry",
            "industry_display",
            "description",
            "preview_image_url",
            "preview_url",
            "is_premium",
            "sort_order",
        ]

    def get_preview_image_url(self, obj):
        if obj.preview_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.preview_image.url)
            return obj.preview_image.url
        return None


class WebsiteTemplateDetailSerializer(serializers.ModelSerializer):
    """Serializer detallado de un template con sus preguntas."""

    industry = serializers.CharField(source="industry.key", read_only=True, default=None)
    industry_display = serializers.CharField(source="industry.label", read_only=True, default=None)
    questions = serializers.SerializerMethodField()
    default_theme = serializers.JSONField(read_only=True)
    structure_schema = serializers.JSONField(read_only=True)

    class Meta:
        model = WebsiteTemplate
        fields = [
            "id",
            "name",
            "slug",
            "industry",
            "industry_display",
            "description",
            "preview_url",
            "structure_schema",
            "default_theme",
            "is_premium",
            "questions",
        ]

    def get_questions(self, obj):
        """Obtiene preguntas genéricas + específicas del template."""
        # Preguntas genéricas (template=None) + específicas del template
        generic_questions = OnboardingQuestion.objects.filter(template__isnull=True, is_active=True)
        template_questions = obj.questions.filter(is_active=True)

        # Combinar y ordenar
        all_questions = list(generic_questions) + list(template_questions)
        all_questions.sort(key=lambda q: (q.section, q.sort_order))

        return OnboardingQuestionSerializer(all_questions, many=True).data


# ===================================
# ONBOARDING QUESTIONS
# ===================================


class OnboardingQuestionSerializer(serializers.ModelSerializer):
    """Serializer para preguntas de onboarding (incluye campos conversacionales de Pipe)."""

    type_display = serializers.CharField(source="get_question_type_display", read_only=True)
    required_modules = serializers.SlugRelatedField(many=True, read_only=True, slug_field="key")

    class Meta:
        model = OnboardingQuestion
        fields = [
            "id",
            "question_key",
            "question_text",
            "message",
            "input_type",
            "question_type",
            "type_display",
            "options",
            "placeholder",
            "hint",
            "help_text",
            "is_required",
            "min_length",
            "max_length",
            "section",
            "sort_order",
            "required_modules",
        ]


class WebsitePageSerializer(serializers.ModelSerializer):
    """Serializer para páginas disponibles en el onboarding."""

    auto_include_modules = serializers.SlugRelatedField(many=True, read_only=True, slug_field="key")

    class Meta:
        model = WebsitePage
        fields = [
            "key",
            "label",
            "description",
            "icon",
            "is_mandatory",
            "is_default",
            "sort_order",
            "auto_include_modules",
        ]


class WebsiteSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteSection
        fields = ["id", "key", "label", "description", "page", "is_default", "sort_order"]


class OnboardingResponseSerializer(serializers.ModelSerializer):
    """Serializer para guardar respuestas del onboarding."""

    question_key = serializers.CharField(write_only=True)

    class Meta:
        model = OnboardingResponse
        fields = ["id", "question_key", "response_value", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_question_key(self, value):
        """Valida que la pregunta exista."""
        if not OnboardingQuestion.objects.filter(question_key=value, is_active=True).exists():
            raise serializers.ValidationError(f"Pregunta '{value}' no encontrada.")
        return value


class BulkOnboardingResponseSerializer(serializers.Serializer):
    """Serializer para guardar múltiples respuestas de onboarding."""

    responses = serializers.DictField(
        child=serializers.JSONField(), help_text="Diccionario de {question_key: response_value}"
    )

    def validate_responses(self, value):
        """Valida que todas las preguntas existan."""
        question_keys = list(value.keys())
        existing_keys = set(
            OnboardingQuestion.objects.filter(question_key__in=question_keys, is_active=True).values_list(
                "question_key", flat=True
            )
        )

        invalid_keys = set(question_keys) - existing_keys
        if invalid_keys:
            raise serializers.ValidationError(f"Preguntas no encontradas: {', '.join(invalid_keys)}")

        return value


# ===================================
# WEBSITE CONFIG
# ===================================


class WebsiteConfigSerializer(serializers.ModelSerializer):
    """Serializer para la configuración del sitio web."""

    template_name = serializers.CharField(source="template.name", read_only=True)
    template_industry = serializers.CharField(source="template.industry.key", read_only=True, default=None)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    public_url = serializers.CharField(read_only=True)
    is_published = serializers.BooleanField(read_only=True)
    has_unpublished_changes = serializers.BooleanField(read_only=True)
    remaining_generations = serializers.SerializerMethodField()

    class Meta:
        model = WebsiteConfig
        fields = [
            "id",
            "template",
            "template_name",
            "template_industry",
            "status",
            "status_display",
            "content_data",
            "theme_data",
            "media_data",
            "seo_data",
            "enabled_pages",
            "pages_data",
            "subdomain",
            "custom_domain",
            "public_url",
            "is_published",
            "has_unpublished_changes",
            "ai_generations_count",
            "remaining_generations",
            "last_generation_at",
            "published_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "ai_generations_count",
            "last_generation_at",
            "published_at",
            "created_at",
            "updated_at",
        ]

    def get_remaining_generations(self, obj):
        try:
            from websites.services.ai_service import AIService

            ai_service = AIService(tenant=obj.tenant, website_config=obj)
            can_generate, used, limit = ai_service.check_usage_limit(obj.tenant)
            return max(0, limit - used)
        except Exception:
            return 0

    def to_representation(self, instance):
        data = super().to_representation(instance)
        media = data.get("media_data") or {}
        current_logo = media.get("logo_url", "")
        # Only query onboarding if logo is missing OR is a data URL (from onboarding/generation)
        # Real uploaded URLs (https://) are set by the editor and should NOT be overwritten
        if not current_logo or current_logo.startswith("data:"):
            logo_resp = (
                OnboardingResponse.objects.filter(
                    website_config=instance,
                    question__question_key="logo_upload",
                )
                .values_list("response_value", flat=True)
                .first()
            )
            if logo_resp and current_logo != logo_resp:
                media = dict(media)
                media["logo_url"] = logo_resp
                data["media_data"] = media
                instance.media_data = media
                instance.save(update_fields=["media_data"])
        return data


class WebsiteConfigCreateSerializer(serializers.Serializer):
    """Serializer para iniciar la creación de un sitio web."""

    template_id = serializers.IntegerField(help_text="ID del template seleccionado")

    def validate_template_id(self, value):
        """Valida que el template exista y esté activo."""
        try:
            WebsiteTemplate.objects.get(id=value, is_active=True)
        except WebsiteTemplate.DoesNotExist:
            raise serializers.ValidationError("Template no encontrado o no disponible.")

        # Verificar si es premium y el tenant tiene acceso
        # TODO: Implementar verificación de acceso a templates premium

        return value


# ===================================
# QUICK-START ONBOARDING (Fase 2)
# ===================================


class QuickStartSerializer(serializers.Serializer):
    """Serializer para el onboarding rapido (3 campos).

    Acepta los datos minimos para generar un sitio de calidad en un solo
    request, sin pasar por el flujo de seleccion de template + onboarding
    de 4 secciones.
    """

    business_description = serializers.CharField(
        max_length=1000,
        help_text="Descripcion del negocio + que lo diferencia (2-3 lineas)",
    )
    main_services = serializers.CharField(
        max_length=2000,
        required=False,
        allow_blank=True,
        help_text="Servicios principales, separados por coma o salto de linea",
    )
    business_whatsapp = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        help_text="Numero de WhatsApp (opcional, se pre-llena con phone del tenant)",
    )
    # website_sections es una pista BLANDA: el frontend envia page keys
    # ("about", "blog", "services", ...) — ver ai_constants.SECTION_OPTION_MAP,
    # la unica fuente de verdad que normaliza estos valores e ignora cualquier
    # key desconocida (home/contact/bookings/menu o futuras paginas) sin romper.
    # Por eso este campo NO valida contra un enum cerrado: hacerlo dead-endeaba
    # la generacion con un 400 cada vez que el universo de paginas cambiaba. Se
    # acepta una lista de strings cortas y el mapeo downstream decide que aplica.
    website_sections = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        max_length=12,
        help_text="Page keys seleccionadas por el usuario (ej: ['about', 'testimonials']). "
        "Se normalizan via SECTION_OPTION_MAP; las desconocidas se ignoran. "
        "Si no se envia, se usan los defaults del vertical.",
    )

    ALLOWED_TONES = [
        "profesional",
        "calido",
        "moderno",
        "minimalista",
        "juvenil",
    ]

    brand_tone = serializers.ChoiceField(
        choices=[],  # choices set in __init__
        required=False,
        help_text="Personalidad de marca: profesional, calido, moderno, minimalista, juvenil",
    )
    primary_color = serializers.RegexField(
        regex=r"^#[0-9A-Fa-f]{6}$",
        required=False,
        help_text="Color primario en hex (ej: #1C3B57)",
    )
    secondary_color = serializers.RegexField(
        regex=r"^#[0-9A-Fa-f]{6}$",
        required=False,
        help_text="Color secundario en hex (ej: #0D9488)",
    )
    target_audience = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="Publico objetivo del negocio (ej: 'mujeres 25-45 que buscan bienestar')",
    )
    unique_selling_point = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="Que diferencia al negocio de la competencia",
    )
    business_email = serializers.EmailField(
        required=False,
        allow_blank=True,
        help_text="Email de contacto del negocio",
    )
    business_phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        help_text="Telefono de contacto del negocio",
    )
    industry_key = serializers.SlugField(
        max_length=50,
        required=False,
        allow_blank=True,
        help_text="Clave de la industria clasificada (de classify-industry). "
        "Si no se envia, se usa la industria del tenant.",
    )

    # --- Logo upload (brand-color-from-logo) ---
    # El frontend extrae los colores del logo y los envia ya derivados en
    # primary_color / secondary_color. El backend solo persiste el archivo y
    # los colores en el Tenant; NO recalcula el secundario.
    MAX_LOGO_BYTES = 5 * 1024 * 1024  # 5 MB
    ALLOWED_LOGO_CONTENT_TYPES = ("image/png", "image/jpeg", "image/webp")

    logo_file = serializers.ImageField(
        required=False,
        allow_null=True,
        help_text="Logo del negocio (PNG, JPEG o WEBP, max 5MB). Opcional: si no se "
        "envia, el flujo JSON actual sigue funcionando sin cambios.",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["brand_tone"].choices = [(t, t) for t in self.ALLOWED_TONES]

    def validate_logo_file(self, value):
        """Valida MIME (PNG/JPEG) y tamaño (<5MB) del logo subido.

        La integridad de la imagen (que PIL pueda abrirla) ya la valida
        ``ImageField``; aqui reforzamos content-type y tamaño para rechazar
        archivos no soportados o demasiado grandes con un 400 claro.
        """
        if value is None:
            return value

        if value.size > self.MAX_LOGO_BYTES:
            raise serializers.ValidationError(
                f"El logo supera el tamaño máximo de {self.MAX_LOGO_BYTES // (1024 * 1024)}MB."
            )

        content_type = getattr(value, "content_type", None)
        if content_type and content_type not in self.ALLOWED_LOGO_CONTENT_TYPES:
            raise serializers.ValidationError("Formato no soportado. Usa PNG, JPEG o WEBP.")

        return value


class ClassifyIndustrySerializer(serializers.Serializer):
    """Serializer de entrada para clasificar la industria de un negocio.

    Recibe una descripción libre del negocio y, opcionalmente, los módulos
    seleccionados en el onboarding. La IA decide si la descripción encaja con
    una industria existente o si debe proponerse una nueva.
    """

    business_description = serializers.CharField(
        max_length=1000,
        help_text="Descripción del negocio (qué hace, a quién atiende)",
    )
    selected_modules = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        max_length=20,
        help_text="Módulos seleccionados en el onboarding (opcional, da contexto)",
    )


class ConfirmClassificationSerializer(serializers.Serializer):
    """Registra el feedback humano sobre una clasificación de industria.

    ``confirmed``: el usuario aceptó la industria predicha (ground truth).
    ``corrected``: el usuario rechazó la predicción (ejemplo negativo); la
    industria final correcta llega en una clasificación posterior.
    """

    action = serializers.ChoiceField(choices=["confirmed", "corrected"])
    final_key = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        help_text="Industria que el usuario aceptó (default: la predicha si confirma)",
    )
    correction_text = serializers.CharField(max_length=1000, required=False, allow_blank=True)


# ===================================
# SUGERENCIA DE COLOR PRIMARIO (IA)
# ===================================


class SuggestColorsSerializer(serializers.Serializer):
    """Entrada para sugerir el color primario de la marca con IA.

    La descripción del negocio es obligatoria; el sector (key/label) y el tono
    son opcionales y dan contexto a la IA para una sugerencia más afinada.
    """

    business_description = serializers.CharField(
        max_length=1000,
        help_text="Descripción del negocio (qué hace, a quién atiende)",
    )
    industry_key = serializers.SlugField(
        max_length=50,
        required=False,
        allow_blank=True,
        help_text="Key del sector/industria (opcional, da contexto)",
    )
    industry_label = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text="Etiqueta legible del sector (opcional)",
    )
    tone = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text="Tono deseado de la marca (opcional, ej: 'profesional', 'cercano')",
    )


class SuggestColorsResponseSerializer(serializers.Serializer):
    """Respuesta de la sugerencia de color primario."""

    primary_hex = serializers.CharField(help_text="Color primario sugerido (#RRGGBB)")
    rationale = serializers.CharField(help_text="Justificación breve de la sugerencia")


# ===================================
# CHAT CON IA
# ===================================


class ChatMessageSerializer(serializers.Serializer):
    """Serializer para mensajes del chat."""

    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField()
    timestamp = serializers.DateTimeField(read_only=True)
    section_id = serializers.CharField(required=False, allow_null=True)


class ChatRequestSerializer(serializers.Serializer):
    """Serializer para solicitudes al chat de IA."""

    message = serializers.CharField(max_length=2000, help_text="Mensaje del usuario para la IA")
    section_id = serializers.CharField(
        required=False, allow_null=True, help_text="ID de la sección a editar (opcional)"
    )
    context = serializers.DictField(required=False, help_text="Contexto adicional para la IA")


class ChatResponseSerializer(serializers.Serializer):
    """Serializer para respuestas del chat de IA."""

    message = serializers.CharField(help_text="Respuesta de la IA")
    updated_content = serializers.JSONField(required=False, help_text="Contenido actualizado (si aplica)")
    section_id = serializers.CharField(required=False, allow_null=True, help_text="Sección que fue modificada")
    tokens_used = serializers.IntegerField(help_text="Tokens consumidos")
    remaining_generations = serializers.IntegerField(help_text="Generaciones restantes este mes")


# ===================================
# GENERACIÓN DE CONTENIDO
# ===================================


class GenerateContentRequestSerializer(serializers.Serializer):
    """Serializer para solicitar generación de contenido."""

    regenerate_section = serializers.CharField(
        required=False, allow_null=True, help_text="ID de sección específica a regenerar (null = todo el sitio)"
    )
    additional_instructions = serializers.CharField(
        required=False, max_length=500, help_text="Instrucciones adicionales para la IA"
    )


class GenerateContentResponseSerializer(serializers.Serializer):
    """Serializer para respuesta de generación de contenido."""

    content_data = serializers.JSONField(help_text="Contenido generado")
    seo_data = serializers.JSONField(help_text="Datos SEO generados")
    tokens_used = serializers.IntegerField(help_text="Tokens consumidos")
    remaining_generations = serializers.IntegerField(help_text="Generaciones restantes este mes")
    is_billable = serializers.BooleanField(help_text="True si se cobró como extra")


# ===================================
# AI GENERATION LOG
# ===================================


class AIGenerationLogSerializer(serializers.ModelSerializer):
    """Serializer para logs de generación de IA."""

    generation_type_display = serializers.CharField(source="get_generation_type_display", read_only=True)
    total_tokens = serializers.IntegerField(read_only=True)

    class Meta:
        model = AIGenerationLog
        fields = [
            "id",
            "generation_type",
            "generation_type_display",
            "section_id",
            "model_used",
            "tokens_input",
            "tokens_output",
            "total_tokens",
            "cost_estimated",
            "is_successful",
            "is_billable",
            "created_at",
        ]


# ===================================
# PUBLICACIÓN
# ===================================


class PublishWebsiteSerializer(serializers.Serializer):
    """Serializer para publicar el sitio web."""

    subdomain = serializers.SlugField(required=False, max_length=50, help_text="Subdominio personalizado (opcional)")

    def validate_subdomain(self, value):
        """Valida que el subdominio esté disponible."""
        if value:
            # Verificar disponibilidad
            tenant = self.context.get("tenant")
            existing = WebsiteConfig.objects.filter(subdomain=value).exclude(tenant=tenant).exists()

            if existing:
                raise serializers.ValidationError("Este subdominio ya está en uso.")
        return value
