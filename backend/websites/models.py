# backend/websites/models.py
"""
Sistema de Website Builder para NERBIS.

Este módulo gestiona:
- Templates de sitio web por industria
- Configuración personalizada de cada tenant
- Cuestionario de onboarding
- Tracking de generaciones de IA
"""

from decimal import Decimal

from django.db import models
from django.utils.text import slugify


class Industry(models.Model):
    """
    Catálogo global de industrias / tipos de negocio.

    Modelo GLOBAL (no tenant-aware) — es la única fuente de verdad para
    la industria que se usa en la resolución de templates y variantes.
    Reemplaza las listas hardcodeadas (Tenant.INDUSTRY_CHOICES,
    WebsiteTemplate.INDUSTRY_CHOICES, SectionVariant.industries).

    Las industrias pueden ser creadas por un superadmin (status=reviewed)
    o propuestas por la IA durante el onboarding (status=proposed_by_model).
    """

    STATUS_CHOICES = [
        ("proposed_by_model", "Propuesta por IA"),
        ("reviewed", "Revisada"),
    ]

    key = models.SlugField(
        "Clave",
        max_length=50,
        unique=True,
        help_text="Identificador único de la industria (ej: 'beauty', 'restaurant')",
    )
    label = models.CharField("Etiqueta", max_length=120, help_text="Nombre visible de la industria")
    description = models.TextField("Descripción", blank=True, help_text="Descripción corta de la industria")
    icon = models.CharField("Icono", max_length=50, blank=True, help_text="Nombre del icono Lucide")
    default_template = models.ForeignKey(
        "WebsiteTemplate",
        on_delete=models.SET_NULL,
        related_name="default_for_industries",
        null=True,
        blank=True,
        verbose_name="Template por defecto",
        help_text="Template que se usa por defecto para esta industria",
    )
    is_active = models.BooleanField("Activa", default=True)
    sort_order = models.PositiveIntegerField("Orden", default=0)
    created_by_ai = models.BooleanField(
        "Creada por IA",
        default=False,
        help_text="True si la industria fue propuesta por la IA durante el onboarding",
    )
    status = models.CharField(
        "Estado",
        max_length=20,
        choices=STATUS_CHOICES,
        default="reviewed",
        help_text="Las propuestas por IA quedan en revisión hasta que un admin las promueve",
    )
    created_at = models.DateTimeField("Creado", auto_now_add=True)
    updated_at = models.DateTimeField("Actualizado", auto_now=True)

    class Meta:
        verbose_name = "Industria"
        verbose_name_plural = "Industrias"
        ordering = ["sort_order", "label"]

    def __str__(self):
        return self.label


class AIModelConfig(models.Model):
    """
    Configuración del modelo de IA por tarea.

    Modelo GLOBAL (no tenant-aware). Permite al superadmin elegir qué
    modelo y parámetros usar en cada tarea de IA, en lugar de leer
    directamente de settings.ANTHROPIC_MODEL*. AIService cae a los
    defaults de settings si no hay fila para una tarea.
    """

    TASK_CHOICES = [
        ("classify_industry", "Clasificar industria"),
        ("web_content", "Generar contenido web"),
        ("chat_edit", "Editar por chat"),
        ("seo", "Optimización SEO"),
        ("suggest_colors", "Sugerir colores"),
    ]

    task = models.CharField(
        "Tarea",
        max_length=30,
        choices=TASK_CHOICES,
        unique=True,
        help_text="Tarea de IA a la que aplica esta configuración",
    )
    model = models.CharField("Modelo", max_length=80, help_text="ID del modelo de Anthropic")
    max_tokens = models.PositiveIntegerField("Tokens máximos", default=4096)
    temperature = models.DecimalField("Temperatura", max_digits=3, decimal_places=2, default=Decimal("1.0"))
    is_active = models.BooleanField("Activo", default=True)
    created_at = models.DateTimeField("Creado", auto_now_add=True)
    updated_at = models.DateTimeField("Actualizado", auto_now=True)

    class Meta:
        verbose_name = "Configuración de modelo IA"
        verbose_name_plural = "Configuraciones de modelo IA"
        ordering = ["task"]

    def __str__(self):
        return f"{self.get_task_display()} → {self.model}"


class WebsiteTemplate(models.Model):
    """
    Plantilla base de sitio web por industria.

    Cada plantilla define:
    - La estructura visual (secciones, layout)
    - Los campos que el usuario debe completar
    - Las instrucciones para la IA sobre cómo generar contenido
    """

    INDUSTRY_CHOICES = [
        ("restaurant", "Restaurante / Café"),
        ("retail", "Tienda / Retail"),
        ("beauty", "Salón de Belleza / Spa"),
        ("health", "Salud / Clínica"),
        ("fitness", "Gimnasio / Fitness"),
        ("professional", "Servicios Profesionales"),
        ("education", "Educación / Academia"),
        ("automotive", "Automotriz / Taller"),
        ("real_estate", "Inmobiliaria"),
        ("events", "Eventos / Catering"),
        ("pet", "Mascotas / Veterinaria"),
        ("tech", "Tecnología / Startup"),
        ("creative", "Creativo / Agencia"),
        ("consulting", "Consultoría"),
        ("generic", "Negocio General"),
    ]

    name = models.CharField(
        "Nombre", max_length=100, help_text="Nombre visible del template (ej: 'Restaurante Moderno')"
    )
    slug = models.SlugField("Slug", max_length=100, unique=True, help_text="Identificador único del template")
    industry = models.ForeignKey(
        "Industry",
        on_delete=models.PROTECT,
        related_name="templates",
        null=True,
        verbose_name="Industria",
        help_text="Industria a la que pertenece el template",
    )
    description = models.TextField("Descripción", help_text="Descripción del template para el usuario")

    # Previsualización
    preview_image = models.ImageField("Imagen de vista previa", upload_to="templates/previews/", blank=True, null=True)
    preview_url = models.URLField(
        "URL de demo", blank=True, help_text="URL a un sitio de demostración de este template"
    )

    # Estructura del template (JSON)
    # Define las secciones disponibles y su estructura
    structure_schema = models.JSONField(
        "Esquema de estructura",
        default=dict,
        help_text="""
        Define las secciones del template. Ejemplo:
        {
            "sections": [
                {"id": "hero", "name": "Encabezado Principal", "required": true},
                {"id": "about", "name": "Sobre Nosotros", "required": false},
                {"id": "services", "name": "Servicios", "required": false},
                {"id": "gallery", "name": "Galería", "required": false},
                {"id": "testimonials", "name": "Testimonios", "required": false},
                {"id": "contact", "name": "Contacto", "required": true}
            ]
        }
        """,
    )

    # Instrucciones para la IA
    ai_system_prompt = models.TextField(
        "Prompt del sistema para IA",
        blank=True,
        help_text="""
        Instrucciones base para la IA al generar contenido para este template.
        Incluye contexto de la industria, tono recomendado, etc.
        """,
    )

    # Configuración visual base (colores, fuentes recomendadas)
    default_theme = models.JSONField(
        "Tema por defecto",
        default=dict,
        help_text="""
        Configuración visual base. Ejemplo:
        {
            "primary_color": "#3b82f6",
            "secondary_color": "#10b981",
            "font_heading": "Poppins",
            "font_body": "Inter",
            "style": "modern"
        }
        """,
    )

    # Metadata
    is_active = models.BooleanField("Activo", default=True)
    is_premium = models.BooleanField(
        "Premium", default=False, help_text="Los templates premium requieren módulos adicionales"
    )
    sort_order = models.PositiveIntegerField("Orden", default=0)

    created_at = models.DateTimeField("Creado", auto_now_add=True)
    updated_at = models.DateTimeField("Actualizado", auto_now=True)

    class Meta:
        verbose_name = "Template de Sitio Web"
        verbose_name_plural = "Templates de Sitio Web"
        ordering = ["sort_order", "industry__sort_order", "name"]

    def __str__(self):
        industry_label = self.industry.label if self.industry_id else "Sin industria"
        return f"{self.name} ({industry_label})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class OnboardingQuestion(models.Model):
    """
    Preguntas del cuestionario de onboarding.

    Pueden ser genéricas (para todos los templates) o específicas de un template.
    Las respuestas alimentan a la IA para generar contenido personalizado.
    """

    QUESTION_TYPES = [
        ("text", "Texto corto"),
        ("textarea", "Texto largo"),
        ("choice", "Opción única"),
        ("multi_choice", "Opción múltiple"),
        ("color", "Selector de color"),
        ("image", "Carga de imagen"),
        ("number", "Número"),
        ("url", "URL"),
    ]

    INPUT_TYPES = [
        ("textarea", "Área de texto"),
        ("input", "Campo de texto"),
        ("multiselect", "Selección múltiple"),
        ("modules", "Selector de módulos"),
        ("style_select", "Selector de estilo visual"),
        ("color_picker", "Selector de colores"),
        ("tone_select", "Selector de tono"),
    ]

    template = models.ForeignKey(
        WebsiteTemplate,
        on_delete=models.CASCADE,
        related_name="questions",
        null=True,
        blank=True,
        help_text="Dejar vacío para preguntas genéricas (todas las plantillas)",
    )

    question_key = models.SlugField(
        "Clave", max_length=50, help_text="Identificador único (ej: 'business_name', 'main_service')"
    )
    question_text = models.CharField("Pregunta", max_length=255, help_text="Texto que verá el usuario")
    question_type = models.CharField("Tipo", max_length=20, choices=QUESTION_TYPES, default="text")

    # Para preguntas tipo choice/multi_choice
    options = models.JSONField(
        "Opciones", default=list, blank=True, help_text='Lista de opciones. Ej: ["Opción 1", "Opción 2"]'
    )

    # Placeholder y validación
    placeholder = models.CharField(
        "Placeholder", max_length=255, blank=True, help_text="Texto de ayuda dentro del campo"
    )
    help_text = models.TextField("Texto de ayuda", blank=True, help_text="Explicación adicional debajo del campo")

    # Para la IA
    ai_context = models.TextField(
        "Contexto para IA",
        blank=True,
        help_text="""
        Describe qué información aporta esta pregunta y cómo debe usarla la IA.
        Ej: "Este es el nombre del negocio. Úsalo como título principal
        y menciona el nombre en textos de bienvenida."
        """,
    )

    # Validación
    is_required = models.BooleanField("Obligatoria", default=False)
    min_length = models.PositiveIntegerField("Longitud mínima", default=0)
    max_length = models.PositiveIntegerField("Longitud máxima", default=500)

    # Orden
    section = models.CharField(
        "Sección", max_length=50, default="basic", help_text="Agrupa preguntas: basic, branding, content, contact"
    )
    sort_order = models.PositiveIntegerField("Orden", default=0)

    is_active = models.BooleanField("Activa", default=True)

    # --- Campos para onboarding conversacional (Pipe) ---
    message = models.CharField(
        "Mensaje de Pipe",
        max_length=300,
        blank=True,
        help_text="Lo que Pipe pregunta al usuario en el chat conversacional",
    )
    input_type = models.CharField(
        "Tipo de input UI",
        max_length=20,
        choices=INPUT_TYPES,
        default="input",
        help_text="Tipo de componente en la interfaz de onboarding",
    )
    hint = models.CharField(
        "Hint",
        max_length=200,
        blank=True,
        help_text="Texto de ayuda debajo del campo",
    )
    required_modules = models.ManyToManyField(
        "core.PlatformModule",
        blank=True,
        related_name="onboarding_questions",
        verbose_name="Módulos requeridos",
        help_text="Si vacío, la pregunta siempre se muestra. Si tiene módulos, solo si el usuario los seleccionó.",
    )

    class Meta:
        verbose_name = "Pregunta de Onboarding"
        verbose_name_plural = "Preguntas de Onboarding"
        ordering = ["section", "sort_order"]
        unique_together = [["template", "question_key"]]

    def __str__(self):
        template_name = self.template.name if self.template else "Genérica"
        return f"{self.question_key} ({template_name})"


