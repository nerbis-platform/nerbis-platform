# backend/websites/views/seo.py
"""View para sugerencias de SEO con IA."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import WebsiteConfig
from ..services import AIService


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
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"error": "No tienes un sitio web configurado"}, status=status.HTTP_400_BAD_REQUEST)

        keywords = request.data.get("keywords", [])
        business_name = request.data.get("business_name", "")
        current_title = request.data.get("current_title", "")
        current_description = request.data.get("current_description", "")

        if not keywords and not business_name:
            return Response(
                {"error": "Agrega al menos una palabra clave o el nombre de tu negocio"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check usage limit
        ai_service = AIService(tenant=tenant, website_config=config)
        can_generate, used, limit = ai_service.check_usage_limit(tenant)

        if not can_generate:
            return Response(
                {
                    "error": "Has alcanzado el límite de generaciones con IA este mes",
                    "used": used,
                    "limit": limit,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        # Generate suggestions
        suggestions, tokens_in, tokens_out = ai_service.suggest_seo(
            keywords=keywords,
            business_name=business_name,
            current_title=current_title,
            current_description=current_description,
        )

        # Log generation
        ai_service.log_generation(
            generation_type="seo_suggest",
            tokens_input=tokens_in,
            tokens_output=tokens_out,
            is_successful=True,
        )

        return Response(
            {
                "title": suggestions.get("title", ""),
                "description": suggestions.get("description", ""),
                "extra_keywords": suggestions.get("extra_keywords", []),
            }
        )

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant
