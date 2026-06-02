"""Public site serving endpoint — no authentication required."""

import logging

from django.core.cache import cache
from django.http import Http404, HttpResponse, HttpResponseServerError
from rest_framework.permissions import AllowAny
from rest_framework.renderers import StaticHTMLRenderer
from rest_framework.views import APIView

from ..models import WebsiteConfig
from ..rendering import SiteRenderer
from ..throttles import PublicSiteThrottle

logger = logging.getLogger(__name__)


class PublicSiteView(APIView):
    """Serve a tenant's published website by slug."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PublicSiteThrottle]
    renderer_classes = [StaticHTMLRenderer]

    def get(self, request, slug):
        page_id = request.query_params.get("page", "home")
        cache_key = f"public_site:{slug}:{page_id}"

        cached = cache.get(cache_key)
        if cached:
            return HttpResponse(cached, content_type="text/html; charset=utf-8")

        config = self._lookup_config(slug)
        published = config.published_data
        if not published:
            raise Http404("Site not found.")

        content_data = published.get("content_data", {})
        theme_data = published.get("theme_data", {})
        seo_data = published.get("seo_data", {})
        media_data = published.get("media_data", {})
        pages_data = published.get("pages_data", {})

        template_theme = config.template.default_theme if config.template else {}
        theme = {**template_theme, **theme_data}
        structure = config.template.structure_schema if config.template else {}

        active_sections, content, seo, page_slugs = SiteRenderer.resolve_page(
            pages_data, content_data, seo_data, structure, page_id
        )

        tenant = config.tenant
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
            pass

        industry = config.template.industry if config.template else "generic"

        try:
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
                base_url=config.public_url or "",
                is_preview=False,
                show_badge=show_badge,
                badge_logo_url="",
                media=media_data,
                industry=industry,
                tenant_info=tenant_info,
            )
            html = renderer.render()
        except Exception:
            logger.exception("Error rendering public site for slug=%s", slug)
            return HttpResponseServerError("An error occurred while rendering the site.")

        cache.set(cache_key, html, timeout=3600)
        return HttpResponse(html, content_type="text/html; charset=utf-8")

    def _lookup_config(self, slug):
        """Find a published WebsiteConfig by subdomain or tenant slug."""
        config = (
            WebsiteConfig.objects.filter(subdomain=slug, status="published", tenant__is_active=True)
            .select_related("tenant", "template")
            .first()
        )
        if config:
            return config

        config = (
            WebsiteConfig.objects.filter(tenant__slug=slug, status="published", tenant__is_active=True)
            .select_related("tenant", "template")
            .first()
        )
        if config:
            return config

        raise Http404("Site not found.")