class WebsiteConfig(models.Model):
    """
    Configuración del sitio web de un tenant.

    Almacena todas las personalizaciones y contenido generado.
    Es el resultado del proceso de onboarding + generación IA.
    """

    STATUS_CHOICES = [
        ("draft", "Borrador"),
        ("onboarding", "En Onboarding"),
        ("generating", "Generando con IA"),
        ("review", "En Revisión"),
        ("published", "Publicado"),
    ]

    tenant = models.OneToOneField(
        "core.Tenant", on_delete=models.CASCADE, related_name="website_config", verbose_name="Tenant"
    )
    template = models.ForeignKey(
        WebsiteTemplate, on_delete=models.PROTECT, related_name="websites", verbose_name="Template"
    )

    status = models.CharField("Estado", max_length=20, choices=STATUS_CHOICES, default="draft")

    # Contenido generado/personalizado
    # Estructura: {"section_id": {"title": "...", "content": "...", ...}}
    content_data = models.JSONField(
        "Contenido del sitio", default=dict, help_text="Contenido de todas las secciones del sitio"
    )

    # Páginas habilitadas (derivadas de la selección del onboarding)
    enabled_pages = models.JSONField(
        "Páginas habilitadas",
        default=list,
        blank=True,
        help_text='IDs de páginas habilitadas. Ej: ["about","services","faq"]',
    )

    # Tema visual personalizado
    theme_data = models.JSONField(
        "Configuración del tema", default=dict, help_text="Colores, fuentes y estilos personalizados"
    )

    # Imágenes y media
    # Referencias a archivos subidos
    media_data = models.JSONField(
        "Media del sitio", default=dict, help_text="Referencias a imágenes y archivos del sitio"
    )

    # Estructura multi-página
    # Reemplaza content_data + enabled_pages en la nueva arquitectura
    # Estructura:
    # {
    #   "global": { "sections": ["header","footer"], "content": {...} },
    #   "pages": [
    #     { "id": "home", "slug": "/", "name": "Inicio", "order": 0,
    #       "sections": ["hero","testimonials"], "content": {...}, "seo": {...} },
    #     { "id": "about", "slug": "/nosotros", "name": "Nosotros", ... }
    #   ]
    # }
    pages_data = models.JSONField(
        "Estructura de páginas",
        default=dict,
        blank=True,
        help_text="Estructura multi-página: global (header/footer) + páginas con sus secciones",
    )

    # SEO
    seo_data = models.JSONField("Datos SEO", default=dict, help_text="Meta títulos, descripciones, keywords")

    # Snapshot de datos publicados
    # Se llena al publicar con copia de content_data, theme_data, etc.
    published_data = models.JSONField(
        "Datos publicados", default=dict, blank=True, help_text="Snapshot de todos los datos al momento de publicar"
    )

    # Dominio personalizado
    custom_domain = models.CharField(
        "Dominio personalizado",
        max_length=255,
        blank=True,
        help_text="Dominio propio del cliente (requiere configuración DNS)",
    )
    subdomain = models.SlugField(
        "Subdominio", max_length=50, blank=True, help_text="Subdominio en nerbis (ej: minegocio.nerbis.com)"
    )

    # Celery task tracking
    generation_task_id = models.CharField(
        "ID de tarea Celery",
        max_length=255,
        null=True,
        blank=True,
        help_text="ID de la tarea Celery activa de generación",
    )

    # Tracking
    ai_generations_count = models.PositiveIntegerField(
        "Generaciones IA usadas", default=0, help_text="Contador de generaciones de IA este mes"
    )
    last_generation_at = models.DateTimeField("Última generación", null=True, blank=True)

    # Fechas
    published_at = models.DateTimeField("Publicado", null=True, blank=True)
    created_at = models.DateTimeField("Creado", auto_now_add=True)
    updated_at = models.DateTimeField("Actualizado", auto_now=True)

    class Meta:
        verbose_name = "Configuración de Sitio Web"
        verbose_name_plural = "Configuraciones de Sitios Web"

    def __str__(self):
        return f"Sitio de {self.tenant.name}"

    @property
    def is_published(self):
        return self.status == "published"

    @property
    def has_unpublished_changes(self):
        """True si los datos del editor difieren del último snapshot publicado."""
        if not self.published_data:
            return bool(self.content_data or self.theme_data)
        current = {
            "content_data": self.content_data,
            "theme_data": self.theme_data,
            "pages_data": self.pages_data,
            "seo_data": self.seo_data,
            "media_data": self.media_data,
        }
        published = {
            "content_data": self.published_data.get("content_data", {}),
            "theme_data": self.published_data.get("theme_data", {}),
            "pages_data": self.published_data.get("pages_data", {}),
            "seo_data": self.published_data.get("seo_data", {}),
            "media_data": self.published_data.get("media_data", {}),
        }
        return current != published

    @property
    def public_url(self):
        """URL pública del sitio."""
        from django.conf import settings

        domain = settings.PLATFORM_BASE_DOMAIN
        if self.custom_domain:
            return f"https://{self.custom_domain}"
        if self.subdomain:
            return f"https://{self.subdomain}.{domain}"
        return f"https://{self.tenant.slug}.{domain}"


class OnboardingResponse(models.Model):
    """
    Respuestas del usuario al cuestionario de onboarding.

    Se guardan individualmente para tracking y regeneración.
    """

    website_config = models.ForeignKey(WebsiteConfig, on_delete=models.CASCADE, related_name="responses")
    question = models.ForeignKey(OnboardingQuestion, on_delete=models.PROTECT, related_name="responses")

    # Valor de la respuesta (puede ser string, array, etc.)
    response_value = models.JSONField("Respuesta", help_text="Valor de la respuesta en formato JSON")

    created_at = models.DateTimeField("Creado", auto_now_add=True)
    updated_at = models.DateTimeField("Actualizado", auto_now=True)

    class Meta:
        verbose_name = "Respuesta de Onboarding"
        verbose_name_plural = "Respuestas de Onboarding"
        unique_together = [["website_config", "question"]]

    def __str__(self):
        return f"{self.question.question_key}: {self.response_value}"


class AIGenerationLog(models.Model):
    """
    Registro de generaciones de IA para billing y auditoría.

    Cada vez que se usa IA para generar o editar contenido,
    se registra aquí para facturación.
    """

    GENERATION_TYPES = [
        ("initial", "Generación Inicial"),
        ("quick_start", "Inicio Rápido"),
        ("regenerate_section", "Regenerar Sección"),
        ("edit_content", "Editar Contenido"),
        ("generate_images", "Generar Imágenes"),
        ("seo_optimization", "Optimización SEO"),
        ("classify_industry", "Clasificar Industria"),
        ("suggest_colors", "Sugerir Colores"),
    ]

    tenant = models.ForeignKey("core.Tenant", on_delete=models.CASCADE, related_name="ai_generation_logs")
    website_config = models.ForeignKey(
        WebsiteConfig, on_delete=models.SET_NULL, related_name="ai_logs", null=True, blank=True
    )

    generation_type = models.CharField("Tipo de generación", max_length=30, choices=GENERATION_TYPES)

    # Detalle de la generación
    section_id = models.CharField("Sección", max_length=50, blank=True, help_text="ID de la sección afectada")
    prompt_summary = models.TextField(
        "Resumen del prompt", blank=True, help_text="Versión resumida del prompt usado (sin datos sensibles)"
    )

    # Captura completa para análisis
    full_prompt = models.TextField(
        "Prompt completo", blank=True, help_text="System prompt + user prompt enviado a la IA"
    )
    raw_response = models.TextField(
        "Respuesta cruda de la IA", blank=True, help_text="Texto completo devuelto por la IA antes de parsear"
    )
    onboarding_snapshot = models.JSONField(
        "Datos del onboarding",
        default=dict,
        blank=True,
        help_text="Snapshot de las respuestas del onboarding usadas en la generación",
    )

    # Métricas de uso
    model_used = models.CharField(
        "Modelo usado", max_length=50, default="claude-3-haiku", help_text="Modelo de IA usado"
    )
    tokens_input = models.PositiveIntegerField("Tokens de entrada", default=0)
    tokens_output = models.PositiveIntegerField("Tokens de salida", default=0)

    # Costo estimado (en COP)
    cost_estimated = models.DecimalField("Costo estimado (COP)", max_digits=10, decimal_places=2, default=Decimal("0"))

    # Estado
    is_successful = models.BooleanField("Exitoso", default=True)
    error_message = models.TextField("Error", blank=True)

    # Para billing
    is_billable = models.BooleanField(
        "Facturable", default=False, help_text="True si excede el límite mensual incluido"
    )
    billed_in_invoice = models.ForeignKey(
        "billing.Invoice", on_delete=models.SET_NULL, null=True, blank=True, related_name="ai_generations"
    )

    created_at = models.DateTimeField("Creado", auto_now_add=True)

    class Meta:
        verbose_name = "Registro de Generación IA"
        verbose_name_plural = "Registros de Generaciones IA"
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.get_generation_type_display()} - {self.tenant.name} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
        )

    @property
    def total_tokens(self):
        return self.tokens_input + self.tokens_output


