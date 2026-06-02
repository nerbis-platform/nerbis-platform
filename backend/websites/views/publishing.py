# backend/websites/views/publishing.py
"""View para la publicacion del sitio web."""

import logging

from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import WebsiteConfig
from ..serializers import PublishWebsiteSerializer

logger = logging.getLogger(__name__)


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
                {"error": "El sitio debe estar en revision para publicar"}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = PublishWebsiteSerializer(data=request.data, context={"tenant": tenant})
        serializer.is_valid(raise_exception=True)

        new_subdomain = serializer.validated_data.get("subdomain")
        old_subdomain = config.subdomain
        if new_subdomain:
            config.subdomain = new_subdomain

        old_published_data = config.published_data or {}

        config.published_data = {
            "content_data": config.content_data or {},
            "theme_data": config.theme_data or {},
            "pages_data": config.pages_data or {},
            "seo_data": config.seo_data or {},
            "media_data": config.media_data or {},
        }

        config.status = "published"
        config.published_at = timezone.now()
        config.save(update_fields=["published_data", "status", "published_at", "subdomain"])

        self._invalidate_public_cache(config, old_published_data, old_subdomain)

        return Response(
            {
                "message": "Sitio publicado exitosamente",
                "public_url": config.public_url,
                "status": config.status,
                "published_at": config.published_at,
            }
        )

    @staticmethod
    def _invalidate_public_cache(config, old_published_data, old_subdomain=None):
        """Eliminar páginas públicas en caché tras volver a publicar."""
        slugs = {config.tenant.slug}
        if config.subdomain:
            slugs.add(config.subdomain)
        if old_subdomain:
            slugs.add(old_subdomain)

        old_pages = old_published_data.get("pages_data", {}).get("pages", [])
        new_pages = config.published_data.get("pages_data", {}).get("pages", [])
        page_ids = {p.get("id") for p in old_pages} | {p.get("id") for p in new_pages}
        page_ids.add("home")
        page_ids.discard(None)

        deleted = 0
        for slug in slugs:
            for pid in page_ids:
                cache.delete(f"public_site:{slug}:{pid}")
                deleted += 1
        logger.info("Invalidated %d cache keys for slugs=%s", deleted, slugs)

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant
