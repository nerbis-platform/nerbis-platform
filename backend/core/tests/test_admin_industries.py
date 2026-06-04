"""Tests del panel de superadmin para el catálogo de industrias (issue-262, C5).

Cubre:
- CRUD de industrias + promote (proposed_by_model -> reviewed, idempotente, 404).
- 403 para usuarios no-superadmin (admin de tenant).
- ai-models: list (4 filas) + patch (task read-only).
- ai-stats: vacío (en cero) + poblado (agrupado por type/model + totales).
- Sin paginación en las listas.
- Admin CRUD de PromptBlock (FK industry) y SectionVariant (M2M industries)
  funciona tras la conversión CharField->FK/M2M (bug corregido en C9).
"""

import pytest
from django.urls import reverse

from websites.models import (
    AIGenerationLog,
    AIModelConfig,
    Industry,
    PromptBlock,
    SectionVariant,
    WebsiteSection,
)


@pytest.mark.django_db
class TestAdminIndustriesCRUD:
    def test_list_no_pagination(self, admin_api_client):
        url = reverse("admin-settings-industries-list")
        response = admin_api_client.get(url)
        assert response.status_code == 200
        # Sin paginación: la respuesta es una lista, no {results: [...]}.
        assert isinstance(response.data, list)
        assert len(response.data) >= 35

    def test_create_industry(self, admin_api_client):
        url = reverse("admin-settings-industries-list")
        response = admin_api_client.post(url, {"key": "new-vertical", "label": "Nuevo Vertical"}, format="json")
        assert response.status_code == 201
        assert response.data["key"] == "new-vertical"
        # created_by_ai / status son read-only -> defaults del modelo.
        assert response.data["created_by_ai"] is False
        assert response.data["status"] == "reviewed"

    def test_retrieve_industry(self, admin_api_client):
        beauty = Industry.objects.get(key="beauty")
        url = reverse("admin-settings-industries-detail", args=[beauty.pk])
        response = admin_api_client.get(url)
        assert response.status_code == 200
        assert response.data["key"] == "beauty"

    def test_update_industry(self, admin_api_client):
        beauty = Industry.objects.get(key="beauty")
        url = reverse("admin-settings-industries-detail", args=[beauty.pk])
        response = admin_api_client.patch(url, {"label": "Belleza Premium"}, format="json")
        assert response.status_code == 200
        beauty.refresh_from_db()
        assert beauty.label == "Belleza Premium"

    def test_delete_industry(self, admin_api_client):
        extra = Industry.objects.create(key="to-delete", label="Borrar")
        url = reverse("admin-settings-industries-detail", args=[extra.pk])
        response = admin_api_client.delete(url)
        assert response.status_code == 204
        assert not Industry.objects.filter(pk=extra.pk).exists()


@pytest.mark.django_db
class TestAdminIndustryPromote:
    def test_promote_proposed_to_reviewed(self, admin_api_client):
        proposed = Industry.objects.create(
            key="prop-1", label="Propuesta", created_by_ai=True, status="proposed_by_model"
        )
        url = reverse("admin-settings-industries-promote", args=[proposed.pk])
        response = admin_api_client.post(url)
        assert response.status_code == 200
        proposed.refresh_from_db()
        assert proposed.status == "reviewed"

    def test_promote_is_idempotent(self, admin_api_client):
        reviewed = Industry.objects.create(key="rev-1", label="Revisada", status="reviewed")
        url = reverse("admin-settings-industries-promote", args=[reviewed.pk])
        first = admin_api_client.post(url)
        second = admin_api_client.post(url)
        assert first.status_code == 200
        assert second.status_code == 200
        reviewed.refresh_from_db()
        assert reviewed.status == "reviewed"

    def test_promote_missing_returns_404(self, admin_api_client):
        url = reverse("admin-settings-industries-promote", args=[999999])
        response = admin_api_client.post(url)
        assert response.status_code == 404


