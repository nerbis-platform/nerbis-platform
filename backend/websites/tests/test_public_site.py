"""Tests for public site serving endpoint."""

from unittest.mock import patch

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from core.context import clear_current_tenant
from core.models import Tenant
from websites.models import WebsiteConfig, WebsiteTemplate

PUBLISHED_DATA = {
    "content_data": {
        "_section_order": ["hero", "about"],
        "hero": {"title": "Welcome", "subtitle": "Test site"},
        "about": {"title": "About Us", "text": "We are a test site"},
    },
    "theme_data": {
        "primary_color": "#0d9488",
        "secondary_color": "#1e293b",
        "font_heading": "Inter",
        "font_body": "Inter",
        "bg_color": "#ffffff",
        "text_color": "#1e293b",
    },
    "seo_data": {"site_title": "Test Site", "meta_description": "A test site"},
    "media_data": {},
    "pages_data": {},
}


@pytest.fixture()
def _clear_tenant():
    clear_current_tenant()
    yield
    clear_current_tenant()


@pytest.fixture()
def tenant(_clear_tenant):
    return Tenant.objects.create(
        name="Test Tenant",
        slug="test-tenant",
        schema_name="test_tenant_db",
        industry="beauty",
        email="test@test.com",
        phone="123456789",
        country="Colombia",
        plan="trial",
        is_active=True,
    )


@pytest.fixture()
def template(seeded_industries):
    return WebsiteTemplate.objects.create(
        name="Basic",
        slug="basic-test",
        industry=seeded_industries("beauty"),
        description="Test template",
        structure_schema={"sections": ["hero", "about"]},
        default_theme={
            "primary_color": "#0d9488",
            "font_heading": "Inter",
            "font_body": "Inter",
        },
        is_active=True,
    )


@pytest.fixture()
def published_config(tenant, template):
    return WebsiteConfig.objects.create(
        tenant=tenant,
        template=template,
        status="published",
        published_data=PUBLISHED_DATA,
        content_data=PUBLISHED_DATA["content_data"],
        theme_data=PUBLISHED_DATA["theme_data"],
        seo_data=PUBLISHED_DATA["seo_data"],
        media_data={},
        pages_data={},
        subdomain="test-tenant",
    )


@pytest.fixture(autouse=True)
def _clear_cache():
    yield
    cache.clear()


@pytest.mark.django_db
class TestPublicSiteView:
    url = "/api/public/sites/test-tenant/"

    def test_published_site_returns_200_html(self, published_config):
        client = APIClient()
        resp = client.get(self.url)
        assert resp.status_code == 200
        assert "text/html" in resp["Content-Type"]
        assert b"<html" in resp.content

    def test_unpublished_site_returns_404(self, tenant, template):
        WebsiteConfig.objects.create(
            tenant=tenant,
            template=template,
            status="draft",
            published_data=PUBLISHED_DATA,
            content_data={},
            theme_data={},
            seo_data={},
            media_data={},
            pages_data={},
            subdomain="test-tenant",
        )
        client = APIClient()
        assert client.get(self.url).status_code == 404

    def test_inactive_tenant_returns_404(self, published_config):
        published_config.tenant.is_active = False
        published_config.tenant.save(update_fields=["is_active"])
        assert APIClient().get(self.url).status_code == 404

    def test_nonexistent_slug_returns_404(self):
        assert APIClient().get("/api/public/sites/nonexistent/").status_code == 404

    def test_subdomain_lookup_priority(self, tenant, template):
        WebsiteConfig.objects.create(
            tenant=tenant,
            template=template,
            status="published",
            published_data=PUBLISHED_DATA,
            content_data={},
            theme_data={},
            seo_data={},
            media_data={},
            pages_data={},
            subdomain="custom-sub",
        )
        assert APIClient().get("/api/public/sites/custom-sub/").status_code == 200

    def test_empty_published_data_returns_404(self, tenant, template):
        WebsiteConfig.objects.create(
            tenant=tenant,
            template=template,
            status="published",
            published_data={},
            content_data={},
            theme_data={},
            seo_data={},
            media_data={},
            pages_data={},
            subdomain="empty-site",
        )
        assert APIClient().get("/api/public/sites/empty-site/").status_code == 404

    def test_no_auth_required(self, published_config):
        assert APIClient().get(self.url).status_code == 200

    def test_cache_hit_on_second_request(self, published_config):
        client = APIClient()
        with patch("websites.views.public.SiteRenderer") as mock_cls:
            mock_cls.resolve_page.return_value = (["hero"], {"hero": {}}, {}, {})
            mock_cls.return_value.render.return_value = "<html>cached</html>"
            assert client.get(self.url).status_code == 200
            assert client.get(self.url).status_code == 200
            assert mock_cls.return_value.render.call_count == 1

    def test_rate_limiting_returns_429(self, published_config):
        from websites.throttles import PublicSiteThrottle

        original_rate = PublicSiteThrottle.THROTTLE_RATES.get("public_site")
        PublicSiteThrottle.THROTTLE_RATES["public_site"] = "2/min"
        PublicSiteThrottle.cache.clear()
        try:
            client = APIClient()
            for _ in range(2):
                assert client.get(self.url).status_code == 200
            assert client.get(self.url).status_code == 429
        finally:
            PublicSiteThrottle.THROTTLE_RATES["public_site"] = original_rate
            PublicSiteThrottle.cache.clear()
