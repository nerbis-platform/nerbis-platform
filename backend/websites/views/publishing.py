# backend/websites/views/publishing.py
"""View para la publicación del sitio web."""

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import WebsiteConfig
from ..serializers import PublishWebsiteSerializer


class PublishWebsiteView(APIView):
    """
    POST /api/websites/publish/

    Publica el sitio web.
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

        if config.status not in ["review", "published"]:
            return Response(
                {"error": "El sitio debe estar en revisión para publicar"}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = PublishWebsiteSerializer(data=request.data, context={"tenant": tenant})
        serializer.is_valid(raise_exception=True)

        # Actualizar subdominio si se proporciona
        new_subdomain = serializer.validated_data.get("subdomain")
        if new_subdomain:
            config.subdomain = new_subdomain

        # Crear snapshot de datos publicados
        config.published_data = {
            "content_data": config.content_data or {},
            "theme_data": config.theme_data or {},
            "pages_data": config.pages_data or {},
            "seo_data": config.seo_data or {},
            "media_data": config.media_data or {},
        }

        # Publicar
        config.status = "published"
        config.published_at = timezone.now()
        config.save(update_fields=["published_data", "status", "published_at", "subdomain"])

        return Response(
            {
                "message": "Sitio publicado exitosamente",
                "public_url": config.public_url,
                "status": config.status,
                "published_at": config.published_at,
            }
        )

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant
