# backend/websites/views.py
"""
API Views para el Website Builder.

Endpoints para:
- Listar y obtener templates
- Proceso de onboarding
- Generación de contenido con IA
- Chat para ediciones
- Publicación del sitio
"""

import logging
import random
from django.conf import settings as django_settings
from django.db import models, transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import (
    WebsiteTemplate, OnboardingQuestion, WebsiteConfig,
    OnboardingResponse, AIGenerationLog, ChatMessage
)
from .serializers import (
    WebsiteTemplateListSerializer, WebsiteTemplateDetailSerializer,
    OnboardingQuestionSerializer, WebsiteConfigSerializer,
    WebsiteConfigCreateSerializer, BulkOnboardingResponseSerializer,
    ChatRequestSerializer, ChatResponseSerializer,
    GenerateContentRequestSerializer, GenerateContentResponseSerializer,
    PublishWebsiteSerializer, AIGenerationLogSerializer
)
from .services import AIService, UnsplashService

logger = logging.getLogger(__name__)


# ===================================
# TEMPLATES
# ===================================

class WebsiteTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para listar y obtener templates de sitios web.

    GET /api/websites/templates/ - Lista todos los templates activos
    GET /api/websites/templates/{id}/ - Detalle de un template con sus preguntas
    """

    permission_classes = [IsAuthenticated]
    queryset = WebsiteTemplate.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WebsiteTemplateDetailSerializer
        return WebsiteTemplateListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtrar por industria si se especifica
        industry = self.request.query_params.get('industry')
        if industry:
            queryset = queryset.filter(industry=industry)

        # Filtrar premium si se especifica
        premium = self.request.query_params.get('premium')
        if premium is not None:
            queryset = queryset.filter(is_premium=premium.lower() == 'true')

        return queryset.order_by('sort_order', 'name')


# ===================================
# WEBSITE CONFIG (Sitio del usuario)
# ===================================

class WebsiteConfigViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar la configuración del sitio web del tenant.

    El tenant solo puede tener UN sitio web (OneToOne con Tenant).
    """

    permission_classes = [IsAuthenticated]
    serializer_class = WebsiteConfigSerializer

    def get_queryset(self):
        """Filtra por el tenant del usuario."""
        user = self.request.user
        if user.is_superuser:
            return WebsiteConfig.objects.all()
        if hasattr(user, 'tenant') and user.tenant:
            return WebsiteConfig.objects.filter(tenant=user.tenant)
        return WebsiteConfig.objects.none()

    def get_object(self):
        """Obtiene el sitio del tenant actual (o por ID si es superuser)."""
        user = self.request.user

        # Si se pasa un ID y es superuser, usar ese ID
        if 'pk' in self.kwargs and user.is_superuser:
            return get_object_or_404(WebsiteConfig, pk=self.kwargs['pk'])

        # Para usuarios normales, obtener su sitio
        if hasattr(user, 'tenant') and user.tenant:
            return get_object_or_404(WebsiteConfig, tenant=user.tenant)

        return Response(
            {"error": "No tienes un sitio web configurado"},
            status=status.HTTP_404_NOT_FOUND
        )

    def perform_update(self, serializer):
        """Keep onboarding logo_upload in sync when logo changes from editor."""
        old_logo = (serializer.instance.media_data or {}).get('logo_url', '')
        instance = serializer.save()
        new_logo = (instance.media_data or {}).get('logo_url', '')
        # Only sync when logo actually changed
        if new_logo and new_logo != old_logo:
            OnboardingResponse.objects.filter(
                website_config=instance,
                question__question_key='logo_upload',
            ).update(response_value=new_logo)

    @action(detail=False, methods=['get'])
    def my_site(self, request):
        """
        GET /api/websites/config/my_site/

        Obtiene el sitio web del tenant actual.
        Si no existe, retorna información para crearlo.
        """
        user = request.user
        if not hasattr(user, 'tenant') or not user.tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=user.tenant)
            return Response(WebsiteConfigSerializer(config).data)
        except WebsiteConfig.DoesNotExist:
            return Response({
                "exists": False,
                "message": "No tienes un sitio web. Selecciona un template para comenzar.",
                "templates_url": "/api/websites/templates/"
            })


# ===================================
# ONBOARDING
# ===================================

class OnboardingView(APIView):
    """
    Base class para views de onboarding.
    """

    permission_classes = [IsAuthenticated]

    def _get_tenant(self, request):
        """Obtiene el tenant del usuario."""
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant


class StartOnboardingView(OnboardingView):
    """
    POST /api/websites/onboarding/start/

    Inicia el proceso de onboarding seleccionando un template.
    Crea o actualiza el WebsiteConfig del tenant.
    """

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = WebsiteConfigCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        template_id = serializer.validated_data['template_id']
        template = WebsiteTemplate.objects.get(id=template_id)

        # Crear o actualizar WebsiteConfig
        config, created = WebsiteConfig.objects.update_or_create(
            tenant=tenant,
            defaults={
                'template': template,
                'status': 'onboarding',
                'subdomain': tenant.slug,  # Usar slug del tenant como subdominio inicial
            }
        )

        # Obtener preguntas del template
        questions = self._get_questions_for_template(template)

        return Response({
            "config_id": config.id,
            "template": WebsiteTemplateListSerializer(template).data,
            "questions": OnboardingQuestionSerializer(questions, many=True).data,
            "status": config.status,
            "created": created
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def _get_questions_for_template(self, template):
        """Obtiene preguntas genéricas + específicas del template."""
        generic = OnboardingQuestion.objects.filter(
            template__isnull=True,
            is_active=True
        )
        specific = template.questions.filter(is_active=True)

        # Combinar y ordenar
        all_questions = list(generic) + list(specific)
        all_questions.sort(key=lambda q: (q.section, q.sort_order))
        return all_questions


class SaveOnboardingResponsesView(OnboardingView):
    """
    POST /api/websites/onboarding/save/

    Guarda las respuestas del onboarding.
    Acepta guardar parcialmente (por sección) o todas a la vez.
    """

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar que existe un sitio en onboarding
        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {"error": "Primero debes seleccionar un template"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = BulkOnboardingResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        responses_data = serializer.validated_data['responses']

        # Guardar respuestas
        saved_count = 0
        with transaction.atomic():
            for question_key, response_value in responses_data.items():
                question = OnboardingQuestion.objects.get(
                    question_key=question_key,
                    is_active=True
                )

                OnboardingResponse.objects.update_or_create(
                    website_config=config,
                    question=question,
                    defaults={'response_value': response_value}
                )
                saved_count += 1

                # Sync logo changes to media_data immediately
                if question_key == 'logo_upload' and response_value:
                    media = dict(config.media_data or {})
                    media['logo_url'] = response_value
                    config.media_data = media
                    config.save(update_fields=['media_data'])

        return Response({
            "saved": saved_count,
            "message": f"Se guardaron {saved_count} respuestas",
            "config_status": config.status
        })


class OnboardingStatusView(OnboardingView):
    """
    GET /api/websites/onboarding/status/

    Obtiene el estado actual del onboarding.
    """

    def get(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({
                "status": "not_started",
                "message": "No has iniciado el proceso. Selecciona un template."
            })

        # Obtener respuestas guardadas
        responses = OnboardingResponse.objects.filter(
            website_config=config
        ).select_related('question')

        responses_dict = {
            r.question.question_key: r.response_value
            for r in responses
        }

        # Obtener preguntas requeridas
        required_questions = OnboardingQuestion.objects.filter(
            is_required=True,
            is_active=True
        ).filter(
            models.Q(template__isnull=True) | models.Q(template=config.template)
        ).values_list('question_key', flat=True)

        # Verificar completitud
        answered_required = [
            key for key in required_questions
            if key in responses_dict and responses_dict[key]
        ]

        return Response({
            "status": config.status,
            "template": WebsiteTemplateListSerializer(config.template).data,
            "responses": responses_dict,
            "progress": {
                "total_required": len(required_questions),
                "answered_required": len(answered_required),
                "is_complete": len(answered_required) == len(required_questions)
            }
        })


# ===================================
# GENERACIÓN DE CONTENIDO
# ===================================

class GenerateContentView(APIView):
    """
    POST /api/websites/generate/

    Genera el contenido del sitio web usando IA.
    Puede generar todo el sitio o regenerar una sección específica.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {"error": "Primero debes completar el onboarding"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = GenerateContentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Verificar límite de uso
        ai_service = AIService(tenant=tenant, website_config=config)
        can_generate, used, limit = ai_service.check_usage_limit(tenant)

        if not can_generate:
            return Response({
                "error": "Has alcanzado el límite de generaciones este mes",
                "used": used,
                "limit": limit,
                "upgrade_url": "/planes/"
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        # Obtener respuestas del onboarding
        responses = OnboardingResponse.objects.filter(
            website_config=config
        ).select_related('question')

        responses_dict = {
            r.question.question_key: r.response_value
            for r in responses
        }

        # Actualizar estado
        config.status = 'generating'
        config.save(update_fields=['status'])

        try:
            # Generar contenido
            regenerate_section = serializer.validated_data.get('regenerate_section')
            additional_instructions = serializer.validated_data.get('additional_instructions', '')

            if regenerate_section:
                generation_type = 'regenerate_section'
            else:
                generation_type = 'initial'

            content_data, seo_data, tokens_in, tokens_out, full_prompt, raw_response = ai_service.generate_initial_content(
                template=config.template,
                onboarding_responses=responses_dict,
                additional_instructions=additional_instructions
            )

            # ── Enriquecer con imágenes de Unsplash ──
            try:
                unsplash = UnsplashService()
                section_ids = [k for k in content_data.keys() if not k.startswith('_')]
                images = unsplash.get_images_for_generation(
                    sections=section_ids,
                    onboarding_responses=responses_dict,
                    tenant_industry=tenant.industry if tenant else '',
                    template_industry=config.template.industry or 'generic',
                )
                self._inject_images_and_variants(content_data, images)
            except Exception as e:
                logger.warning(f"Unsplash enrichment failed (non-fatal): {e}")

            # ── Aplicar branding del onboarding al theme_data ──
            theme_data = dict(config.template.default_theme or {})
            if responses_dict.get('primary_color'):
                theme_data['primary_color'] = responses_dict['primary_color']
            if responses_dict.get('secondary_color'):
                theme_data['secondary_color'] = responses_dict['secondary_color']

            # ── Logo y media ──
            media_data = dict(config.media_data or {})
            if responses_dict.get('logo_upload'):
                media_data['logo_url'] = responses_dict['logo_upload']

            # ── Asegurar que header y footer existan en content_data ──
            if 'header' not in content_data:
                content_data['header'] = {
                    'logo_text': tenant.name,
                    'cta_text': '',
                    'cta_link': '#contact',
                }
            if 'footer' not in content_data:
                content_data['footer'] = {}

            # ── Agregar _section_order al content ──
            section_keys = [k for k in content_data.keys() if not k.startswith('_') and k not in ('header', 'footer')]
            ordered = []
            if 'hero' in section_keys:
                ordered.append('hero')
                section_keys.remove('hero')
            contact_at_end = 'contact' in section_keys
            if contact_at_end:
                section_keys.remove('contact')
            ordered.extend(section_keys)
            if contact_at_end:
                ordered.append('contact')
            content_data['_section_order'] = ordered

            # Derivar páginas habilitadas de las secciones generadas
            config.enabled_pages = [
                k for k in content_data.keys()
                if not k.startswith('_') and k != 'hero'
            ]

            # Guardar contenido generado + branding
            config.content_data = content_data
            config.seo_data = seo_data
            config.theme_data = theme_data
            config.media_data = media_data
            config.status = 'review'
            config.save(update_fields=[
                'content_data', 'seo_data', 'theme_data', 'media_data',
                'status', 'enabled_pages',
            ])

            # Registrar uso con prompt y respuesta completos
            ai_service.log_generation(
                generation_type=generation_type,
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                section_id=regenerate_section or '',
                is_successful=True,
                full_prompt=full_prompt,
                raw_response=raw_response,
                onboarding_snapshot=responses_dict,
            )

            # Calcular restantes
            _, new_used, new_limit = ai_service.check_usage_limit(tenant)

            return Response({
                "content_data": content_data,
                "seo_data": seo_data,
                "tokens_used": tokens_in + tokens_out,
                "remaining_generations": max(0, new_limit - new_used),
                "is_billable": new_used > new_limit,
                "status": config.status
            })

        except Exception as e:
            logger.error(f"Error generando contenido: {e}")
            config.status = 'onboarding'
            config.save(update_fields=['status'])

            ai_service.log_generation(
                generation_type='initial',
                tokens_input=0,
                tokens_output=0,
                is_successful=False,
                error_message=str(e)
            )

            return Response(
                {"error": "Error generando contenido. Intenta de nuevo."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _inject_images_and_variants(self, content, images):
        """Inyecta imágenes de Unsplash y auto-selecciona variantes."""
        unsplash = UnsplashService()

        # Hero — variantes que necesitan imagen vs las que no
        if 'hero' in content:
            hero_imgs = images.get('hero', [])
            if hero_imgs:
                content['hero']['_image'] = hero_imgs[0]
                content['hero']['_image_alternatives'] = hero_imgs[1:]
                unsplash.trigger_download(hero_imgs[0].get('download_location', ''))
                variant = random.choice(['split-image', 'fullwidth-image', 'diagonal-split'])
            else:
                variant = random.choice(['centered', 'bold-typography', 'glassmorphism'])
            content['hero']['_variant'] = variant
            content['hero']['_variant_ai_recommended'] = variant

        # About — la mayoría no necesita imagen
        if 'about' in content:
            about_imgs = images.get('about', [])
            if about_imgs:
                content['about']['_image'] = about_imgs[0]
                content['about']['_image_alternatives'] = about_imgs[1:]
                unsplash.trigger_download(about_imgs[0].get('download_location', ''))
                variant = random.choice(['split-image', 'stats-banner', 'fullwidth-banner'])
            else:
                variant = random.choice(['text-only', 'stats-banner', 'timeline', 'overlapping-cards', 'fullwidth-banner'])
            content['about']['_variant'] = variant
            content['about']['_variant_ai_recommended'] = variant

        # Services — imágenes en items individuales
        if 'services' in content:
            section_imgs = images.get('services', [])
            items = content['services'].get('items', [])
            has_images = False
            for i, item in enumerate(items):
                if i < len(section_imgs):
                    item['_image'] = section_imgs[i]
                    unsplash.trigger_download(section_imgs[i].get('download_location', ''))
                    has_images = True
            if has_images:
                variant = random.choice(['grid-cards-image', 'featured-highlight'])
            else:
                variant = random.choice(['grid-cards', 'list-detailed', 'horizontal-scroll', 'icon-minimal'])
            content['services']['_variant'] = variant
            content['services']['_variant_ai_recommended'] = variant

        # Products — sin imágenes stock (el usuario sube las suyas)
        if 'products' in content:
            variant = random.choice(['grid-cards', 'price-table'])
            content['products']['_variant'] = variant
            content['products']['_variant_ai_recommended'] = variant

    def _get_tenant(self, request):
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant


# ===================================
# CHAT CON IA
# ===================================

class ChatView(APIView):
    """
    POST /api/websites/chat/ - Envía mensaje al chat
    GET /api/websites/chat/ - Obtiene historial del chat
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Envía un mensaje al chat para editar el contenido."""
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {"error": "No tienes un sitio web configurado"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if config.status not in ['review', 'published']:
            return Response(
                {"error": "Primero debes generar el contenido inicial"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data['message']
        section_id = serializer.validated_data.get('section_id')

        # Verificar límite de uso
        ai_service = AIService(tenant=tenant, website_config=config)
        can_generate, used, limit = ai_service.check_usage_limit(tenant)

        if not can_generate:
            return Response({
                "error": "Has alcanzado el límite de generaciones este mes",
                "used": used,
                "limit": limit
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        # Obtener historial del chat
        chat_history = list(
            ChatMessage.objects.filter(
                website_config=config
            ).order_by('-created_at')[:20].values('role', 'content')
        )
        chat_history.reverse()

        # Guardar mensaje del usuario
        ChatMessage.objects.create(
            website_config=config,
            role='user',
            content=message,
            section_id=section_id or ''
        )

        try:
            # Procesar con IA
            response_message, updated_content, affected_section, tokens_in, tokens_out = (
                ai_service.chat_edit(
                    message=message,
                    current_content=config.content_data,
                    chat_history=chat_history,
                    section_id=section_id
                )
            )

            # Guardar mensaje del asistente
            ChatMessage.objects.create(
                website_config=config,
                role='assistant',
                content=response_message,
                section_id=affected_section or '',
                changes_made={'updated_content': updated_content} if updated_content else {},
                tokens_used=tokens_in + tokens_out
            )

            # Actualizar contenido si hay cambios
            if updated_content and affected_section:
                config.content_data[affected_section] = updated_content
                config.save(update_fields=['content_data'])

            # Registrar uso
            ai_service.log_generation(
                generation_type='edit_content',
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                section_id=affected_section or '',
                is_successful=True
            )

            _, new_used, new_limit = ai_service.check_usage_limit(tenant)

            return Response({
                "message": response_message,
                "updated_content": updated_content,
                "section_id": affected_section,
                "tokens_used": tokens_in + tokens_out,
                "remaining_generations": max(0, new_limit - new_used)
            })

        except Exception as e:
            logger.error(f"Error en chat: {e}")
            return Response(
                {"error": "Error procesando mensaje. Intenta de nuevo."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get(self, request):
        """Obtiene el historial del chat."""
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"messages": []})

        messages = ChatMessage.objects.filter(
            website_config=config
        ).order_by('created_at').values(
            'id', 'role', 'content', 'section_id', 'created_at'
        )

        return Response({"messages": list(messages)})

    def _get_tenant(self, request):
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant


# ===================================
# SEO AI SUGGESTIONS
# ===================================

class SuggestSeoView(APIView):
    """
    POST /api/websites/suggest-seo/

    Genera sugerencias de título y descripción SEO usando IA,
    basándose en las keywords que el usuario ingresó.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {"error": "No tienes un sitio web configurado"},
                status=status.HTTP_400_BAD_REQUEST
            )

        keywords = request.data.get('keywords', [])
        business_name = request.data.get('business_name', '')
        current_title = request.data.get('current_title', '')
        current_description = request.data.get('current_description', '')

        if not keywords and not business_name:
            return Response(
                {"error": "Agrega al menos una palabra clave o el nombre de tu negocio"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check usage limit
        ai_service = AIService(tenant=tenant, website_config=config)
        can_generate, used, limit = ai_service.check_usage_limit(tenant)

        if not can_generate:
            return Response({
                "error": "Has alcanzado el límite de generaciones con IA este mes",
                "used": used,
                "limit": limit,
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        # Generate suggestions
        suggestions, tokens_in, tokens_out = ai_service.suggest_seo(
            keywords=keywords,
            business_name=business_name,
            current_title=current_title,
            current_description=current_description,
        )

        # Log generation
        ai_service.log_generation(
            generation_type='seo_suggest',
            tokens_input=tokens_in,
            tokens_output=tokens_out,
            is_successful=True,
        )

        return Response({
            "title": suggestions.get('title', ''),
            "description": suggestions.get('description', ''),
            "extra_keywords": suggestions.get('extra_keywords', []),
        })

    def _get_tenant(self, request):
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant


# ===================================
# UPLOAD DE MEDIA
# ===================================


class UploadWebsiteMediaView(APIView):
    """
    POST /api/websites/upload-media/

    Sube una imagen para el website builder (OG image, favicon, etc).
    Devuelve la URL absoluta del archivo subido.
    """

    permission_classes = [IsAuthenticated]

    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    ALLOWED_IMAGE_TYPES = {
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon',
    }

    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico'}
    # Magic bytes for image format detection
    _MAGIC_BYTES = {
        b'\xff\xd8\xff': '.jpg',
        b'\x89PNG': '.png',
        b'RIFF': '.webp',  # WebP starts with RIFF....WEBP
        b'GIF8': '.gif',
        b'\x00\x00\x01\x00': '.ico',
        b'\x00\x00\x02\x00': '.ico',
    }

    def _detect_image_type(self, uploaded_file):
        """Detect image type from file content (magic bytes), not client headers."""
        uploaded_file.seek(0)
        header = uploaded_file.read(12)
        uploaded_file.seek(0)

        # Check SVG (text-based)
        if header.lstrip(b'\xef\xbb\xbf').lstrip()[:5] in (b'<?xml', b'<svg '):
            return '.svg'
        # WebP: RIFF....WEBP
        if header[:4] == b'RIFF' and header[8:12] == b'WEBP':
            return '.webp'
        for magic, ext in self._MAGIC_BYTES.items():
            if magic != b'RIFF' and header[:len(magic)] == magic:
                return ext
        return None

    def post(self, request):
        import os
        import uuid
        from django.core.files.storage import default_storage

        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {"error": "No se envió ningún archivo"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar tamaño
        if uploaded_file.size > self.MAX_FILE_SIZE:
            return Response(
                {"error": "La imagen es muy grande. El máximo es 5MB."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar tipo real del archivo (magic bytes, no content_type del cliente)
        detected_ext = self._detect_image_type(uploaded_file)
        if not detected_ext or detected_ext not in self.ALLOWED_EXTENSIONS:
            return Response(
                {"error": "Formato no soportado. Usa JPG, PNG, WebP, GIF o SVG."},
                status=status.HTTP_400_BAD_REQUEST
            )

        purpose = request.data.get('purpose', 'general')
        if purpose not in ('og_image', 'favicon', 'general'):
            purpose = 'general'

        # Generar nombre seguro con extensión detectada (no la del cliente)
        ext = detected_ext
        filename = f"{purpose}_{uuid.uuid4().hex[:8]}{ext}"
        path = f"websites/{tenant.slug}/{filename}"

        # Guardar archivo
        saved_path = default_storage.save(path, uploaded_file)
        file_url = request.build_absolute_uri(f"/media/{saved_path}")

        return Response({
            "url": file_url,
            "path": saved_path,
        }, status=status.HTTP_201_CREATED)

    def _get_tenant(self, request):
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant


# ===================================
# PUBLICACIÓN
# ===================================

class PublishWebsiteView(APIView):
    """
    POST /api/websites/publish/

    Publica el sitio web.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {"error": "No tienes un sitio web configurado"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if config.status not in ['review', 'published']:
            return Response(
                {"error": "El sitio debe estar en revisión para publicar"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = PublishWebsiteSerializer(
            data=request.data,
            context={'tenant': tenant}
        )
        serializer.is_valid(raise_exception=True)

        # Actualizar subdominio si se proporciona
        new_subdomain = serializer.validated_data.get('subdomain')
        if new_subdomain:
            config.subdomain = new_subdomain

        # Crear snapshot de datos publicados
        config.published_data = {
            'content_data': config.content_data or {},
            'theme_data': config.theme_data or {},
            'pages_data': config.pages_data or {},
            'seo_data': config.seo_data or {},
            'media_data': config.media_data or {},
        }

        # Publicar
        config.status = 'published'
        config.published_at = timezone.now()
        config.save(update_fields=['published_data', 'status', 'published_at', 'subdomain'])

        return Response({
            "message": "Sitio publicado exitosamente",
            "public_url": config.public_url,
            "status": config.status,
            "published_at": config.published_at
        })

    def _get_tenant(self, request):
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant


# ===================================
# PREVIEW
# ===================================

class PreviewWebsiteView(APIView):
    """
    GET /api/websites/preview/

    Obtiene los datos para previsualizar el sitio.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {"error": "No tienes un sitio web configurado"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Combinar theme del template con personalizaciones
        theme_data = {
            **config.template.default_theme,
            **config.theme_data
        }

        return Response({
            "template": {
                "slug": config.template.slug,
                "industry": config.template.industry,
                "structure": config.template.structure_schema
            },
            "content": config.content_data,
            "theme": theme_data,
            "seo": config.seo_data,
            "media": config.media_data,
            "status": config.status,
            "public_url": config.public_url if config.is_published else None
        })

    def _get_tenant(self, request):
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant


# ===================================
# PREVIEW RENDER (HTML para iframe)
# ===================================

class PreviewRenderView(APIView):
    """
    GET /api/websites/preview/render/

    Retorna el HTML completo renderizado del sitio para usarlo en un iframe.
    Combina template + content_data + theme_data para generar la página.
    """

    permission_classes = [IsAuthenticated]
    # Allow both JSON (for error responses) and HTML (for success)
    renderer_classes = APIView.renderer_classes

    def get(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {"error": "No tienes un sitio web configurado"},
                status=status.HTTP_404_NOT_FOUND
            )

        theme = {**config.template.default_theme, **config.theme_data}
        seo = config.seo_data or {}
        structure = config.template.structure_schema or {}
        pages_data = config.pages_data or {}

        # ── Multi-page: resolver página solicitada ──────────────────────
        page_id = request.query_params.get('page', 'home')
        page_slugs = {}  # { page_id: slug } para nav links

        if pages_data.get('pages'):
            # Nueva arquitectura: extraer contenido de la página solicitada
            global_block = pages_data.get('global', {})
            global_sections = global_block.get('sections', [])
            global_content = global_block.get('content', {})

            # Encontrar la página pedida (o usar la primera si no existe)
            all_pages = pages_data['pages']
            page_slugs = {p['id']: p.get('slug', '/') for p in all_pages}
            page_obj = next((p for p in all_pages if p['id'] == page_id), all_pages[0] if all_pages else {})

            page_sections = page_obj.get('sections', [])
            page_content = page_obj.get('content', {})
            page_seo = page_obj.get('seo', {})

            # SEO de página sobreescribe el global
            if page_seo:
                seo = {**seo, **page_seo}

            # Contenido fusionado: global + página
            content = {**global_content, **page_content}

            # Secciones en orden: globales delanteras + página + globales traseras
            # Header va primero, Footer va al final (se manejan en _render_footer)
            active_sections = (
                [s for s in global_sections if s == 'header']
                + page_sections
                + [s for s in global_sections if s == 'footer']
            )
            # Filtrar solo las que tienen contenido real
            active_sections = [s for s in active_sections if s in content or s in ('header', 'footer')]

        else:
            # Arquitectura antigua: fallback compatible
            content = config.content_data or {}
            custom_order = content.get('_section_order', [])
            if custom_order:
                section_order = custom_order
            else:
                section_order = [s['id'] for s in structure.get('sections', [])]
            active_sections = [sid for sid in section_order if sid in content and sid != '_section_order']

        industry = config.template.industry
        tenant_name = tenant.name

        media = dict(config.media_data or {})
        current_logo = media.get('logo_url', '')
        # Sync from onboarding if missing or stale data URL
        if not current_logo or current_logo.startswith('data:'):
            logo_resp = OnboardingResponse.objects.filter(
                website_config=config, question__question_key='logo_upload',
            ).values_list('response_value', flat=True).first()
            if logo_resp and current_logo != logo_resp:
                media['logo_url'] = logo_resp
                config.media_data = media
                config.save(update_fields=['media_data'])
        base_url = config.public_url or ''

        tenant_modules = {
            'has_shop': tenant.has_shop,
            'has_bookings': tenant.has_bookings,
            'has_services': tenant.has_services,
        }

        tenant_info = {
            'name': tenant.name,
            'email': tenant.email or '',
            'phone': tenant.phone or '',
            'address': tenant.address or '',
            'city': tenant.city or '',
            'state': getattr(tenant, 'state', '') or '',
            'country': tenant.country or 'Colombia',
        }

        # Badge: visible siempre en trial; suscriptos pueden ocultarlo desde Ajustes
        show_badge = True
        try:
            if tenant.subscription.status != 'trial':
                show_badge = seo.get('show_nerbis_badge', True)
        except Exception:
            pass

        # Badge logo URL (static file, cacheable por el browser)
        from django.templatetags.static import static as _static
        badge_logo_url = request.build_absolute_uri(_static('images/nerbis-badge.png'))

        html = self._render_html(
            theme, content, seo, active_sections,
            tenant_name, industry, structure, media, base_url,
            tenant_modules, is_preview=True, tenant_info=tenant_info,
            page_slugs=page_slugs,
            show_badge=show_badge, badge_logo_url=badge_logo_url,
        )

        from django.http import HttpResponse
        return HttpResponse(html, content_type='text/html; charset=utf-8')

    def _render_html(self, theme, content, seo, sections, tenant_name, industry='generic', structure=None, media=None, base_url='', tenant_modules=None, is_preview=False, tenant_info=None, show_badge=True, badge_logo_url=None, page_slugs=None):
        media = media or {}
        page_slugs = page_slugs or {}
        self._base_url = base_url  # URL pública del tenant para CTAs
        self._tenant_modules = tenant_modules or {}
        self._page_slugs = page_slugs  # { page_id: slug } para nav multi-página
        primary = theme.get('primary_color', '#3b82f6')
        secondary = theme.get('secondary_color', '#10b981')
        font_heading = theme.get('font_heading', 'Poppins')
        font_body = theme.get('font_body', 'Inter')
        style = theme.get('style', 'modern')
        color_mode = theme.get('color_mode', 'light')
        is_dark = color_mode == 'dark'

        meta_title = seo.get('meta_title', tenant_name)
        meta_description = seo.get('meta_description', '')
        keywords = seo.get('keywords', [])
        og_image_url = seo.get('og_image_url', '') or media.get('og_image_url', '')
        favicon_url = media.get('favicon_url', '')
        ga_id = seo.get('google_analytics_id', '')
        social_links = seo.get('social_links', {})

        # ─── New settings (Phase 4) ───────────────────────
        og_inherit_seo = seo.get('og_inherit_seo', True)
        og_title = seo.get('og_title', '') if not og_inherit_seo else ''
        og_description = seo.get('og_description', '') if not og_inherit_seo else ''
        gtm_id = seo.get('gtm_id', '')
        fb_pixel_id = seo.get('facebook_pixel_id', '')
        hotjar_id = seo.get('hotjar_id', '')
        custom_head_code = seo.get('custom_head_code', '')
        custom_body_code = seo.get('custom_body_code', '')
        cookie_enabled = seo.get('cookie_banner_enabled', False)
        cookie_position = seo.get('cookie_banner_position', 'bottom-bar')
        cookie_text = seo.get('cookie_banner_text', 'Usamos cookies para mejorar tu experiencia.')
        cookie_accept = seo.get('cookie_accept_label', 'Aceptar')
        cookie_decline = seo.get('cookie_decline_label', 'Rechazar')
        cookie_privacy_url = seo.get('cookie_privacy_url', '')

        # ─── New features ─────────────────────────────────
        hide_from_search = seo.get('hide_from_search', False)
        google_site_verification = seo.get('google_site_verification', '')
        bing_site_verification = seo.get('bing_site_verification', '')
        whatsapp_float_enabled = seo.get('whatsapp_float_enabled', False)
        whatsapp_float_number = seo.get('whatsapp_float_number', '')
        whatsapp_float_message = seo.get('whatsapp_float_message', '')
        whatsapp_float_position = seo.get('whatsapp_float_position', 'bottom-right')
        schema_enabled = seo.get('schema_enabled', False)
        schema_business_type = seo.get('schema_business_type', 'LocalBusiness')
        # Site access mode — stored but not rendered (public serving not yet implemented)
        # TODO: implement access control when public serving is added

        # Header config
        header_data = content.get('header', {})
        logo_text = header_data.get('logo_text', '') or tenant_name
        logo_url = media.get('logo_url', '')
        header_cta_text = header_data.get('cta_text', '')
        header_cta_link = header_data.get('cta_link', '#contact')

        # Build nav items from active sections (skip hero and header)
        nav_sections = [s for s in sections if s not in ('hero', 'header', '_section_order')]

        # Contact data for info bar
        contact_data = content.get('contact', {})

        # Build header HTML
        header_nav_items = header_data.get('nav_items', None)
        header_html = self._render_header(
            logo_text, nav_sections, header_cta_text, header_cta_link, primary, secondary, logo_url,
            custom_nav_items=header_nav_items, header_data=header_data, industry=industry
        )

        # Info bar (above everything)
        info_bar_html = self._render_info_bar(header_data, contact_data, social_links, industry)

        # Promo bar (above header)
        promo_html = ''
        if header_data.get('promo_bar_enabled'):
            _promo_text = self._esc(header_data.get('promo_bar_text', ''))
            _promo_bg = header_data.get('promo_bar_bg', '#1C3B57')
            _promo_tc = header_data.get('promo_bar_text_color', '#FFFFFF')
            _promo_lt = header_data.get('promo_bar_link_text', '')
            _promo_lk = header_data.get('promo_bar_link', '')
            _promo_link_html = ''
            if _promo_lt and _promo_lk:
                _promo_link_html = f' <a href="{self._esc(_promo_lk)}" style="color:{_promo_tc};text-decoration:underline;font-weight:600;margin-left:8px;">{self._esc(_promo_lt)}</a>'
            promo_html = f'<div class="promo-bar" style="background:{_promo_bg};color:{_promo_tc};text-align:center;padding:10px 24px;font-size:.85rem;font-family:var(--font-body);letter-spacing:.01em;">{_promo_text}{_promo_link_html}</div>'

        # Section divider SVG (for modern/artistic wave, others use CSS-only)
        _divider_html = '<div class="section-divider" aria-hidden="true"><svg viewBox="0 0 1200 48" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 24C200 44 400 4 600 24C800 44 1000 4 1200 24V48H0Z" fill="currentColor" opacity="0.04"/></svg><span></span></div>'

        # Build sections HTML
        sections_html = ''
        alt_counter = 0
        non_hero_count = 0
        for section_id in sections:
            if section_id in ('header', 'footer'):
                continue  # header and footer are rendered separately
            data = content.get(section_id, {})
            renderer = getattr(self, f'_render_{section_id}', None)
            if renderer:
                html = renderer(data, primary, secondary)
            else:
                html = self._render_generic(section_id, data, primary, secondary)
            # Inject id for anchor navigation (nav links use #about, #services, etc.)
            html = html.replace(f'data-section="{section_id}"', f'id="{section_id}" data-section="{section_id}"', 1)
            # Add alternating bg + scroll reveal to non-hero sections
            if section_id != 'hero':
                extra = ' reveal'
                if alt_counter % 2 == 1:
                    extra += ' section-alt'
                if 'class="section"' in html:
                    html = html.replace('class="section"', f'class="section{extra}"', 1)
                else:
                    # Non-standard sections (about-banner, hero--*, etc.) — add reveal to existing class
                    import re as _re
                    html = _re.sub(
                        r'(<section\s+)class="([^"]*)"',
                        rf'\1class="\2{extra}"',
                        html, count=1
                    )
                alt_counter += 1
                # Section divider between non-hero sections
                if non_hero_count > 0:
                    sections_html += _divider_html
                non_hero_count += 1
            sections_html += html

        # Build footer HTML (now with social links)
        contact_data = content.get('contact', {})
        footer_data = content.get('footer', {})
        footer_html = self._render_footer(logo_text, contact_data, nav_sections, primary, social_links, show_badge=show_badge, badge_logo_url=badge_logo_url, footer_data=footer_data)

        border_radius = '12px' if style in ('modern', 'clean') else '4px' if style == 'elegant' else '8px'

        # Build additional head tags
        head_extra = ''
        if meta_description:
            head_extra += f'    <meta name="description" content="{self._esc(meta_description)}">\n'
        if keywords:
            head_extra += f'    <meta name="keywords" content="{self._esc(", ".join(keywords))}">\n'
        if favicon_url:
            head_extra += f'    <link rel="icon" href="{self._esc(favicon_url)}" type="image/png">\n'
        # Open Graph (with inheritance support)
        _og_title = og_title if og_title else meta_title
        _og_desc = og_description if og_description else meta_description
        head_extra += f'    <meta property="og:title" content="{self._esc(_og_title)}">\n'
        if _og_desc:
            head_extra += f'    <meta property="og:description" content="{self._esc(_og_desc)}">\n'
        if og_image_url:
            head_extra += f'    <meta property="og:image" content="{self._esc(og_image_url)}">\n'
        head_extra += '    <meta property="og:type" content="website">\n'
        # Twitter card (uses same OG values)
        head_extra += '    <meta name="twitter:card" content="summary_large_image">\n'
        head_extra += f'    <meta name="twitter:title" content="{self._esc(_og_title)}">\n'
        if _og_desc:
            head_extra += f'    <meta name="twitter:description" content="{self._esc(_og_desc)}">\n'
        if og_image_url:
            head_extra += f'    <meta name="twitter:image" content="{self._esc(og_image_url)}">\n'
        # Noindex
        if hide_from_search:
            head_extra += '    <meta name="robots" content="noindex, nofollow">\n'
        # Search engine verification
        if google_site_verification:
            head_extra += f'    <meta name="google-site-verification" content="{self._esc(google_site_verification)}">\n'
        if bing_site_verification:
            head_extra += f'    <meta name="msvalidate.01" content="{self._esc(bing_site_verification)}">\n'
        # Schema.org JSON-LD
        if schema_enabled:
            head_extra += self._render_schema_jsonld(schema_business_type, meta_title, meta_description, content, media, base_url)

        # ─── Analytics & Tracking Scripts ─────────────────
        has_analytics = bool(ga_id or gtm_id or fb_pixel_id or hotjar_id)
        consent_gated = cookie_enabled and has_analytics

        analytics_head = ''
        analytics_body_start = ''

        if consent_gated:
            # Cookie banner activo: envolver analytics en función que solo
            # se ejecuta cuando el usuario acepta las cookies
            analytics_js_parts = []
            if ga_id:
                analytics_js_parts.append(
                    f"var gs=document.createElement('script');gs.async=true;"
                    f"gs.src='https://www.googletagmanager.com/gtag/js?id={self._esc(ga_id)}';"
                    f"document.head.appendChild(gs);"
                    f"window.dataLayer=window.dataLayer||[];"
                    f"function gtag(){{dataLayer.push(arguments)}}"
                    f"gtag('js',new Date());gtag('config','{self._esc(ga_id)}');"
                )
            if gtm_id:
                analytics_js_parts.append(
                    f"(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':"
                    f"new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],"
                    f"j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';"
                    f"j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;"
                    f"f.parentNode.insertBefore(j,f)}})(window,document,'script','dataLayer',"
                    f"'{self._esc(gtm_id)}');"
                )
            if fb_pixel_id:
                analytics_js_parts.append(
                    f"!function(f,b,e,v,n,t,s){{if(f.fbq)return;n=f.fbq=function()"
                    f"{{n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)}};"
                    f"if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];"
                    f"t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];"
                    f"s.parentNode.insertBefore(t,s)}}(window,document,'script',"
                    f"'https://connect.facebook.net/en_US/fbevents.js');"
                    f"fbq('init','{self._esc(fb_pixel_id)}');fbq('track','PageView');"
                )
            if hotjar_id:
                analytics_js_parts.append(
                    f"(function(h,o,t,j,a,r){{h.hj=h.hj||function()"
                    f"{{(h.hj.q=h.hj.q||[]).push(arguments)}};"
                    f"h._hjSettings={{hjid:{self._esc(hotjar_id)},hjsv:6}};"
                    f"a=o.getElementsByTagName('head')[0];r=o.createElement('script');"
                    f"r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;"
                    f"a.appendChild(r)}})(window,document,"
                    f"'https://static.hotjar.com/c/hotjar-','.js?sv=');"
                )
            analytics_fn_body = '\n'.join(analytics_js_parts)
            analytics_head = f"""<script>function __loadAnalytics(){{if(window.__analyticsLoaded)return;window.__analyticsLoaded=true;{analytics_fn_body}}}</script>\n"""
            # GTM noscript no se renderiza si depende de consentimiento
        else:
            # Sin banner de cookies o sin analytics: cargar directamente
            if ga_id:
                analytics_head += f'<script async src="https://www.googletagmanager.com/gtag/js?id={self._esc(ga_id)}"></script>\n'
                analytics_head += f'<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag("js",new Date());gtag("config","{self._esc(ga_id)}");</script>\n'
            if gtm_id:
                analytics_head += f"""<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{"gtm.start":new Date().getTime(),event:"gtm.js"}});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f)}})(window,document,"script","dataLayer","{self._esc(gtm_id)}");</script>\n"""
                analytics_body_start = f'<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={self._esc(gtm_id)}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n'
            if fb_pixel_id:
                analytics_head += f"""<script>!function(f,b,e,v,n,t,s){{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)}};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init","{self._esc(fb_pixel_id)}");fbq("track","PageView");</script>\n"""
            if hotjar_id:
                analytics_head += f"""<script>(function(h,o,t,j,a,r){{h.hj=h.hj||function(){{(h.hj.q=h.hj.q||[]).push(arguments)}};h._hjSettings={{hjid:{self._esc(hotjar_id)},hjsv:6}};a=o.getElementsByTagName("head")[0];r=o.createElement("script");r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r)}})(window,document,"https://static.hotjar.com/c/hotjar-",".js?sv=");</script>\n"""

        # Custom head code siempre se carga (responsabilidad del tenant)
        if custom_head_code:
            analytics_head += custom_head_code + '\n'
        ga_script = analytics_head

        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="generator" content="NERBIS — nerbis.co">
    <title>{self._esc(meta_title)}</title>
{head_extra}    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family={font_heading.replace(' ', '+')}:wght@400;600;700&family={font_body.replace(' ', '+')}:wght@300;400;500;600&display=swap" rel="stylesheet">
{ga_script}
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        :root {{
            --primary: {primary};
            --secondary: {secondary};
            --font-heading: '{font_heading}', sans-serif;
            --font-body: '{font_body}', sans-serif;
            --radius: {border_radius};
            --shadow-sm: {'0 1px 3px rgba(0,0,0,.2), 0 1px 2px rgba(0,0,0,.15)' if is_dark else '0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06)'};
            --shadow-md: {'0 4px 16px rgba(0,0,0,.25), 0 1px 3px rgba(0,0,0,.15)' if is_dark else '0 4px 16px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04)'};
            --shadow-lg: {'0 12px 40px rgba(0,0,0,.35), 0 4px 12px rgba(0,0,0,.2)' if is_dark else '0 12px 40px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.04)'};
            --shadow-xl: {'0 20px 60px rgba(0,0,0,.4), 0 8px 20px rgba(0,0,0,.25)' if is_dark else '0 20px 60px rgba(0,0,0,.1), 0 8px 20px rgba(0,0,0,.06)'};
            --glow-primary: 0 0 30px color-mix(in srgb, var(--primary), transparent 60%);
            --glow-sm: 0 0 16px color-mix(in srgb, var(--primary), transparent 70%);
        }}
        body {{
            font-family: var(--font-body);
            color: {'#e2e8f0' if is_dark else '#1f2937'};
            line-height: 1.7;
            background: {'#0f172a' if is_dark else '#ffffff'};
            -webkit-font-smoothing: antialiased;
            {'-moz-osx-font-smoothing: grayscale;' if is_dark else ''}
        }}
        h1, h2, h3, h4 {{ font-family: var(--font-heading); line-height: 1.15; }}

        /* ─── Sections ─────────────────────── */
        .section {{ padding: 80px 24px; position: relative; }}
        .section-alt {{ background: #f8fafc; }}
        .container {{ max-width: 1120px; margin: 0 auto; }}
        .section-label {{
            display: inline-block;
            font-size: .7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .12em;
            color: var(--secondary);
            margin-bottom: 12px;
        }}
        .section-title {{
            font-size: clamp(1.6rem, 1.3rem + 1.5vw, 2.2rem);
            font-weight: 700;
            margin-bottom: 12px;
            color: var(--primary);
            text-wrap: balance;
            letter-spacing: -.02em;
        }}
        .section-subtitle {{
            font-size: 1.05rem;
            color: #6b7280;
            margin-bottom: 48px;
            max-width: 560px;
        }}
        .section-header {{ margin-bottom: 48px; }}
        .section-header.center {{ text-align: center; }}
        .section-header.center .section-subtitle {{ margin-left: auto; margin-right: auto; }}

        /* ─── Grids ────────────────────────── */
        .grid-2 {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 28px; }}
        .grid-3 {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }}

        /* ─── Cards ────────────────────────── */
        .card {{
            background: #fff;
            border: 1px solid #f0f0f0;
            border-radius: var(--radius);
            padding: 28px;
            transition: all .25s cubic-bezier(.4,0,.2,1);
            position: relative;
        }}
        .card::before {{
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 3px;
            border-radius: var(--radius) var(--radius) 0 0;
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            opacity: 0;
            transition: opacity .25s;
        }}
        .card:hover {{
            box-shadow: var(--shadow-lg);
            transform: translateY(-4px);
            border-color: transparent;
        }}
        .card:hover::before {{ opacity: 1; }}
        .card .card-icon {{
            width: 48px; height: 48px;
            border-radius: 12px;
            background: linear-gradient(135deg, color-mix(in srgb, var(--primary), #fff 90%), color-mix(in srgb, var(--secondary), #fff 85%));
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 16px;
            color: var(--primary);
        }}
        .card h3 {{ font-size: 1.1rem; margin-bottom: 10px; color: #111827; font-weight: 600; }}
        .card p {{ color: #6b7280; font-size: .92rem; line-height: 1.6; }}

        /* Cards — image variant */
        .card--has-image {{
            padding: 0; overflow: hidden;
        }}
        .card--has-image .card-image {{
            position: relative; width: 100%; aspect-ratio: 16/10; overflow: hidden;
            background: #f3f4f6;
        }}
        .card--has-image .card-image img {{
            width: 100%; height: 100%; object-fit: cover; display: block;
            transition: transform .4s cubic-bezier(.4,0,.2,1);
        }}
        .card--has-image:hover .card-image img {{
            transform: scale(1.05);
        }}
        .card--has-image .card-image--placeholder {{
            width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, color-mix(in srgb, var(--primary), #fff 90%), color-mix(in srgb, var(--secondary), #fff 85%));
            color: var(--primary); font-size: .8rem; font-weight: 500;
        }}
        .card--has-image .card-body {{
            padding: 20px 24px 24px;
        }}
        .card--has-image .card-body h3 {{ margin-bottom: 8px; }}
        .card--has-image::before {{ display: none; }}
        .card .card-price {{
            display: inline-block;
            margin-top: 14px;
            padding: 4px 14px;
            border-radius: 20px;
            background: color-mix(in srgb, var(--primary), #fff 92%);
            color: var(--primary);
            font-weight: 700;
            font-size: .9rem;
        }}

        /* Card micro-interactions */
        .card-3d {{
            perspective: 1000px;
        }}
        .card-3d .card {{
            transition: transform .4s cubic-bezier(.4,0,.2,1), box-shadow .4s cubic-bezier(.4,0,.2,1);
        }}
        .card-3d .card:hover {{
            transform: translateY(-8px) rotateX(2deg) rotateY(-2deg);
            box-shadow: var(--shadow-xl);
        }}
        .card--glass {{
            background: rgba(255,255,255,.6) !important;
            backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,.3) !important;
        }}
        .card--has-image .card-image::after {{
            content: '';
            position: absolute; inset: 0;
            background: linear-gradient(135deg, color-mix(in srgb, var(--primary), transparent 60%), color-mix(in srgb, var(--secondary), transparent 60%));
            opacity: 0; transition: opacity .4s;
        }}
        .card--has-image:hover .card-image::after {{ opacity: 1; }}

        /* ─── Buttons ──────────────────────── */
        .btn {{
            display: inline-flex; align-items: center; gap: 8px;
            padding: 14px 36px;
            border-radius: var(--radius);
            font-weight: 600;
            text-decoration: none;
            font-size: .95rem;
            transition: all .2s cubic-bezier(.4,0,.2,1);
            border: none; cursor: pointer;
        }}
        .btn:hover {{ transform: translateY(-2px); box-shadow: var(--shadow-md); }}
        .btn-primary {{ background: var(--primary); color: #fff; }}
        .btn-secondary {{ background: var(--secondary); color: #fff; }}
        .btn-outline {{
            background: transparent;
            border: 2px solid rgba(255,255,255,.3);
            color: #fff;
        }}
        .btn-outline:hover {{ background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.5); }}

        /* Button micro-interactions */
        .btn-arrow {{ position: relative; padding-right: 44px; }}
        .btn-arrow::after {{
            content: '→'; position: absolute; right: 20px; top: 50%; transform: translateY(-50%);
            transition: transform .25s cubic-bezier(.4,0,.2,1);
        }}
        .btn-arrow:hover::after {{ transform: translateY(-50%) translateX(4px); }}
        .section-cta .btn {{ gap: 8px; }}
        .section-cta .btn:hover {{ gap: 12px; }}

        /* ─── Header / Nav ─────────────────── */
        .site-header {{
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            background: rgba(255,255,255,.92);
            backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid rgba(0,0,0,.04);
            transition: all .3s;
        }}
        .site-header.scrolled {{
            background: rgba(255,255,255,.98);
            box-shadow: 0 1px 12px rgba(0,0,0,.06);
        }}
        .site-header .container {{
            display: flex; align-items: center; justify-content: space-between;
            height: 68px; padding: 0 24px;
        }}
        .site-header .logo {{
            font-family: var(--font-heading);
            font-size: 1.25rem; font-weight: 700;
            color: var(--primary); text-decoration: none;
        }}
        .site-header nav {{ display: flex; align-items: center; gap: 2px; }}
        .site-header nav a {{
            padding: 7px 16px; border-radius: 8px;
            font-size: .85rem; font-weight: 500;
            color: #4b5563; text-decoration: none;
            transition: all .15s;
        }}
        .site-header nav a:hover {{ color: var(--primary); background: color-mix(in srgb, var(--primary), #fff 94%); }}
        .site-header .header-cta {{
            padding: 9px 22px; border-radius: var(--radius);
            font-size: .85rem; font-weight: 600;
            color: #fff; background: var(--primary);
            text-decoration: none; transition: all .2s;
        }}
        .site-header .header-cta:hover {{ box-shadow: var(--shadow-md); transform: translateY(-1px); }}

        /* ─── Info Bar ─────────────────────── */
        .info-bar {{
            font-size: .78rem; font-family: var(--font-body);
            padding: 7px 0; letter-spacing: .01em;
        }}
        .info-bar .container {{ max-width: 1200px; margin: 0 auto; }}
        .info-bar-left {{ display: flex; align-items: center; gap: 20px; }}
        .info-bar-item {{ display: inline-flex; align-items: center; gap: 5px; }}
        .info-bar-social {{ display: flex; align-items: center; gap: 10px; }}
        .info-bar-social-link {{ color: inherit; opacity: .7; transition: opacity .2s; display: inline-flex; }}
        .info-bar-social-link:hover {{ opacity: 1; }}

        /* ─── Header Actions ───────────────── */
        .header-actions {{
            display: flex; align-items: center; gap: 2px; margin-left: 8px;
        }}
        .header-action {{
            display: inline-flex; align-items: center; gap: 5px;
            padding: 7px 12px; border-radius: 8px;
            font-size: .82rem; font-weight: 500;
            color: #4b5563; text-decoration: none;
            transition: all .15s;
        }}
        .header-action:hover {{
            color: var(--primary);
            background: color-mix(in srgb, var(--primary), #fff 94%);
        }}
        .header-action-booking {{
            color: var(--primary); font-weight: 600;
            background: color-mix(in srgb, var(--primary), #fff 92%);
            border-radius: var(--radius);
        }}
        .header-action-booking:hover {{
            background: color-mix(in srgb, var(--primary), #fff 86%);
        }}

        /* ─── Hero ─────────────────────────── */
        .hero {{
            padding: 140px 24px 120px;
            text-align: center;
            background: linear-gradient(145deg, var(--primary), color-mix(in srgb, var(--primary), #000 25%));
            color: #fff;
            position: relative; overflow: hidden;
        }}
        .hero::before {{
            content: '';
            position: absolute; top: -50%; right: -20%; width: 600px; height: 600px;
            border-radius: 50%;
            background: radial-gradient(circle, color-mix(in srgb, var(--secondary), transparent 60%), transparent 70%);
            pointer-events: none;
        }}
        .hero::after {{
            content: '';
            position: absolute; bottom: -30%; left: -10%; width: 500px; height: 500px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255,255,255,.06), transparent 70%);
            pointer-events: none;
        }}
        .hero .container {{ position: relative; z-index: 1; }}
        .hero h1 {{
            font-size: clamp(2.8rem, 2rem + 4vw, 5rem); margin-bottom: 20px; color: #fff;
            letter-spacing: -.03em; font-weight: 700; text-wrap: balance;
        }}
        .hero p {{
            font-size: 1.15rem; opacity: .88; margin-bottom: 36px;
            max-width: 580px; margin-left: auto; margin-right: auto;
            line-height: 1.7;
        }}
        .hero .btn {{ background: var(--secondary); color: #fff; font-size: 1rem; padding: 16px 40px; }}
        .hero .hero-buttons {{ display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }}

        /* ── Hero: Split Image ─────────────── */
        .hero--split {{
            padding: 0; background: #fff; color: #1f2937; overflow: hidden;
        }}
        .hero--split::before, .hero--split::after {{ display: none; }}
        .hero-split-inner {{
            display: flex; min-height: 580px; max-width: 100%;
        }}
        .hero-split-text {{
            flex: 1; display: flex; flex-direction: column; justify-content: center;
            padding: 72px 56px; max-width: 50%;
        }}
        .hero--split h1 {{
            color: var(--primary); font-size: 2.8rem; letter-spacing: -.03em;
        }}
        .hero--split p {{
            color: #6b7280; opacity: 1; margin-left: 0; margin-right: 0;
        }}
        .hero--split .btn {{
            background: var(--primary); color: #fff; align-self: flex-start;
        }}
        .hero--split .hero-buttons {{ justify-content: flex-start; }}
        .hero-split-media {{ flex: 1; position: relative; overflow: hidden; }}
        .hero-split-img {{
            width: 100%; height: 100%; object-fit: cover; display: block;
        }}
        .hero-split-placeholder {{
            width: 100%; height: 100%;
            background: linear-gradient(135deg, color-mix(in srgb, var(--primary), #fff 90%), color-mix(in srgb, var(--secondary), #fff 85%));
        }}

        /* ── Hero: Fullwidth Image + Parallax ─── */
        .hero--fullwidth {{
            position: relative; overflow: hidden;
        }}
        .hero--fullwidth::before, .hero--fullwidth::after {{ display: none; }}
        .parallax-bg {{
            position: absolute; inset: -20% 0; width: 100%; height: 140%;
            will-change: transform; z-index: 0;
        }}
        .hero-fullwidth-bg {{
            background-size: cover; background-position: center; background-repeat: no-repeat;
        }}
        .hero-overlay {{
            position: absolute; inset: 0; background: rgba(0,0,0,.55); z-index: 1;
        }}
        .hero--fullwidth .container {{ position: relative; z-index: 2; }}
        @media (prefers-reduced-motion: reduce) {{
            .parallax-bg {{ inset: 0; height: 100%; transform: none !important; }}
        }}

        /* ── Unsplash Attribution ──────────── */
        .hero-attribution {{
            position: absolute; bottom: 8px; right: 12px;
            font-size: .6rem; color: rgba(255,255,255,.45); z-index: 3;
        }}
        .hero-attribution a {{ color: rgba(255,255,255,.55); text-decoration: underline; }}
        .hero--split .hero-attribution {{ color: rgba(0,0,0,.3); }}
        .hero--split .hero-attribution a {{ color: rgba(0,0,0,.4); }}
        .img-attribution {{
            position: absolute; bottom: 8px; right: 8px;
            font-size: .55rem; color: rgba(255,255,255,.4);
        }}
        .img-attribution a {{ color: rgba(255,255,255,.5); text-decoration: underline; }}

        @media (max-width: 768px) {{
            .hero-split-inner {{ flex-direction: column; }}
            .hero-split-text {{ max-width: 100%; padding: 56px 24px; }}
            .hero-split-media {{ height: 280px; }}
            .hero--split h1 {{ font-size: 2rem; }}
        }}

        /* ─── About ────────────────────────── */
        .about-content {{ font-size: 1.05rem; color: #4b5563; max-width: 680px; line-height: 1.8; margin-bottom: 32px; }}
        .about-highlights {{
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px; margin-top: 24px;
        }}
        .about-highlights .highlight {{
            display: flex; align-items: flex-start; gap: 12px;
            padding: 16px; border-radius: var(--radius);
            background: color-mix(in srgb, var(--secondary), #fff 92%);
        }}
        .about-highlights .highlight-icon {{
            width: 28px; height: 28px; border-radius: 8px;
            background: var(--secondary); color: #fff;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; font-size: .8rem;
        }}
        .about-highlights .highlight span {{
            font-size: .92rem; font-weight: 500; color: #374151;
        }}

        /* About — split-image variant */
        .about-split-layout {{
            display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;
        }}
        .about-split-media {{
            position: relative; border-radius: var(--radius); overflow: hidden;
            aspect-ratio: 4/3; background: #f3f4f6;
        }}
        .about-split-img {{
            width: 100%; height: 100%; object-fit: cover; display: block;
        }}
        .about-split-placeholder {{
            width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, color-mix(in srgb, var(--primary), #fff 88%), color-mix(in srgb, var(--secondary), #fff 85%));
            color: var(--primary); font-size: .85rem; font-weight: 500;
        }}
        .about-split-content .section-label {{ text-align: left; }}
        .about-split-content .section-header {{ text-align: left; }}
        .about-split-content .section-header h2 {{ text-align: left; }}
        .about-split-content .about-content {{ max-width: 100%; }}
        @media (max-width: 768px) {{
            .about-split-layout {{ grid-template-columns: 1fr; gap: 32px; }}
        }}

        /* ─── Hero: Bold Typography ──────── */
        .hero--bold {{ background: #fff; color: #111827; text-align: left; padding: 100px 0; }}
        .hero--bold .container {{ max-width: 960px; }}
        .hero--bold h1 {{ font-size: clamp(2.8rem, 7vw, 5.5rem); font-weight: 800; line-height: 1.0; letter-spacing: -0.04em; color: #111827; margin-bottom: 12px; }}
        .hero--bold .hero-accent {{ height: 4px; width: 80px; border-radius: 2px; background: linear-gradient(90deg, var(--primary), var(--secondary)); margin-bottom: 24px; }}
        .hero--bold p {{ font-size: 1.15rem; color: #6b7280; max-width: 520px; }}
        .hero--bold::before, .hero--bold::after {{ display: none; }}

        /* ─── Hero: Diagonal Split ───────── */
        .hero--diagonal {{ display: flex; min-height: 520px; position: relative; overflow: hidden; padding: 0; }}
        .hero--diagonal::before, .hero--diagonal::after {{ display: none; }}
        .hero-diag-text {{ flex: 1; background: var(--primary); color: #fff; display: flex; flex-direction: column; justify-content: center; padding: 64px 48px; clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%); z-index: 2; position: relative; }}
        .hero-diag-media {{ position: absolute; top: 0; right: 0; width: 55%; height: 100%; }}
        .hero-diag-media img {{ width: 100%; height: 100%; object-fit: cover; }}
        .hero-diag-placeholder {{ width: 100%; height: 100%; background: linear-gradient(135deg, color-mix(in srgb, var(--secondary), #fff 70%), color-mix(in srgb, var(--primary), #fff 80%)); }}
        .hero--diagonal h1 {{ font-size: 2.6rem; color: #fff; }}
        .hero--diagonal p {{ color: rgba(255,255,255,.85); }}
        @media (max-width: 768px) {{
            .hero--diagonal {{ flex-direction: column; }}
            .hero-diag-text {{ clip-path: none; padding: 48px 24px; }}
            .hero-diag-media {{ position: relative; width: 100%; height: 240px; }}
        }}

        /* ─── Hero: Glassmorphism ────────── */
        .hero--glass {{ background: #0f172a; position: relative; overflow: hidden; padding: 100px 0; }}
        .hero--glass::before {{ content: ''; position: absolute; width: 300px; height: 300px; border-radius: 50%; background: var(--primary); opacity: .35; filter: blur(80px); top: -60px; left: 10%; animation: float-blob 8s ease-in-out infinite; }}
        .hero--glass::after {{ content: ''; position: absolute; width: 250px; height: 250px; border-radius: 50%; background: var(--secondary); opacity: .3; filter: blur(80px); bottom: -40px; right: 15%; animation: float-blob 8s ease-in-out infinite reverse; }}
        @keyframes float-blob {{ 0%,100% {{ transform: translate(0,0); }} 50% {{ transform: translate(30px,-20px); }} }}
        .hero-glass-card {{ position: relative; z-index: 2; max-width: 600px; margin: 0 auto; background: rgba(255,255,255,.08); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,.12); border-radius: 20px; padding: 48px 40px; text-align: center; }}
        .hero--glass h1 {{ color: #fff; font-size: 2.4rem; }}
        .hero--glass p {{ color: rgba(255,255,255,.7); }}

        /* ─── About: Stats Banner ────────── */
        .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 32px; margin-top: 40px; text-align: center; }}
        .stat-item {{ padding: 24px 16px; }}
        .stat-number {{ font-size: 2.5rem; font-weight: 800; color: var(--primary); line-height: 1; margin-bottom: 8px; letter-spacing: -0.02em; }}
        .stat-label {{ font-size: .82rem; color: #6b7280; font-weight: 500; }}

        /* ─── About: Timeline ────────────── */
        .timeline-wrap {{ position: relative; padding-left: 32px; margin-top: 32px; }}
        .timeline-wrap::before {{ content: ''; position: absolute; left: 7px; top: 0; bottom: 0; width: 2px; background: #e5e7eb; }}
        .timeline-item {{ position: relative; padding-bottom: 28px; padding-left: 24px; }}
        .timeline-item::before {{ content: ''; position: absolute; left: -29px; top: 4px; width: 14px; height: 14px; border-radius: 50%; border: 3px solid var(--primary); background: #fff; z-index: 1; }}
        .timeline-item h4 {{ font-size: .95rem; font-weight: 600; color: #111827; margin-bottom: 4px; }}
        .timeline-item p {{ font-size: .85rem; color: #6b7280; line-height: 1.5; }}

        /* ─── About: Overlapping Cards ───── */
        .overlap-cards {{ display: flex; justify-content: center; gap: 0; margin-top: 40px; perspective: 800px; }}
        .overlap-card {{ width: 220px; padding: 28px 24px; background: #fff; border-radius: var(--radius); border: 1px solid #f0f0f0; box-shadow: 0 4px 24px rgba(0,0,0,.06); transition: all .35s cubic-bezier(.4,0,.2,1); cursor: default; }}
        .overlap-card:nth-child(1) {{ transform: rotate(-3deg) translateX(16px); z-index: 1; background: color-mix(in srgb, var(--primary), #fff 92%); }}
        .overlap-card:nth-child(2) {{ transform: translateY(-8px); z-index: 3; box-shadow: 0 8px 32px rgba(0,0,0,.1); }}
        .overlap-card:nth-child(3) {{ transform: rotate(3deg) translateX(-16px); z-index: 1; background: color-mix(in srgb, var(--secondary), #fff 92%); }}
        .overlap-card:hover {{ transform: rotate(0) translateY(-12px); z-index: 4; box-shadow: 0 12px 40px rgba(0,0,0,.12); }}
        .overlap-card .highlight-icon {{ margin-bottom: 12px; }}
        @media (max-width: 768px) {{
            .overlap-cards {{ flex-direction: column; align-items: center; gap: 16px; }}
            .overlap-card {{ transform: none !important; width: 100%; max-width: 300px; }}
        }}

        /* ─── About: Fullwidth Banner ────── */
        .about-banner {{ background: color-mix(in srgb, var(--primary), #000 30%); color: #fff; padding: 96px 0; margin: 0 calc(-50vw + 50%); width: 100vw; position: relative; left: 50%; right: 50%; }}
        .about-banner .container {{ max-width: 1120px; margin: 0 auto; padding: 0 24px; }}
        .about-banner .section-label {{ color: var(--secondary); }}
        .about-banner .section-title {{ color: #fff; }}
        .about-banner .about-content {{ color: rgba(255,255,255,.8); max-width: 680px; }}
        .about-banner .highlight {{ background: rgba(255,255,255,.08); }}
        .about-banner .highlight span {{ color: #fff; }}
        .about-banner .highlight-icon {{ background: var(--secondary); }}

        /* ─── Services: List Detailed ────── */
        .svc-list {{ margin-top: 32px; }}
        .svc-list-item {{ display: flex; align-items: flex-start; gap: 24px; padding: 28px 0; border-bottom: 1px solid #f0f0f0; transition: background .2s; }}
        .svc-list-item:hover {{ background: #fafafa; margin: 0 -24px; padding: 28px 24px; border-radius: var(--radius); }}
        .svc-list-num {{ font-size: 1.8rem; font-weight: 800; color: #e5e7eb; min-width: 48px; transition: color .2s; line-height: 1; }}
        .svc-list-item:hover .svc-list-num {{ color: var(--primary); }}
        .svc-list-body h3 {{ font-size: 1.05rem; font-weight: 600; color: #111827; margin-bottom: 4px; }}
        .svc-list-body p {{ font-size: .88rem; color: #6b7280; line-height: 1.6; }}

        /* ─── Services: Featured Highlight ── */
        .svc-featured {{ display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-top: 32px; }}
        .svc-featured-main {{ border-radius: var(--radius); overflow: hidden; position: relative; min-height: 320px; background: color-mix(in srgb, var(--primary), #fff 90%); display: flex; flex-direction: column; justify-content: flex-end; padding: 32px; }}
        .svc-featured-main img {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }}
        .svc-featured-main .svc-featured-overlay {{ position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.7), transparent); }}
        .svc-featured-main h3, .svc-featured-main p {{ position: relative; z-index: 2; color: #fff; }}
        .svc-featured-main h3 {{ font-size: 1.3rem; margin-bottom: 8px; }}
        .svc-featured-main p {{ font-size: .88rem; opacity: .85; }}
        .svc-featured-side {{ display: flex; flex-direction: column; gap: 16px; }}
        .svc-featured-side .card {{ flex: 1; }}
        @media (max-width: 768px) {{
            .svc-featured {{ grid-template-columns: 1fr; }}
            .svc-featured-main {{ min-height: 240px; }}
        }}

        /* ─── Services: Horizontal Scroll ── */
        .svc-scroll-wrap {{ position: relative; margin-top: 32px; }}
        .svc-scroll {{ display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; padding: 8px 0 24px; scrollbar-width: none; }}
        .svc-scroll::-webkit-scrollbar {{ display: none; }}
        .svc-scroll .card {{ min-width: 272px; max-width: 272px; scroll-snap-align: start; flex-shrink: 0; }}
        .svc-scroll-fade {{ pointer-events: none; position: absolute; top: 0; bottom: 0; width: 48px; z-index: 2; }}
        .svc-scroll-fade--r {{ right: 0; background: linear-gradient(to left, #fff, transparent); }}
        .section-alt .svc-scroll-fade--r {{ background: linear-gradient(to left, #f8fafc, transparent); }}

        /* ─── Services: Icon Minimal ─────── */
        .svc-icon-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 32px; }}
        .svc-icon-row {{ display: flex; align-items: flex-start; gap: 20px; }}
        .svc-icon-box {{ width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, color-mix(in srgb, var(--primary), #fff 88%), color-mix(in srgb, var(--secondary), #fff 84%)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--primary); }}
        .svc-icon-text h3 {{ font-size: 1rem; font-weight: 600; color: #111827; margin-bottom: 4px; }}
        .svc-icon-text p {{ font-size: .85rem; color: #6b7280; line-height: 1.6; }}
        @media (max-width: 768px) {{
            .svc-icon-grid {{ grid-template-columns: 1fr; }}
        }}

        /* ─── Products: Showcase Large ───── */
        .prod-showcase {{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }}
        .prod-showcase-card {{ position: relative; border-radius: var(--radius); overflow: hidden; aspect-ratio: 3/4; background: #f3f4f6; cursor: pointer; }}
        .prod-showcase-card img {{ width: 100%; height: 100%; object-fit: cover; transition: transform .5s cubic-bezier(.4,0,.2,1); }}
        .prod-showcase-card:hover img {{ transform: scale(1.06); }}
        .prod-showcase-overlay {{ position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.65) 0%, transparent 50%); z-index: 1; }}
        .prod-showcase-info {{ position: absolute; bottom: 24px; left: 24px; right: 24px; z-index: 2; color: #fff; }}
        .prod-showcase-info h3 {{ font-size: 1.2rem; font-weight: 600; margin-bottom: 4px; }}
        .prod-showcase-info p {{ font-size: .82rem; opacity: .8; }}
        .prod-showcase-price {{ position: absolute; top: 16px; right: 16px; z-index: 2; background: #fff; color: #111827; padding: 6px 14px; border-radius: 20px; font-size: .82rem; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,.15); }}
        .prod-showcase-placeholder {{ width: 100%; height: 100%; background: linear-gradient(135deg, color-mix(in srgb, var(--primary), #fff 88%), color-mix(in srgb, var(--secondary), #fff 84%)); display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: .9rem; }}
        @media (max-width: 768px) {{
            .prod-showcase {{ grid-template-columns: 1fr; }}
        }}

        /* ─── Products: Catalog Compact ──── */
        .prod-catalog {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 32px; }}
        .prod-catalog-item {{ border-radius: var(--radius); overflow: hidden; background: #fff; border: 1px solid #f0f0f0; transition: all .25s; }}
        .prod-catalog-item:hover {{ box-shadow: var(--shadow-lg); transform: translateY(-4px); }}
        .prod-catalog-img {{ aspect-ratio: 1; background: #f3f4f6; overflow: hidden; }}
        .prod-catalog-img img {{ width: 100%; height: 100%; object-fit: cover; transition: transform .4s; }}
        .prod-catalog-item:hover .prod-catalog-img img {{ transform: scale(1.05); }}
        .prod-catalog-img .prod-showcase-placeholder {{ aspect-ratio: 1; }}
        .prod-catalog-body {{ padding: 14px 16px; }}
        .prod-catalog-body h3 {{ font-size: .88rem; font-weight: 600; color: #111827; margin-bottom: 2px; }}
        .prod-catalog-body .prod-price {{ font-size: .95rem; font-weight: 700; color: var(--primary); }}
        @media (max-width: 768px) {{
            .prod-catalog {{ grid-template-columns: 1fr 1fr; }}
        }}

        /* ─── Products: Masonry ──────────── */
        .prod-masonry {{ column-count: 3; column-gap: 20px; margin-top: 32px; }}
        .prod-masonry-item {{ break-inside: avoid; margin-bottom: 20px; border-radius: var(--radius); overflow: hidden; background: #fff; border: 1px solid #f0f0f0; transition: all .25s; }}
        .prod-masonry-item:hover {{ box-shadow: var(--shadow-lg); }}
        .prod-masonry-item:nth-child(odd) .prod-masonry-img {{ aspect-ratio: 3/4; }}
        .prod-masonry-item:nth-child(even) .prod-masonry-img {{ aspect-ratio: 4/3; }}
        .prod-masonry-img {{ background: #f3f4f6; overflow: hidden; }}
        .prod-masonry-img img {{ width: 100%; height: 100%; object-fit: cover; }}
        .prod-masonry-body {{ padding: 16px; }}
        .prod-masonry-body h3 {{ font-size: .9rem; font-weight: 600; color: #111827; margin-bottom: 4px; }}
        .prod-masonry-body p {{ font-size: .8rem; color: #6b7280; }}
        .prod-masonry-body .prod-price {{ font-weight: 700; color: var(--primary); font-size: .9rem; margin-top: 6px; display: block; }}
        @media (max-width: 768px) {{
            .prod-masonry {{ column-count: 2; }}
        }}

        /* ─── Products: Price Table ─────── */
        .prod-price-table {{ margin-top: 32px; }}
        .prod-price-row {{ display: flex; align-items: baseline; gap: 12px; padding: 20px 0; border-bottom: 1px solid #f0f0f0; }}
        .prod-price-row:last-child {{ border-bottom: none; }}
        .prod-price-name {{ font-size: 1rem; font-weight: 600; color: #111827; white-space: nowrap; }}
        .prod-price-dots {{ flex: 1; border-bottom: 2px dotted #d1d5db; margin-bottom: 4px; }}
        .prod-price-val {{ font-size: 1.1rem; font-weight: 700; color: var(--primary); white-space: nowrap; }}
        .prod-price-desc {{ font-size: .8rem; color: #9ca3af; margin-top: 2px; padding-left: 0; }}

        /* ─── Bento Grid ──────────────────── */
        .bento-grid {{
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
        }}
        .bento-item {{
            background: #fff; border-radius: var(--radius); border: 1px solid #f0f0f0;
            padding: 28px 24px; position: relative; overflow: hidden;
            transition: transform .3s cubic-bezier(.4,0,.2,1), box-shadow .3s cubic-bezier(.4,0,.2,1);
        }}
        .bento-item:hover {{ transform: translateY(-4px); box-shadow: var(--shadow-lg); }}
        .bento-item h3 {{ font-size: 1.05rem; font-weight: 600; color: #111827; margin-bottom: 8px; }}
        .bento-item p {{ font-size: .88rem; color: #6b7280; line-height: 1.55; }}
        .bento-lg {{ grid-column: span 2; grid-row: span 2; }}
        .bento-md {{ grid-column: span 2; }}
        .bento-sm {{ grid-column: span 1; }}
        .bento-item--has-image {{ padding: 0; }}
        .bento-item--has-image .bento-img {{
            width: 100%; height: 100%; object-fit: cover; display: block;
            transition: transform .6s cubic-bezier(.4,0,.2,1);
        }}
        .bento-item--has-image:hover .bento-img {{ transform: scale(1.05); }}
        .bento-overlay {{
            position: absolute; bottom: 0; left: 0; right: 0; padding: 24px;
            background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: #fff;
        }}
        .bento-overlay h3 {{ color: #fff; font-size: 1.1rem; margin-bottom: 4px; }}
        .bento-overlay p {{ color: rgba(255,255,255,0.85); font-size: .85rem; }}
        .bento-overlay .card-price {{ background: rgba(255,255,255,0.2); color: #fff; }}
        .bento-lg.bento-item--has-image {{ min-height: 320px; }}
        .bento-md.bento-item--has-image {{ min-height: 200px; }}
        .bento-sm.bento-item--has-image {{ min-height: 180px; }}
        @media (max-width: 768px) {{
            .bento-grid {{ grid-template-columns: repeat(2, 1fr); }}
            .bento-lg {{ grid-column: span 2; grid-row: span 1; }}
        }}
        @media (max-width: 480px) {{
            .bento-grid {{ grid-template-columns: 1fr; }}
            .bento-lg, .bento-md {{ grid-column: span 1; }}
        }}

        /* ─── About Asymmetric ────────────── */
        .about-asymmetric {{
            display: grid; grid-template-columns: 5fr 3fr; gap: 48px; align-items: start;
        }}
        .about-asym-content {{ padding-top: 16px; }}
        .about-asym-img-wrap {{
            position: relative; border-radius: var(--radius); overflow: hidden;
            box-shadow: var(--shadow-lg);
        }}
        .about-asym-img {{
            width: 100%; height: auto; display: block; aspect-ratio: 3/4; object-fit: cover;
        }}
        .about-asym-placeholder {{
            aspect-ratio: 3/4; border-radius: var(--radius); position: relative; overflow: hidden;
            background: linear-gradient(135deg, color-mix(in srgb, var(--primary), #fff 90%), color-mix(in srgb, var(--secondary), #fff 85%));
        }}
        .about-asym-placeholder-inner {{
            position: absolute; inset: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            background-size: 200% 100%; animation: pw-shimmer 2.5s infinite;
        }}
        @media (max-width: 768px) {{
            .about-asymmetric {{ grid-template-columns: 1fr; gap: 32px; }}
            .about-asym-img {{ aspect-ratio: 16/10; }}
        }}

        /* ─── Hero Split Overlap ──────────── */
        .hero--split-overlap .hero-split-media {{
            margin-left: -60px; z-index: 2;
            border-radius: var(--radius) 0 0 var(--radius);
            box-shadow: -12px 0 40px rgba(0,0,0,0.12);
        }}
        .hero--split-overlap .hero-split-text {{
            z-index: 1; padding-right: 80px;
        }}
        @media (max-width: 768px) {{
            .hero--split-overlap .hero-split-media {{ margin-left: 0; border-radius: 0; box-shadow: none; }}
            .hero--split-overlap .hero-split-text {{ padding-right: 24px; }}
        }}

        /* ─── Testimonials ─────────────────── */
        .testimonial-card {{
            text-align: left; padding: 32px;
            background: #fff;
            border-radius: var(--radius);
            border: 1px solid #f0f0f0;
            position: relative;
            transition: all .25s cubic-bezier(.4,0,.2,1);
        }}
        .testimonial-card:hover {{
            box-shadow: var(--shadow-lg);
            transform: translateY(-4px);
            border-color: transparent;
        }}
        .testimonial-card .quote-mark {{
            font-size: 3rem; line-height: 1; color: var(--secondary);
            opacity: .5; margin-bottom: 8px; font-family: Georgia, serif;
        }}
        .testimonial-card .content {{
            font-size: .98rem; color: #4b5563;
            margin-bottom: 20px; line-height: 1.7;
            font-style: italic;
        }}
        .testimonial-card .author {{
            display: flex; align-items: center; gap: 12px;
            border-top: 1px solid #f3f4f6; padding-top: 16px;
        }}
        .testimonial-card .avatar {{
            width: 40px; height: 40px; border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            display: flex; align-items: center; justify-content: center;
            color: #fff; font-weight: 700; font-size: .85rem;
        }}
        .testimonial-card .name {{ font-weight: 600; color: #111827; font-size: .92rem; }}
        .testimonial-card .role {{ font-size: .82rem; color: #9ca3af; }}

        /* ─── Pricing ──────────────────────── */
        .pricing-card {{
            text-align: center; padding: 36px 28px;
            background: #fff; border: 1px solid #f0f0f0;
            border-radius: var(--radius);
            transition: all .25s cubic-bezier(.4,0,.2,1);
            position: relative;
        }}
        .pricing-card:hover {{
            box-shadow: var(--shadow-lg);
            transform: translateY(-4px);
            border-color: transparent;
        }}
        .pricing-card h3 {{ font-size: 1.1rem; color: #111827; margin-bottom: 8px; }}
        .pricing-card .price {{
            font-size: 2rem; font-weight: 800; color: var(--primary);
            margin: 16px 0; letter-spacing: -.02em;
        }}
        .pricing-card p {{ color: #6b7280; font-size: .92rem; }}
        .pricing-card--recommended {{
            border: 2px solid var(--primary); transform: scale(1.04);
            box-shadow: var(--shadow-xl); z-index: 2;
        }}
        .pricing-card--recommended:hover {{ transform: scale(1.06); }}
        .pricing-badge {{
            position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            color: #fff; padding: 4px 20px; border-radius: 20px;
            font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.06em; white-space: nowrap;
        }}
        .pricing-features {{
            list-style: none; padding: 0; margin: 20px 0; text-align: left;
        }}
        .pricing-features li {{
            padding: 8px 0; border-bottom: 1px solid #f5f5f5;
            font-size: .92rem; display: flex; align-items: center; gap: 8px; color: #4b5563;
        }}
        .pricing-features li:last-child {{ border-bottom: none; }}
        .pricing-check {{
            display: inline-flex; align-items: center; justify-content: center;
            width: 20px; height: 20px; border-radius: 50%;
            background: color-mix(in srgb, var(--primary), #fff 88%);
            color: var(--primary); flex-shrink: 0;
        }}
        .pricing-period {{ font-size: .9rem; font-weight: 400; color: #9ca3af; }}
        .pricing-cta {{
            display: block; width: 100%; text-align: center; margin-top: auto; padding: 12px 24px;
        }}
        .pricing-grid {{
            display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 24px; align-items: stretch;
        }}
        .pricing-grid .pricing-card {{ display: flex; flex-direction: column; }}
        /* Comparison table */
        .pricing-table-wrap {{ overflow-x: auto; margin-top: 32px; }}
        .pricing-table {{ width: 100%; border-collapse: collapse; text-align: center; font-size: .92rem; }}
        .pricing-table th, .pricing-table td {{ padding: 14px 18px; border-bottom: 1px solid #f0f0f0; }}
        .pricing-table thead th {{ background: #fafafa; font-weight: 600; vertical-align: bottom; border-bottom: 2px solid #e5e7eb; }}
        .pricing-table-feature-col {{ text-align: left; min-width: 160px; color: #374151; }}
        .pricing-table tbody td:first-child {{ text-align: left; color: #4b5563; font-weight: 500; }}
        .pricing-table-recommended {{ background: color-mix(in srgb, var(--primary), #fff 92%) !important; }}
        .pricing-table-plan {{ display: flex; flex-direction: column; gap: 4px; }}
        .pricing-table-name {{ font-size: 1rem; font-weight: 700; color: #111827; }}
        .pricing-table-price {{ font-size: 1.5rem; font-weight: 800; color: var(--primary); }}
        .pricing-table-period {{ font-size: .8rem; color: #9ca3af; font-weight: 400; }}
        .pricing-table-check {{ text-align: center; }}
        .pricing-check--yes {{
            display: inline-flex; align-items: center; justify-content: center;
            width: 24px; height: 24px; border-radius: 50%;
            background: color-mix(in srgb, var(--primary), #fff 85%); color: var(--primary);
        }}
        .pricing-check--no {{ color: #d1d5db; font-size: 1.1rem; }}
        .pricing-table-cta {{ display: inline-block; margin-top: 8px; padding: 8px 20px; font-size: .92rem; }}
        .pricing-table tfoot td {{ border-bottom: none; padding-top: 20px; }}
        /* Minimal list */
        .pricing-minimal-item {{
            display: flex; flex-direction: column; padding: 22px 0; border-bottom: 1px solid #f0f0f0;
        }}
        .pricing-minimal-item:first-child {{ border-top: 1px solid #f0f0f0; }}
        .pricing-minimal-item--featured {{
            background: color-mix(in srgb, var(--primary), #fff 95%);
            padding: 22px 16px; margin: 0 -16px; border-radius: var(--radius);
            border: 1px solid color-mix(in srgb, var(--primary), #fff 80%);
        }}
        .pricing-minimal-header {{ display: flex; align-items: baseline; gap: 8px; }}
        .pricing-minimal-name {{ font-size: 1.05rem; font-weight: 600; color: #111827; margin: 0; white-space: nowrap; }}
        .pricing-minimal-desc {{ font-size: .72rem; color: #9ca3af; margin: 2px 0 0; }}
        .pricing-minimal-dots {{ flex: 1; border-bottom: 2px dotted #e5e7eb; margin: 0 8px; min-width: 40px; align-self: center; }}
        .pricing-minimal-price {{ font-size: 1.3rem; font-weight: 800; color: var(--primary); white-space: nowrap; }}
        .pricing-minimal-features {{ display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }}
        .pricing-minimal-tag {{
            font-size: 0.7rem; padding: 3px 10px; border-radius: 20px;
            background: color-mix(in srgb, var(--primary), #fff 90%); color: var(--primary); font-weight: 500;
        }}

        /* ─── Contact ──────────────────────── */
        .contact-grid {{
            display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px; margin-top: 32px;
        }}
        .contact-item {{
            display: flex; align-items: flex-start; gap: 14px;
            padding: 22px; border-radius: var(--radius);
            background: #fff; border: 1px solid #f0f0f0;
            transition: all .25s cubic-bezier(.4,0,.2,1);
        }}
        .contact-item:hover {{
            box-shadow: var(--shadow-md); transform: translateY(-2px);
            border-color: color-mix(in srgb, var(--primary), #fff 80%);
        }}
        .contact-item .ci-icon {{
            width: 44px; height: 44px; border-radius: 12px;
            background: linear-gradient(135deg, color-mix(in srgb, var(--primary), #fff 88%), color-mix(in srgb, var(--secondary), #fff 84%));
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; color: var(--primary);
        }}
        .contact-item .ci-label {{
            font-size: .72rem; font-weight: 600; text-transform: uppercase;
            letter-spacing: .06em; color: #9ca3af; margin-bottom: 2px;
        }}
        .contact-item .ci-value {{ font-size: .92rem; color: #374151; font-weight: 500; }}
        .whatsapp-cta {{
            display: inline-flex; align-items: center; gap: 10px;
            background: #25D366; border-color: #25D366;
        }}
        .whatsapp-cta:hover {{ background: #128C7E; border-color: #128C7E; }}
        /* Split form */
        .contact-split {{
            display: grid; grid-template-columns: 1fr 1fr; gap: 48px;
            margin-top: 32px; align-items: start;
        }}
        .contact-split-info {{ display: flex; flex-direction: column; gap: 16px; }}
        .contact-split-item {{
            display: flex; align-items: flex-start; gap: 14px; padding: 14px 0;
        }}
        .contact-split-item .ci-icon {{
            width: 40px; height: 40px; border-radius: 10px;
            background: color-mix(in srgb, var(--primary), #fff 88%);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; color: var(--primary);
        }}
        .contact-split-form {{
            background: #fff; border: 1px solid #f0f0f0;
            border-radius: var(--radius); padding: 32px;
        }}
        .contact-form-placeholder {{ display: flex; flex-direction: column; gap: 16px; }}
        .contact-form-field label {{
            display: block; font-size: .72rem; font-weight: 600;
            text-transform: uppercase; letter-spacing: .04em;
            color: #6b7280; margin-bottom: 6px;
        }}
        .contact-form-input {{
            width: 100%; height: 42px; border: 1px solid #e5e7eb;
            border-radius: 8px; background: #fafafa;
        }}
        .contact-form-textarea {{ height: 100px; }}
        /* Centered minimal */
        .contact-centered {{ text-align: center; max-width: 560px; margin: 0 auto; }}
        .contact-centered-items {{ display: flex; flex-direction: column; align-items: center; gap: 20px; margin-top: 36px; }}
        .contact-centered-item {{ display: flex; align-items: center; gap: 14px; }}
        .contact-centered-item .ci-icon {{
            width: 44px; height: 44px; border-radius: 50%;
            background: color-mix(in srgb, var(--primary), #fff 88%);
            display: flex; align-items: center; justify-content: center;
            color: var(--primary); flex-shrink: 0;
        }}
        .contact-centered-link {{
            font-size: 1.1rem; font-weight: 500; color: #374151;
            text-decoration: none; transition: color .2s;
        }}
        .contact-centered-link:hover {{ color: var(--primary); }}

        /* ─── FAQ ──────────────────────────── */
        .faq-item {{
            border: 1px solid #f0f0f0; border-radius: var(--radius);
            margin-bottom: 10px; overflow: hidden;
            transition: all .25s cubic-bezier(.4,0,.2,1);
        }}
        .faq-item:hover {{ border-color: color-mix(in srgb, var(--primary), #fff 60%); }}
        .faq-item--open {{ border-color: color-mix(in srgb, var(--primary), #fff 50%); box-shadow: var(--shadow-sm); }}
        .faq-trigger {{
            width: 100%; padding: 18px 24px; font-weight: 600; font-size: 1rem;
            color: #111827; cursor: pointer; display: flex; align-items: center;
            justify-content: space-between; background: none; border: none;
            text-align: left; font-family: inherit; transition: color .2s;
        }}
        .faq-item--open .faq-trigger {{ color: var(--primary); }}
        .faq-icon {{
            width: 24px; height: 24px; position: relative; flex-shrink: 0;
        }}
        .faq-icon::before, .faq-icon::after {{
            content: ''; position: absolute; background: currentColor; border-radius: 1px;
            transition: transform .3s cubic-bezier(.4,0,.2,1);
        }}
        .faq-icon::before {{ width: 14px; height: 2px; top: 50%; left: 50%; transform: translate(-50%,-50%); }}
        .faq-icon::after {{ width: 2px; height: 14px; top: 50%; left: 50%; transform: translate(-50%,-50%); }}
        .faq-item--open .faq-icon::after {{ transform: translate(-50%,-50%) rotate(90deg); opacity: 0; }}
        .faq-answer {{
            max-height: 0; overflow: hidden;
            transition: max-height .4s cubic-bezier(.4,0,.2,1), padding .3s;
        }}
        .faq-item--open .faq-answer {{ max-height: 500px; }}
        .faq-answer .answer {{ padding: 0 24px 18px; color: #6b7280; font-size: .94rem; line-height: 1.7; }}
        /* Side by side */
        .faq-side-layout {{ display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 32px; }}
        .faq-side-questions {{ display: flex; flex-direction: column; gap: 4px; }}
        .faq-side-q {{
            display: flex; align-items: center; gap: 12px;
            padding: 14px 18px; border-radius: var(--radius); border: none;
            background: none; font-size: .92rem; font-weight: 500;
            color: #6b7280; cursor: pointer; text-align: left;
            font-family: inherit; transition: all .2s;
        }}
        .faq-side-q:hover {{ background: #f9fafb; color: #374151; }}
        .faq-side-q--active {{ background: color-mix(in srgb, var(--primary), #fff 92%); color: var(--primary); font-weight: 600; }}
        .faq-side-num {{ font-size: .72rem; font-weight: 700; color: #d1d5db; min-width: 24px; }}
        .faq-side-q--active .faq-side-num {{ color: var(--primary); }}
        .faq-side-answer {{
            background: #fff; border: 1px solid #f0f0f0; border-radius: var(--radius);
            padding: 32px;
        }}
        .faq-side-answer h3 {{ font-size: 1.1rem; margin-bottom: 12px; color: #111827; }}
        .faq-side-answer p {{ color: #6b7280; line-height: 1.7; }}
        /* Cards grid */
        .faq-cards-grid {{
            display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px; margin-top: 32px;
        }}
        .faq-card {{
            border: 1px solid #f0f0f0; border-radius: var(--radius);
            padding: 24px; cursor: pointer; transition: all .25s cubic-bezier(.4,0,.2,1);
        }}
        .faq-card:hover {{ border-color: color-mix(in srgb, var(--primary), #fff 60%); }}
        .faq-card--open {{ border-color: color-mix(in srgb, var(--primary), #fff 50%); box-shadow: var(--shadow-sm); }}
        .faq-card-q {{
            display: flex; align-items: center; justify-content: space-between;
            font-weight: 600; font-size: 1rem; color: #111827;
        }}
        .faq-card--open .faq-card-q {{ color: var(--primary); }}
        .faq-card-a {{ max-height: 0; overflow: hidden; transition: max-height .4s cubic-bezier(.4,0,.2,1); }}
        .faq-card--open .faq-card-a {{ max-height: 300px; }}
        .faq-card-a p {{ padding-top: 14px; color: #6b7280; font-size: .92rem; line-height: 1.7; }}

        /* ─── Gallery ─────────────────────── */
        .gallery-placeholder {{
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
        }}
        .gallery-placeholder .ph {{
            aspect-ratio: 4/3; border-radius: var(--radius);
            background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
            display: flex; align-items: center; justify-content: center;
            color: #9ca3af; font-size: .8rem;
        }}
        .gallery-masonry {{ column-count: 3; column-gap: 12px; }}
        .gallery-masonry-item {{
            break-inside: avoid; margin-bottom: 12px;
            border-radius: var(--radius); overflow: hidden; position: relative; cursor: pointer;
        }}
        .gallery-masonry-item img {{ width: 100%; display: block; }}
        .gallery-item-overlay {{
            position: absolute; inset: 0;
            background: rgba(0,0,0,.3); opacity: 0;
            display: flex; align-items: center; justify-content: center;
            transition: opacity .3s;
        }}
        .gallery-masonry-item:hover .gallery-item-overlay,
        .gallery-item:hover .gallery-item-overlay {{ opacity: 1; }}
        .gallery-item-zoom {{ font-size: 2rem; color: #fff; }}
        .gallery-grid {{
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }}
        .gallery-item {{
            aspect-ratio: 4/3; border-radius: var(--radius); overflow: hidden;
            position: relative; cursor: pointer;
        }}
        .gallery-item img {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
        .gallery-slider-wrap {{ position: relative; }}
        .gallery-slider {{
            display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory;
            scroll-behavior: smooth; scrollbar-width: none; padding: 8px 0;
        }}
        .gallery-slider::-webkit-scrollbar {{ display: none; }}
        .gallery-slider-item {{
            flex: 0 0 auto; width: 320px; aspect-ratio: 4/3;
            border-radius: var(--radius); overflow: hidden; cursor: pointer;
            scroll-snap-align: start;
        }}
        .gallery-slider-item img {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
        .gallery-slider-nav {{
            position: absolute; top: 50%; transform: translateY(-50%);
            width: 40px; height: 40px; border-radius: 50%;
            background: rgba(255,255,255,.9); border: 1px solid #e5e7eb;
            cursor: pointer; font-size: 1.5rem; color: #374151;
            display: flex; align-items: center; justify-content: center;
            z-index: 2; transition: all .2s;
        }}
        .gallery-slider-nav:hover {{ background: #fff; box-shadow: var(--shadow-md); }}
        .gallery-slider-prev {{ left: -12px; }}
        .gallery-slider-next {{ right: -12px; }}

        /* ─── Testimonials enhanced ──────── */
        .testimonial-stars {{ display: flex; gap: 2px; margin-bottom: 12px; }}
        .star-filled {{ color: #f59e0b; font-size: 1rem; }}
        .star-empty {{ color: #e5e7eb; font-size: 1rem; }}
        .testimonial-carousel-wrap {{ max-width: 640px; margin: 0 auto; }}
        .testimonial-carousel {{
            display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
            scroll-behavior: smooth; scrollbar-width: none; gap: 24px;
        }}
        .testimonial-carousel::-webkit-scrollbar {{ display: none; }}
        .testimonial-carousel-item {{ flex: 0 0 100%; scroll-snap-align: center; }}
        .testimonial-card--large {{ padding: 40px 36px; }}
        .testimonial-card--large .content {{ font-size: 1.1rem; line-height: 1.8; }}
        .testimonial-highlight {{ max-width: 640px; margin: 0 auto; text-align: center; }}
        .testimonial-highlight .testimonial-stars {{ justify-content: center; }}
        .quote-mark--large {{ font-size: 5rem; line-height: 1; margin-bottom: 8px; }}
        .testimonial-highlight-content {{
            font-size: 1.2rem; line-height: 1.85; color: #374151;
            font-style: italic; margin-bottom: 28px;
        }}
        .testimonial-highlight .author {{ justify-content: center; }}
        .testimonial-dots {{ display: flex; justify-content: center; gap: 8px; margin-top: 28px; }}
        .testimonial-dot {{
            width: 10px; height: 10px; border-radius: 50%;
            border: 2px solid #d1d5db; background: transparent;
            cursor: pointer; padding: 0; transition: all .3s;
        }}
        .testimonial-dot.active {{ background: var(--primary); border-color: var(--primary); transform: scale(1.2); }}
        .testimonial-dot:hover {{ border-color: var(--primary); }}

        /* ─── Footer ──────────────────────── */
        .site-footer {{
            background: linear-gradient(180deg, #0f172a, #111827);
            color: #94a3b8;
            padding: 56px 24px 36px;
        }}
        .site-footer .container {{
            display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px;
        }}
        .site-footer .footer-brand {{
            font-family: var(--font-heading);
            font-size: 1.15rem; font-weight: 700;
            color: #fff; margin-bottom: 12px;
        }}
        .site-footer .footer-desc {{
            font-size: .85rem; line-height: 1.7;
            color: #64748b; max-width: 300px;
        }}
        .site-footer h4 {{
            font-size: .72rem; font-weight: 700;
            color: #e2e8f0; text-transform: uppercase;
            letter-spacing: .08em; margin-bottom: 16px;
        }}
        .site-footer ul {{ list-style: none; padding: 0; }}
        .site-footer ul li {{ margin-bottom: 10px; }}
        .site-footer ul a {{
            font-size: .85rem; color: #64748b;
            text-decoration: none; transition: color .15s;
        }}
        .site-footer ul a:hover {{ color: #fff; }}
        .site-footer .footer-social {{ display: flex; gap: 8px; margin-top: 20px; }}
        .site-footer .footer-social-link {{
            display: flex; align-items: center; justify-content: center;
            width: 36px; height: 36px; border-radius: 8px;
            background: rgba(255,255,255,.06); color: #64748b;
            transition: all .2s;
        }}
        .site-footer .footer-social-link:hover {{
            background: var(--primary); color: #fff;
            transform: translateY(-2px);
        }}
        .site-footer .footer-bottom {{
            grid-column: 1 / -1;
            border-top: 1px solid rgba(255,255,255,.06);
            padding-top: 24px; margin-top: 12px;
            display: flex; align-items: center; justify-content: center;
            gap: 16px; flex-wrap: wrap;
            font-size: .78rem; color: #475569;
        }}
        .site-footer .footer-bottom a {{
            color: inherit; text-decoration: none; opacity: .7;
        }}
        .site-footer .footer-bottom a:hover {{ opacity: 1; }}
        @media (max-width: 768px) {{
            .hero h1 {{ font-size: 2.2rem; }}
            .hero {{ padding: 120px 20px 90px; }}
            .section {{ padding: 56px 20px; }}
            .section-title {{ font-size: 1.8rem; }}
            .site-footer .container {{ grid-template-columns: 1fr; gap: 28px; }}
            .site-header nav {{ display: none; }}
            .header-actions {{ display: none; }}
            .info-bar {{ display: none; }}
        }}

        /* ─── Scroll animations (anim-*) ─── */
        .reveal {{ opacity: 0; transform: translateY(24px); transition: all .6s cubic-bezier(.4,0,.2,1); }}
        .reveal.visible {{ opacity: 1; transform: translateY(0); }}

        @keyframes pw-fade-up {{ from {{ opacity:0; transform:translateY(32px); }} to {{ opacity:1; transform:translateY(0); }} }}
        @keyframes pw-fade-in {{ from {{ opacity:0; }} to {{ opacity:1; }} }}
        @keyframes pw-scale-in {{ from {{ opacity:0; transform:scale(.92); }} to {{ opacity:1; transform:scale(1); }} }}
        @keyframes g-pendulum {{
          0%   {{ transform: rotate(0deg); }}
          6%   {{ transform: rotate(-18deg); }}
          15%  {{ transform: rotate(-18deg); }}
          35%  {{ transform: rotate(0deg); }}
          42%  {{ transform: rotate(0deg); }}
          48%  {{ transform: rotate(18deg); }}
          57%  {{ transform: rotate(18deg); }}
          77%  {{ transform: rotate(0deg); }}
          100% {{ transform: rotate(0deg); }}
        }}
        .g-pendulum {{ animation: g-pendulum 4.3s cubic-bezier(0.22,1,0.36,1) infinite; will-change: transform; }}
        @media (prefers-reduced-motion: reduce) {{ .g-pendulum {{ animation: none; }} }}
        @keyframes pw-slide-left {{ from {{ opacity:0; transform:translateX(-40px); }} to {{ opacity:1; transform:translateX(0); }} }}
        @keyframes pw-slide-right {{ from {{ opacity:0; transform:translateX(40px); }} to {{ opacity:1; transform:translateX(0); }} }}
        @keyframes pw-blur-in {{ from {{ opacity:0; filter:blur(8px); }} to {{ opacity:1; filter:blur(0); }} }}

        [class*="anim-"] {{ opacity: 0; }}
        .anim-visible {{ opacity: 1 !important; }}
        .anim-fade-up.anim-visible {{ animation: pw-fade-up .7s cubic-bezier(.16,1,.3,1) both; }}
        .anim-fade-in.anim-visible {{ animation: pw-fade-in .6s ease both; }}
        .anim-scale-in.anim-visible {{ animation: pw-scale-in .6s cubic-bezier(.16,1,.3,1) both; }}
        .anim-slide-left.anim-visible {{ animation: pw-slide-left .7s cubic-bezier(.16,1,.3,1) both; }}
        .anim-slide-right.anim-visible {{ animation: pw-slide-right .7s cubic-bezier(.16,1,.3,1) both; }}
        .anim-blur-in.anim-visible {{ animation: pw-blur-in .7s ease both; }}

        /* Stagger children */
        .stagger.anim-visible > * {{
            opacity: 0; animation: pw-fade-up .5s cubic-bezier(.16,1,.3,1) both;
        }}
        .stagger.anim-visible > *:nth-child(1) {{ animation-delay: 0ms; }}
        .stagger.anim-visible > *:nth-child(2) {{ animation-delay: 80ms; }}
        .stagger.anim-visible > *:nth-child(3) {{ animation-delay: 160ms; }}
        .stagger.anim-visible > *:nth-child(4) {{ animation-delay: 240ms; }}
        .stagger.anim-visible > *:nth-child(5) {{ animation-delay: 320ms; }}
        .stagger.anim-visible > *:nth-child(6) {{ animation-delay: 400ms; }}
        .stagger.anim-visible > *:nth-child(n+7) {{ animation-delay: 480ms; }}
        .stagger-child-visible {{ animation-delay: var(--stagger-delay, 0ms) !important; }}

        @media (prefers-reduced-motion: reduce) {{
            [class*="anim-"], .reveal {{ opacity: 1 !important; transform: none !important; filter: none !important; animation: none !important; }}
            .stagger.anim-visible > * {{ opacity: 1 !important; animation: none !important; }}
        }}

        @media (max-width: 768px) {{
            .contact-split {{ grid-template-columns: 1fr; gap: 32px; }}
            .faq-side-layout {{ grid-template-columns: 1fr; }}
            .gallery-masonry {{ column-count: 2; }}
        }}

        /* ─── Section Dividers ─────────────── */
        .section-divider {{ display: block; width: 100%; overflow: hidden; line-height: 0; margin: -1px 0; position: relative; z-index: 1; }}
        /* Wave for modern/artistic */
        .pw-style-modern .section-divider,
        .pw-style-artistic .section-divider {{ height: 48px; }}
        .pw-style-modern .section-divider svg,
        .pw-style-artistic .section-divider svg {{ display: block; width: 100%; height: 100%; }}
        /* Gradient line for elegant/clean */
        .pw-style-elegant .section-divider,
        .pw-style-clean .section-divider {{
            height: 1px; max-width: 1120px; margin: 0 auto;
            background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary), transparent 65%), color-mix(in srgb, var(--secondary), transparent 65%), transparent);
        }}
        .pw-style-elegant .section-divider svg,
        .pw-style-clean .section-divider svg {{ display: none; }}
        /* Bold: dot divider */
        .pw-style-bold .section-divider {{
            display: flex; justify-content: center; gap: 8px; padding: 4px 0;
        }}
        .pw-style-bold .section-divider svg {{ display: none; }}
        .pw-style-bold .section-divider::before,
        .pw-style-bold .section-divider::after,
        .pw-style-bold .section-divider span {{
            content: ''; width: 6px; height: 6px; border-radius: 50%;
            background: color-mix(in srgb, var(--primary), transparent 70%);
        }}
        /* Minimal: no divider */
        .pw-style-minimal .section-divider {{ display: none; }}

        /* ─── Scroll-to-top ───────────────── */
        .scroll-top-btn {{
            position: fixed; bottom: 24px; right: 24px; z-index: 99;
            width: 44px; height: 44px; border-radius: 50%;
            background: var(--primary); color: #fff; border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; visibility: hidden; transform: translateY(16px);
            transition: all .3s cubic-bezier(.4,0,.2,1);
            box-shadow: 0 4px 16px color-mix(in srgb, var(--primary), transparent 60%);
        }}
        .scroll-top-btn.visible {{ opacity: 1; visibility: visible; transform: translateY(0); }}
        .scroll-top-btn:hover {{ transform: translateY(-2px); box-shadow: 0 6px 24px color-mix(in srgb, var(--primary), transparent 45%); }}

        /* ─── Image loading skeleton ─────── */
        img {{
            background: linear-gradient(135deg,
                color-mix(in srgb, var(--primary), #fff 94%),
                color-mix(in srgb, var(--secondary), #fff 90%)
            );
        }}
        img[loading="lazy"] {{ transition: opacity .4s cubic-bezier(.4,0,.2,1); }}

        /* ─── Editor interaction ────────────── */
        [data-section] {{ position: relative; cursor: pointer; transition: outline .15s; }}
        [data-section]:hover {{ outline: 2px dashed var(--secondary); outline-offset: -2px; }}

        {'/* ─── Dark Mode Premium ────────────── */' if is_dark else ''}
        {self._dark_mode_css() if is_dark else ''}
    </style>
</head>
<body class="pw-style-{style}" data-color-mode="{color_mode}">
{analytics_body_start}{info_bar_html}{promo_html}{header_html}
{sections_html}
<button class="scroll-top-btn" aria-label="Volver arriba" onclick="window.scrollTo({{top:0,behavior:'smooth'}})">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
</button>
{footer_html}
<script>
    // Comunicación con el editor parent via postMessage
    document.querySelectorAll('[data-section]').forEach(el => {{
        el.addEventListener('click', () => {{
            window.parent.postMessage({{
                type: 'section-click',
                sectionId: el.dataset.section
            }}, '*');
        }});
    }});
    // Escuchar actualizaciones del editor
    window.addEventListener('message', (e) => {{
        if (e.data.type === 'refresh') {{
            window.location.reload();
        }}
    }});
    // Header scroll effect + scroll-to-top
    const header = document.querySelector('.site-header');
    const scrollBtn = document.querySelector('.scroll-top-btn');
    if (header || scrollBtn) {{
        window.addEventListener('scroll', () => {{
            var y = window.scrollY;
            if (header) header.classList.toggle('scrolled', y > 20);
            if (scrollBtn) scrollBtn.classList.toggle('visible', y > 500);
        }}, {{ passive: true }});
    }}
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(a => {{
        a.addEventListener('click', (e) => {{
            const href = a.getAttribute('href');
            if (!href || href === '#') return;
            try {{
                const target = document.querySelector(href);
                if (target) {{
                    e.preventDefault();
                    target.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
                }}
            }} catch(err) {{}}
        }});
    }});
    // Prevent navigation and text editing in preview iframe (editor context)
    if (window.parent !== window) {{
        document.querySelectorAll('a:not([href^="#"])').forEach(a => {{
            a.addEventListener('click', (e) => {{
                e.preventDefault();
            }});
        }});
        // Block text selection & editing in preview mode
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    }}
    // Scroll reveal animations (anim-* and .reveal)
    const animSelector = '[class*="anim-"], .reveal';
    const animEls = document.querySelectorAll(animSelector);
    if (animEls.length) {{
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {{
            animEls.forEach(el => {{ el.classList.add('anim-visible'); el.classList.add('visible'); }});
        }} else {{
            const io = new IntersectionObserver((entries) => {{
                entries.forEach(e => {{
                    if (e.isIntersecting) {{
                        e.target.classList.add('anim-visible');
                        e.target.classList.add('visible');
                        if (e.target.classList.contains('stagger')) {{
                            Array.from(e.target.children).forEach((child, i) => {{
                                child.style.setProperty('--stagger-delay', i * 80 + 'ms');
                                child.classList.add('stagger-child-visible');
                            }});
                        }}
                        io.unobserve(e.target);
                    }}
                }});
            }}, {{ threshold: 0.12, rootMargin: '0px 0px -40px 0px' }});
            animEls.forEach(el => io.observe(el));
        }}
    }}
    // Gallery slider navigation
    document.querySelectorAll('.gallery-slider-prev').forEach(btn => {{
        btn.addEventListener('click', () => {{
            const slider = btn.parentElement.querySelector('.gallery-slider');
            if (slider) slider.scrollBy({{ left: -slider.clientWidth * 0.8, behavior: 'smooth' }});
        }});
    }});
    document.querySelectorAll('.gallery-slider-next').forEach(btn => {{
        btn.addEventListener('click', () => {{
            const slider = btn.parentElement.querySelector('.gallery-slider');
            if (slider) slider.scrollBy({{ left: slider.clientWidth * 0.8, behavior: 'smooth' }});
        }});
    }});
    // Counter animation for stats
    (function() {{
        const counters = document.querySelectorAll('[data-count-target]');
        if (!counters.length) return;
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        function easeOutExpo(t) {{ return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }}
        function parseStatValue(raw) {{
            if (!raw) return {{ end: 0, prefix: '', suffix: '', decimals: 0 }};
            const pm = raw.match(/^([^0-9.,]*)/);
            const prefix = pm ? pm[1] : '';
            const sm = raw.match(/([^0-9.,]*)$/);
            const suffix = sm ? sm[1] : '';
            const numStr = raw.slice(prefix.length, raw.length - (suffix.length || 0)).replace(/,/g, '');
            const num = parseFloat(numStr);
            const dp = numStr.split('.')[1];
            return {{ end: isNaN(num) ? 0 : num, prefix: prefix, suffix: suffix, decimals: dp ? dp.length : 0 }};
        }}
        function animateCounter(el) {{
            const parsed = parseStatValue(el.dataset.countTarget);
            if (prefersReduced) {{
                el.textContent = parsed.prefix + parsed.end.toFixed(parsed.decimals) + parsed.suffix;
                return;
            }}
            var start = 0, duration = 2000, startTime = null;
            function tick(ts) {{
                if (!startTime) startTime = ts;
                var progress = Math.min((ts - startTime) / duration, 1);
                var val = start + (parsed.end - start) * easeOutExpo(progress);
                el.textContent = parsed.prefix + val.toFixed(parsed.decimals) + parsed.suffix;
                if (progress < 1) requestAnimationFrame(tick);
            }}
            requestAnimationFrame(tick);
        }}
        const cio = new IntersectionObserver(function(entries) {{
            entries.forEach(function(e) {{
                if (e.isIntersecting) {{
                    animateCounter(e.target);
                    cio.unobserve(e.target);
                }}
            }});
        }}, {{ threshold: 0.3 }});
        counters.forEach(function(el) {{ cio.observe(el); }});
    }})();
    // Parallax effect for hero backgrounds
    (function() {{
        const els = document.querySelectorAll('.parallax-bg');
        if (!els.length) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var ticking = false;
        window.addEventListener('scroll', function() {{
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function() {{
                var scrollY = window.scrollY;
                els.forEach(function(el) {{
                    var rect = el.getBoundingClientRect();
                    if (rect.bottom > -200 && rect.top < window.innerHeight + 200) {{
                        el.style.transform = 'translateY(' + (scrollY * 0.3) + 'px)';
                    }}
                }});
                ticking = false;
            }});
        }}, {{ passive: true }});
    }})();
</script>
{self._render_privacy_modal(tenant_info or {}, seo)}
{self._render_cookie_banner(cookie_enabled, cookie_position, cookie_text, cookie_accept, cookie_decline, primary, is_preview=is_preview) if cookie_enabled else ''}
{self._render_whatsapp_button(whatsapp_float_enabled, whatsapp_float_number, whatsapp_float_message, whatsapp_float_position) if whatsapp_float_enabled else ''}
{self._render_header_whatsapp_float(header_data, contact_data) if (not whatsapp_float_enabled and header_data.get('whatsapp_float_enabled')) else ''}
{custom_body_code if custom_body_code else ''}
</body>
</html>"""

    # ─── Industry header defaults ────────────────────────
    INDUSTRY_HEADER_DEFAULTS = {
        'retail': {
            'action_login_enabled': True,
            'action_cart_enabled': True,
            'action_wishlist_enabled': True,
        },
        'beauty': {
            'action_login_enabled': True,
            'action_booking_enabled': True,
            'action_booking_text': 'Reservar cita',
        },
        'health': {
            'action_login_enabled': True,
            'action_booking_enabled': True,
            'action_booking_text': 'Agendar cita',
        },
        'fitness': {
            'action_login_enabled': True,
            'action_booking_enabled': True,
            'action_booking_text': 'Reservar clase',
        },
        'restaurant': {
            'action_booking_enabled': True,
            'action_booking_text': 'Reservar mesa',
        },
        'events': {
            'action_booking_enabled': True,
            'action_booking_text': 'Reservar',
        },
    }

    def _header_field(self, header_data, field, industry='generic', default=None):
        """Get header field with industry-aware defaults."""
        if field in header_data:
            return header_data[field]
        ind_defaults = self.INDUSTRY_HEADER_DEFAULTS.get(industry, {})
        if field in ind_defaults:
            return ind_defaults[field]
        return default

    # ─── Nav labels ─────────────────────────────────────
    SECTION_NAV_LABELS = {
        'about': 'Nosotros',
        'services': 'Servicios',
        'products': 'Productos',
        'testimonials': 'Testimonios',
        'gallery': 'Galería',
        'pricing': 'Precios',
        'faq': 'FAQ',
        'contact': 'Contacto',
        'team': 'Equipo',
        'blog': 'Blog',
    }

    def _dark_mode_css(self):
        """Premium dark mode CSS rules — glass morphism, glow, gradient accents."""
        # Using double braces {{ }} for f-string escaping since this is inside an f-string context
        return """
        /* Dark: Typography */
        h1, h2, h3, h4 { color: #f1f5f9; }
        p, li, span { color: #94a3b8; }
        .section-title { color: #f1f5f9; }
        .section-label { color: var(--secondary); }
        .section-subtitle { color: #94a3b8; }
        .about-content { color: #94a3b8; }

        /* Dark: Section backgrounds */
        .section { background: transparent; }
        .section-alt { background: rgba(30,41,59,0.3); }

        /* Dark: Section divider */
        .section + .section { border-top: 1px solid rgba(255,255,255,0.04); }

        /* Dark: Header glass */
        .site-header {
            background: rgba(15,23,42,0.85);
            backdrop-filter: blur(20px) saturate(1.4);
            -webkit-backdrop-filter: blur(20px) saturate(1.4);
            border-bottom-color: rgba(255,255,255,0.06);
        }
        .site-header.scrolled {
            background: rgba(15,23,42,0.96);
            box-shadow: 0 4px 30px rgba(0,0,0,0.3);
        }
        .site-header nav a { color: #cbd5e1; }
        .site-header nav a:hover { color: #fff; }
        .logo { color: #f1f5f9; }

        /* Dark: Cards — glass morphism */
        .card, .bento-item, .faq-item, .testimonial-card, .pricing-card, .contact-card {
            background: rgba(30,41,59,0.6);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            border-color: rgba(255,255,255,0.08);
        }
        .card:hover, .bento-item:hover, .testimonial-card:hover, .pricing-card:hover {
            border-color: rgba(255,255,255,0.12);
            box-shadow: var(--shadow-lg), var(--glow-sm);
        }
        .card h3, .bento-item h3, .testimonial-card h3, .pricing-card h3 { color: #f1f5f9; }
        .card p, .bento-item p, .testimonial-card p, .pricing-card p { color: #94a3b8; }
        .card .card-icon { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); }
        .card .card-price { background: rgba(255,255,255,0.08); }
        .card::before { opacity: 0.7; }
        .card:hover::before { opacity: 1; }

        /* Dark: Pricing recommended — glow */
        .pricing-card--recommended { border-color: var(--primary); box-shadow: var(--glow-primary); }

        /* Dark: Stats */
        .stat-number { color: #f1f5f9; }
        .stat-label { color: #64748b; }

        /* Dark: FAQ */
        .faq-trigger, .faq-item summary, .faq-item button { color: #f1f5f9; }
        .faq-answer { color: #94a3b8; }

        /* Dark: Testimonials */
        .author-name, .testimonial-card strong { color: #f1f5f9; }
        .author-role { color: #64748b; }

        /* Dark: Highlights */
        .highlight { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.08); }
        .highlight span { color: #cbd5e1; }

        /* Dark: Overlap cards */
        .overlap-card { background: rgba(30,41,59,0.7); border-color: rgba(255,255,255,0.08); }

        /* Dark: Services */
        .svc-list-item { border-color: rgba(255,255,255,0.06); }
        .svc-featured-main { background: rgba(30,41,59,0.6); border-color: rgba(255,255,255,0.08); }
        .svc-featured-small { background: rgba(30,41,59,0.5); border-color: rgba(255,255,255,0.06); }
        .svc-icon-box { background: rgba(255,255,255,0.06); }

        /* Dark: Products */
        .catalog-item { background: rgba(30,41,59,0.5); border-color: rgba(255,255,255,0.08); }
        .masonry-item { background: rgba(30,41,59,0.6); border-color: rgba(255,255,255,0.08); }
        .price-table-row { border-color: rgba(255,255,255,0.06); }
        .pricing-table { border-color: rgba(255,255,255,0.08); }
        .pricing-table th { background: rgba(30,41,59,0.8); color: #f1f5f9; border-color: rgba(255,255,255,0.08); }
        .pricing-table td { border-color: rgba(255,255,255,0.06); color: #94a3b8; }

        /* Dark: Forms */
        input, textarea, select {
            background-color: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.1); color: #e2e8f0;
        }

        /* Dark: Buttons — glow */
        .btn-primary:hover { box-shadow: var(--glow-primary); }
        .btn-outline { border-color: rgba(255,255,255,0.2); color: #e2e8f0; }
        .btn-outline:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.3); }

        /* Dark: Hero */
        .hero--centered { background: linear-gradient(135deg, #0f172a, #1e293b); }
        .hero--split { background: #0f172a; }
        .hero--split h1 { color: #f1f5f9; }
        .hero--split p { color: #94a3b8; }
        .hero--bold { background: #0f172a; color: #f1f5f9; }

        /* Dark: Footer */
        .site-footer { background: rgba(2,6,23,0.8); border-top: 1px solid rgba(255,255,255,0.06); }
        .site-footer h4 { color: #cbd5e1; }
        .site-footer a { color: #64748b; }
        .site-footer a:hover { color: var(--primary); }
        .footer-brand { color: #f1f5f9; }
        .footer-bottom { border-color: rgba(255,255,255,0.06); color: #475569; }
        .footer-social-link { color: #64748b; border-color: rgba(255,255,255,0.08); }
        .footer-social-link:hover { color: var(--primary); box-shadow: var(--glow-sm); }
        """

    # ─── Privacy Policy Modal ────────────────────────────────────
    def _render_privacy_modal(self, tenant_info, seo):
        from django.utils.timezone import now as _now
        name     = self._esc(tenant_info.get('name', ''))
        email    = self._esc(tenant_info.get('email', ''))
        phone    = self._esc(tenant_info.get('phone', ''))
        address  = self._esc(tenant_info.get('address', ''))
        city     = self._esc(tenant_info.get('city', ''))
        country  = tenant_info.get('country', 'Colombia')
        year     = _now().year

        is_eu = country in ('España', 'Francia', 'Alemania', 'Italia', 'Portugal', 'Reino Unido')
        co_law = '<li>Ley 1581 de 2012 y Decreto 1377 de 2013 (Colombia)</li>' if not is_eu else ''
        eu_law = ('<li>Reglamento General de Proteccion de Datos - RGPD/GDPR (UE 2016/679)</li>'
                  '<li>Ley Organica 3/2018, LOPDGDD (Espana)</li>') if is_eu else ''
        authority = (
            'Agencia Espanola de Proteccion de Datos (AEPD) - www.aepd.es'
            if is_eu else
            'Superintendencia de Industria y Comercio (SIC) - www.sic.gov.co'
        )
        rights_items = (
            '<li><strong>Acceso</strong>: conocer que datos tenemos sobre ti.</li>'
            '<li><strong>Rectificacion</strong>: corregir datos inexactos.</li>'
            '<li><strong>Supresion</strong>: solicitar la eliminacion de tus datos.</li>'
            '<li><strong>Portabilidad</strong>: recibir tus datos en formato digital.</li>'
            '<li><strong>Oposicion / Limitacion</strong>: oponerte a ciertos usos de tus datos.</li>'
        )

        contact_parts = []
        if name:    contact_parts.append('<strong>' + name + '</strong>')
        if address: contact_parts.append(address)
        if city:    contact_parts.append(city)
        if email:   contact_parts.append('<a href="mailto:' + email + '" style="color:var(--primary)">' + email + '</a>')
        if phone:   contact_parts.append(phone)
        contact_html = ' &middot; '.join(contact_parts) if contact_parts else '(informacion de contacto no disponible)'

        html_parts = [
            '<!-- Privacy Policy Modal -->',
            '<div id="privacy-modal" style="display:none;position:fixed;inset:0;z-index:10000;'
            'background:rgba(0,0,0,.5);backdrop-filter:blur(4px);padding:16px;overflow-y:auto;'
            'font-family:var(--font-body);">',
            '  <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:20px;'
            'box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden;">',
            # Header
            '    <div style="display:flex;align-items:center;justify-content:space-between;'
            'padding:20px 24px;border-bottom:1px solid #f3f4f6;'
            'background:color-mix(in srgb, var(--primary), #fff 94%);">',
            '      <div style="display:flex;align-items:center;gap:10px;">',
            '        <div style="width:32px;height:32px;border-radius:50%;'
            'background:color-mix(in srgb, var(--primary), transparent 80%);'
            'display:flex;align-items:center;justify-content:center;">',
            '          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" '
            'stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6'
            'a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0'
            'C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
            '        </div>',
            '        <span style="font-weight:700;font-size:1rem;color:#1f2937;">Politica de Privacidad</span>',
            '      </div>',
            '      <button onclick="closePrivacyPolicy()" style="width:32px;height:32px;border-radius:50%;'
            'border:1px solid #e5e7eb;background:#fff;cursor:pointer;display:flex;align-items:center;'
            'justify-content:center;font-size:1.1rem;color:#6b7280;line-height:1;" '
            'aria-label="Cerrar">&times;</button>',
            '    </div>',
            # Body
            '    <div style="padding:24px;font-size:.85rem;line-height:1.7;color:#374151;'
            'overflow-y:auto;max-height:70vh;">',
            '      <p style="color:#6b7280;font-size:.78rem;margin:0 0 20px;">Ultima actualizacion: '
            + str(year) + ' &nbsp;&middot;&nbsp; ' + self._esc(country) + '</p>',
            '      <h3 style="font-size:.95rem;font-weight:700;color:#1f2937;margin:0 0 8px;">1. Quien es el responsable?</h3>',
            '      <p style="margin:0 0 16px;">' + contact_html + '</p>',
            '      <h3 style="font-size:.95rem;font-weight:700;color:#1f2937;margin:0 0 8px;">2. Marco legal aplicable</h3>',
            '      <ul style="margin:0 0 16px;padding-left:20px;">' + co_law + eu_law + '</ul>',
            '      <h3 style="font-size:.95rem;font-weight:700;color:#1f2937;margin:0 0 8px;">3. Datos que recopilamos</h3>',
            '      <ul style="margin:0 0 16px;padding-left:20px;">',
            '        <li><strong>Datos de contacto:</strong> nombre, correo y telefono cuando te registras o nos contactas.</li>',
            '        <li><strong>Datos de navegacion:</strong> paginas visitadas y dispositivo (solo si aceptas las cookies de analisis).</li>',
            '        <li><strong>Datos de transaccion:</strong> pedidos, citas y pagos cuando usas nuestros servicios.</li>',
            '      </ul>',
            '      <h3 style="font-size:.95rem;font-weight:700;color:#1f2937;margin:0 0 8px;">4. Para que usamos tus datos?</h3>',
            '      <ul style="margin:0 0 16px;padding-left:20px;">',
            '        <li>Gestionar tu cuenta, pedidos y citas.</li>',
            '        <li>Enviarte confirmaciones relacionadas con tu compra.</li>',
            '        <li>Mejorar nuestros servicios (solo con tu consentimiento).</li>',
            '        <li>Cumplir con obligaciones legales y fiscales.</li>',
            '      </ul>',
            '      <h3 style="font-size:.95rem;font-weight:700;color:#1f2937;margin:0 0 8px;">5. Cookies</h3>',
            '      <ul style="margin:0 0 16px;padding-left:20px;">',
            '        <li><strong>Esenciales:</strong> imprescindibles para el funcionamiento del sitio. No requieren consentimiento.</li>',
            '        <li><strong>Analisis:</strong> miden el trafico y mejoran la experiencia. Solo se activan si las aceptas.</li>',
            '      </ul>',
            '      <h3 style="font-size:.95rem;font-weight:700;color:#1f2937;margin:0 0 8px;">6. Tus derechos</h3>',
            '      <p style="margin:0 0 8px;">Puedes ejercer en cualquier momento:</p>',
            '      <ul style="margin:0 0 8px;padding-left:20px;">' + rights_items + '</ul>',
            '      <p style="margin:0 0 8px;">Escribenos a <a href="mailto:' + email + '" style="color:var(--primary)">' + email + '</a>. Respondemos en un maximo de 15 dias habiles.</p>',
            '      <p style="margin:0 0 16px;">Autoridad competente: ' + authority + '</p>',
            '      <h3 style="font-size:.95rem;font-weight:700;color:#1f2937;margin:0 0 8px;">7. Conservacion de datos</h3>',
            '      <p style="margin:0 0 16px;">Conservamos tus datos mientras mantengas una relacion activa o durante el tiempo que exija la ley.</p>',
            '      <h3 style="font-size:.95rem;font-weight:700;color:#1f2937;margin:0 0 8px;">8. Cambios en esta politica</h3>',
            '      <p style="margin:0 0 16px;">Podemos actualizar esta politica ocasionalmente. Te notificaremos de cambios significativos.</p>',
            '      <div style="margin-top:20px;padding:14px 16px;border-radius:10px;background:#f9fafb;border:1px solid #f3f4f6;">',
            '        <p style="margin:0;font-size:.75rem;color:#9ca3af;line-height:1.5;">',
            '          Esta politica es una base de referencia. Te recomendamos revisarla con un profesional legal si tu negocio maneja datos de forma especial.',
            '        </p>',
            '      </div>',
            '    </div>',
            # Footer
            '    <div style="padding:16px 24px;border-top:1px solid #f3f4f6;text-align:center;">',
            '      <button onclick="closePrivacyPolicy()" style="padding:10px 28px;border-radius:10px;'
            'border:none;background:var(--primary);color:#fff;font-weight:600;font-size:.85rem;'
            'cursor:pointer;font-family:inherit;">Entendido</button>',
            '    </div>',
            '  </div>',
            '</div>',
            '<script>',
            'function openPrivacyPolicy(){var m=document.getElementById("privacy-modal");if(m){m.style.display="block";document.body.style.overflow="hidden";}}',
            'function closePrivacyPolicy(){var m=document.getElementById("privacy-modal");if(m){m.style.display="none";document.body.style.overflow="";}}',
            '(function(){var m=document.getElementById("privacy-modal");if(m)m.addEventListener("click",function(e){if(e.target===this)closePrivacyPolicy();});})();',
            '</script>',
        ]
        return '\n'.join(html_parts)

    # ─── Cookie Consent Banner ──────────────────────────────────
    def _render_cookie_banner(self, enabled, position, text, accept_label, decline_label, primary, is_preview=False):
        if not enabled:
            return ''

        # Link que abre el modal de política de privacidad (siempre disponible)
        privacy_link = ' <a href="#" onclick="openPrivacyPolicy();return false;" style="color:var(--primary);text-decoration:none;font-weight:500;">Política de privacidad</a>'

        # Shield icon SVG con color del tenant (usa CSS var para actualizaciones en tiempo real)
        shield_icon = '<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:color-mix(in srgb, var(--primary), transparent 88%);flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg></div>'

        return f"""<div id="cookie-banner" style="position:fixed;bottom:0;left:0;right:0;z-index:9999;display:none;padding:16px;font-family:var(--font-body);">
    <div style="max-width:460px;margin:0 auto;background:#fff;border-radius:16px;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,.12);border:1px solid #e5e7eb;">
        <div style="display:flex;align-items:flex-start;gap:12px;">
            {shield_icon}
            <div style="flex:1;min-width:0;">
                <p style="margin:0 0 4px;font-size:.82rem;font-weight:600;color:#1f2937;">
                    Tu privacidad es importante
                </p>
                <p style="margin:0;font-size:.75rem;line-height:1.5;color:#6b7280;">
                    {self._esc(text)}{privacy_link}
                </p>
            </div>
        </div>
        <div style="margin:12px 0 0;padding:10px 12px;border-radius:8px;background:#f9fafb;border:1px solid #f3f4f6;">
            <p style="margin:0;font-size:.68rem;line-height:1.6;color:#9ca3af;">
                <strong style="color:#6b7280;">Esenciales:</strong> necesarias para que el sitio funcione (sesión, carrito, preferencias).
                <strong style="color:#6b7280;margin-left:4px;">Análisis:</strong> nos ayudan a entender cómo usas el sitio para mejorarlo.
            </p>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
            <button onclick="declineCookies()" style="flex:1;height:36px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;font-weight:500;cursor:pointer;font-size:.78rem;font-family:inherit;transition:all .15s ease;"
                onmouseover="this.style.background='#f9fafb';"
                onmouseout="this.style.background='#fff';">
                {self._esc(decline_label)}
            </button>
            <button onclick="acceptCookies()" style="flex:1;height:36px;border-radius:8px;border:none;background:var(--primary);color:#fff;font-weight:600;cursor:pointer;font-size:.78rem;font-family:inherit;transition:all .15s ease;"
                onmouseover="this.style.opacity='0.85';"
                onmouseout="this.style.opacity='1';">
                {self._esc(accept_label)}
            </button>
        </div>
    </div>
</div>
<script>
(function(){{
    var banner=document.getElementById('cookie-banner');
    if(!banner)return;
    var isPreview={'true' if is_preview else 'false'};
    if(isPreview){{
        banner.style.display='block';
        window.acceptCookies=function(){{banner.style.display='none';}};
        window.declineCookies=function(){{banner.style.display='none';}};
        return;
    }}
    var choice=localStorage.getItem('cookie-consent');
    if(choice==='accepted'){{
        if(typeof __loadAnalytics==='function')__loadAnalytics();
    }}else if(!choice){{
        banner.style.display='block';
    }}
    window.acceptCookies=function(){{
        localStorage.setItem('cookie-consent','accepted');
        if(typeof __loadAnalytics==='function')__loadAnalytics();
        banner.style.display='none';
    }};
    window.declineCookies=function(){{
        localStorage.setItem('cookie-consent','declined');
        banner.style.display='none';
    }};
}})();
</script>"""

    # ─── WhatsApp Floating Button ────────────────────────────────
    def _render_whatsapp_button(self, enabled, number, message, position):
        if not enabled or not number:
            return ''
        clean_number = ''.join(c for c in str(number) if c.isdigit() or c == '+')
        encoded_msg = ''
        if message:
            import urllib.parse as _urlparse
            encoded_msg = _urlparse.quote(message)
        wa_url = f'https://wa.me/{clean_number}'
        if encoded_msg:
            wa_url += f'?text={encoded_msg}'
        pos_css = 'right:24px;' if position == 'bottom-right' else 'left:24px;'

        return f"""<div id="wa-float" style="position:fixed;bottom:24px;{pos_css}z-index:9998;">
    <a href="{self._esc(wa_url)}" target="_blank" rel="noopener noreferrer"
       style="display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;background:#25D366;box-shadow:0 4px 16px rgba(37,211,102,.4);transition:transform .2s ease,box-shadow .2s ease;text-decoration:none;"
       onmouseover="this.style.transform='scale(1.1)';this.style.boxShadow='0 6px 24px rgba(37,211,102,.5)';"
       onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 4px 16px rgba(37,211,102,.4)';"
       aria-label="Contactar por WhatsApp">
        <svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
    </a>
</div>"""

    # ─── Schema.org JSON-LD ──────────────────────────────────────
    def _render_schema_jsonld(self, business_type, name, description, content, media, base_url):
        import json as _json
        contact = content.get('contact', {})
        logo_url = media.get('logo_url', '')
        url = base_url or ''

        schema = {
            "@context": "https://schema.org",
            "@type": business_type or "LocalBusiness",
            "name": name or "",
            "description": description or "",
            "url": url,
        }
        if logo_url:
            schema["image"] = logo_url
        if contact.get('phone'):
            schema["telephone"] = contact['phone']
        if contact.get('email'):
            schema["email"] = contact['email']
        if contact.get('address'):
            schema["address"] = {
                "@type": "PostalAddress",
                "streetAddress": contact['address']
            }

        json_str = _json.dumps(schema, ensure_ascii=False, indent=2)
        return f'    <script type="application/ld+json">\n{json_str}\n    </script>\n'

    def _esc(self, text):
        if not text:
            return ''
        return str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

    def _tenant_url(self, path: str) -> str:
        """Construye URL absoluta del tenant. Ej: https://tenant.nerbis.com/products"""
        base = getattr(self, '_base_url', '') or ''
        if base:
            return f"{base.rstrip('/')}/{path.lstrip('/')}"
        return f"/{path.lstrip('/')}"

    def _inject_section_cta(self, html, text, path):
        """Inyecta un botón CTA antes del cierre de </section>."""
        url = self._tenant_url(path)
        cta = f'        <div style="text-align:center;margin-top:2.5rem;"><a href="{url}" class="btn btn-primary" style="display:inline-flex;align-items:center;gap:8px;">{text} &#8594;</a></div>\n'
        marker = '    </div>\n</section>'
        idx = html.rfind(marker)
        if idx >= 0:
            return html[:idx] + cta + marker + '\n'
        return html

    # Secciones que enlazan a páginas reales en vez de anchors
    SECTION_PAGE_MAP = {
        'about': '/about',
        'services': '/services',
        'products': '/products',
        'testimonials': '/testimonials',
        'faq': '/faq',
        'gallery': '/gallery',
        'pricing': '/pricing',
        'contact': '/contact',
    }

    # ─── SVG icons for header ──────────────────────────
    _SVG_PHONE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
    _SVG_MAIL = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>'
    _SVG_CLOCK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    _SVG_USER = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    _SVG_CART = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>'
    _SVG_HEART = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
    _SVG_CALENDAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>'

    def _render_info_bar(self, header_data, contact_data, social_links, industry='generic'):
        """Render the info bar above the header nav."""
        if not self._header_field(header_data, 'info_bar_enabled', industry, False):
            return ''

        bg = header_data.get('info_bar_bg', '#1C3B57')
        tc = header_data.get('info_bar_text_color', '#FFFFFF')

        items_html = ''
        show_phone = header_data.get('info_bar_show_phone', True)
        show_email = header_data.get('info_bar_show_email', True)
        show_hours = header_data.get('info_bar_show_hours', True)

        phone = contact_data.get('phone', '')
        email = contact_data.get('email', '')
        hours = contact_data.get('hours', '')

        info_parts = []
        if show_phone and phone:
            info_parts.append(f'<span class="info-bar-item">{self._SVG_PHONE} {self._esc(phone)}</span>')
        if show_email and email:
            info_parts.append(f'<span class="info-bar-item">{self._SVG_MAIL} {self._esc(email)}</span>')
        if show_hours and hours:
            info_parts.append(f'<span class="info-bar-item">{self._SVG_CLOCK} {self._esc(hours)}</span>')

        if info_parts:
            items_html = f'<div class="info-bar-left">{" ".join(info_parts)}</div>'

        social_html = ''
        show_social = header_data.get('info_bar_show_social', True)
        if show_social and social_links:
            social_icons_map = {
                'facebook': '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>',
                'instagram': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>',
                'twitter': '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
                'linkedin': '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>',
                'youtube': '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/></svg>',
                'tiktok': '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.19a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.62z"/></svg>',
            }
            social_parts = []
            for network, url in social_links.items():
                if url and network in social_icons_map:
                    social_parts.append(f'<a href="{self._esc(url)}" target="_blank" rel="noopener noreferrer" class="info-bar-social-link" title="{network.title()}">{social_icons_map[network]}</a>')
            if social_parts:
                social_html = f'<div class="info-bar-social">{" ".join(social_parts)}</div>'

        if not items_html and not social_html:
            return ''

        return f'''<div class="info-bar" style="background:{bg};color:{tc};">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
        {items_html}
        {social_html}
    </div>
</div>'''

    def _render_header(self, logo_text, nav_sections, cta_text, cta_link, primary, secondary, logo_url='', custom_nav_items=None, header_data=None, industry='generic'):
        nav_html = ''
        page_slugs = getattr(self, '_page_slugs', {})

        if custom_nav_items:
            # Navegación personalizada desde content_data['header']['nav_items']
            for item in custom_nav_items:
                if not item.get('visible', True):
                    continue
                sid = item.get('id', '')
                label = item.get('label', self.SECTION_NAV_LABELS.get(sid, sid.replace('_', ' ').title()))
                if page_slugs and sid in page_slugs:
                    href = page_slugs[sid]
                else:
                    page = self.SECTION_PAGE_MAP.get(sid)
                    href = self._tenant_url(page) if page else f'#{sid}'
                nav_html += f'<a href="{href}">{self._esc(label)}</a>\n'
        else:
            # Fallback: auto-generar desde secciones activas
            for sid in nav_sections:
                label = self.SECTION_NAV_LABELS.get(sid, sid.replace('_', ' ').title())
                page = self.SECTION_PAGE_MAP.get(sid)
                href = self._tenant_url(page) if page else f'#{sid}'
                nav_html += f'<a href="{href}">{self._esc(label)}</a>\n'

        cta_html = ''
        if cta_text:
            cta_html = f'<a href="{self._esc(cta_link)}" class="header-cta">{self._esc(cta_text)}</a>'

        # Logo: mode-aware rendering
        header_data = header_data or {}
        logo_mode = header_data.get('logo_mode', 'image' if logo_url else 'text')
        logo_scale = int(header_data.get('logo_scale', 100))
        logo_padding = int(header_data.get('logo_padding', 0))
        logo_height = round(36 * logo_scale / 100)
        padding_style = f'padding:{logo_padding}px;' if logo_padding > 0 else ''
        font_scale = round(1.25 * logo_scale / 100, 2)

        if logo_mode == 'image' and logo_url:
            logo_inner = f'<img src="{self._esc(logo_url)}" alt="{self._esc(logo_text)}" style="max-height:{logo_height}px;width:auto;display:block;{padding_style}">'
        elif logo_mode == 'image_text' and logo_url:
            logo_inner = (
                f'<span style="display:inline-flex;align-items:center;gap:8px;{padding_style}">'
                f'<img src="{self._esc(logo_url)}" alt="{self._esc(logo_text)}" style="max-height:{logo_height}px;width:auto;display:block;">'
                f'<span style="font-size:{font_scale}rem;">{self._esc(logo_text)}</span>'
                f'</span>'
            )
        else:
            logo_inner = f'<span style="font-size:{font_scale}rem;{padding_style}">{self._esc(logo_text)}</span>'

        # User action icons
        actions_html = ''

        if self._header_field(header_data, 'action_login_enabled', industry, False):
            _login_text = self._esc(header_data.get('action_login_text', 'Mi cuenta'))
            _login_link = self._esc(header_data.get('action_login_link', '/login'))
            actions_html += f'<a href="{_login_link}" class="header-action" title="{_login_text}">{self._SVG_USER} <span>{_login_text}</span></a>'

        if self._header_field(header_data, 'action_wishlist_enabled', industry, False):
            _wish_link = self._esc(header_data.get('action_wishlist_link', '/favoritos'))
            actions_html += f'<a href="{_wish_link}" class="header-action" title="Favoritos">{self._SVG_HEART}</a>'

        if self._header_field(header_data, 'action_cart_enabled', industry, False):
            _cart_link = self._esc(header_data.get('action_cart_link', '/carrito'))
            actions_html += f'<a href="{_cart_link}" class="header-action" title="Carrito">{self._SVG_CART}</a>'

        if self._header_field(header_data, 'action_booking_enabled', industry, False):
            _book_text = self._esc(header_data.get('action_booking_text',
                         self.INDUSTRY_HEADER_DEFAULTS.get(industry, {}).get('action_booking_text', 'Reservar cita')))
            _use_system = header_data.get('action_booking_use_system', True)
            if _use_system:
                _base = getattr(self, '_base_url', '')
                _book_link = f'{_base}/booking' if _base else '#booking'
            else:
                _book_link = self._esc(header_data.get('action_booking_link', '#'))
            actions_html += f'<a href="{_book_link}" class="header-action header-action-booking">{self._SVG_CALENDAR} <span>{_book_text}</span></a>'

        actions_wrapper = f'<div class="header-actions">{actions_html}</div>' if actions_html else ''

        return f"""<header class="site-header" data-section="header">
    <div class="container">
        <a href="#" class="logo">{logo_inner}</a>
        <nav>
            {nav_html}
            {cta_html}
        </nav>
        {actions_wrapper}
    </div>
</header>
"""

    def _render_footer(self, logo_text, contact_data, nav_sections, primary, social_links=None, show_badge=True, badge_logo_url=None, footer_data=None):
        social_links = social_links or {}
        footer_data = footer_data or {}

        # Nav links — usa slugs de página si está disponible (multi-page)
        nav_links = ''
        page_slugs = getattr(self, '_page_slugs', {})
        for sid in nav_sections[:6]:
            label = self.SECTION_NAV_LABELS.get(sid, sid.replace('_', ' ').title())
            if page_slugs and sid in page_slugs:
                # Multi-page: link a la URL real de la página
                href = page_slugs[sid]
            else:
                # Single-page legado: anchor o tenant URL
                page = self.SECTION_PAGE_MAP.get(sid)
                href = self._tenant_url(page) if page else f'#{sid}'
            nav_links += f'<li><a href="{href}">{self._esc(label)}</a></li>\n'

        # Contact info
        contact_items = ''
        for key in ('phone', 'email', 'address', 'whatsapp', 'hours'):
            val = contact_data.get(key, '')
            if val:
                label = self._CONTACT_LABELS.get(key, key.title())
                contact_items += f'<li><a href="#">{label}: {self._esc(val)}</a></li>\n'

        # Social links
        social_icons = {
            'whatsapp': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
            'instagram': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85s.01-3.58.07-4.85C2.38 3.86 3.9 2.31 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z"/></svg>',
            'facebook': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.23 2.68.23v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.27h3.33l-.53 3.49h-2.8v8.44C19.61 23.08 24 18.09 24 12.07z"/></svg>',
            'tiktok': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52V6.8a4.84 4.84 0 01-1-.11z"/></svg>',
            'youtube': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.6 31.6 0 000 12a31.6 31.6 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.6 31.6 0 0024 12a31.6 31.6 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>',
            'linkedin': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05a3.74 3.74 0 013.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 11-.01-4.13 2.06 2.06 0 01.01 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
            'twitter': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
            'pinterest': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>',
        }

        social_html = ''
        for network, url in social_links.items():
            if url and network in social_icons:
                social_html += f'<a href="{self._esc(url)}" target="_blank" rel="noopener noreferrer" class="footer-social-link" title="{network.title()}">{social_icons[network]}</a>\n'

        social_section = ''
        if social_html:
            social_section = f'<div class="footer-social">{social_html}</div>'

        esc_name = self._esc(logo_text)

        # Footer editable fields (con defaults para backward compat)
        footer_desc = footer_data.get('description', 'Visítanos y descubre todo lo que tenemos para ofrecerte.')
        footer_copyright = footer_data.get('copyright_text', f'2026 {logo_text}. Todos los derechos reservados.')
        footer_privacy = footer_data.get('privacy_label', 'Política de privacidad')

        # Newsletter form (visual only)
        newsletter_html = ''
        if footer_data.get('newsletter_enabled'):
            _nl_title = self._esc(footer_data.get('newsletter_title', 'Suscríbete a nuestro boletín'))
            _nl_placeholder = self._esc(footer_data.get('newsletter_placeholder', 'Tu correo electrónico'))
            _nl_btn = self._esc(footer_data.get('newsletter_button_text', 'Suscribirse'))
            newsletter_html = f'''<div class="footer-newsletter" style="grid-column:1/-1;padding:32px 0 24px;border-top:1px solid rgba(255,255,255,.08);margin-top:16px;">
            <h4 style="margin-bottom:12px;font-size:.95rem;">{_nl_title}</h4>
            <form onsubmit="return false" style="display:flex;gap:8px;max-width:420px;">
                <input type="email" placeholder="{_nl_placeholder}" style="flex:1;padding:10px 14px;border-radius:var(--radius);border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:inherit;font-size:.88rem;outline:none;">
                <button type="submit" class="btn btn-primary" style="white-space:nowrap;padding:10px 20px;font-size:.85rem;">{_nl_btn}</button>
            </form>
        </div>'''

        # Badge "Hecho con NERBIS" — isotipo embebido como data URI + animación pendulo
        _b64 = 'iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAKMWlDQ1BJQ0MgUHJvZmlsZQAAeJydlndUU9kWh8+9N71QkhCKlNBraFICSA29SJEuKjEJEErAkAAiNkRUcERRkaYIMijggKNDkbEiioUBUbHrBBlE1HFwFBuWSWStGd+8ee/Nm98f935rn73P3Wfvfda6AJD8gwXCTFgJgAyhWBTh58WIjYtnYAcBDPAAA2wA4HCzs0IW+EYCmQJ82IxsmRP4F726DiD5+yrTP4zBAP+flLlZIjEAUJiM5/L42VwZF8k4PVecJbdPyZi2NE3OMErOIlmCMlaTc/IsW3z2mWUPOfMyhDwZy3PO4mXw5Nwn4405Er6MkWAZF+cI+LkyviZjg3RJhkDGb+SxGXxONgAoktwu5nNTZGwtY5IoMoIt43kA4EjJX/DSL1jMzxPLD8XOzFouEiSniBkmXFOGjZMTi+HPz03ni8XMMA43jSPiMdiZGVkc4XIAZs/8WRR5bRmyIjvYODk4MG0tbb4o1H9d/JuS93aWXoR/7hlEH/jD9ld+mQ0AsKZltdn6h21pFQBd6wFQu/2HzWAvAIqyvnUOfXEeunxeUsTiLGcrq9zcXEsBn2spL+jv+p8Of0NffM9Svt3v5WF485M4knQxQ143bmZ6pkTEyM7icPkM5p+H+B8H/nUeFhH8JL6IL5RFRMumTCBMlrVbyBOIBZlChkD4n5r4D8P+pNm5lona+BHQllgCpSEaQH4eACgqESAJe2Qr0O99C8ZHA/nNi9GZmJ37z4L+fVe4TP7IFiR/jmNHRDK4ElHO7Jr8WgI0IABFQAPqQBvoAxPABLbAEbgAD+ADAkEoiARxYDHgghSQAUQgFxSAtaAYlIKtYCeoBnWgETSDNnAYdIFj4DQ4By6By2AE3AFSMA6egCnwCsxAEISFyBAVUod0IEPIHLKFWJAb5AMFQxFQHJQIJUNCSAIVQOugUqgcqobqoWboW+godBq6AA1Dt6BRaBL6FXoHIzAJpsFasBFsBbNgTzgIjoQXwcnwMjgfLoK3wJVwA3wQ7oRPw5fgEVgKP4GnEYAQETqiizARFsJGQpF4JAkRIauQEqQCaUDakB6kH7mKSJGnyFsUBkVFMVBMlAvKHxWF4qKWoVahNqOqUQdQnag+1FXUKGoK9RFNRmuizdHO6AB0LDoZnYsuRlegm9Ad6LPoEfQ4+hUGg6FjjDGOGH9MHCYVswKzGbMb0445hRnGjGGmsVisOtYc64oNxXKwYmwxtgp7EHsSewU7jn2DI+J0cLY4X1w8TogrxFXgWnAncFdwE7gZvBLeEO+MD8Xz8MvxZfhGfA9+CD+OnyEoE4wJroRIQiphLaGS0EY4S7hLeEEkEvWITsRwooC4hlhJPEQ8TxwlviVRSGYkNimBJCFtIe0nnSLdIr0gk8lGZA9yPFlM3kJuJp8h3ye/UaAqWCoEKPAUVivUKHQqXFF4pohXNFT0VFysmK9YoXhEcUjxqRJeyUiJrcRRWqVUo3RU6YbStDJV2UY5VDlDebNyi/IF5UcULMWI4kPhUYoo+yhnKGNUhKpPZVO51HXURupZ6jgNQzOmBdBSaaW0b2iDtCkVioqdSrRKnkqNynEVKR2hG9ED6On0Mvph+nX6O1UtVU9Vvuom1TbVK6qv1eaoeajx1UrU2tVG1N6pM9R91NPUt6l3qd/TQGmYaYRr5Grs0Tir8XQObY7LHO6ckjmH59zWhDXNNCM0V2ju0xzQnNbS1vLTytKq0jqj9VSbru2hnaq9Q/uE9qQOVcdNR6CzQ+ekzmOGCsOTkc6oZPQxpnQ1df11Jbr1uoO6M3rGelF6hXrtevf0Cfos/ST9Hfq9+lMGOgYhBgUGrQa3DfGGLMMUw12G/YavjYyNYow2GHUZPTJWMw4wzjduNb5rQjZxN1lm0mByzRRjyjJNM91tetkMNrM3SzGrMRsyh80dzAXmu82HLdAWThZCiwaLG0wS05OZw2xljlrSLYMtCy27LJ9ZGVjFW22z6rf6aG1vnW7daH3HhmITaFNo02Pzq62ZLde2xvbaXPJc37mr53bPfW5nbse322N3055qH2K/wb7X/oODo4PIoc1h0tHAMdGx1vEGi8YKY21mnXdCO3k5rXY65vTW2cFZ7HzY+RcXpkuaS4vLo3nG8/jzGueNueq5clzrXaVuDLdEt71uUnddd457g/sDD30PnkeTx4SnqWeq50HPZ17WXiKvDq/XbGf2SvYpb8Tbz7vEe9CH4hPlU+1z31fPN9m31XfKz95vhd8pf7R/kP82/xsBWgHcgOaAqUDHwJWBfUGkoAVB1UEPgs2CRcE9IXBIYMj2kLvzDecL53eFgtCA0O2h98KMw5aFfR+OCQ8Lrwl/GGETURDRv4C6YMmClgWvIr0iyyLvRJlESaJ6oxWjE6Kbo1/HeMeUx0hjrWJXxl6K04gTxHXHY+Oj45vipxf6LNy5cDzBPqE44foi40V5iy4s1licvvj4EsUlnCVHEtGJMYktie85oZwGzvTSgKW1S6e4bO4u7hOeB28Hb5Lvyi/nTyS5JpUnPUp2Td6ePJninlKR8lTAFlQLnqf6p9alvk4LTduf9ik9Jr09A5eRmHFUSBGmCfsytTPzMoezzLOKs6TLnJftXDYlChI1ZUPZi7K7xTTZz9SAxESyXjKa45ZTk/MmNzr3SJ5ynjBvYLnZ8k3LJ/J9879egVrBXdFboFuwtmB0pefK+lXQqqWrelfrry5aPb7Gb82BtYS1aWt/KLQuLC98uS5mXU+RVtGaorH1futbixWKRcU3NrhsqNuI2ijYOLhp7qaqTR9LeCUXS61LK0rfb+ZuvviVzVeVX33akrRlsMyhbM9WzFbh1uvb3LcdKFcuzy8f2x6yvXMHY0fJjpc7l+y8UGFXUbeLsEuyS1oZXNldZVC1tep9dUr1SI1XTXutZu2m2te7ebuv7PHY01anVVda926vYO/Ner/6zgajhop9mH05+x42Rjf2f836urlJo6m06cN+4X7pgYgDfc2Ozc0tmi1lrXCrpHXyYMLBy994f9Pdxmyrb6e3lx4ChySHHn+b+O31w0GHe4+wjrR9Z/hdbQe1o6QT6lzeOdWV0iXtjusePhp4tLfHpafje8vv9x/TPVZzXOV42QnCiaITn07mn5w+lXXq6enk02O9S3rvnIk9c60vvG/wbNDZ8+d8z53p9+w/ed71/LELzheOXmRd7LrkcKlzwH6g4wf7HzoGHQY7hxyHui87Xe4Znjd84or7ldNXva+euxZw7dLI/JHh61HXb95IuCG9ybv56Fb6ree3c27P3FlzF3235J7SvYr7mvcbfjT9sV3qID0+6j068GDBgztj3LEnP2X/9H686CH5YcWEzkTzI9tHxyZ9Jy8/Xvh4/EnWk5mnxT8r/1z7zOTZd794/DIwFTs1/lz0/NOvm1+ov9j/0u5l73TY9P1XGa9mXpe8UX9z4C3rbf+7mHcTM7nvse8rP5h+6PkY9PHup4xPn34D94Tz+6TMXDkAAAjtSURBVHjazZdtjFTVGcf//3PuvXNnZnd2F1egLCAhSAXfuyAGkdk1VRsbW6IOqKVJtRZK2jS10UYbm939UIT6Eutb60vSmia13Q1t6heJjd0Zo4simwoVQSwICqxalmF3h3m795ynH2a27MsgoqTpSe6Xe0/u/d/f8zz/8zzEGVoiKd3fv0+1ttZJf3+Ora11Mn7HVCF7DP4XSwQ8U/ucMyBGkbAHD15xfWKKc/FQNgyhAIFYGAgVwrp6F8NDwV6y7wURkISc7H2nUkwkk7rmk7Y2K51dAgD79ycbnEh4YNo0L1EsWlCNEWwB1yWy2SB0lZzT3Nw3AIAk7OchJMhkwppPMhmgM+mQmfDA4eD2hkY38dFHpeJJ3hk2Nrn+saPBj0jc09ub1EDGng4hAsC0i1bHytHS3QA8Vc0BEiKOp5Up9/97S0/PS9uvji1oPv6OH9WzikUrJFSNsIrrEsbYYzDBuS0tbx4FgFqhq00omdTIZMIgUrxdR+o6JCwDZEWlAEo5iLrFFSRk3/7CrU1T3NlHjwZGKdYMLwkGgQ2nTHGbBrP4Polf9ErSASbT58nozLw85ectdkGpFoi1ECgAhtrR1pR7j23ddM2fulPekqWH3orH9Xn5vBGS6lPCb12XDMr2Y9/D/ObmvlwtSqomHUCOC1bT9c6BtQTggXAAcUE4dXE8KAAuXXJ4RWOjsyCfN/YUYgBAlUrWNk5xpxfLcltFyOSCUZPoZDIGC1MeBD+FNQIKq+lt6LhKwuC1D/6+6W+pVEq7Wu4ypnYJi4idHDqykLci4J3vv5/0gYyZ6E2qFp0pdXKzcr15YowFxv+5H5UNJGT9xo++mqh3FudyoZCTcyca1apGLqlCwdimJneOdsu3kJB0ejwlNaGULZJJR4B7JtNxlDXBtkd+oF4EAM81dytVfVpjFQv2dyKwtRK8VLIi4N0iSSedHl/+agwdB4BtKk69Ubnegsl0yIhnN6xc2WN2vXfl0mhMXzUyYux4OmJiMS0C2T5zxow7QHkrFtcCiBkTNpXPG9vY6C44OFBe0dUF29ubdCYLyrRZpFKakHthRcZYo6F2lITlHd9YfeAFAIj65q6Ir1jx4XF+A8clofAA2WMgfMjRpMgkSghDEWt5jwjY1naCUkVQKqWBLnvWAV5P7V0sJrQgTvy5Ih2XG59Z2x/s2rv8Qt/n9cNDoQB0xiZxNKbVsWywe9a0UrdISs+aUewZOhbujka1Gh8+6lwulETCaf1wYNm1JKxISp8Q1LNQANDC/qzynydOImqtbFDeteorI5sEQMw3d8bjjiMiZqIbRyKKADaS/QEw4pD9AYgHfV9RZDynUf+x1t5bubNQKoKSSQfosk1LVn1NOe5iCcfQEQqUpqfxwOOPbS7teHfZXM/lzUMVOnqMGBuNanUsG+wrtSSeFwE7OzcHIiCM+UM2Gx6YSImkHhkJbV1cLz9waOmVZJcVSWmFTJsFAIq5b4KRWDqOlrC8d/nl/KMAqI/ZdfG48qyVEiBGREIRCQEp+76iIh6Yz82ldDqpu7pg00jq2bNfLxB4JBabnHMAxHEJCO4FgJ6e6jHRtPiGa5Ub2SxhYFF1XILGUinY0rrs1r889fbbyXlnTzfv1SccmFDAqp1ZC0RjCgOHyx9rFOc+/XR/sbMTQkJGTW9w8LL6Qtnd47qcGgQiE+zGui5ZDtSS2TNeedOp5tgqUAsQWgAKhBhjdaIhWrjtxzf8tevrf2bdoeVTI75++JNPymVHQURoAbFChKADAba0tPTnqw2bjOZJrySd9ubM8AcHlz1Zn3C7Bo+UzNhjRkRsIuE6RwbLtwKoCNKe85wYcxsgCiCUUswN5cJVa1dEL7xs0SqQv5oD9gHSd6oWdWLj1VY9HoYPHXliONuwzvW86UHZymjzQFKN5Iwoi+5qlXWoI68+n4GEr9BxFUETlAJMn9msLlmyAIMfH/3JQ3190e7um/Q2WeOKJJ1aV3d3Stfqb0Zv3bRzV3FfflngqRIASpWOqa/XqliwL82c2beluzulHSTTChlYz/fXl8tmORVYKpVxxdWLlR91DZQ7O2rxrZUre57t6O3lovb28HR67o50WrMd4aP/2LnmcOTmWTOLb4Sa1qmmF8MQoFLrK3Z4oh9SIiJTl93yRhDYRXX1vr1r/VodjUWs9jwGhdIeFfLCNa2tIcmTnl81YkgB0PPhFn8wy93iNc+6yHtK5sVeViVbZxL11EPD5pU5M19LinQosss61XNMkQznXvfdDQMHj2665ptL0XR2A3JDx5WxRRNvSHz5+NDwjZ2dnd2/7e319gOfidKcdNpBW1tpMKtXxxsbZg9lc2afvUqfE30dFEOBC0V3fWX3OxzXMXZ0dKg0oA5tO/zWup9/Z2F9ImrDINQkjRf1VblQ3L7uosWXfp5R6df/3Pau63nnhqW8lKVOLa5/xlzQ/Jo6MhzfNqclvaTSKVWKwRkz1qhMe3t4f/rlXzZPb37u+NAQquHRpXxBHNe95MntW58VYoCVrBQlqhq6SmFRUawdTWYSSixE5jiuM79cLIqiUgoG/ypchfPVNmrK/SRl7BTCifF+EfD273hzp+f7c4NiUUaNUkQklqinUvq06FhjkB8ZEXLUSmFcP6bO5e93Lp+34ZLOTpGuLtrJ7Qcpnem0vo4sEXjY833KmOQlycJILjw+NHRaV35kxIwRAxGB62luz317IwmDtrQ66dQhUukQn0in4+qsut2u684Ig0BqDgOfb+62ru+zXCzubdb7z0+dnwoInjCriR9ildIP29tzFDwaicX43wQ5E3oA8fwIST648oKV5c50WmOCmbLGtMBKZbzaSEb3aK0bTRBa8ItREhHrRiIqLJUHVMDz1rS2FkYhfOrkSlI6enudrvb27BM7tv7m7C+13JfLHoPS+gvRsdYg3tCAwYOHHlm7aFH+cOUbn2lyhYiQAB7btXWKB/d7lY7WElAQsRw7Iiioypk/5p7Yyt5xPQZJRRjHiT92x3kLcgKZROf/cvEUcWcalXZ2T38/v+jH5re2Sjtg8Clk/gOmupdTvrsrkQAAAABJRU5ErkJggg=='
        if show_badge:
            badge_html = '''<div style="text-align:center;padding:4px 24px 8px;">
        <a href="https://nerbis.co" target="_blank" rel="noopener nofollow"
           style="display:inline-flex;align-items:center;gap:5px;color:rgba(255,255,255,0.45);text-decoration:none;font-size:.68rem;opacity:.45;transition:all .25s ease;letter-spacing:.01em;"
           onmouseover="this.style.opacity=\'1\';this.style.color=\'rgba(255,255,255,0.9)\';this.style.fontSize=\'.72rem\';this.style.letterSpacing=\'.04em\';"
           onmouseout="this.style.opacity=\'.45\';this.style.color=\'rgba(255,255,255,0.45)\';this.style.fontSize=\'.68rem\';this.style.letterSpacing=\'.01em\';">
            Hecho con NERBIS
        </a>
    </div>'''
        else:
            badge_html = ''

        return f"""<footer class="site-footer" data-section="footer">
    <div class="container">
        <div>
            <div class="footer-brand">{esc_name}</div>
            <p class="footer-desc">{self._esc(footer_desc)}</p>
            {social_section}
        </div>
        <div>
            <h4>Navegación</h4>
            <ul>{nav_links}</ul>
        </div>
        <div>
            <h4>Contacto</h4>
            <ul>{contact_items}</ul>
        </div>
        <div>
            <h4>Legal</h4>
            <ul>
                <li><a href="#" onclick="openPrivacyPolicy();return false;">{self._esc(footer_privacy)}</a></li>
            </ul>
        </div>
        {newsletter_html}
        <div class="footer-bottom">
            &copy; {self._esc(footer_copyright)}
        </div>
    </div>
    {badge_html}
</footer>
"""

    def _render_hero(self, data, primary, secondary):
        variant = data.get('_variant', 'centered')
        renderer = getattr(self, f'_render_hero_{variant.replace("-", "_")}', self._render_hero_centered)
        return renderer(data, primary, secondary)

    def _hero_buttons(self, data, outline=True):
        cta = self._esc(data.get('cta_text', ''))
        cta_link = data.get('cta_link', '#contact')
        cta2 = self._esc(data.get('cta_secondary_text', ''))
        cta2_link = data.get('cta_secondary_link', '#about')

        # Smart links: reemplazar anchors por páginas reales según módulos activos
        modules = getattr(self, '_tenant_modules', {})
        if cta_link.startswith('#'):
            if modules.get('has_bookings') or modules.get('has_services'):
                cta_link = self._tenant_url('/services')
            elif modules.get('has_shop'):
                cta_link = self._tenant_url('/products')
            else:
                cta_link = '#contact'

        cta_link = self._esc(cta_link)
        cta2_link = self._esc(cta2_link)
        buttons = ''
        if cta:
            buttons += f'<a href="{cta_link}" class="btn btn-secondary">{cta}</a>'
        if cta2:
            btn_class = 'btn btn-outline' if outline else 'btn btn-primary'
            buttons += f'<a href="{cta2_link}" class="{btn_class}">{cta2}</a>'
        return f'<div class="hero-buttons">{buttons}</div>' if buttons else ''

    def _unsplash_attr(self, image, css_class='hero-attribution'):
        photographer = self._esc(image.get('photographer', ''))
        photographer_url = self._esc(image.get('photographer_url', ''))
        if not photographer:
            return ''
        return f'<span class="{css_class}">Foto: <a href="{photographer_url}?utm_source=nerbis&utm_medium=referral" target="_blank" rel="noopener">{photographer}</a> / <a href="https://unsplash.com?utm_source=nerbis&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a></span>'

    def _render_hero_centered(self, data, primary, secondary):
        """Gradiente, texto centrado, CTAs."""
        title = self._esc(data.get('title', ''))
        subtitle = self._esc(data.get('subtitle', ''))
        return f"""<section class="hero hero--centered" data-section="hero">
    <div class="container">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {self._hero_buttons(data)}
    </div>
</section>
"""

    def _render_hero_split_image(self, data, primary, secondary):
        """Texto izquierda (50%), imagen Unsplash derecha (50%)."""
        title = self._esc(data.get('title', ''))
        subtitle = self._esc(data.get('subtitle', ''))
        image = data.get('_image', {})
        image_url = self._esc(image.get('url', ''))
        image_alt = self._esc(image.get('alt', ''))

        if image_url:
            img_html = f'<img src="{image_url}" alt="{image_alt}" loading="eager" class="hero-split-img">'
        else:
            img_html = '<div class="hero-split-placeholder"></div>'

        cta = self._esc(data.get('cta_text', ''))
        cta_link = self._esc(data.get('cta_link', '#contact'))
        cta_html = f'<a href="{cta_link}" class="btn btn-primary">{cta}</a>' if cta else ''

        return f"""<section class="hero hero--split" data-section="hero">
    <div class="hero-split-inner">
        <div class="hero-split-text">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            {cta_html}
        </div>
        <div class="hero-split-media">
            {img_html}
            {self._unsplash_attr(image)}
        </div>
    </div>
</section>
"""

    def _render_hero_fullwidth_image(self, data, primary, secondary):
        """Imagen full-width con overlay oscuro, parallax y texto centrado."""
        title = self._esc(data.get('title', ''))
        subtitle = self._esc(data.get('subtitle', ''))
        image = data.get('_image', {})
        image_url = self._esc(image.get('url', ''))
        parallax_div = f'<div class="parallax-bg hero-fullwidth-bg" style="background-image:url({image_url});"></div>' if image_url else ''

        return f"""<section class="hero hero--fullwidth" data-section="hero">
    {parallax_div}
    <div class="hero-overlay"></div>
    <div class="container">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {self._hero_buttons(data)}
    </div>
    {self._unsplash_attr(image)}
</section>
"""

    # ── NEW HERO VARIANTS ──

    def _render_hero_bold_typography(self, data, primary, secondary):
        """Tipografía gigante estilo Apple/Linear, minimal."""
        title = self._esc(data.get('title', ''))
        subtitle = self._esc(data.get('subtitle', ''))
        return f"""<section class="hero hero--bold" data-section="hero">
    <div class="container">
        <h1>{title}</h1>
        <div class="hero--bold-line"></div>
        <p>{subtitle}</p>
        {self._hero_buttons(data)}
    </div>
</section>
"""

    def _render_hero_diagonal_split(self, data, primary, secondary):
        """Clip-path diagonal, texto izq, imagen der."""
        title = self._esc(data.get('title', ''))
        subtitle = self._esc(data.get('subtitle', ''))
        image = data.get('_image', {})
        image_url = self._esc(image.get('url', ''))
        image_alt = self._esc(image.get('alt', ''))
        if image_url:
            right_html = f'<img src="{image_url}" alt="{image_alt}" loading="eager" style="width:100%;height:100%;object-fit:cover;">'
            attr_html = self._unsplash_attr(image)
        else:
            right_html = ''
            attr_html = ''
        return f"""<section class="hero hero--diagonal" data-section="hero">
    <div class="hero--diagonal-left">
        <div class="hero--diagonal-content">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            {self._hero_buttons(data, outline=False)}
        </div>
    </div>
    <div class="hero--diagonal-right">
        {right_html}
        {attr_html}
    </div>
</section>
"""

    def _render_hero_glassmorphism(self, data, primary, secondary):
        """Card frosted glass con blobs flotantes."""
        title = self._esc(data.get('title', ''))
        subtitle = self._esc(data.get('subtitle', ''))
        return f"""<section class="hero hero--glass" data-section="hero">
    <div class="hero--glass-blob hero--glass-blob1"></div>
    <div class="hero--glass-blob hero--glass-blob2"></div>
    <div class="hero--glass-blob hero--glass-blob3"></div>
    <div class="hero--glass-card">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {self._hero_buttons(data)}
    </div>
</section>
"""

    def _render_about(self, data, primary, secondary):
        variant = data.get('_variant', 'text-only')
        renderer = getattr(self, f'_render_about_{variant.replace("-", "_")}', self._render_about_text_only)
        return renderer(data, primary, secondary)

    def _about_highlights_html(self, highlights):
        if not highlights:
            return ''
        items = ''
        for h in highlights:
            hl_text = self._esc(h) if isinstance(h, str) else self._esc(h.get('text', str(h)))
            items += f'''<div class="highlight">
                <div class="highlight-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                <span>{hl_text}</span>
            </div>'''
        return f'<div class="about-highlights">{items}</div>'

    def _render_about_text_only(self, data, primary, secondary):
        """Diseño actual: texto + highlights."""
        title = self._esc(data.get('title', 'Sobre Nosotros'))
        text = self._esc(data.get('content', ''))
        return f"""<section class="section" data-section="about">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Conócenos</span>
            <h2 class="section-title">{title}</h2>
        </div>
        <p class="about-content">{text}</p>
        {self._about_highlights_html(data.get('highlights', []))}
    </div>
</section>
"""

    def _render_about_split_image(self, data, primary, secondary):
        """Imagen izquierda, texto + highlights derecha."""
        title = self._esc(data.get('title', 'Sobre Nosotros'))
        text = self._esc(data.get('content', ''))
        image = data.get('_image', {})
        image_url = self._esc(image.get('url', ''))
        image_alt = self._esc(image.get('alt', ''))

        if image_url:
            img_html = f'<img src="{image_url}" alt="{image_alt}" loading="lazy" class="about-split-img">'
        else:
            img_html = '<div class="about-split-placeholder"></div>'

        return f"""<section class="section" data-section="about">
    <div class="container">
        <div class="about-split-layout">
            <div class="about-split-media">
                {img_html}
                {self._unsplash_attr(image, 'img-attribution')}
            </div>
            <div class="about-split-content">
                <span class="section-label">Conócenos</span>
                <h2 class="section-title">{title}</h2>
                <p class="about-content">{text}</p>
                {self._about_highlights_html(data.get('highlights', []))}
            </div>
        </div>
    </div>
</section>
"""

    # ── NEW ABOUT VARIANTS ──

    def _render_about_stats_banner(self, data, primary, secondary):
        """Estadísticas grandes animadas con counter + texto."""
        title = self._esc(data.get('title', 'Sobre Nosotros'))
        text = self._esc(data.get('content', ''))
        highlights = data.get('highlights', [])
        stats = data.get('stats', [])
        stats_html = ''

        if stats:
            # New format: stats list with {value, label}
            for s in stats:
                val = self._esc(str(s.get('value', '')))
                label = self._esc(str(s.get('label', '')))
                stats_html += f'''<div class="stat-item anim-fade-up">
                    <div class="stat-number" data-count-target="{val}">0</div>
                    <div class="stat-label">{label}</div>
                </div>\n'''
        else:
            # Legacy format: highlights list
            for h in highlights:
                hl_text = self._esc(h) if isinstance(h, str) else self._esc(h.get('text', str(h)))
                stats_html += f'''<div class="stat-item anim-fade-up">
                    <span class="stat-number" data-count-target="{hl_text}">{hl_text}</span>
                </div>\n'''

        return f"""<section class="section" data-section="about">
    <div class="container">
        <div class="section-header anim-fade-up">
            <span class="section-label">Conócenos</span>
            <h2 class="section-title">{title}</h2>
        </div>
        <p class="about-content anim-fade-up">{text}</p>
        <div class="stats-grid stagger">{stats_html}</div>
    </div>
</section>
"""

    def _render_about_timeline(self, data, primary, secondary):
        """Timeline vertical con milestones."""
        title = self._esc(data.get('title', 'Sobre Nosotros'))
        text = self._esc(data.get('content', ''))
        highlights = data.get('highlights', [])
        items_html = ''
        for i, h in enumerate(highlights):
            hl_text = self._esc(h) if isinstance(h, str) else self._esc(h.get('text', str(h)))
            side = 'left' if i % 2 == 0 else 'right'
            items_html += f'<div class="timeline-item timeline-item--{side}"><div class="timeline-dot"></div><div class="timeline-content">{hl_text}</div></div>\n'
        return f"""<section class="section" data-section="about">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Conócenos</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{text}</p>
        </div>
        <div class="timeline-wrap">{items_html}</div>
    </div>
</section>
"""

    def _render_about_overlapping_cards(self, data, primary, secondary):
        """Cards superpuestas con rotación sutil."""
        title = self._esc(data.get('title', 'Sobre Nosotros'))
        text = self._esc(data.get('content', ''))
        highlights = data.get('highlights', [])
        cards_html = ''
        rotations = ['-2', '0', '2', '-1', '1', '0']
        for i, h in enumerate(highlights):
            hl_text = self._esc(h) if isinstance(h, str) else self._esc(h.get('text', str(h)))
            rot = rotations[i % len(rotations)]
            cards_html += f'<div class="overlap-card" style="--rot:{rot}deg"><span>{hl_text}</span></div>\n'
        return f"""<section class="section" data-section="about">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Conócenos</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{text}</p>
        </div>
        <div class="overlap-cards">{cards_html}</div>
    </div>
</section>
"""

    def _render_about_fullwidth_banner(self, data, primary, secondary):
        """Banner oscuro full-width con texto blanco."""
        title = self._esc(data.get('title', 'Sobre Nosotros'))
        text = self._esc(data.get('content', ''))
        highlights = data.get('highlights', [])
        checks_html = ''
        for h in highlights:
            hl_text = self._esc(h) if isinstance(h, str) else self._esc(h.get('text', str(h)))
            checks_html += f'<div class="banner-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg><span>{hl_text}</span></div>\n'
        return f"""<section class="about-banner" data-section="about">
    <div class="container">
        <span class="section-label" style="color:var(--secondary)">Conócenos</span>
        <h2 class="section-title">{title}</h2>
        <p class="about-content">{text}</p>
        <div class="banner-checks">{checks_html}</div>
    </div>
</section>
"""

    def _render_about_asymmetric(self, data, primary, secondary):
        """Grid asimétrico 2/3 + 1/3 con imagen."""
        title = self._esc(data.get('title', 'Sobre Nosotros'))
        text = self._esc(data.get('content', ''))
        image = data.get('_image', {})
        image_url = self._esc(image.get('url', ''))
        highlights_html = self._about_highlights_html(data.get('highlights', []))

        if image_url:
            media_html = f'''<div class="about-asym-img-wrap">
                <img src="{image_url}" alt="" loading="lazy" class="about-asym-img" />
                {self._unsplash_attr(image)}
            </div>'''
        else:
            media_html = '<div class="about-asym-placeholder"><div class="about-asym-placeholder-inner"></div></div>'

        return f"""<section class="section" data-section="about">
    <div class="container">
        <div class="about-asymmetric">
            <div class="about-asym-content anim-fade-up">
                <div class="section-header">
                    <span class="section-label">Conócenos</span>
                    <h2 class="section-title">{title}</h2>
                </div>
                <p class="about-content">{text}</p>
                {highlights_html}
            </div>
            <div class="about-asym-media anim-fade-up">
                {media_html}
            </div>
        </div>
    </div>
</section>
"""

    _SERVICE_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    _PRODUCT_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></svg>'

    def _render_services(self, data, primary, secondary):
        variant = data.get('_variant', 'grid-cards')
        renderer = getattr(self, f'_render_services_{variant.replace("-", "_")}', None)
        if renderer:
            html = renderer(data, primary, secondary)
        elif variant == 'grid-cards-image':
            html = self._render_services_image(data, primary, secondary, 'services', 'Lo que hacemos', self._SERVICE_ICON)
        else:
            html = self._render_services_default(data, primary, secondary, 'services', 'Lo que hacemos', self._SERVICE_ICON)
        return self._inject_section_cta(html, 'Ver todos los servicios', '/services')

    def _render_services_default(self, data, primary, secondary, section_id, label, icon_svg):
        """Cards con icono SVG."""
        title = self._esc(data.get('title', section_id.title()))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        cards = ''
        for item in items:
            name = self._esc(item.get('name', ''))
            desc = self._esc(item.get('description', ''))
            price = self._esc(item.get('price', ''))
            price_html = f'<span class="card-price">{price}</span>' if price else ''
            cards += f'<div class="card"><div class="card-icon">{icon_svg}</div><h3>{name}</h3><p>{desc}</p>{price_html}</div>\n'
        return f"""<section class="section" data-section="{section_id}">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">{label}</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{subtitle}</p>
        </div>
        <div class="grid-3">{cards}</div>
    </div>
</section>
"""

    def _render_services_image(self, data, primary, secondary, section_id, label, icon_svg):
        """Cards con imagen Unsplash arriba."""
        title = self._esc(data.get('title', section_id.title()))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        cards = ''
        for item in items:
            name = self._esc(item.get('name', ''))
            desc = self._esc(item.get('description', ''))
            price = self._esc(item.get('price', ''))
            price_html = f'<span class="card-price">{price}</span>' if price else ''
            image = item.get('_image', {})
            image_url = self._esc(image.get('url', ''))
            image_alt = self._esc(image.get('alt', ''))
            if image_url:
                attr_html = self._unsplash_attr(image, 'img-attribution')
                img_html = f'<div class="card-image"><img src="{image_url}" alt="{image_alt}" loading="lazy">{attr_html}</div>'
            else:
                img_html = f'<div class="card-image card-image--placeholder"><div class="card-icon">{icon_svg}</div></div>'
            cards += f'<div class="card card--has-image">{img_html}<div class="card-body"><h3>{name}</h3><p>{desc}</p>{price_html}</div></div>\n'
        return f"""<section class="section" data-section="{section_id}">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">{label}</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{subtitle}</p>
        </div>
        <div class="grid-3">{cards}</div>
    </div>
</section>
"""

    # ── NEW SERVICES VARIANTS ──

    def _render_services_list_detailed(self, data, primary, secondary):
        """Filas numeradas full-width, estilo Linear."""
        title = self._esc(data.get('title', 'Servicios'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        rows_html = ''
        for i, item in enumerate(items, 1):
            name = self._esc(item.get('name', ''))
            desc = self._esc(item.get('description', ''))
            price = self._esc(item.get('price', ''))
            price_html = f'<span class="svc-list-price">{price}</span>' if price else ''
            rows_html += f'<div class="svc-list-item"><span class="svc-list-num">{i:02d}</span><div class="svc-list-text"><h3>{name}</h3><p>{desc}</p></div>{price_html}</div>\n'
        return f"""<section class="section" data-section="services">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Lo que hacemos</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{subtitle}</p>
        </div>
        <div class="svc-list">{rows_html}</div>
    </div>
</section>
"""

    def _render_services_featured_highlight(self, data, primary, secondary):
        """1 card grande + grid de pequeñas, layout asimétrico."""
        title = self._esc(data.get('title', 'Servicios'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        if not items:
            return self._render_services_default(data, primary, secondary, 'services', 'Lo que hacemos', self._SERVICE_ICON)
        # First item = featured
        feat = items[0]
        feat_name = self._esc(feat.get('name', ''))
        feat_desc = self._esc(feat.get('description', ''))
        feat_image = feat.get('_image', {})
        feat_url = self._esc(feat_image.get('url', ''))
        if feat_url:
            feat_img = f'<img src="{feat_url}" alt="{feat_name}" loading="lazy" style="width:100%;height:200px;object-fit:cover;border-radius:12px;margin-bottom:16px;">'
            feat_img += self._unsplash_attr(feat_image, 'img-attribution')
        else:
            feat_img = f'<div class="card-icon" style="margin-bottom:16px;">{self._SERVICE_ICON}</div>'
        # Rest = small grid
        small_html = ''
        for item in items[1:]:
            name = self._esc(item.get('name', ''))
            desc = self._esc(item.get('description', ''))
            price = self._esc(item.get('price', ''))
            price_h = f'<span class="card-price">{price}</span>' if price else ''
            small_html += f'<div class="svc-featured-small"><div class="card-icon">{self._SERVICE_ICON}</div><h3>{name}</h3><p>{desc}</p>{price_h}</div>\n'
        return f"""<section class="section" data-section="services">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Lo que hacemos</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{subtitle}</p>
        </div>
        <div class="svc-featured">
            <div class="svc-featured-main">
                {feat_img}
                <h3>{feat_name}</h3>
                <p>{feat_desc}</p>
            </div>
            <div class="svc-featured-grid">{small_html}</div>
        </div>
    </div>
</section>
"""

    def _render_services_horizontal_scroll(self, data, primary, secondary):
        """Cards con scroll horizontal snap, estilo Apple."""
        title = self._esc(data.get('title', 'Servicios'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        cards_html = ''
        for item in items:
            name = self._esc(item.get('name', ''))
            desc = self._esc(item.get('description', ''))
            price = self._esc(item.get('price', ''))
            price_html = f'<span class="card-price">{price}</span>' if price else ''
            cards_html += f'<div class="svc-scroll-card"><div class="card-icon">{self._SERVICE_ICON}</div><h3>{name}</h3><p>{desc}</p>{price_html}</div>\n'
        return f"""<section class="section" data-section="services">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Lo que hacemos</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{subtitle}</p>
        </div>
        <div class="svc-scroll">{cards_html}</div>
        <p style="text-align:center;color:#9ca3af;font-size:.8rem;margin-top:12px;">← Desliza para ver más →</p>
    </div>
</section>
"""

    def _render_services_icon_minimal(self, data, primary, secondary):
        """Grid 2-col con icono grande + texto, estilo Stripe."""
        title = self._esc(data.get('title', 'Servicios'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        grid_html = ''
        for item in items:
            name = self._esc(item.get('name', ''))
            desc = self._esc(item.get('description', ''))
            price = self._esc(item.get('price', ''))
            price_html = f'<span class="card-price">{price}</span>' if price else ''
            grid_html += f'<div class="svc-icon-item"><div class="svc-icon-box">{self._SERVICE_ICON}</div><div class="svc-icon-text"><h3>{name}</h3><p>{desc}</p>{price_html}</div></div>\n'
        return f"""<section class="section" data-section="services">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Lo que hacemos</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{subtitle}</p>
        </div>
        <div class="svc-icon-grid">{grid_html}</div>
    </div>
</section>
"""

    _BENTO_SIZES = ['lg', 'md', 'sm', 'sm', 'md', 'sm', 'sm', 'lg']

    def _render_bento_grid(self, data, primary, secondary, section_id, label, icon_svg):
        """Bento grid layout with mixed card sizes."""
        title = self._esc(data.get('title', section_id.title()))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        cards = ''
        for i, item in enumerate(items):
            name = self._esc(item.get('name', ''))
            desc = self._esc(item.get('description', ''))
            price = self._esc(item.get('price', ''))
            size = self._BENTO_SIZES[i % len(self._BENTO_SIZES)]
            image = item.get('_image', {})
            image_url = self._esc(image.get('url', ''))
            price_html = f'<span class="card-price">{price}</span>' if price else ''

            if image_url:
                cards += f'''<div class="bento-item bento-{size} bento-item--has-image">
                    <img src="{image_url}" alt="{name}" loading="lazy" class="bento-img" />
                    <div class="bento-overlay"><h3>{name}</h3><p>{desc}</p>{price_html}</div>
                    {self._unsplash_attr(image)}
                </div>\n'''
            else:
                cards += f'''<div class="bento-item bento-{size}">
                    <div class="card-icon">{icon_svg}</div>
                    <h3>{name}</h3><p>{desc}</p>{price_html}
                </div>\n'''

        return f"""<section class="section" data-section="{section_id}">
    <div class="container">
        <div class="section-header center anim-fade-up">
            <span class="section-label">{label}</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{subtitle}</p>
        </div>
        <div class="bento-grid stagger">{cards}</div>
    </div>
</section>
"""

    def _render_services_bento_grid(self, data, primary, secondary):
        return self._render_bento_grid(data, primary, secondary, 'services', 'Lo que hacemos', self._SERVICE_ICON)

    def _render_products_bento_grid(self, data, primary, secondary):
        return self._render_bento_grid(data, primary, secondary, 'products', 'Nuestros productos', self._PRODUCT_ICON)

    def _render_products(self, data, primary, secondary):
        variant = data.get('_variant', 'grid-cards')
        renderer = getattr(self, f'_render_products_{variant.replace("-", "_")}', None)
        if renderer:
            html = renderer(data, primary, secondary)
        elif variant == 'grid-cards-image':
            html = self._render_services_image(data, primary, secondary, 'products', 'Nuestros productos', self._PRODUCT_ICON)
        else:
            html = self._render_services_default(data, primary, secondary, 'products', 'Nuestros productos', self._PRODUCT_ICON)
        return self._inject_section_cta(html, 'Ver catálogo completo', '/products')

    # ── NEW PRODUCTS VARIANTS ──

    def _render_products_showcase_large(self, data, primary, secondary):
        """Vitrina grande 2-col, nombre superpuesto sobre imagen."""
        title = self._esc(data.get('title', 'Productos'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        cards_html = ''
        for item in items:
            name = self._esc(item.get('name', ''))
            desc = self._esc(item.get('description', ''))
            price = self._esc(item.get('price', ''))
            image = item.get('_image', {})
            image_url = self._esc(image.get('url', ''))
            if image_url:
                bg = f'background-image:url({image_url});'
                attr = self._unsplash_attr(image, 'img-attribution')
            else:
                bg = f'background:linear-gradient(135deg,var(--primary),var(--secondary));'
                attr = ''
            price_html = f'<span class="showcase-price">{price}</span>' if price else ''
            cards_html += f'<div class="showcase-card" style="{bg}">{price_html}<div class="showcase-overlay"><h3>{name}</h3><p>{desc}</p></div>{attr}</div>\n'
        return f"""<section class="section" data-section="products">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Nuestros productos</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{subtitle}</p>
        </div>
        <div class="prod-showcase">{cards_html}</div>
    </div>
</section>
"""

    def _render_products_catalog_compact(self, data, primary, secondary):
        """Grid 4-col denso, imágenes cuadradas, e-commerce."""
        title = self._esc(data.get('title', 'Productos'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        cards_html = ''
        for item in items:
            name = self._esc(item.get('name', ''))
            price = self._esc(item.get('price', ''))
            image = item.get('_image', {})
            image_url = self._esc(image.get('url', ''))
            if image_url:
                img_html = f'<img src="{image_url}" alt="{name}" loading="lazy">'
            else:
                img_html = f'<div class="catalog-placeholder">{self._PRODUCT_ICON}</div>'
            price_html = f'<span class="catalog-price">{price}</span>' if price else ''
            cards_html += f'<div class="catalog-item"><div class="catalog-img">{img_html}</div><h3>{name}</h3>{price_html}</div>\n'
        return f"""<section class="section" data-section="products">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Nuestros productos</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{subtitle}</p>
        </div>
        <div class="prod-catalog">{cards_html}</div>
    </div>
</section>
"""

    def _render_products_masonry_staggered(self, data, primary, secondary):
        """Masonry columns con alturas variadas, estilo Pinterest."""
        title = self._esc(data.get('title', 'Productos'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        cards_html = ''
        for item in items:
            name = self._esc(item.get('name', ''))
            desc = self._esc(item.get('description', ''))
            price = self._esc(item.get('price', ''))
            image = item.get('_image', {})
            image_url = self._esc(image.get('url', ''))
            if image_url:
                img_html = f'<img src="{image_url}" alt="{name}" loading="lazy" style="width:100%;border-radius:10px;margin-bottom:10px;">'
                img_html += self._unsplash_attr(image, 'img-attribution')
            else:
                img_html = ''
            price_html = f'<span class="card-price">{price}</span>' if price else ''
            cards_html += f'<div class="masonry-item">{img_html}<h3>{name}</h3><p>{desc}</p>{price_html}</div>\n'
        return f"""<section class="section" data-section="products">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Nuestros productos</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{subtitle}</p>
        </div>
        <div class="prod-masonry">{cards_html}</div>
    </div>
</section>
"""

    def _render_products_price_table(self, data, primary, secondary):
        """Tabla de precios estilo menú, con dotted leaders."""
        title = self._esc(data.get('title', 'Productos'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        rows_html = ''
        for item in items:
            name = self._esc(item.get('name', ''))
            desc = self._esc(item.get('description', ''))
            price = self._esc(item.get('price', ''))
            desc_html = f'<p class="price-table-desc">{desc}</p>' if desc else ''
            rows_html += f'<div class="price-table-row"><span class="price-table-name">{name}</span><span class="price-table-dots"></span><span class="price-table-price">{price}</span></div>{desc_html}\n'
        return f"""<section class="section" data-section="products">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Nuestros productos</span>
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{subtitle}</p>
        </div>
        <div class="prod-price-table">{rows_html}</div>
    </div>
</section>
"""

    def _render_testimonials(self, data, primary, secondary):
        variant = data.get('_variant', 'cards-grid')
        renderer = getattr(self, f'_render_testimonials_{variant.replace("-", "_")}', self._render_testimonials_cards_grid)
        return renderer(data, primary, secondary)

    def _testimonial_card(self, item, extra_class=''):
        name = self._esc(item.get('name', ''))
        role = self._esc(item.get('role', ''))
        text = self._esc(item.get('content', ''))
        rating = item.get('rating', 5)
        initials = ''.join(w[0].upper() for w in name.split()[:2]) if name else '?'
        stars = ''.join(f'<span class="{"star-filled" if i < rating else "star-empty"}">&#9733;</span>' for i in range(5))
        cls = f' {extra_class}' if extra_class else ''
        return f"""<div class="testimonial-card{cls}">
    <div class="testimonial-stars">{stars}</div>
    <div class="quote-mark">&ldquo;</div>
    <p class="content">{text}</p>
    <div class="author">
        <div class="avatar">{initials}</div>
        <div><div class="name">{name}</div><div class="role">{role}</div></div>
    </div>
</div>"""

    def _render_testimonials_cards_grid(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Testimonios'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        cards = ''.join(self._testimonial_card(item) for item in items)
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        return f"""<section class="section" data-section="testimonials">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Lo que dicen</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        <div class="grid-3 anim-fade-up stagger">{cards}</div>
    </div>
</section>
"""

    def _render_testimonials_carousel(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Testimonios'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        cards = ''
        for item in items:
            cards += f'<div class="testimonial-carousel-item">{self._testimonial_card(item, "testimonial-card--large")}</div>\n'
        dots = ''
        if len(items) > 1:
            dots_inner = ''.join(f'<button class="testimonial-dot{"  active" if i == 0 else ""}" data-index="{i}"></button>' for i in range(len(items)))
            dots = f'<div class="testimonial-dots">{dots_inner}</div>'
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        return f"""<section class="section" data-section="testimonials">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Lo que dicen</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        <div class="testimonial-carousel-wrap anim-fade-up">
            <div class="testimonial-carousel">{cards}</div>
            {dots}
        </div>
    </div>
</section>
"""

    def _render_testimonials_single_highlight(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Testimonios'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        if not items:
            return self._render_testimonials_cards_grid(data, primary, secondary)
        first = items[0]
        name = self._esc(first.get('name', ''))
        role = self._esc(first.get('role', ''))
        text = self._esc(first.get('content', ''))
        rating = first.get('rating', 5)
        initials = ''.join(w[0].upper() for w in name.split()[:2]) if name else '?'
        stars = ''.join(f'<span class="{"star-filled" if i < rating else "star-empty"}">&#9733;</span>' for i in range(5))
        dots = ''
        if len(items) > 1:
            dots_inner = ''.join(f'<button class="testimonial-dot{" active" if i == 0 else ""}" data-index="{i}"></button>' for i in range(len(items)))
            dots = f'<div class="testimonial-dots">{dots_inner}</div>'
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        return f"""<section class="section" data-section="testimonials">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Lo que dicen</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        <div class="testimonial-highlight anim-fade-up">
            <div class="testimonial-highlight-card">
                <div class="testimonial-stars">{stars}</div>
                <div class="quote-mark quote-mark--large">&ldquo;</div>
                <p class="testimonial-highlight-content">{text}</p>
                <div class="author">
                    <div class="avatar">{initials}</div>
                    <div><div class="name">{name}</div><div class="role">{role}</div></div>
                </div>
            </div>
            {dots}
        </div>
    </div>
</section>
"""

    _CHECK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>'

    def _render_pricing(self, data, primary, secondary):
        variant = data.get('_variant', 'cards')
        renderer = getattr(self, f'_render_pricing_{variant.replace("-", "_")}', self._render_pricing_cards)
        return renderer(data, primary, secondary)

    def _render_pricing_cards(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Precios'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        cards = ''
        for item in items:
            name = self._esc(item.get('name', ''))
            price = self._esc(item.get('price', ''))
            desc = self._esc(item.get('description', ''))
            period = self._esc(item.get('period', ''))
            is_rec = item.get('recommended') or item.get('featured') or item.get('popular')
            features = item.get('features', [])
            cta_text = self._esc(item.get('cta_text', item.get('button_text', 'Elegir plan')))
            cta_link = item.get('cta_link', item.get('button_link', '#contact'))
            rec_cls = ' pricing-card--recommended' if is_rec else ''
            badge = f'<span class="pricing-badge">Recomendado</span>' if is_rec else ''
            period_html = f'<span class="pricing-period">/{period}</span>' if period else ''
            feats = ''
            if features:
                feats_li = ''.join(f'<li><span class="pricing-check">{self._CHECK_ICON}</span>{self._esc(f)}</li>' for f in features)
                feats = f'<ul class="pricing-features">{feats_li}</ul>'
            btn_cls = 'btn-primary' if is_rec else 'btn-outline'
            cards += f"""<div class="pricing-card{rec_cls}">
    {badge}<h3>{name}</h3>
    <div class="price">{price}{period_html}</div>
    <p>{desc}</p>
    {feats}
    <a href="{cta_link}" class="btn {btn_cls} pricing-cta">{cta_text}</a>
</div>
"""
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        return f"""<section class="section" data-section="pricing">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Nuestros precios</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        <div class="pricing-grid anim-fade-up stagger">{cards}</div>
    </div>
</section>
"""

    def _render_pricing_comparison_table(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Comparar Planes'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        all_features = []
        seen = set()
        for item in items:
            for f in item.get('features', []):
                if f not in seen:
                    all_features.append(f)
                    seen.add(f)
        # Header
        th_plans = ''
        for item in items:
            is_rec = item.get('recommended') or item.get('featured') or item.get('popular')
            rec_cls = ' class="pricing-table-recommended"' if is_rec else ''
            period = self._esc(item.get('period', ''))
            period_html = f'<span class="pricing-table-period">/{period}</span>' if period else ''
            th_plans += f"""<th{rec_cls}><div class="pricing-table-plan">
    <span class="pricing-table-name">{self._esc(item.get("name", ""))}</span>
    <span class="pricing-table-price">{self._esc(item.get("price", ""))}</span>{period_html}
</div></th>"""
        # Body rows
        rows = ''
        for feat in all_features:
            cells = ''
            for item in items:
                has = feat in (item.get('features', []))
                if has:
                    cells += f'<td class="pricing-table-check"><span class="pricing-check pricing-check--yes">{self._CHECK_ICON}</span></td>'
                else:
                    cells += '<td class="pricing-table-check"><span class="pricing-check--no">&mdash;</span></td>'
            rows += f'<tr><td>{self._esc(feat)}</td>{cells}</tr>\n'
        # Footer CTAs
        foot_cells = ''
        for item in items:
            is_rec = item.get('recommended') or item.get('featured') or item.get('popular')
            cta_text = self._esc(item.get('cta_text', item.get('button_text', 'Elegir')))
            cta_link = item.get('cta_link', item.get('button_link', '#contact'))
            btn_cls = 'btn-primary' if is_rec else 'btn-outline'
            foot_cells += f'<td><a href="{cta_link}" class="btn {btn_cls} pricing-table-cta">{cta_text}</a></td>'
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        return f"""<section class="section" data-section="pricing">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Nuestros precios</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        <div class="pricing-table-wrap anim-fade-up">
            <table class="pricing-table">
                <thead><tr><th class="pricing-table-feature-col">Característica</th>{th_plans}</tr></thead>
                <tbody>{rows}</tbody>
                <tfoot><tr><td></td>{foot_cells}</tr></tfoot>
            </table>
        </div>
    </div>
</section>
"""

    def _render_pricing_minimal_list(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Precios'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        rows = ''
        for item in items:
            name = self._esc(item.get('name', ''))
            price = self._esc(item.get('price', ''))
            desc = self._esc(item.get('description', ''))
            period = self._esc(item.get('period', ''))
            is_rec = item.get('recommended') or item.get('featured') or item.get('popular')
            features = item.get('features', [])
            feat_cls = ' pricing-minimal-item--featured' if is_rec else ''
            period_html = f'<span class="pricing-period">/{period}</span>' if period else ''
            desc_html = f'<p class="pricing-minimal-desc">{desc}</p>' if desc else ''
            feats_html = ''
            if features:
                tags = ''.join(f'<span class="pricing-minimal-tag">{self._esc(f)}</span>' for f in features)
                feats_html = f'<div class="pricing-minimal-features">{tags}</div>'
            rows += f"""<div class="pricing-minimal-item{feat_cls}">
    <div class="pricing-minimal-header">
        <div><h3 class="pricing-minimal-name">{name}</h3>{desc_html}</div>
        <span class="pricing-minimal-dots"></span>
        <div class="pricing-minimal-price">{price}{period_html}</div>
    </div>
    {feats_html}
</div>
"""
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        return f"""<section class="section" data-section="pricing">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Nuestros precios</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        <div class="pricing-minimal anim-fade-up" style="max-width:640px;margin:0 auto">{rows}</div>
    </div>
</section>
"""

    def _render_gallery(self, data, primary, secondary):
        variant = data.get('_variant', 'masonry')
        renderer = getattr(self, f'_render_gallery_{variant.replace("-", "_")}', self._render_gallery_masonry)
        return renderer(data, primary, secondary)

    def _gallery_images(self, data):
        """Get gallery images from data, return list of items with url/alt."""
        items = data.get('items', [])
        result = []
        for item in items:
            img = item.get('_image', {})
            url = img.get('url') or item.get('url', '')
            alt = img.get('alt') or item.get('alt', '')
            if url:
                result.append({'url': url, 'alt': alt, 'photographer': img.get('photographer', ''), 'photographer_url': img.get('photographer_url', '')})
        return result

    def _gallery_placeholder(self):
        placeholders = ''.join(f'<div class="ph">Imagen {i + 1}</div>\n' for i in range(6))
        return f'<div class="gallery-placeholder anim-fade-up">{placeholders}</div>'

    def _render_gallery_masonry(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Galería'))
        subtitle = self._esc(data.get('subtitle', ''))
        images = self._gallery_images(data)
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        if images:
            items_html = ''
            for img in images:
                items_html += f'''<div class="gallery-masonry-item">
    <img src="{img["url"]}" alt="{self._esc(img["alt"])}" loading="lazy"/>
    <div class="gallery-item-overlay"><span class="gallery-item-zoom">&#x2922;</span></div>
</div>\n'''
            content = f'<div class="gallery-masonry anim-fade-up stagger">{items_html}</div>'
        else:
            content = self._gallery_placeholder()
        return f"""<section class="section" data-section="gallery">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Galería</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        {content}
    </div>
</section>
"""

    def _render_gallery_grid_uniform(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Galería'))
        subtitle = self._esc(data.get('subtitle', ''))
        images = self._gallery_images(data)
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        if images:
            items_html = ''
            for img in images:
                items_html += f'''<div class="gallery-item">
    <img src="{img["url"]}" alt="{self._esc(img["alt"])}" loading="lazy"/>
    <div class="gallery-item-overlay"><span class="gallery-item-zoom">&#x2922;</span></div>
</div>\n'''
            content = f'<div class="gallery-grid anim-fade-up stagger">{items_html}</div>'
        else:
            content = self._gallery_placeholder()
        return f"""<section class="section" data-section="gallery">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Galería</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        {content}
    </div>
</section>
"""

    def _render_gallery_slider(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Galería'))
        subtitle = self._esc(data.get('subtitle', ''))
        images = self._gallery_images(data)
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        if images:
            items_html = ''
            for img in images:
                items_html += f'<div class="gallery-slider-item"><img src="{img["url"]}" alt="{self._esc(img["alt"])}" loading="lazy"/></div>\n'
            content = f"""<div class="gallery-slider-wrap anim-fade-up">
    <button class="gallery-slider-nav gallery-slider-prev" aria-label="Anterior">&lsaquo;</button>
    <div class="gallery-slider">{items_html}</div>
    <button class="gallery-slider-nav gallery-slider-next" aria-label="Siguiente">&rsaquo;</button>
</div>"""
        else:
            content = self._gallery_placeholder()
        return f"""<section class="section" data-section="gallery">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Galería</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        {content}
    </div>
</section>
"""

    def _render_faq(self, data, primary, secondary):
        variant = data.get('_variant', 'classic')
        renderer = getattr(self, f'_render_faq_{variant.replace("-", "_")}', self._render_faq_classic)
        return renderer(data, primary, secondary)

    def _render_faq_classic(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Preguntas Frecuentes'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        faq_html = ''
        for i, item in enumerate(items):
            q = self._esc(item.get('question', ''))
            a = self._esc(item.get('answer', ''))
            open_cls = ' faq-item--open' if i == 0 else ''
            faq_html += f"""<div class="faq-item{open_cls}">
    <button type="button" class="faq-trigger" onclick="this.parentElement.classList.toggle('faq-item--open')">
        <span>{q}</span><span class="faq-icon"></span>
    </button>
    <div class="faq-answer"><div class="answer">{a}</div></div>
</div>\n"""
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        return f"""<section class="section" data-section="faq">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">FAQ</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        <div class="faq-list anim-fade-up" style="max-width:720px;margin:0 auto">{faq_html}</div>
    </div>
</section>
"""

    def _render_faq_side_by_side(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Preguntas Frecuentes'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        questions_html = ''
        for i, item in enumerate(items):
            q = self._esc(item.get('question', ''))
            active_cls = ' faq-side-q--active' if i == 0 else ''
            questions_html += f'<button type="button" class="faq-side-q{active_cls}" data-index="{i}"><span class="faq-side-num">{str(i + 1).zfill(2)}</span>{q}</button>\n'
        # Show first answer by default
        first_q = self._esc(items[0].get('question', '')) if items else ''
        first_a = self._esc(items[0].get('answer', '')) if items else ''
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        return f"""<section class="section" data-section="faq">
    <div class="container">
        <div class="section-header">
            <span class="section-label">FAQ</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        <div class="faq-side-layout anim-fade-up">
            <div class="faq-side-questions">{questions_html}</div>
            <div class="faq-side-answer">
                <div class="faq-side-answer-content"><h3>{first_q}</h3><p>{first_a}</p></div>
            </div>
        </div>
    </div>
</section>
"""

    def _render_faq_cards(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Preguntas Frecuentes'))
        subtitle = self._esc(data.get('subtitle', ''))
        items = data.get('items', [])
        cards = ''
        for i, item in enumerate(items):
            q = self._esc(item.get('question', ''))
            a = self._esc(item.get('answer', ''))
            open_cls = ' faq-card--open' if i == 0 else ''
            cards += f"""<div class="faq-card{open_cls}" onclick="this.classList.toggle('faq-card--open')">
    <div class="faq-card-q"><span>{q}</span><span class="faq-icon"></span></div>
    <div class="faq-card-a"><p>{a}</p></div>
</div>\n"""
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        return f"""<section class="section" data-section="faq">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">FAQ</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        <div class="faq-cards-grid anim-fade-up stagger">{cards}</div>
    </div>
</section>
"""

    _CONTACT_ICONS = {
        'phone': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
        'email': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
        'address': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
        'whatsapp': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
        'hours': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    }
    _CONTACT_LABELS = {
        'phone': 'Teléfono',
        'email': 'Email',
        'address': 'Dirección',
        'whatsapp': 'WhatsApp',
        'hours': 'Horario',
    }

    def _get_wa_link(self, data):
        import re as _re
        whatsapp_raw = data.get('whatsapp', '') or data.get('phone', '')
        if whatsapp_raw:
            digits = _re.sub(r'[^\d+]', '', whatsapp_raw)
            if digits:
                return f'https://wa.me/{digits.lstrip("+")}'
        return None

    def _render_header_whatsapp_float(self, header_data, contact_data):
        """WhatsApp floating button from header toggle (uses contact whatsapp number)."""
        if not header_data.get('whatsapp_float_enabled'):
            return ''
        wa_url = self._get_wa_link(contact_data)
        if not wa_url:
            return ''
        return f'''<a href="{wa_url}" target="_blank" rel="noopener" class="wa-float-btn"
   style="position:fixed;bottom:24px;right:24px;z-index:9990;width:56px;height:56px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.18);transition:transform .2s,box-shadow .2s;text-decoration:none;"
   onmouseover="this.style.transform='scale(1.1)';this.style.boxShadow='0 6px 24px rgba(0,0,0,.25)'"
   onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 4px 16px rgba(0,0,0,.18)'"
   title="WhatsApp">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
</a>'''

    def _render_map_embed(self, data):
        """Google Maps embed iframe if map is enabled in contact section."""
        if not data.get('map_enabled'):
            return ''
        import urllib.parse
        address = data.get('map_address', '') or data.get('address', '')
        if not address:
            return ''
        encoded = urllib.parse.quote(address)
        maps_key = getattr(django_settings, 'GOOGLE_MAPS_API_KEY', '')
        if not maps_key:
            return ''
        return f'''<div class="contact-map" style="margin-top:2.5rem;border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm);">
    <iframe src="https://www.google.com/maps/embed/v1/place?key={maps_key}&q={encoded}"
        width="100%" height="300" style="border:0;display:block;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
</div>'''

    def _contact_items_html(self, data, item_class='contact-item'):
        items_html = ''
        for key in ('phone', 'email', 'address', 'whatsapp', 'hours'):
            val = data.get(key, '')
            if val:
                icon_svg = self._CONTACT_ICONS.get(key, '')
                label = self._CONTACT_LABELS.get(key, key.title())
                items_html += f'''<div class="{item_class}">
    <div class="ci-icon">{icon_svg}</div>
    <div><div class="ci-label">{label}</div><div class="ci-value">{self._esc(val)}</div></div>
</div>\n'''
        return items_html

    def _whatsapp_cta(self, data):
        wa_url = self._get_wa_link(data)
        if wa_url:
            return f'''<div style="text-align:center;margin-top:2rem;">
    <a href="{wa_url}" target="_blank" rel="noopener" class="btn btn-primary whatsapp-cta">
        {self._CONTACT_ICONS['whatsapp']} Escríbenos por WhatsApp
    </a>
</div>'''
        return ''

    def _render_contact(self, data, primary, secondary):
        variant = data.get('_variant', 'cards-grid')
        renderer = getattr(self, f'_render_contact_{variant.replace("-", "_")}', self._render_contact_cards_grid)
        return renderer(data, primary, secondary)

    def _render_contact_cards_grid(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Contacto'))
        subtitle = self._esc(data.get('subtitle', ''))
        items_html = self._contact_items_html(data)
        wa_cta = self._whatsapp_cta(data)
        map_html = self._render_map_embed(data)
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        return f"""<section class="section" data-section="contact">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Contacto</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        <div class="contact-grid anim-fade-up stagger">{items_html}</div>
        {wa_cta}
        {map_html}
    </div>
</section>
"""

    def _render_contact_split_form(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Contáctanos'))
        subtitle = self._esc(data.get('subtitle', ''))
        items_html = self._contact_items_html(data, 'contact-split-item')
        wa_url = self._get_wa_link(data)
        wa_btn = f'<a href="{wa_url}" target="_blank" rel="noopener" class="btn btn-primary whatsapp-cta" style="margin-top:16px">{self._CONTACT_ICONS["whatsapp"]} WhatsApp</a>' if wa_url else ''
        map_html = self._render_map_embed(data)
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        return f"""<section class="section" data-section="contact">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Contacto</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
        </div>
        <div class="contact-split anim-fade-up">
            <div class="contact-split-info">{items_html}{wa_btn}</div>
            <div class="contact-split-form">
                <div class="contact-form-placeholder">
                    <div class="contact-form-field"><label>Nombre</label><div class="contact-form-input"></div></div>
                    <div class="contact-form-field"><label>Email</label><div class="contact-form-input"></div></div>
                    <div class="contact-form-field"><label>Mensaje</label><div class="contact-form-input contact-form-textarea"></div></div>
                    <button type="button" class="btn btn-primary" style="width:100%;margin-top:8px">Enviar mensaje</button>
                </div>
            </div>
        </div>
        {map_html}
    </div>
</section>
"""

    def _render_contact_centered_minimal(self, data, primary, secondary):
        title = self._esc(data.get('title', 'Hablemos'))
        subtitle = self._esc(data.get('subtitle', ''))
        wa_url = self._get_wa_link(data)
        items_html = ''
        for key in ('phone', 'email', 'address', 'whatsapp', 'hours'):
            val = data.get(key, '')
            if val:
                icon_svg = self._CONTACT_ICONS.get(key, '')
                items_html += f'''<div class="contact-centered-item">
    <span class="ci-icon">{icon_svg}</span>
    <span class="ci-value">{self._esc(val)}</span>
</div>\n'''
        wa_cta = ''
        if wa_url:
            wa_cta = f'<a href="{wa_url}" target="_blank" rel="noopener" class="btn btn-primary whatsapp-cta" style="margin-top:28px">{self._CONTACT_ICONS["whatsapp"]} Escríbenos por WhatsApp</a>'
        map_html = self._render_map_embed(data)
        sub_html = f'<p class="section-subtitle">{subtitle}</p>' if subtitle else ''
        return f"""<section class="section" data-section="contact">
    <div class="container">
        <div class="contact-centered anim-fade-up">
            <span class="section-label">Contacto</span>
            <h2 class="section-title">{title}</h2>
            {sub_html}
            <div class="contact-centered-items">{items_html}</div>
            {wa_cta}
            {map_html}
        </div>
    </div>
</section>
"""

    def _render_generic(self, section_id, data, primary, secondary):
        title = self._esc(data.get('title', section_id.replace('_', ' ').title()))
        subtitle = self._esc(data.get('subtitle', ''))
        text = self._esc(data.get('content', ''))
        items = data.get('items', [])
        cards = ''
        if items:
            for item in items:
                if isinstance(item, dict):
                    name = self._esc(item.get('name', item.get('title', '')))
                    desc = self._esc(item.get('description', item.get('content', '')))
                    cards += f'<div class="card"><h3>{name}</h3><p>{desc}</p></div>\n'
            cards = f'<div class="grid-3">{cards}</div>'
        text_html = f'<p class="about-content">{text}</p>' if text else ''
        return f"""<section class="section" data-section="{section_id}">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">{title}</h2>
            <p class="section-subtitle">{subtitle}</p>
        </div>
        {text_html}
        {cards}
    </div>
</section>
"""

    def _get_tenant(self, request):
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant


# ===================================
# SECTION MANAGEMENT
# ===================================

class ReorderSectionsView(APIView):
    """
    POST /api/websites/sections/reorder/

    Reordena las secciones del content_data.
    Body: {"order": ["hero", "services", "about", "contact"]}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {"error": "No tienes un sitio web configurado"},
                status=status.HTTP_404_NOT_FOUND
            )

        new_order = request.data.get('order', [])
        if not new_order or not isinstance(new_order, list):
            return Response(
                {"error": "Se requiere 'order' como lista de IDs de sección"},
                status=status.HTTP_400_BAD_REQUEST
            )

        content = config.content_data or {}
        content['_section_order'] = new_order
        config.content_data = content
        config.save(update_fields=['content_data', 'updated_at'])

        return Response({
            "message": "Secciones reordenadas",
            "order": new_order
        })

    def _get_tenant(self, request):
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant


class AddSectionView(APIView):
    """
    POST /api/websites/sections/add/

    Agrega una sección vacía al content_data.
    Body: {"section_id": "gallery"}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {"error": "No tienes un sitio web configurado"},
                status=status.HTTP_404_NOT_FOUND
            )

        section_id = request.data.get('section_id', '')
        if not section_id:
            return Response(
                {"error": "Se requiere 'section_id'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar que la sección exista en el template
        structure = config.template.structure_schema or {}
        available = {s['id'] for s in structure.get('sections', [])}
        if section_id not in available:
            return Response(
                {"error": f"La sección '{section_id}' no existe en este template"},
                status=status.HTTP_400_BAD_REQUEST
            )

        content = config.content_data or {}
        if section_id in content:
            return Response(
                {"error": f"La sección '{section_id}' ya existe"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Usar contenido inicial del frontend si viene, o defaults
        initial_content = request.data.get('initial_content')
        variant = request.data.get('variant')

        if initial_content and isinstance(initial_content, dict):
            content[section_id] = initial_content
        else:
            section_defaults = {
                'header': {'logo_text': '', 'cta_text': 'Contáctanos', 'cta_link': '#contact'},
                'hero': {'title': '', 'subtitle': '', 'cta_text': '', 'cta_link': '#'},
                'about': {'title': 'Sobre Nosotros', 'content': '', 'highlights': []},
                'services': {'title': 'Servicios', 'subtitle': '', 'items': []},
                'products': {'title': 'Productos', 'subtitle': '', 'items': []},
                'testimonials': {'title': 'Testimonios', 'items': []},
                'gallery': {'title': 'Galería', 'subtitle': '', 'items': []},
                'pricing': {'title': 'Precios', 'subtitle': '', 'items': []},
                'faq': {'title': 'Preguntas Frecuentes', 'items': []},
                'contact': {'title': 'Contacto', 'subtitle': ''},
            }
            content[section_id] = section_defaults.get(section_id, {'title': '', 'content': ''})

        # Guardar variante si viene
        if variant:
            content[section_id]['_variant'] = variant

        # Actualizar orden
        order = content.get('_section_order', [])
        if order and section_id not in order:
            order.append(section_id)
            content['_section_order'] = order

        config.content_data = content
        config.save(update_fields=['content_data', 'updated_at'])

        return Response({
            "message": f"Sección '{section_id}' agregada",
            "section": content[section_id]
        }, status=status.HTTP_201_CREATED)

    def _get_tenant(self, request):
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant


class RemoveSectionView(APIView):
    """
    POST /api/websites/sections/remove/

    Elimina una sección del content_data.
    Body: {"section_id": "gallery"}
    No permite eliminar secciones requeridas.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {"error": "No tienes un sitio web configurado"},
                status=status.HTTP_404_NOT_FOUND
            )

        section_id = request.data.get('section_id', '')
        if not section_id:
            return Response(
                {"error": "Se requiere 'section_id'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar que no sea requerida
        structure = config.template.structure_schema or {}
        for s in structure.get('sections', []):
            if s['id'] == section_id and s.get('required', False):
                return Response(
                    {"error": f"La sección '{section_id}' es requerida y no se puede eliminar"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        content = config.content_data or {}
        if section_id not in content:
            return Response(
                {"error": f"La sección '{section_id}' no existe en el contenido"},
                status=status.HTTP_404_NOT_FOUND
            )

        del content[section_id]

        # Actualizar orden
        order = content.get('_section_order', [])
        if order and section_id in order:
            order.remove(section_id)
            content['_section_order'] = order

        config.content_data = content
        config.save(update_fields=['content_data', 'updated_at'])

        return Response({"message": f"Sección '{section_id}' eliminada"})

    def _get_tenant(self, request):
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant


# ===================================
# DUPLICAR SECCIÓN
# ===================================

class DuplicateSectionView(APIView):
    """
    POST /api/websites/sections/duplicate/

    Duplica una sección existente con todo su contenido.
    Body: {"section_id": "services"}
    Genera un id único: services_2, services_3, etc.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {"error": "No tienes un sitio web configurado"},
                status=status.HTTP_404_NOT_FOUND
            )

        section_id = request.data.get('section_id', '')
        if not section_id:
            return Response(
                {"error": "Se requiere 'section_id'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        content = config.content_data or {}
        if section_id not in content:
            return Response(
                {"error": f"La sección '{section_id}' no existe en el contenido"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Generar id único para la copia
        import copy
        base_id = section_id.split('_')[0] if '_' in section_id else section_id
        counter = 2
        new_id = f"{base_id}_{counter}"
        while new_id in content:
            counter += 1
            new_id = f"{base_id}_{counter}"

        # Copiar contenido de la sección original
        content[new_id] = copy.deepcopy(content[section_id])

        # Insertar justo después del original en el orden
        order = content.get('_section_order', [])
        if order and section_id in order:
            idx = order.index(section_id)
            order.insert(idx + 1, new_id)
            content['_section_order'] = order

        config.content_data = content
        config.save(update_fields=['content_data', 'updated_at'])

        return Response({
            "message": f"Sección '{section_id}' duplicada como '{new_id}'",
            "new_section_id": new_id,
            "section": content[new_id],
        }, status=status.HTTP_201_CREATED)

    def _get_tenant(self, request):
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant


# ===================================
# CAMBIAR VARIANTE DE SECCIÓN
# ===================================

class UpdateSectionVariantView(APIView):
    """
    POST /api/websites/sections/variant/

    Cambia la variante visual de una sección.
    Body: {"section_id": "hero", "variant": "split-image"}
    """

    permission_classes = [IsAuthenticated]

    VALID_VARIANTS = {
        'hero': ['centered', 'split-image', 'fullwidth-image', 'bold-typography', 'diagonal-split', 'glassmorphism'],
        'about': ['text-only', 'split-image', 'stats-banner', 'timeline', 'overlapping-cards', 'fullwidth-banner'],
        'services': ['grid-cards', 'grid-cards-image', 'list-detailed', 'featured-highlight', 'horizontal-scroll', 'icon-minimal'],
        'products': ['grid-cards', 'grid-cards-image', 'showcase-large', 'catalog-compact', 'masonry-staggered', 'price-table'],
    }

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {"error": "No tienes un sitio web configurado"},
                status=status.HTTP_404_NOT_FOUND
            )

        section_id = request.data.get('section_id', '')
        variant = request.data.get('variant', '')

        if not section_id or not variant:
            return Response(
                {"error": "Se requieren 'section_id' y 'variant'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar variante
        valid = self.VALID_VARIANTS.get(section_id)
        if not valid:
            return Response(
                {"error": f"La sección '{section_id}' no soporta variantes"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if variant not in valid:
            return Response(
                {"error": f"Variante '{variant}' no válida. Opciones: {', '.join(valid)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        content = config.content_data or {}
        if section_id not in content:
            return Response(
                {"error": f"La sección '{section_id}' no existe en el contenido"},
                status=status.HTTP_404_NOT_FOUND
            )

        content[section_id]['_variant'] = variant
        config.content_data = content
        config.save(update_fields=['content_data', 'updated_at'])

        return Response({
            "message": f"Variante de '{section_id}' cambiada a '{variant}'",
            "section_id": section_id,
            "variant": variant
        })

    def _get_tenant(self, request):
        if not hasattr(request.user, 'tenant') or not request.user.tenant:
            return None
        return request.user.tenant
