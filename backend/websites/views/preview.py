# backend/websites/views/preview.py
"""Views para preview y rendering HTML del sitio web."""

import logging

from django.http import HttpResponse
from django.templatetags.static import static as _static
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import OnboardingResponse, WebsiteConfig
from ..rendering import SiteRenderer

logger = logging.getLogger(__name__)


class PreviewWebsiteView(APIView):
    """
    GET /api/websites/preview/

    Obtiene los datos para previsualizar el sitio.
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

        theme_data = {**config.template.default_theme, **config.theme_data}

        return Response(
            {
                "template": {
                    "slug": config.template.slug,
                    "industry": config.template.industry,
                    "structure": config.template.structure_schema,
                },
                "content": config.content_data,
                "theme": theme_data,
                "seo": config.seo_data,
                "media": config.media_data,
                "status": config.status,
                "public_url": config.public_url if config.is_published else None,
            }
        )

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant


class PreviewRenderView(APIView):
    """
    GET /api/websites/preview/render/

    Retorna el HTML completo renderizado del sitio para usarlo en un iframe.
    """

    permission_classes = [IsAuthenticated]
    renderer_classes = APIView.renderer_classes

    def get(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"error": "No tienes un sitio web configurado"}, status=status.HTTP_404_NOT_FOUND)

        theme = {**config.template.default_theme, **config.theme_data}
        seo = config.seo_data or {}
        structure = config.template.structure_schema or {}
        pages_data = config.pages_data or {}
        page_id = request.query_params.get("page", "home")

        active_sections, content, seo, page_slugs = SiteRenderer.resolve_page(
            pages_data, config.content_data, seo, structure, page_id
        )

        industry = config.template.industry
        media = dict(config.media_data or {})

        current_logo = media.get("logo_url", "")
        if not current_logo or current_logo.startswith("data:"):
            logo_resp = (
                OnboardingResponse.objects.filter(
                    website_config=config,
                    question__question_key="logo_upload",
                )
                .values_list("response_value", flat=True)
                .first()
            )
            if logo_resp and current_logo != logo_resp:
                media["logo_url"] = logo_resp
                config.media_data = media
                config.save(update_fields=["media_data"])

        base_url = config.public_url or ""
        tenant_modules = {
            "has_shop": tenant.has_shop,
            "has_bookings": tenant.has_bookings,
            "has_services": tenant.has_services,
        }
        tenant_info = {
            "name": tenant.name,
            "email": tenant.email or "",
            "phone": tenant.phone or "",
            "address": tenant.address or "",
            "city": tenant.city or "",
            "state": getattr(tenant, "state", "") or "",
            "country": tenant.country or "Colombia",
        }

        show_badge = True
        try:
            if tenant.subscription.status != "trial":
                show_badge = seo.get("show_nerbis_badge", True)
        except Exception:
            logger.warning("Error al verificar badge en preview para tenant %s", tenant.slug, exc_info=True)

        badge_logo_url = request.build_absolute_uri(_static("images/nerbis-badge.png"))

        renderer = SiteRenderer(
            theme=theme,
            content=content,
            seo=seo,
            structure=structure,
            active_sections=active_sections,
            page_slugs=page_slugs,
            tenant_name=tenant.name,
            tenant_slug=tenant.slug,
            tenant_modules=tenant_modules,
            base_url=base_url,
            is_preview=True,
            show_badge=show_badge,
            badge_logo_url=badge_logo_url,
            media=media,
            industry=industry,
            tenant_info=tenant_info,
        )
        html = renderer.render()

        return HttpResponse(html, content_type="text/html; charset=utf-8")

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant
