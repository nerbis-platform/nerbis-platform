# backend/websites/admin.py
"""
Admin para el sistema de Website Builder.

Gestión de templates, configuraciones de sitios y tracking de IA.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from unfold.admin import ModelAdmin, TabularInline, StackedInline
from unfold.decorators import display
from core.admin_site import gravitify_admin_site
from .models import (
    WebsiteTemplate, OnboardingQuestion, WebsiteConfig,
    OnboardingResponse, AIGenerationLog, ChatMessage
)


# ===================================
# TEMPLATES DE SITIO WEB
# ===================================

class OnboardingQuestionInline(TabularInline):
    """Inline para preguntas específicas del template."""

    model = OnboardingQuestion
    extra = 0
    fields = ['question_key', 'question_text', 'question_type', 'section', 'sort_order', 'is_required', 'is_active']
    ordering = ['section', 'sort_order']


@admin.register(WebsiteTemplate, site=gravitify_admin_site)
class WebsiteTemplateAdmin(ModelAdmin):
    """Admin para gestionar templates de sitios web."""

    list_display = [
        'display_template',
        'industry',
        'display_status',
        'display_questions_count',
        'sort_order',
    ]
    list_filter = ['industry', 'is_active', 'is_premium']
    list_editable = ['sort_order']
    search_fields = ['name', 'slug', 'description']
    ordering = ['sort_order', 'industry']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [OnboardingQuestionInline]

    fieldsets = (
        ('Identificación', {
            'fields': ('name', 'slug', 'industry', 'description'),
        }),
        ('Vista Previa', {
            'fields': ('preview_image', 'preview_url'),
        }),
        ('Configuración Técnica', {
            'fields': ('structure_schema', 'default_theme'),
            'classes': ('collapse',),
        }),
        ('Configuración de IA', {
            'fields': ('ai_system_prompt',),
            'classes': ('collapse',),
        }),
        ('Estado', {
            'fields': ('is_active', 'is_premium', 'sort_order'),
        }),
    )

    @display(description='Template')
    def display_template(self, obj):
        premium_badge = mark_safe(' <span style="background: #f59e0b; color: white; padding: 1px 6px; border-radius: 4px; font-size: 10px;">PREMIUM</span>') if obj.is_premium else ''
        return format_html(
            '<strong>{}</strong>{}',
            obj.name, premium_badge
        )

    @display(description='Estado', boolean=True)
    def display_status(self, obj):
        return obj.is_active

    @display(description='Preguntas')
    def display_questions_count(self, obj):
        count = obj.questions.filter(is_active=True).count()
        return f'{count} preguntas'


# ===================================
# PREGUNTAS DE ONBOARDING
# ===================================

@admin.register(OnboardingQuestion, site=gravitify_admin_site)
class OnboardingQuestionAdmin(ModelAdmin):
    """Admin para gestionar preguntas de onboarding."""

    list_display = [
        'question_key',
        'question_text',
        'display_template',
        'question_type',
        'section',
        'is_required',
        'is_active',
        'sort_order',
    ]
    list_filter = ['template', 'question_type', 'section', 'is_required', 'is_active']
    list_editable = ['sort_order', 'is_active']
    search_fields = ['question_key', 'question_text']
    ordering = ['template', 'section', 'sort_order']

    fieldsets = (
        ('Pregunta', {
            'fields': ('template', 'question_key', 'question_text', 'question_type'),
        }),
        ('Opciones (para tipo choice)', {
            'fields': ('options',),
            'classes': ('collapse',),
        }),
        ('Ayuda al Usuario', {
            'fields': ('placeholder', 'help_text'),
        }),
        ('Contexto para IA', {
            'fields': ('ai_context',),
            'classes': ('collapse',),
        }),
        ('Validación', {
            'fields': ('is_required', 'min_length', 'max_length'),
        }),
        ('Organización', {
            'fields': ('section', 'sort_order', 'is_active'),
        }),
    )

    @display(description='Template')
    def display_template(self, obj):
        if obj.template:
            return obj.template.name
        return mark_safe('<span style="color: #6b7280;">Genérica</span>')


# ===================================
# CONFIGURACIÓN DE SITIOS WEB
# ===================================

class OnboardingResponseInline(TabularInline):
    """Inline para ver respuestas del onboarding."""

    model = OnboardingResponse
    extra = 0
    fields = ['question', 'response_value', 'updated_at']
    readonly_fields = ['question', 'response_value', 'updated_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class AIGenerationLogInline(TabularInline):
    """Inline para ver registros de generación de IA."""

    model = AIGenerationLog
    extra = 0
    fields = ['generation_type', 'section_id', 'tokens_input', 'tokens_output', 'is_billable', 'created_at']
    readonly_fields = ['generation_type', 'section_id', 'tokens_input', 'tokens_output', 'is_billable', 'created_at']
    can_delete = False
    max_num = 10
    ordering = ['-created_at']

    def has_add_permission(self, request, obj=None):
        return False


class ChatMessageInline(TabularInline):
    """Inline para ver historial de chat con IA."""

    model = ChatMessage
    extra = 0
    fields = ['role', 'display_content_preview', 'section_id', 'tokens_used', 'created_at']
    readonly_fields = ['role', 'display_content_preview', 'section_id', 'tokens_used', 'created_at']
    can_delete = False
    max_num = 20
    ordering = ['-created_at']

    def display_content_preview(self, obj):
        preview = obj.content[:100]
        if len(obj.content) > 100:
            preview += '...'
        return preview
    display_content_preview.short_description = 'Mensaje'

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(WebsiteConfig, site=gravitify_admin_site)
class WebsiteConfigAdmin(ModelAdmin):
    """Admin para gestionar configuraciones de sitios web de tenants."""

    list_display = [
        'tenant',
        'template',
        'display_status',
        'display_url',
        'display_ai_usage',
        'updated_at',
    ]
    list_filter = ['status', 'template']
    search_fields = ['tenant__name', 'subdomain', 'custom_domain']
    raw_id_fields = ['tenant']
    readonly_fields = ['ai_generations_count', 'display_ai_usage_detail', 'last_generation_at', 'published_at', 'created_at', 'updated_at']
    inlines = [OnboardingResponseInline, ChatMessageInline, AIGenerationLogInline]

    fieldsets = (
        ('Identificación', {
            'fields': ('tenant', 'template', 'status'),
        }),
        ('Dominio', {
            'fields': ('subdomain', 'custom_domain'),
        }),
        ('Contenido', {
            'fields': ('content_data', 'theme_data', 'media_data', 'seo_data'),
            'classes': ('collapse',),
        }),
        ('Uso de IA', {
            'fields': ('display_ai_usage_detail', 'last_generation_at'),
        }),
        ('Fechas', {
            'fields': ('published_at', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @display(description='Estado', ordering='status')
    def display_status(self, obj):
        colors = {
            'draft': '#6b7280',
            'onboarding': '#3b82f6',
            'generating': '#f59e0b',
            'review': '#8b5cf6',
            'published': '#22c55e',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 9999px; font-size: 11px; font-weight: 500;">{}</span>',
            color, obj.get_status_display()
        )

    def _get_ai_limits(self, obj):
        """Calcula uso y límite de generaciones IA para el tenant."""
        from billing.models import Subscription
        from websites.models import AIGenerationLog
        from django.utils import timezone

        tenant = obj.tenant
        subscription = Subscription.objects.filter(
            tenant=tenant, status__in=['active', 'trial']
        ).first()
        if not subscription:
            return 0, 0, 'Sin suscripción'

        web_sm = subscription.subscription_modules.filter(
            module__slug='web', is_active=True
        ).select_related('module').first()
        if not web_sm:
            limit = 5
        else:
            limit = web_sm.module.get_ai_limit_for_subscription(subscription)

        plan_label = subscription.get_status_display()
        if subscription.status == 'trial':
            plan_label = 'Trial'

        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        used = AIGenerationLog.objects.filter(
            tenant=tenant, created_at__gte=month_start, is_successful=True
        ).count()

        return used, limit, plan_label

    @display(description='Generaciones IA')
    def display_ai_usage(self, obj):
        used, limit, plan_label = self._get_ai_limits(obj)
        remaining = max(0, limit - used)
        if limit == 0:
            return format_html(
                '<span style="color: #6b7280;">—</span>'
            )
        color = '#22c55e' if remaining > 1 else '#f59e0b' if remaining == 1 else '#ef4444'
        return format_html(
            '<span style="color: {}; font-weight: 500;">{}/{}</span>'
            ' <span style="color: #9ca3af; font-size: 11px;">({})</span>',
            color, used, limit, plan_label
        )

    @display(description='Uso de generaciones IA')
    def display_ai_usage_detail(self, obj):
        used, limit, plan_label = self._get_ai_limits(obj)
        remaining = max(0, limit - used)
        color = '#22c55e' if remaining > 1 else '#f59e0b' if remaining == 1 else '#ef4444'
        return format_html(
            '<div style="font-size: 13px;">'
            '<strong>{}</strong> usadas de <strong>{}</strong> disponibles '
            '<span style="color: {}; font-weight: 600;">({} restantes)</span>'
            '<br><span style="color: #9ca3af;">Plan: {}</span>'
            '</div>',
            used, limit, color, remaining, plan_label
        )

    @display(description='URL')
    def display_url(self, obj):
        url = obj.public_url
        if obj.is_published:
            return format_html(
                '<a href="{}" target="_blank" style="color: #3b82f6;">{}</a>',
                url, url.replace('https://', '')
            )
        return format_html(
            '<span style="color: #6b7280;">{}</span>',
            url.replace('https://', '')
        )


# ===================================
# REGISTRO DE GENERACIONES IA
# ===================================

@admin.register(AIGenerationLog, site=gravitify_admin_site)
class AIGenerationLogAdmin(ModelAdmin):
    """Admin para ver registros de generación de IA."""

    list_display = [
        'tenant',
        'generation_type',
        'display_has_prompt',
        'display_tokens',
        'display_cost',
        'display_billable',
        'is_successful',
        'created_at',
    ]
    list_filter = ['generation_type', 'model_used', 'is_billable', 'is_successful']
    search_fields = ['tenant__name', 'section_id', 'full_prompt', 'raw_response']
    raw_id_fields = ['tenant', 'website_config', 'billed_in_invoice']
    readonly_fields = [
        'created_at', 'display_full_prompt', 'display_raw_response',
        'display_onboarding_snapshot',
    ]
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Identificación', {
            'fields': ('tenant', 'website_config', 'generation_type', 'section_id'),
        }),
        ('Prompt enviado a la IA', {
            'fields': ('display_full_prompt',),
            'description': 'El prompt completo (system + user) que se envió a Claude.',
        }),
        ('Respuesta de la IA', {
            'fields': ('display_raw_response',),
            'description': 'La respuesta cruda de Claude antes de parsear el JSON.',
        }),
        ('Datos del Onboarding', {
            'fields': ('display_onboarding_snapshot',),
            'classes': ('collapse',),
            'description': 'Respuestas del onboarding que alimentaron el prompt.',
        }),
        ('Métricas', {
            'fields': ('model_used', 'tokens_input', 'tokens_output', 'cost_estimated'),
        }),
        ('Estado', {
            'fields': ('is_successful', 'error_message'),
        }),
        ('Facturación', {
            'fields': ('is_billable', 'billed_in_invoice'),
        }),
    )

    @display(description='Prompt', boolean=True)
    def display_has_prompt(self, obj):
        return bool(obj.full_prompt)

    @display(description='Tokens')
    def display_tokens(self, obj):
        return format_html(
            '↓{} / ↑{}',
            obj.tokens_input, obj.tokens_output
        )

    @display(description='Costo')
    def display_cost(self, obj):
        return f'${obj.cost_estimated:,.0f}'

    @display(description='Facturable', boolean=True)
    def display_billable(self, obj):
        return obj.is_billable

    def display_full_prompt(self, obj):
        if not obj.full_prompt:
            return mark_safe('<em style="color:#999">No capturado (generación anterior al cambio)</em>')
        return mark_safe(
            f'<pre style="white-space:pre-wrap;word-break:break-word;max-height:500px;'
            f'overflow-y:auto;background:#f8f9fa;padding:16px;border-radius:8px;'
            f'font-size:13px;line-height:1.5;border:1px solid #e5e7eb">'
            f'{obj.full_prompt}</pre>'
        )
    display_full_prompt.short_description = 'Prompt completo'

    def display_raw_response(self, obj):
        if not obj.raw_response:
            return mark_safe('<em style="color:#999">No capturado (generación anterior al cambio)</em>')
        return mark_safe(
            f'<pre style="white-space:pre-wrap;word-break:break-word;max-height:500px;'
            f'overflow-y:auto;background:#f0fdf4;padding:16px;border-radius:8px;'
            f'font-size:13px;line-height:1.5;border:1px solid #bbf7d0">'
            f'{obj.raw_response}</pre>'
        )
    display_raw_response.short_description = 'Respuesta cruda de la IA'

    def display_onboarding_snapshot(self, obj):
        import json
        if not obj.onboarding_snapshot:
            return mark_safe('<em style="color:#999">No capturado</em>')
        formatted = json.dumps(obj.onboarding_snapshot, indent=2, ensure_ascii=False)
        return mark_safe(
            f'<pre style="white-space:pre-wrap;word-break:break-word;max-height:400px;'
            f'overflow-y:auto;background:#fefce8;padding:16px;border-radius:8px;'
            f'font-size:13px;line-height:1.5;border:1px solid #fde68a">'
            f'{formatted}</pre>'
        )
    display_onboarding_snapshot.short_description = 'Respuestas del onboarding'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


# ===================================
# RESPUESTAS DE ONBOARDING
# ===================================

@admin.register(OnboardingResponse, site=gravitify_admin_site)
class OnboardingResponseAdmin(ModelAdmin):
    """Admin para consultar respuestas de onboarding de tenants."""

    list_display = [
        'display_tenant',
        'display_question',
        'display_response',
        'display_section',
        'updated_at',
    ]
    list_filter = ['question__section', 'question__question_type', 'question__template']
    search_fields = ['website_config__tenant__name', 'question__question_key', 'question__question_text']
    raw_id_fields = ['website_config', 'question']
    readonly_fields = ['website_config', 'question', 'response_value', 'created_at', 'updated_at']

    fieldsets = (
        ('Identificación', {
            'fields': ('website_config', 'question'),
        }),
        ('Respuesta', {
            'fields': ('response_value',),
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at'),
        }),
    )

    @display(description='Tenant')
    def display_tenant(self, obj):
        return obj.website_config.tenant.name

    @display(description='Pregunta')
    def display_question(self, obj):
        return obj.question.question_text

    @display(description='Respuesta')
    def display_response(self, obj):
        value = obj.response_value
        if isinstance(value, str) and len(value) > 80:
            return f'{value[:80]}...'
        return str(value) if value else '—'

    @display(description='Sección')
    def display_section(self, obj):
        section_labels = {
            'basic': 'Básica',
            'branding': 'Marca',
            'content': 'Contenido',
            'contact': 'Contacto',
        }
        section = obj.question.section
        label = section_labels.get(section, section)
        colors = {
            'basic': '#3b82f6',
            'branding': '#8b5cf6',
            'content': '#22c55e',
            'contact': '#f59e0b',
        }
        color = colors.get(section, '#6b7280')
        return format_html(
            '<span style="background-color: {}20; color: {}; padding: 2px 8px; '
            'border-radius: 9999px; font-size: 11px; font-weight: 500;">{}</span>',
            color, color, label
        )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# ===================================
# HISTORIAL DE CHAT CON IA
# ===================================

@admin.register(ChatMessage, site=gravitify_admin_site)
class ChatMessageAdmin(ModelAdmin):
    """Admin para ver historial de conversaciones con IA."""

    list_display = [
        'display_tenant',
        'display_role',
        'display_content_preview',
        'section_id',
        'display_tokens',
        'created_at',
    ]
    list_filter = ['role', 'website_config__tenant']
    search_fields = ['website_config__tenant__name', 'content', 'section_id']
    raw_id_fields = ['website_config']
    readonly_fields = ['website_config', 'role', 'content', 'section_id', 'changes_made', 'tokens_used', 'created_at']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Identificación', {
            'fields': ('website_config', 'role', 'section_id'),
        }),
        ('Mensaje', {
            'fields': ('content',),
        }),
        ('Cambios Aplicados', {
            'fields': ('changes_made',),
            'classes': ('collapse',),
        }),
        ('Métricas', {
            'fields': ('tokens_used', 'created_at'),
        }),
    )

    @display(description='Tenant')
    def display_tenant(self, obj):
        return obj.website_config.tenant.name

    @display(description='Rol')
    def display_role(self, obj):
        colors = {
            'user': '#3b82f6',
            'assistant': '#22c55e',
            'system': '#6b7280',
        }
        icons = {
            'user': '👤',
            'assistant': '🤖',
            'system': '⚙️',
        }
        color = colors.get(obj.role, '#6b7280')
        icon = icons.get(obj.role, '')
        return format_html(
            '<span style="color: {}; font-weight: 500;">{} {}</span>',
            color, icon, obj.get_role_display()
        )

    @display(description='Mensaje')
    def display_content_preview(self, obj):
        preview = obj.content[:120]
        if len(obj.content) > 120:
            preview += '...'
        return preview

    @display(description='Tokens')
    def display_tokens(self, obj):
        if obj.tokens_used > 0:
            return format_html(
                '<span style="font-weight: 500;">{}</span>',
                obj.tokens_used
            )
        return format_html('<span style="color: #9ca3af;">—</span>')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