class IndustryClassification(models.Model):
    """
    Dataset etiquetado de clasificaciones de industria.

    Modelo GLOBAL (no tenant-aware) — registra cada decisión del modelo
    (Haiku) más la confirmación/corrección del usuario durante el onboarding.
    El objetivo es construir un dataset propio ``(descripción, módulos) ->
    industria confirmada`` para:
      1. Resolver clasificaciones repetidas desde caché (sin gastar tokens).
      2. A futuro, entrenar un clasificador propio de NERBIS.

    ``final_key`` es el ground truth (lo que el usuario aceptó). Las filas con
    ``user_action='confirmed'`` y confianza alta alimentan la caché.
    """

    SOURCE_CHOICES = [
        ("haiku", "Haiku (IA)"),
        ("cache", "Caché (dataset propio)"),
        ("mock", "Mock (sin IA)"),
    ]

    USER_ACTION_CHOICES = [
        ("pending", "Pendiente"),
        ("confirmed", "Confirmada"),
        ("corrected", "Corregida"),
    ]

    tenant = models.ForeignKey("core.Tenant", on_delete=models.CASCADE, related_name="industry_classifications")

    # ── Input (features) ────────────────────────────────────────────
    business_description = models.TextField("Descripción del negocio")
    selected_modules = models.JSONField("Módulos seleccionados", default=list, blank=True)
    description_normalized = models.CharField(
        "Descripción normalizada",
        max_length=255,
        db_index=True,
        blank=True,
        help_text="Slug del texto para deduplicar / lookup de caché",
    )

    # ── Predicción del modelo ───────────────────────────────────────
    predicted_key = models.CharField("Industria predicha (key)", max_length=50)
    predicted_label = models.CharField("Industria predicha (label)", max_length=120)
    predicted_confidence = models.FloatField("Confianza", default=0.0)
    is_new = models.BooleanField(
        "Industria nueva", default=False, help_text="True si la IA propuso una industria nueva"
    )
    source = models.CharField("Origen de la predicción", max_length=10, choices=SOURCE_CHOICES, default="haiku")

    # ── Feedback humano (ground truth) ──────────────────────────────
    user_action = models.CharField("Acción del usuario", max_length=10, choices=USER_ACTION_CHOICES, default="pending")
    final_key = models.CharField("Industria final (key)", max_length=50, blank=True)
    final_label = models.CharField("Industria final (label)", max_length=120, blank=True)
    correction_text = models.TextField(
        "Texto de corrección", blank=True, help_text="Lo que escribió el usuario al corregir"
    )

    # ── Costo asociado ──────────────────────────────────────────────
    model_used = models.CharField("Modelo usado", max_length=50, blank=True)
    tokens_input = models.PositiveIntegerField("Tokens de entrada", default=0)
    tokens_output = models.PositiveIntegerField("Tokens de salida", default=0)

    created_at = models.DateTimeField("Creado", auto_now_add=True)
    confirmed_at = models.DateTimeField("Confirmado", null=True, blank=True)

    class Meta:
        verbose_name = "Clasificación de Industria"
        verbose_name_plural = "Clasificaciones de Industria"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["description_normalized", "user_action"]),
        ]

    def __str__(self):
        return f"{self.business_description[:40]} -> {self.final_key or self.predicted_key} ({self.user_action})"

    @property
    def total_tokens(self):
        return self.tokens_input + self.tokens_output


