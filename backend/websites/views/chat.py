# backend/websites/views/chat.py
"""View para el chat con IA para editar contenido."""

import logging

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Tenant

from ..models import ChatMessage, WebsiteConfig
from ..serializers import ChatRequestSerializer
from ..services import AIService

logger = logging.getLogger(__name__)


class ChatView(APIView):
    """
    POST /api/websites/chat/ - Envía mensaje al chat
    GET /api/websites/chat/ - Obtiene historial del chat
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        """Envía un mensaje al chat para editar el contenido."""
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"error": "No tienes un sitio web configurado"}, status=status.HTTP_400_BAD_REQUEST)

        if config.status not in ["review", "published"]:
            return Response({"error": "Primero debes generar el contenido inicial"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data["message"]
        section_id = serializer.validated_data.get("section_id")

        # Verificar límite de uso
        ai_service = AIService(tenant=tenant, website_config=config)
        can_generate, used, limit = ai_service.check_usage_limit(tenant)

        if not can_generate:
            return Response(
                {"error": "Has alcanzado el límite de generaciones este mes", "used": used, "limit": limit},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        # Obtener historial del chat
        chat_history = list(
            ChatMessage.objects.filter(website_config=config).order_by("-created_at")[:20].values("role", "content")
        )
        chat_history.reverse()

        try:
            # Procesar con IA
            response_message, updated_content, affected_section, tokens_in, tokens_out = ai_service.chat_edit(
                message=message, current_content=config.content_data, chat_history=chat_history, section_id=section_id
            )

            # Escrituras atómicas: user msg + assistant msg + content update + log
            with transaction.atomic():
                ChatMessage.objects.create(
                    website_config=config, role="user", content=message, section_id=section_id or ""
                )

                ChatMessage.objects.create(
                    website_config=config,
                    role="assistant",
                    content=response_message,
                    section_id=affected_section or "",
                    changes_made={"updated_content": updated_content} if updated_content else {},
                    tokens_used=tokens_in + tokens_out,
                )

                if updated_content and affected_section:
                    if config.content_data is None:
                        config.content_data = {}
                    config.content_data[affected_section] = updated_content
                    config.save(update_fields=["content_data"])

                ai_service.log_generation(
                    generation_type="edit_content",
                    tokens_input=tokens_in,
                    tokens_output=tokens_out,
                    section_id=affected_section or "",
                    is_successful=True,
                )

            _, new_used, new_limit = ai_service.check_usage_limit(tenant)

            return Response(
                {
                    "message": response_message,
                    "updated_content": updated_content,
                    "section_id": affected_section,
                    "tokens_used": tokens_in + tokens_out,
                    "remaining_generations": max(0, new_limit - new_used),
                }
            )

        except Exception:
            logger.exception("Error en chat")
            ai_service.log_generation(
                generation_type="edit_content",
                tokens_input=0,
                tokens_output=0,
                section_id=section_id or "",
                is_successful=False,
            )
            return Response(
                {"error": "Error procesando mensaje. Intenta de nuevo."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get(self, request: Request) -> Response:
        """Obtiene el historial del chat."""
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"messages": []})

        messages = (
            ChatMessage.objects.filter(website_config=config)
            .order_by("created_at")
            .values("id", "role", "content", "section_id", "created_at")
        )

        return Response({"messages": list(messages)})

    def _get_tenant(self, request: Request) -> Tenant | None:
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant
