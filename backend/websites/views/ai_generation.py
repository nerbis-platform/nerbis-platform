# backend/websites/views/ai_generation.py
"""Views para la generación de contenido con IA (async via Celery)."""

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import OnboardingResponse, WebsiteConfig
from ..serializers import GenerateContentRequestSerializer
from ..services import AIService

logger = logging.getLogger(__name__)


class GenerateContentView(APIView):
    """
    POST /api/websites/generate/

    Despacha la generacion de contenido del sitio web a una tarea de Celery.
    Retorna 202 Accepted con el task_id para que el frontend haga polling.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from celery.result import AsyncResult

        from ..tasks import generate_website_content

        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"error": "Primero debes completar el onboarding"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = GenerateContentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Guard: no permitir generacion duplicada si ya hay una tarea activa
        if config.generation_task_id:
            result = AsyncResult(config.generation_task_id)
            if result.state not in ("SUCCESS", "FAILURE", "REVOKED"):
                return Response(
                    {
                        "error": "Ya hay una generación en progreso",
                        "task_id": config.generation_task_id,
                        "status": "generating",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        # Verificar limite de uso
        ai_service = AIService(tenant=tenant, website_config=config)
        can_generate, used, limit = ai_service.check_usage_limit(tenant)

        if not can_generate:
            return Response(
                {
                    "error": "Has alcanzado el límite de generaciones este mes",
                    "used": used,
                    "limit": limit,
                    "upgrade_url": "/planes/",
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        # Obtener respuestas del onboarding
        responses = OnboardingResponse.objects.filter(website_config=config).select_related("question")
        responses_dict = {r.question.question_key: r.response_value for r in responses}

        regenerate_section = serializer.validated_data.get("regenerate_section")
        additional_instructions = serializer.validated_data.get("additional_instructions", "")

        # Despachar tarea asincrona
        task = generate_website_content.delay(
            website_config_id=config.id,
            tenant_id=tenant.id,
            user_id=request.user.id,
            onboarding_responses=responses_dict,
            additional_instructions=additional_instructions,
            regenerate_section=regenerate_section,
            is_quick_start=False,
        )

        # Guardar task_id y actualizar estado
        config.generation_task_id = task.id
        config.status = "generating"
        config.save(update_fields=["status", "generation_task_id"])

        return Response(
            {
                "message": "Generación iniciada",
                "task_id": task.id,
                "status": "generating",
            },
            status=status.HTTP_202_ACCEPTED,
        )

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant


class GenerationStatusView(APIView):
    """
    GET /api/websites/generation-status/

    Retorna el estado actual de la generacion de contenido.
    El frontend hace polling a este endpoint mientras status == "generating".
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"error": "No tienes un sitio web configurado"}, status=status.HTTP_404_NOT_FOUND)

        response_data = {
            "status": config.status,
            "task_id": config.generation_task_id,
        }

        # Incluir datos generados solo cuando la generacion termino exitosamente
        if config.status == "review":
            response_data["content_data"] = config.content_data
            response_data["seo_data"] = config.seo_data
            response_data["theme_data"] = config.theme_data

        return Response(response_data)

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant
