# backend/websites/views/templates.py
"""ViewSet para listar y obtener templates de sitios web."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from ..models import WebsiteTemplate
from ..serializers import WebsiteTemplateDetailSerializer, WebsiteTemplateListSerializer


class WebsiteTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para listar y obtener templates de sitios web.

    GET /api/websites/templates/ - Lista todos los templates activos
    GET /api/websites/templates/{id}/ - Detalle de un template con sus preguntas
    """

    permission_classes = [IsAuthenticated]
    queryset = WebsiteTemplate.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return WebsiteTemplateDetailSerializer
        return WebsiteTemplateListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtrar por industria si se especifica
        industry = self.request.query_params.get("industry")
        if industry:
            queryset = queryset.filter(industry=industry)

        # Filtrar premium si se especifica
        premium = self.request.query_params.get("premium")
        if premium is not None:
            queryset = queryset.filter(is_premium=premium.lower() == "true")

        return queryset.order_by("sort_order", "name")
