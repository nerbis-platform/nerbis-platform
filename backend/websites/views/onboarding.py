# backend/websites/views/onboarding.py
"""Views para el proceso de onboarding del website builder."""

import logging
import random

from django.db import models, transaction
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import OnboardingQuestion, OnboardingResponse, WebsiteConfig, WebsitePage, WebsiteTemplate
from ..services.ai_service import AIService
from ..services.unsplash_service import UnsplashService

logger = logging.getLogger(__name__)
from ..serializers import (
    BulkOnboardingResponseSerializer,
    OnboardingQuestionSerializer,
    WebsiteConfigCreateSerializer,
    WebsitePageSerializer,
    WebsiteTemplateListSerializer,
)


class OnboardingView(APIView):
    """
    Base class para views de onboarding.
    """

    permission_classes = [IsAuthenticated]

    def _get_tenant(self, request):
        """Obtiene el tenant del usuario."""
        if not hasattr(request.user, "tenant") or not request.user.tenant:
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
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = WebsiteConfigCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        template_id = serializer.validated_data["template_id"]
        try:
            template = WebsiteTemplate.objects.get(id=template_id)
        except WebsiteTemplate.DoesNotExist:
            return Response({"error": "Template no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        # Crear o actualizar WebsiteConfig
        old_template_id = None
        existing = WebsiteConfig.objects.filter(tenant=tenant).first()
        if existing:
            old_template_id = existing.template_id

        config, created = WebsiteConfig.objects.update_or_create(
            tenant=tenant,
            defaults={
                "template": template,
                "status": "onboarding",
                "subdomain": tenant.slug,  # Usar slug del tenant como subdominio inicial
            },
        )

        # Si cambió el template, limpiar respuestas del template anterior
        if not created and old_template_id and old_template_id != template.id:
            OnboardingResponse.objects.filter(website_config=config).delete()

        # Obtener preguntas del template
        questions = self._get_questions_for_template(template)

        return Response(
            {
                "config_id": config.id,
                "template": WebsiteTemplateListSerializer(template).data,
                "questions": OnboardingQuestionSerializer(questions, many=True).data,
                "status": config.status,
                "created": created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def _get_questions_for_template(self, template):
        """Obtiene preguntas genéricas + específicas del template."""
        generic = OnboardingQuestion.objects.filter(template__isnull=True, is_active=True)
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
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar que existe un sitio en onboarding
        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"error": "Primero debes seleccionar un template"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = BulkOnboardingResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        responses_data = serializer.validated_data["responses"]

        # Guardar respuestas
        saved_count = 0
        with transaction.atomic():
            for question_key, response_value in responses_data.items():
                try:
                    question = OnboardingQuestion.objects.get(question_key=question_key, is_active=True)
                except OnboardingQuestion.DoesNotExist:
                    logger.warning("Pregunta de onboarding no encontrada: %s", question_key)
                    continue

                OnboardingResponse.objects.update_or_create(
                    website_config=config, question=question, defaults={"response_value": response_value}
                )
                saved_count += 1

                # Sync logo changes to media_data immediately
                if question_key == "logo_upload" and response_value:
                    media = dict(config.media_data or {})
                    media["logo_url"] = response_value
                    config.media_data = media
                    config.save(update_fields=["media_data"])

        return Response(
            {"saved": saved_count, "message": f"Se guardaron {saved_count} respuestas", "config_status": config.status}
        )


class OnboardingStatusView(OnboardingView):
    """
    GET /api/websites/onboarding/status/

    Obtiene el estado actual del onboarding.
    """

    def get(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"status": "not_started", "message": "No has iniciado el proceso. Selecciona un template."})

        # Obtener respuestas guardadas
        responses = OnboardingResponse.objects.filter(website_config=config).select_related("question")

        responses_dict = {r.question.question_key: r.response_value for r in responses}

        # Obtener preguntas requeridas
        required_questions = (
            OnboardingQuestion.objects.filter(is_required=True, is_active=True)
            .filter(models.Q(template__isnull=True) | models.Q(template=config.template))
            .values_list("question_key", flat=True)
        )

        # Verificar completitud
        answered_required = [key for key in required_questions if key in responses_dict and responses_dict[key]]

        return Response(
            {
                "status": config.status,
                "template": WebsiteTemplateListSerializer(config.template).data,
                "responses": responses_dict,
                "progress": {
                    "total_required": len(required_questions),
                    "answered_required": len(answered_required),
                    "is_complete": len(answered_required) == len(required_questions),
                },
            }
        )


class QuickStartView(OnboardingView):
    """
    POST /api/websites/onboarding/quick-start/

    Flujo acelerado post-registro: recibe 3 campos y genera el sitio completo.
    Combina en un solo request: auto-resolucion de template + guardar respuestas
    minimas + generacion con IA + Unsplash + guardado en WebsiteConfig.

    Campos:
    - business_description (obligatorio): que hace el negocio + que lo diferencia.
    - main_services (obligatorio): servicios principales, uno por linea.
    - business_whatsapp (opcional): se pre-llena con phone del tenant.
    """

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        from ..serializers import QuickStartSerializer

        serializer = QuickStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 1. Resolver template por industria
        from core.industry_defaults import get_default_template_slug

        slug = get_default_template_slug(tenant.industry)
        if not slug:
            return Response(
                {"error": "Tu industria aún no tiene un template asignado. Usa el flujo completo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        template = WebsiteTemplate.objects.filter(slug=slug, is_active=True).first()
        if not template:
            return Response(
                {"error": f"Template '{slug}' no encontrado. Contacta soporte."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Crear o actualizar WebsiteConfig con lock para evitar generaciones concurrentes
        with transaction.atomic():
            existing = WebsiteConfig.objects.select_for_update().filter(tenant=tenant).first()
            if existing and existing.status == "generating":
                return Response(
                    {"error": "Ya hay una generación en progreso. Espera a que termine."},
                    status=status.HTTP_409_CONFLICT,
                )

            config, _created = WebsiteConfig.objects.update_or_create(
                tenant=tenant,
                defaults={
                    "template": template,
                    "status": "generating",
                    "subdomain": tenant.slug,
                },
            )

        # 3. Armar onboarding_responses a partir de los 3 campos + tenant data
        data = serializer.validated_data
        responses_dict = {
            "business_name": tenant.name,
            "business_description": data["business_description"],
            "main_services": data["main_services"],
            "business_whatsapp": data.get("business_whatsapp") or tenant.phone or "",
            "business_phone": tenant.phone or "",
            "business_email": tenant.email or "",
            "business_address": tenant.address or "",
        }
        if data.get("website_sections"):
            responses_dict["website_sections"] = data["website_sections"]

        # 4. Verificar limite de generaciones
        ai_service = AIService(tenant=tenant, website_config=config)
        can_generate, used, limit = ai_service.check_usage_limit(tenant)
        if not can_generate:
            config.status = "onboarding"
            config.save(update_fields=["status"])
            return Response(
                {
                    "error": "Has alcanzado el límite de generaciones este mes",
                    "used": used,
                    "limit": limit,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        try:
            # 5. Generar contenido con IA
            content_data, seo_data, tokens_in, tokens_out, full_prompt, raw_response = (
                ai_service.generate_initial_content(
                    template=template,
                    onboarding_responses=responses_dict,
                )
            )

            # 6. Enriquecer con imagenes de Unsplash
            try:
                unsplash = UnsplashService()
                section_ids = [k for k in content_data.keys() if not k.startswith("_")]
                images = unsplash.get_images_for_generation(
                    sections=section_ids,
                    onboarding_responses=responses_dict,
                    tenant_industry=tenant.industry,
                    template_industry=template.industry or "generic",
                )
                self._inject_images_and_variants(content_data, images)
            except Exception as e:
                logger.warning(f"Unsplash enrichment failed (non-fatal): {e}")

            # 7. Theme, media, header/footer, section order
            theme_data = dict(template.default_theme or {})
            media_data = dict(config.media_data or {})

            if "header" not in content_data:
                content_data["header"] = {
                    "logo_text": tenant.name,
                    "cta_text": "",
                    "cta_link": "#contact",
                }
            if "footer" not in content_data:
                content_data["footer"] = {}

            section_keys = [k for k in content_data.keys() if not k.startswith("_") and k not in ("header", "footer")]
            ordered = []
            if "hero" in section_keys:
                ordered.append("hero")
                section_keys.remove("hero")
            contact_at_end = "contact" in section_keys
            if contact_at_end:
                section_keys.remove("contact")
            ordered.extend(section_keys)
            if contact_at_end:
                ordered.append("contact")
            content_data["_section_order"] = ordered

            config.enabled_pages = [
                k for k in content_data.keys() if not k.startswith("_") and k not in ("hero", "header", "footer")
            ]

            # 8. Guardar
            config.content_data = content_data
            config.seo_data = seo_data
            config.theme_data = theme_data
            config.media_data = media_data
            config.status = "review"
            config.save(
                update_fields=[
                    "content_data",
                    "seo_data",
                    "theme_data",
                    "media_data",
                    "status",
                    "enabled_pages",
                ]
            )

            # 9. Log de generacion
            ai_service.log_generation(
                generation_type="quick_start",
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                is_successful=True,
                full_prompt=full_prompt,
                raw_response=raw_response,
                onboarding_snapshot=responses_dict,
            )

            _, new_used, new_limit = ai_service.check_usage_limit(tenant)

            return Response(
                {
                    "content_data": content_data,
                    "seo_data": seo_data,
                    "theme_data": theme_data,
                    "tokens_used": tokens_in + tokens_out,
                    "remaining_generations": max(0, new_limit - new_used),
                    "status": config.status,
                    "template": {
                        "slug": template.slug,
                        "name": template.name,
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            logger.exception("Error en quick-start generation")
            config.status = "onboarding"
            config.save(update_fields=["status"])
            ai_service.log_generation(
                generation_type="quick_start",
                tokens_input=0,
                tokens_output=0,
                is_successful=False,
                error_message=str(e),
            )
            return Response(
                {"error": "Error generando contenido. Intenta de nuevo."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _inject_images_and_variants(self, content, images):
        """Inyecta imagenes de Unsplash (misma logica que GenerateContentView)."""
        unsplash = UnsplashService()

        if "hero" in content:
            hero_imgs = images.get("hero", [])
            if hero_imgs:
                content["hero"]["_image"] = hero_imgs[0]
                content["hero"]["_image_alternatives"] = hero_imgs[1:]
                unsplash.trigger_download(hero_imgs[0].get("download_location", ""))
                variant = random.choice(["split-image", "fullwidth-image", "diagonal-split"])
            else:
                variant = random.choice(["centered", "bold-typography", "glassmorphism"])
            content["hero"]["_variant"] = variant
            content["hero"]["_variant_ai_recommended"] = variant

        if "about" in content:
            about_imgs = images.get("about", [])
            if about_imgs:
                content["about"]["_image"] = about_imgs[0]
                content["about"]["_image_alternatives"] = about_imgs[1:]
                unsplash.trigger_download(about_imgs[0].get("download_location", ""))

        if "services" in content:
            svc_imgs = images.get("services", [])
            for idx, item in enumerate(content["services"].get("items", [])):
                if idx < len(svc_imgs):
                    item["_image"] = svc_imgs[idx]
                    unsplash.trigger_download(svc_imgs[idx].get("download_location", ""))


class OnboardingQuestionListView(generics.ListAPIView):
    """
    GET /api/websites/onboarding/questions/

    Devuelve preguntas activas de onboarding con sus modulos requeridos.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = OnboardingQuestionSerializer

    def get_queryset(self):
        return (
            OnboardingQuestion.objects.filter(is_active=True)
            .prefetch_related("required_modules")
            .order_by("sort_order")
        )


class WebsitePageListView(generics.ListAPIView):
    """
    GET /api/websites/onboarding/pages/

    Devuelve paginas disponibles para el onboarding.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = WebsitePageSerializer

    def get_queryset(self):
        return (
            WebsitePage.objects.filter(is_active=True).prefetch_related("auto_include_modules").order_by("sort_order")
        )
