# backend/websites/models.py
"""
Sistema de Website Builder para GRAVITIFY.

Este módulo gestiona:
- Templates de sitio web por industria
- Configuración personalizada de cada tenant
- Cuestionario de onboarding
- Tracking de generaciones de IA
"""

from django.db import models
from django.utils.text import slugify
from decimal import Decimal


class WebsiteTemplate(models.Model):
    """
    Plantilla base de sitio web por industria.

    Cada plantilla define:
    - La estructura visual (secciones, layout)
    - Los campos que el usuario debe completar
    - Las instrucciones para la IA sobre cómo generar contenido
    """

    INDUSTRY_CHOICES = [
        ('restaurant', 'Restaurante / Café'),
        ('retail', 'Tienda / Retail'),
        ('beauty', 'Salón de Belleza / Spa'),
        ('health', 'Salud / Clínica'),
        ('fitness', 'Gimnasio / Fitness'),
        ('professional', 'Servicios Profesionales'),
        ('education', 'Educación / Academia'),
        ('automotive', 'Automotriz / Taller'),
        ('real_estate', 'Inmobiliaria'),
        ('events', 'Eventos / Catering'),
        ('pet', 'Mascotas / Veterinaria'),
        ('tech', 'Tecnología / Startup'),
        ('creative', 'Creativo / Agencia'),
        ('consulting', 'Consultoría'),
        ('generic', 'Negocio General'),
    ]

    name = models.CharField(
        'Nombre',
        max_length=100,
        help_text="Nombre visible del template (ej: 'Restaurante Moderno')"
    )
    slug = models.SlugField(
        'Slug',
        max_length=100,
        unique=True,
        help_text="Identificador único del template"
    )
    industry = models.CharField(
        'Industria',
        max_length=50,
        choices=INDUSTRY_CHOICES,
        default='generic'
    )
    description = models.TextField(
        'Descripción',
        help_text="Descripción del template para el usuario"
    )

    # Previsualización
    preview_image = models.ImageField(
        'Imagen de vista previa',
        upload_to='templates/previews/',
        blank=True,
        null=True
    )
    preview_url = models.URLField(
        'URL de demo',
        blank=True,
        help_text="URL a un sitio de demostración de este template"
    )

    # Estructura del template (JSON)
    # Define las secciones disponibles y su estructura
    structure_schema = models.JSONField(
        'Esquema de estructura',
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
        """
    )

    # Instrucciones para la IA
    ai_system_prompt = models.TextField(
        'Prompt del sistema para IA',
        blank=True,
        help_text="""
        Instrucciones base para la IA al generar contenido para este template.
        Incluye contexto de la industria, tono recomendado, etc.
        """
    )

    # Configuración visual base (colores, fuentes recomendadas)
    default_theme = models.JSONField(
        'Tema por defecto',
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
        """
    )

    # Metadata
    is_active = models.BooleanField('Activo', default=True)
    is_premium = models.BooleanField(
        'Premium',
        default=False,
        help_text="Los templates premium requieren módulos adicionales"
    )
    sort_order = models.PositiveIntegerField('Orden', default=0)

    created_at = models.DateTimeField('Creado', auto_now_add=True)
    updated_at = models.DateTimeField('Actualizado', auto_now=True)

    class Meta:
        verbose_name = 'Template de Sitio Web'
        verbose_name_plural = 'Templates de Sitio Web'
        ordering = ['sort_order', 'industry', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_industry_display()})"

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
        ('text', 'Texto corto'),
        ('textarea', 'Texto largo'),
        ('choice', 'Opción única'),
        ('multi_choice', 'Opción múltiple'),
        ('color', 'Selector de color'),
        ('image', 'Carga de imagen'),
        ('number', 'Número'),
        ('url', 'URL'),
    ]

    template = models.ForeignKey(
        WebsiteTemplate,
        on_delete=models.CASCADE,
        related_name='questions',
        null=True,
        blank=True,
        help_text="Dejar vacío para preguntas genéricas (todas las plantillas)"
    )

    question_key = models.SlugField(
        'Clave',
        max_length=50,
        help_text="Identificador único (ej: 'business_name', 'main_service')"
    )
    question_text = models.CharField(
        'Pregunta',
        max_length=255,
        help_text="Texto que verá el usuario"
    )
    question_type = models.CharField(
        'Tipo',
        max_length=20,
        choices=QUESTION_TYPES,
        default='text'
    )

    # Para preguntas tipo choice/multi_choice
    options = models.JSONField(
        'Opciones',
        default=list,
        blank=True,
        help_text='Lista de opciones. Ej: ["Opción 1", "Opción 2"]'
    )

    # Placeholder y validación
    placeholder = models.CharField(
        'Placeholder',
        max_length=255,
        blank=True,
        help_text="Texto de ayuda dentro del campo"
    )
    help_text = models.TextField(
        'Texto de ayuda',
        blank=True,
        help_text="Explicación adicional debajo del campo"
    )

    # Para la IA
    ai_context = models.TextField(
        'Contexto para IA',
        blank=True,
        help_text="""
        Describe qué información aporta esta pregunta y cómo debe usarla la IA.
        Ej: "Este es el nombre del negocio. Úsalo como título principal
        y menciona el nombre en textos de bienvenida."
        """
    )

    # Validación
    is_required = models.BooleanField('Obligatoria', default=False)
    min_length = models.PositiveIntegerField('Longitud mínima', default=0)
    max_length = models.PositiveIntegerField('Longitud máxima', default=500)

    # Orden
    section = models.CharField(
        'Sección',
        max_length=50,
        default='basic',
        help_text="Agrupa preguntas: basic, branding, content, contact"
    )
    sort_order = models.PositiveIntegerField('Orden', default=0)

    is_active = models.BooleanField('Activa', default=True)

    class Meta:
        verbose_name = 'Pregunta de Onboarding'
        verbose_name_plural = 'Preguntas de Onboarding'
        ordering = ['section', 'sort_order']
        unique_together = [['template', 'question_key']]

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
        ('draft', 'Borrador'),
        ('onboarding', 'En Onboarding'),
        ('generating', 'Generando con IA'),
        ('review', 'En Revisión'),
        ('published', 'Publicado'),
    ]

    tenant = models.OneToOneField(
        'core.Tenant',
        on_delete=models.CASCADE,
        related_name='website_config',
        verbose_name='Tenant'
    )
    template = models.ForeignKey(
        WebsiteTemplate,
        on_delete=models.PROTECT,
        related_name='websites',
        verbose_name='Template'
    )

    status = models.CharField(
        'Estado',
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )

    # Contenido generado/personalizado
    # Estructura: {"section_id": {"title": "...", "content": "...", ...}}
    content_data = models.JSONField(
        'Contenido del sitio',
        default=dict,
        help_text="Contenido de todas las secciones del sitio"
    )

    # Páginas habilitadas (derivadas de la selección del onboarding)
    enabled_pages = models.JSONField(
        'Páginas habilitadas',
        default=list,
        blank=True,
        help_text='IDs de páginas habilitadas. Ej: ["about","services","faq"]'
    )

    # Tema visual personalizado
    theme_data = models.JSONField(
        'Configuración del tema',
        default=dict,
        help_text="Colores, fuentes y estilos personalizados"
    )

    # Imágenes y media
    # Referencias a archivos subidos
    media_data = models.JSONField(
        'Media del sitio',
        default=dict,
        help_text="Referencias a imágenes y archivos del sitio"
    )

    # SEO
    seo_data = models.JSONField(
        'Datos SEO',
        default=dict,
        help_text="Meta títulos, descripciones, keywords"
    )

    # Dominio personalizado
    custom_domain = models.CharField(
        'Dominio personalizado',
        max_length=255,
        blank=True,
        help_text="Dominio propio del cliente (requiere configuración DNS)"
    )
    subdomain = models.SlugField(
        'Subdominio',
        max_length=50,
        blank=True,
        help_text="Subdominio en graviti (ej: minegocio.graviti.co)"
    )

    # Tracking
    ai_generations_count = models.PositiveIntegerField(
        'Generaciones IA usadas',
        default=0,
        help_text="Contador de generaciones de IA este mes"
    )
    last_generation_at = models.DateTimeField(
        'Última generación',
        null=True,
        blank=True
    )

    # Fechas
    published_at = models.DateTimeField('Publicado', null=True, blank=True)
    created_at = models.DateTimeField('Creado', auto_now_add=True)
    updated_at = models.DateTimeField('Actualizado', auto_now=True)

    class Meta:
        verbose_name = 'Configuración de Sitio Web'
        verbose_name_plural = 'Configuraciones de Sitios Web'

    def __str__(self):
        return f"Sitio de {self.tenant.name}"

    @property
    def is_published(self):
        return self.status == 'published'

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

    website_config = models.ForeignKey(
        WebsiteConfig,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    question = models.ForeignKey(
        OnboardingQuestion,
        on_delete=models.PROTECT,
        related_name='responses'
    )

    # Valor de la respuesta (puede ser string, array, etc.)
    response_value = models.JSONField(
        'Respuesta',
        help_text="Valor de la respuesta en formato JSON"
    )

    created_at = models.DateTimeField('Creado', auto_now_add=True)
    updated_at = models.DateTimeField('Actualizado', auto_now=True)

    class Meta:
        verbose_name = 'Respuesta de Onboarding'
        verbose_name_plural = 'Respuestas de Onboarding'
        unique_together = [['website_config', 'question']]

    def __str__(self):
        return f"{self.question.question_key}: {self.response_value}"


class AIGenerationLog(models.Model):
    """
    Registro de generaciones de IA para billing y auditoría.

    Cada vez que se usa IA para generar o editar contenido,
    se registra aquí para facturación.
    """

    GENERATION_TYPES = [
        ('initial', 'Generación Inicial'),
        ('regenerate_section', 'Regenerar Sección'),
        ('edit_content', 'Editar Contenido'),
        ('generate_images', 'Generar Imágenes'),
        ('seo_optimization', 'Optimización SEO'),
    ]

    tenant = models.ForeignKey(
        'core.Tenant',
        on_delete=models.CASCADE,
        related_name='ai_generation_logs'
    )
    website_config = models.ForeignKey(
        WebsiteConfig,
        on_delete=models.CASCADE,
        related_name='ai_logs',
        null=True,
        blank=True
    )

    generation_type = models.CharField(
        'Tipo de generación',
        max_length=30,
        choices=GENERATION_TYPES
    )

    # Detalle de la generación
    section_id = models.CharField(
        'Sección',
        max_length=50,
        blank=True,
        help_text="ID de la sección afectada"
    )
    prompt_summary = models.TextField(
        'Resumen del prompt',
        blank=True,
        help_text="Versión resumida del prompt usado (sin datos sensibles)"
    )

    # Captura completa para análisis
    full_prompt = models.TextField(
        'Prompt completo',
        blank=True,
        help_text="System prompt + user prompt enviado a la IA"
    )
    raw_response = models.TextField(
        'Respuesta cruda de la IA',
        blank=True,
        help_text="Texto completo devuelto por la IA antes de parsear"
    )
    onboarding_snapshot = models.JSONField(
        'Datos del onboarding',
        default=dict,
        blank=True,
        help_text="Snapshot de las respuestas del onboarding usadas en la generación"
    )

    # Métricas de uso
    model_used = models.CharField(
        'Modelo usado',
        max_length=50,
        default='claude-3-haiku',
        help_text="Modelo de IA usado"
    )
    tokens_input = models.PositiveIntegerField(
        'Tokens de entrada',
        default=0
    )
    tokens_output = models.PositiveIntegerField(
        'Tokens de salida',
        default=0
    )

    # Costo estimado (en COP)
    cost_estimated = models.DecimalField(
        'Costo estimado (COP)',
        max_digits=10,
        decimal_places=2,
        default=Decimal('0')
    )

    # Estado
    is_successful = models.BooleanField('Exitoso', default=True)
    error_message = models.TextField('Error', blank=True)

    # Para billing
    is_billable = models.BooleanField(
        'Facturable',
        default=False,
        help_text="True si excede el límite mensual incluido"
    )
    billed_in_invoice = models.ForeignKey(
        'billing.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_generations'
    )

    created_at = models.DateTimeField('Creado', auto_now_add=True)

    class Meta:
        verbose_name = 'Registro de Generación IA'
        verbose_name_plural = 'Registros de Generaciones IA'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_generation_type_display()} - {self.tenant.name} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"

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
        ('user', 'Usuario'),
        ('assistant', 'Asistente IA'),
        ('system', 'Sistema'),
    ]

    website_config = models.ForeignKey(
        WebsiteConfig,
        on_delete=models.CASCADE,
        related_name='chat_messages',
        verbose_name='Configuración del sitio'
    )

    role = models.CharField(
        'Rol',
        max_length=20,
        choices=ROLE_CHOICES,
        help_text="Quién envió el mensaje"
    )
    content = models.TextField(
        'Contenido',
        help_text="Contenido del mensaje"
    )

    # Metadata del mensaje
    section_id = models.CharField(
        'Sección afectada',
        max_length=50,
        blank=True,
        help_text="ID de la sección que se estaba editando"
    )

    # Para mensajes del asistente, guardar qué cambios se hicieron
    changes_made = models.JSONField(
        'Cambios realizados',
        default=dict,
        blank=True,
        help_text="Resumen de los cambios aplicados por este mensaje"
    )

    # Tracking de tokens (solo para mensajes de asistente)
    tokens_used = models.PositiveIntegerField(
        'Tokens usados',
        default=0,
        help_text="Tokens consumidos en esta interacción"
    )

    created_at = models.DateTimeField('Creado', auto_now_add=True)

    class Meta:
        verbose_name = 'Mensaje de Chat'
        verbose_name_plural = 'Mensajes de Chat'
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:50]}..."
