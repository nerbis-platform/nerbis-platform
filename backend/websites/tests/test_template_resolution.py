"""Tests de resolución de template por industria (issue-262, C7).

``resolve_template_for_industry`` nunca debe devolver ``None`` mientras exista
al menos un ``WebsiteTemplate`` activo. El endpoint QuickStart nunca debe
devolver 400 para una industria desconocida / propuesta por IA (se acabó el
dead-end ``unsupported-industry``).
"""

from unittest.mock import MagicMock, patch

import pytest

from websites.models import Industry, WebsiteTemplate
from websites.services.template_resolution import resolve_template_for_industry


@pytest.fixture()
def generic_template(db):
    """Template activo de la industria ``generic`` (fallback universal).

    Las migraciones 0004/0005 ya siembran ``universal-adaptable`` (generic);
    se reutiliza vía get_or_create para no colisionar el slug único.
    """
    generic = Industry.objects.get(key="generic")
    template, _ = WebsiteTemplate.objects.get_or_create(
        slug="universal-adaptable",
        defaults={"name": "Universal", "industry": generic, "description": "Template generico"},
    )
    if template.industry_id != generic.pk or not template.is_active:
        template.industry = generic
        template.is_active = True
        template.save(update_fields=["industry", "is_active"])
    return template


@pytest.fixture()
def beauty_template(db):
    beauty = Industry.objects.get(key="beauty")
    template, _ = WebsiteTemplate.objects.get_or_create(
        slug="belleza-elegante",
        defaults={"name": "Belleza", "industry": beauty, "description": "Template de belleza"},
    )
    return template


@pytest.mark.django_db
class TestResolveTemplate:
    def test_seeded_industry_with_default_template(self, beauty_template, generic_template):
        beauty = Industry.objects.get(key="beauty")
        beauty.default_template = beauty_template
        beauty.save(update_fields=["default_template"])

        result = resolve_template_for_industry("beauty")
        assert result == beauty_template

    def test_proposed_industry_falls_back_to_generic(self, generic_template):
        """Una industria propuesta sin default_template cae a generic."""
        proposed = Industry.objects.create(
            key="floristeria-prop",
            label="Floristería",
            created_by_ai=True,
            status="proposed_by_model",
            is_active=True,
        )
        result = resolve_template_for_industry(proposed.key)
        assert result == generic_template

    def test_unknown_key_falls_back_to_generic(self, generic_template):
        result = resolve_template_for_industry("totalmente-desconocida")
        assert result == generic_template

    def test_none_key_falls_back_to_generic(self, generic_template):
        result = resolve_template_for_industry(None)
        assert result == generic_template

    def test_returns_some_template_when_only_one_active(self, generic_template):
        """Aunque no haya match, devuelve algún template activo (último recurso)."""
        result = resolve_template_for_industry("inexistente")
        assert result is not None
        assert result.is_active is True

    def test_returns_none_only_when_no_active_templates(self):
        """Sin ningún template activo, devuelve None (caller -> 503)."""
        WebsiteTemplate.objects.all().update(is_active=False)
        result = resolve_template_for_industry("beauty")
        assert result is None


@pytest.mark.django_db
class TestQuickStartNeverReturns400:
    """El endpoint QuickStart no hace dead-end por industria desconocida."""

    QUICK_START_URL = "/api/websites/onboarding/quick-start/"

    @patch("websites.views.onboarding.AIService")
    def test_unknown_industry_not_400(self, mock_ai_cls, auth_admin_client, generic_template, tenant):
        tenant.industry = "industria-inexistente-zzz"
        tenant.save(update_fields=["industry"])

        mock_ai = MagicMock()
        # Sin suscripción, check_usage_limit puede negar -> 402, pero NUNCA 400.
        mock_ai.check_usage_limit.return_value = (False, 0, 0)
        mock_ai_cls.return_value = mock_ai

        response = auth_admin_client.post(
            self.QUICK_START_URL,
            {"business_description": "Negocio raro", "main_services": "Servicio A"},
            format="json",
        )
        assert response.status_code != 400

    @patch("websites.views.onboarding.AIService")
    def test_proposed_industry_key_not_400(self, mock_ai_cls, auth_admin_client, generic_template, tenant):
        proposed = Industry.objects.create(
            key="propuesta-quickstart",
            label="Propuesta",
            created_by_ai=True,
            status="proposed_by_model",
            is_active=True,
        )

        mock_ai = MagicMock()
        mock_ai.check_usage_limit.return_value = (False, 0, 0)
        mock_ai_cls.return_value = mock_ai

        response = auth_admin_client.post(
            self.QUICK_START_URL,
            {
                "business_description": "Negocio propuesto",
                "main_services": "Servicio B",
                "industry_key": proposed.key,
            },
            format="json",
        )
        assert response.status_code != 400
