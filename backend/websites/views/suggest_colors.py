# backend/websites/views/suggest_colors.py
"""View para sugerir el color primario de la marca con IA (Haiku).

Durante el onboarding, el usuario describe su negocio. Esta view le pide a Haiku
un color primario coherente con el sector + descripción + tono. Ante cualquier
fallo de la IA cae a un primario curado por sector, de modo que SIEMPRE devuelve
un color válido (200). Solo responde 400 ante input inválido o tenant ausente.
"""

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..serializers import SuggestColorsResponseSerializer, SuggestColorsSerializer
from ..services import AIService

logger = logging.getLogger(__name__)


class SuggestColorsView(APIView):
    """
    POST /api/websites/onboarding/suggest-colors/

    Body:
        - business_description (str, requerido)
        - industry_key (str, opcional)
        - industry_label (str, opcional)
        - tone (str, opcional)

    Respuesta (siempre 200 con un primario válido):
        {"primary_hex": "#RRGGBB", "rationale": "..."}
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "suggest_colors"

    def post(self, request):
        tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SuggestColorsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        business_description = serializer.validated_data["business_description"]
        industry_key = serializer.validated_data.get("industry_key", "")
        industry_label = serializer.validated_data.get("industry_label", "")
        tone = serializer.validated_data.get("tone", "")

        ai_service = AIService(tenant=tenant)

        # La sugerencia nunca debe romper el onboarding: el servicio ya cae a un
        # primario curado por sector ante cualquier fallo. Aun así, blindamos la
        # view para garantizar 200 (jamás 5xx) si algo inesperado ocurre.
        try:
            primary_hex, rationale, tokens_in, tokens_out = ai_service.suggest_colors(
                business_description=business_description,
                sector_key=industry_key,
                sector_label=industry_label,
                tone=tone,
            )
            is_successful = True
            error_message = ""
        except Exception as e:  # pragma: no cover - blindaje defensivo
            logger.error("Error inesperado en suggest-colors: %s", e)
            from ..services.ai_service import _fallback_primary_for_sector

            primary_hex = _fallback_primary_for_sector(industry_key)
            rationale = "Color base sugerido para tu negocio."
            tokens_in = tokens_out = 0
            is_successful = False
            error_message = str(e)

        # Log tenant-scoped para billing/auditoría. No debe romper la respuesta.
        try:
            ai_service.log_generation(
                generation_type="suggest_colors",
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                is_successful=is_successful,
                error_message=error_message,
            )
        except Exception as e:  # pragma: no cover - logging best-effort
            logger.warning("No se pudo registrar la generación suggest-colors: %s", e)

        response_serializer = SuggestColorsResponseSerializer(
            {"primary_hex": primary_hex, "rationale": rationale}
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)