@pytest.mark.django_db
class TestAdminIndustriesPermissions:
    def test_tenant_admin_forbidden(self, auth_admin_client):
        """Un admin de tenant (no superadmin) recibe 403."""
        url = reverse("admin-settings-industries-list")
        response = auth_admin_client.get(url)
        assert response.status_code == 403

    def test_unauthenticated_forbidden(self, api_client):
        url = reverse("admin-settings-industries-list")
        response = api_client.get(url)
        assert response.status_code in (401, 403)


@pytest.mark.django_db
class TestAdminAIModels:
    def test_list_four_rows(self, admin_api_client):
        url = reverse("admin-settings-ai-models-list")
        response = admin_api_client.get(url)
        assert response.status_code == 200
        assert isinstance(response.data, list)
        assert len(response.data) == 4

    def test_patch_model_fields(self, admin_api_client):
        row = AIModelConfig.objects.get(task="classify_industry")
        url = reverse("admin-settings-ai-models-detail", args=[row.pk])
        response = admin_api_client.patch(
            url, {"model": "claude-new", "max_tokens": 256, "is_active": False}, format="json"
        )
        assert response.status_code == 200
        row.refresh_from_db()
        assert row.model == "claude-new"
        assert row.max_tokens == 256
        assert row.is_active is False

    def test_task_is_read_only(self, admin_api_client):
        row = AIModelConfig.objects.get(task="seo")
        url = reverse("admin-settings-ai-models-detail", args=[row.pk])
        response = admin_api_client.patch(url, {"task": "web_content"}, format="json")
        assert response.status_code == 200
        row.refresh_from_db()
        assert row.task == "seo"  # no cambió


@pytest.mark.django_db
class TestAdminAIStats:
    def test_empty_stats_zeroed(self, admin_api_client):
        url = reverse("admin-settings-ai-stats")
        response = admin_api_client.get(url)
        assert response.status_code == 200
        assert response.data["totals"]["count"] == 0
        assert response.data["totals"]["cost_estimated"] == "0"
        assert response.data["by_generation_type"] == []
        assert response.data["by_model"] == []

    def test_populated_stats_grouped(self, admin_api_client, tenant):
        AIGenerationLog.objects.create(
            tenant=tenant,
            generation_type="classify_industry",
            model_used="claude-3-haiku-20240307",
            tokens_input=100,
            tokens_output=20,
        )
        AIGenerationLog.objects.create(
            tenant=tenant,
            generation_type="initial",
            model_used="claude-sonnet-4-6",
            tokens_input=500,
            tokens_output=800,
        )

        url = reverse("admin-settings-ai-stats")
        response = admin_api_client.get(url)
        assert response.status_code == 200
        assert response.data["totals"]["count"] == 2
        assert response.data["totals"]["tokens_input"] == 600
        types = {r["generation_type"] for r in response.data["by_generation_type"]}
        assert types == {"classify_industry", "initial"}
        models = {r["model_used"] for r in response.data["by_model"]}
        assert models == {"claude-3-haiku-20240307", "claude-sonnet-4-6"}


