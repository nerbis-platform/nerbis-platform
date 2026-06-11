"""Tests de integridad de datos de la migración de industrias (issue-262).

Verifican el estado resultante de las migraciones 0021 + 0022:
- El catálogo Industry se sembró con la UNIÓN (~36 incluyendo ``generic``).
- Todo ``WebsiteTemplate.industry`` / ``PromptBlock.industry`` apunta a una
  Industry válida; las industrias desconocidas caen a ``generic``.
- ``SectionVariant.industries`` es M2M (no JSON).
- Las 4 filas de ``AIModelConfig`` quedaron sembradas con el modelo correcto.
- El round-trip key->FK->key preserva la key (sin orphans).
"""

import pytest

from websites.models import (
    AIModelConfig,
    Industry,
    PromptBlock,
    SectionVariant,
    WebsiteTemplate,
)

# Keys que la migración 0022 siembra como UNIÓN (28 tenant + 8 template-only).
EXPECTED_MIN_INDUSTRIES = 35


@pytest.mark.django_db
class TestIndustrySeed:
    """El catálogo global quedó sembrado por la migración de datos."""

    def test_generic_industry_exists(self):
        generic = Industry.objects.filter(key="generic").first()
        assert generic is not None
        assert generic.is_active is True
        assert generic.status == "reviewed"
        assert generic.created_by_ai is False

    def test_union_seed_count(self):
        """La UNIÓN siembra ~36 industrias (incluyendo generic)."""
        count = Industry.objects.count()
        assert count >= EXPECTED_MIN_INDUSTRIES

    def test_seeded_industries_are_reviewed_not_ai(self):
        """Las industrias sembradas son reviewed y no created_by_ai."""
        seeded = Industry.objects.filter(key__in=["beauty", "restaurant", "generic"])
        assert seeded.count() == 3
        for industry in seeded:
            assert industry.status == "reviewed"
            assert industry.created_by_ai is False

    def test_canonical_tenant_keys_present(self):
        """Las keys canónicas de Tenant existen en el catálogo."""
        for key in ["beauty", "gym", "restaurant", "tech", "real_estate"]:
            assert Industry.objects.filter(key=key).exists(), key

    def test_template_only_keys_present(self):
        """Las keys template-only se sembraron y la migración 0023 las consolidó
        en su twin canónico (retail→store, health→clinic, fitness→gym,
        professional→services)."""
        for key in ["store", "clinic", "gym", "services", "generic"]:
            assert Industry.objects.filter(key=key).exists(), key
        # Los duplicados fusionados por 0023 ya no existen en el catálogo.
        for old in ["retail", "health", "fitness", "professional"]:
            assert not Industry.objects.filter(key=old).exists(), old


@pytest.mark.django_db
class TestAIModelConfigSeed:
    """Las 5 filas de configuración de modelo IA quedaron sembradas."""

    def test_five_rows_seeded(self):
        assert AIModelConfig.objects.count() == 5

    def test_tasks_seeded(self):
        tasks = set(AIModelConfig.objects.values_list("task", flat=True))
        assert tasks == {
            "classify_industry",
            "web_content",
            "chat_edit",
            "seo",
            "suggest_colors",
        }

    def test_classify_uses_cheap_model_low_tokens(self):
        row = AIModelConfig.objects.get(task="classify_industry")
        assert "haiku" in row.model.lower()
        assert row.max_tokens == 512
        assert float(row.temperature) == 0.0

    def test_web_content_uses_sonnet(self):
        row = AIModelConfig.objects.get(task="web_content")
        assert "sonnet" in row.model.lower()
        assert row.max_tokens == 4096


@pytest.mark.django_db
class TestFKM2MIntegrity:
    """La conversión CharField->FK y JSON->M2M dejó relaciones íntegras."""

    def test_no_orphan_template_industries(self):
        """Todo WebsiteTemplate con industria apunta a una Industry real."""
        for template in WebsiteTemplate.objects.all():
            if template.industry_id is not None:
                assert Industry.objects.filter(pk=template.industry_id).exists()

    def test_no_orphan_promptblock_industries(self):
        for block in PromptBlock.objects.all():
            if block.industry_id is not None:
                assert Industry.objects.filter(pk=block.industry_id).exists()

    def test_template_industry_is_fk(self):
        """``WebsiteTemplate.industry`` es una relación FK (no string)."""
        industry = Industry.objects.get(key="beauty")
        template = WebsiteTemplate.objects.create(
            name="FK Check",
            slug="fk-check",
            industry=industry,
            description="desc",
        )
        template.refresh_from_db()
        assert template.industry == industry
        assert template.industry.key == "beauty"

    def test_sectionvariant_industries_is_m2m(self):
        """``SectionVariant.industries`` acepta .set() / .all() (M2M, no JSON)."""
        from websites.models import WebsiteSection

        section = WebsiteSection.objects.create(key="hero-m2m", label="Hero")
        variant = SectionVariant.objects.create(section=section, key="hero-bold-m2m", label="Bold")
        beauty = Industry.objects.get(key="beauty")
        gym = Industry.objects.get(key="gym")
        variant.industries.set([beauty, gym])

        keys = set(variant.industries.values_list("key", flat=True))
        assert keys == {"beauty", "gym"}

    def test_round_trip_key_preserved(self):
        """key -> FK -> key conserva la key original (sin pérdida)."""
        for key in ["beauty", "restaurant", "generic"]:
            industry = Industry.objects.get(key=key)
            template = WebsiteTemplate.objects.create(
                name=f"RT {key}",
                slug=f"rt-{key}",
                industry=industry,
                description="desc",
            )
            assert template.industry.key == key