class ChatMessage(models.Model):
    """
    Historial de mensajes del chat de edición con IA.

    Guarda la conversación para mantener contexto y permitir
    que la IA entienda el historial de cambios.
    """

    ROLE_CHOICES = [
        ("user", "Usuario"),
        ("assistant", "Asistente IA"),
        ("system", "Sistema"),
    ]

    website_config = models.ForeignKey(
        WebsiteConfig, on_delete=models.CASCADE, related_name="chat_messages", verbose_name="Configuración del sitio"
    )

    role = models.CharField("Rol", max_length=20, choices=ROLE_CHOICES, help_text="Quién envió el mensaje")
    content = models.TextField("Contenido", help_text="Contenido del mensaje")

    # Metadata del mensaje
    section_id = models.CharField(
        "Sección afectada", max_length=50, blank=True, help_text="ID de la sección que se estaba editando"
    )

    # Para mensajes del asistente, guardar qué cambios se hicieron
    changes_made = models.JSONField(
        "Cambios realizados", default=dict, blank=True, help_text="Resumen de los cambios aplicados por este mensaje"
    )

    # Tracking de tokens (solo para mensajes de asistente)
    tokens_used = models.PositiveIntegerField(
        "Tokens usados", default=0, help_text="Tokens consumidos en esta interacción"
    )

    created_at = models.DateTimeField("Creado", auto_now_add=True)

    class Meta:
        verbose_name = "Mensaje de Chat"
        verbose_name_plural = "Mensajes de Chat"
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.role}] {self.content[:50]}..."