@pytest.mark.django_db
class TestAdminPromptBlockFK:
    """Admin CRUD de PromptBlock con industry FK (bug corregido en C9)."""

    def test_create_industry_scoped_block_by_key(self, admin_api_client):
        url = reverse("admin-settings-prompt-blocks-list")
        response = admin_api_client.post(
            url,
            {
                "key": "block-beauty",
                "label": "Bloque belleza",
                "content": "Contenido",
                "category": "business",
                "scope": "industry",
                "industry": "beauty",  # por key
            },
            format="json",
        )
        assert response.status_code == 201, response.data
        block = PromptBlock.objects.get(key="block-beauty")
        assert block.industry is not None
        assert block.industry.key == "beauty"

    def test_create_industry_scoped_block_by_id(self, admin_api_client):
        beauty = Industry.objects.get(key="beauty")
        url = reverse("admin-settings-prompt-blocks-list")
        response = admin_api_client.post(
            url,
            {
                "key": "block-beauty-id",
                "label": "Bloque belleza id",
                "content": "Contenido",
                "category": "business",
                "scope": "industry",
                "industry": beauty.pk,  # por id
            },
            format="json",
        )
        assert response.status_code == 201, response.data
        block = PromptBlock.objects.get(key="block-beauty-id")
        assert block.industry_id == beauty.pk

    def test_industry_scope_requires_industry(self, admin_api_client):
        url = reverse("admin-settings-prompt-blocks-list")
        response = admin_api_client.post(
            url,
            {
                "key": "block-no-industry",
                "label": "Sin industria",
                "content": "Contenido",
                "category": "business",
                "scope": "industry",
            },
            format="json",
        )
        assert response.status_code == 400
        assert "industry" in response.data

    def test_global_scope_clears_industry(self, admin_api_client):
        beauty = Industry.objects.get(key="beauty")
        block = PromptBlock.objects.create(
            key="block-global", label="Global", content="x", scope="industry", industry=beauty
        )
        url = reverse("admin-settings-prompt-blocks-detail", args=[block.pk])
        response = admin_api_client.patch(url, {"scope": "global"}, format="json")
        assert response.status_code == 200, response.data
        block.refresh_from_db()
        assert block.industry_id is None

    def test_read_represents_industry_as_key(self, admin_api_client):
        beauty = Industry.objects.get(key="beauty")
        block = PromptBlock.objects.create(
            key="block-read", label="Read", content="x", scope="industry", industry=beauty
        )
        url = reverse("admin-settings-prompt-blocks-detail", args=[block.pk])
        response = admin_api_client.get(url)
        assert response.status_code == 200
        assert response.data["industry"] == "beauty"


@pytest.mark.django_db
class TestAdminSectionVariantM2M:
    """Admin CRUD de SectionVariant con industries M2M (bug corregido en C9)."""

    @pytest.fixture()
    def section(self, db):
        return WebsiteSection.objects.create(key="hero-admin", label="Hero")

    def test_create_with_industries_by_key(self, admin_api_client, section):
        url = reverse("admin-settings-variants-list")
        response = admin_api_client.post(
            url,
            {
                "section": section.pk,
                "key": "hero-variant-1",
                "label": "Variante 1",
                "industries": ["beauty", "gym"],  # por key
            },
            format="json",
        )
        assert response.status_code == 201, response.data
        variant = SectionVariant.objects.get(key="hero-variant-1")
        keys = set(variant.industries.values_list("key", flat=True))
        assert keys == {"beauty", "gym"}

    def test_create_with_industries_by_id(self, admin_api_client, section):
        beauty = Industry.objects.get(key="beauty")
        url = reverse("admin-settings-variants-list")
        response = admin_api_client.post(
            url,
            {
                "section": section.pk,
                "key": "hero-variant-2",
                "label": "Variante 2",
                "industries": [beauty.pk],  # por id
            },
            format="json",
        )
        assert response.status_code == 201, response.data
        variant = SectionVariant.objects.get(key="hero-variant-2")
        assert list(variant.industries.values_list("pk", flat=True)) == [beauty.pk]

    def test_read_represents_industries_as_keys(self, admin_api_client, section):
        beauty = Industry.objects.get(key="beauty")
        variant = SectionVariant.objects.create(section=section, key="hero-read", label="Read")
        variant.industries.set([beauty])
        url = reverse("admin-settings-variants-detail", args=[variant.pk])
        response = admin_api_client.get(url)
        assert response.status_code == 200
        assert response.data["industries"] == ["beauty"]

    def test_update_industries(self, admin_api_client, section):
        beauty = Industry.objects.get(key="beauty")
        gym = Industry.objects.get(key="gym")
        variant = SectionVariant.objects.create(section=section, key="hero-upd", label="Upd")
        variant.industries.set([beauty])
        url = reverse("admin-settings-variants-detail", args=[variant.pk])
        response = admin_api_client.patch(url, {"industries": ["gym"]}, format="json")
        assert response.status_code == 200, response.data
        keys = set(variant.industries.values_list("key", flat=True))
        assert keys == {gym.key}