class WebsitePage(models.Model):
    """
    Pagina configurable para sitios web.

    Define las paginas disponibles en el onboarding.
    Es un modelo GLOBAL, no pertenece a ningun tenant.
    """

    key = models.CharField(
        max_length=50,
        unique=True,
        help_text="Identificador ej: about",
    )
    label = models.CharField(
        max_length=100,
        help_text="Nombre visible ej: Sobre nosotros",
    )
    description = models.CharField(
        max_length=200,
        blank=True,
        help_text="Descripcion corta de la pagina",
    )
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Nombre del icono Lucide",
    )
    is_mandatory = models.BooleanField(
        default=False,
        help_text="No se puede quitar (Home, Contacto)",
    )
    is_default = models.BooleanField(
        default=False,
        help_text="Preseleccionada en onboarding",
    )
    sort_order = models.IntegerField(
        default=0,
        help_text="Orden de la pagina en el listado",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Si esta disponible para seleccion",
    )
    auto_include_modules = models.ManyToManyField(
        "core.PlatformModule",
        blank=True,
        related_name="auto_pages",
        help_text="Se incluye automaticamente si el usuario selecciona estos modulos",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "label"]
        verbose_name = "Pagina de sitio web"
        verbose_name_plural = "Paginas de sitio web"

    def __str__(self):
        return self.label


class WebsiteSection(models.Model):
    """
    Seccion configurable para paginas de sitio web.

    Modelo GLOBAL, no pertenece a ningun tenant.
    page=NULL significa seccion de Home.
    """

    key = models.CharField(max_length=50, unique=True, help_text="Identificador ej: testimonials")
    label = models.CharField(max_length=100, help_text="Nombre visible ej: Testimonios")
    description = models.CharField(max_length=200, blank=True, help_text="Descripcion corta")
    page = models.ForeignKey(
        WebsitePage,
        on_delete=models.SET_NULL,
        related_name="sections",
        null=True,
        blank=True,
        help_text="Pagina a la que pertenece. NULL = seccion de Home",
    )
    is_default = models.BooleanField(default=False, help_text="La IA la incluye por defecto")
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "label"]
        verbose_name = "Seccion de sitio web"
        verbose_name_plural = "Secciones de sitio web"

    def __str__(self):
        page_label = self.page.label if self.page else "Home"
        return f"{self.label} ({page_label})"


class SectionVariant(models.Model):
    """Variante visual para una seccion de sitio web.
    Modelo GLOBAL — permite al superadmin definir opciones de diseno
    que la IA puede elegir al generar un sitio."""

    MOOD_CHOICES = [
        ("professional", "Profesional"),
        ("playful", "Lúdico"),
        ("elegant", "Elegante"),
        ("bold", "Audaz"),
        ("minimal", "Minimalista"),
    ]

    section = models.ForeignKey(
        "WebsiteSection",
        on_delete=models.CASCADE,
        related_name="variants",
        verbose_name="Sección",
    )
    # El `key` es el token BARE que consume el renderer (`_render_<section>_<key>`)
    # y el frontend (`switch (variant)`). Los tokens colisionan entre secciones
    # (ej. `grid-cards` en services+products), así que la unicidad es COMPUESTA
    # por (section, key), no global.
    key = models.SlugField("Clave", max_length=80)
    label = models.CharField("Etiqueta", max_length=100)
    description = models.TextField("Descripción", blank=True)
    css_class_hint = models.CharField("Clase CSS sugerida", max_length=100, blank=True)
    preview_url = models.URLField("URL de preview", blank=True)
    tags = models.JSONField("Tags", default=list, blank=True)
    industries = models.ManyToManyField(
        "Industry",
        related_name="section_variants",
        blank=True,
        verbose_name="Industrias",
    )
    mood = models.CharField("Mood", max_length=20, choices=MOOD_CHOICES, default="professional")
    is_default = models.BooleanField("Por defecto", default=False)
    is_active = models.BooleanField("Activa", default=True)
    sort_order = models.PositiveIntegerField("Orden", default=0)
    created_at = models.DateTimeField("Creado", auto_now_add=True)
    updated_at = models.DateTimeField("Actualizado", auto_now=True)

    class Meta:
        verbose_name = "Variante de sección"
        verbose_name_plural = "Variantes de sección"
        ordering = ["section", "sort_order", "label"]
        constraints = [
            models.UniqueConstraint(
                fields=["section", "key"],
                name="uq_sectionvariant_section_key",
            ),
        ]

    def __str__(self):
        return f"{self.label} ({self.section.key})"


class PromptBlock(models.Model):
    """Bloque reutilizable de prompt para la IA.
    Modelo GLOBAL — los superadmins componen el system prompt
    ensamblando bloques por categoria y scope."""

    CATEGORY_CHOICES = [
        ("system", "Sistema"),
        ("business", "Negocio"),
        ("visual", "Visual"),
        ("section", "Secciones"),
        ("rules", "Reglas"),
    ]

    SCOPE_CHOICES = [
        ("global", "Global"),
        ("template", "Template específico"),
        ("industry", "Industria específica"),
    ]

    key = models.SlugField("Clave", max_length=80, unique=True)
    label = models.CharField("Etiqueta", max_length=100)
    content = models.TextField("Contenido")
    category = models.CharField("Categoría", max_length=20, choices=CATEGORY_CHOICES, default="system")
    scope = models.CharField("Alcance", max_length=20, choices=SCOPE_CHOICES, default="global")
    template = models.ForeignKey(
        "WebsiteTemplate",
        on_delete=models.CASCADE,
        related_name="prompt_blocks",
        null=True,
        blank=True,
    )
    industry = models.ForeignKey(
        "Industry",
        on_delete=models.SET_NULL,
        related_name="prompt_blocks",
        null=True,
        blank=True,
        verbose_name="Industria",
    )
    sort_order = models.PositiveIntegerField("Orden", default=0)
    is_active = models.BooleanField("Activo", default=True)
    created_at = models.DateTimeField("Creado", auto_now_add=True)
    updated_at = models.DateTimeField("Actualizado", auto_now=True)

    class Meta:
        verbose_name = "Bloque de prompt"
        verbose_name_plural = "Bloques de prompt"
        ordering = ["category", "sort_order", "key"]

    def __str__(self):
        scope_label = f" [{self.scope}]" if self.scope != "global" else ""
        return f"{self.label} ({self.get_category_display()}){scope_label}"
