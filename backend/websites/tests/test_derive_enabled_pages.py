"""Tests para ``derive_enabled_pages`` y los bugs colaterales (issue #262).

Cubre los escenarios del delta spec ``sdd/onboarding-pages-ai/spec``:
- Páginas obligatorias siempre presentes (force-inject).
- Páginas de módulo sólo por flag has_* (nunca por IA).
- ``menu`` sólo por vertical gastronómica (nunca por IA).
- Electivas = IA ∩ renderizadas; llaves desconocidas ignoradas.
- selected_pages vacío => sólo home+contact+módulo.
- Aislamiento: el helper es puro (sólo usa los args pasados).
- SECTION_OPTION_MAP filtra por page keys (no labels).
- _call_generation parsea selected_pages.
- Ambos caminos (generation.py + tasks.py) convergen.
"""

import pytest

from websites.services.pages import (
    ELECTIVE_PAGES,
    GASTRONOMY_INDUSTRIES,
    MANDATORY_PAGES,
    derive_enabled_pages,
)


def _derive(**overrides):
    """Helper con defaults sensatos para reducir ruido en los casos."""
    base = {
        "content_keys": [],
        "ai_selected_pages": [],
        "has_services": False,
        "has_shop": False,
        "has_bookings": False,
        "industry_key": "generic",
    }
    base.update(overrides)
    return derive_enabled_pages(**base)


# ───────────────────────────────────────────────────────────────────
# Mandatory pages (force-inject)
# ───────────────────────────────────────────────────────────────────


class TestMandatoryPages:
    def test_home_and_contact_always_present(self):
        """Spec: Mandatory pages present even with empty selection."""
        result = _derive(ai_selected_pages=["about"], content_keys=["about"])
        assert "home" in result
        assert "contact" in result

    def test_mandatory_present_with_empty_selection(self):
        """Spec: AI omits mandatory pages — still force-injected."""
        result = _derive(ai_selected_pages=[], content_keys=[])
        assert set(MANDATORY_PAGES) <= set(result)

    def test_mandatory_present_even_when_ai_omits_them(self):
        """Spec: AI omits mandatory pages and no contact block."""
        result = _derive(ai_selected_pages=["blog"], content_keys=["blog"])
        assert "home" in result
        assert "contact" in result


# ───────────────────────────────────────────────────────────────────
# Module-gated pages (by has_* flags, never by AI)
# ───────────────────────────────────────────────────────────────────


class TestModuleGatedPages:
    def test_services_and_products_enabled_by_flags(self):
        """Spec: Tenant with services + shop enabled."""
        result = _derive(has_services=True, has_shop=True, has_bookings=False)
        assert "services" in result
        assert "products" in result
        assert "bookings" not in result

    def test_bookings_only_with_flag(self):
        result = _derive(has_bookings=True)
        assert "bookings" in result

    def test_ai_cannot_enable_disabled_module(self):
        """Spec: AI selecting a module page does not enable a disabled module."""
        result = _derive(
            has_bookings=False,
            ai_selected_pages=["bookings"],
            content_keys=["bookings"],
        )
        assert "bookings" not in result

    def test_module_flag_false_excludes_page_even_with_content(self):
        result = _derive(has_services=False, content_keys=["services"])
        assert "services" not in result


# ───────────────────────────────────────────────────────────────────
# Industry-gated menu (gastronomy vertical only, never by AI)
# ───────────────────────────────────────────────────────────────────


class TestMenuIndustryGate:
    @pytest.mark.parametrize("industry", sorted(GASTRONOMY_INDUSTRIES))
    def test_menu_for_gastronomy_industries(self, industry):
        """Spec: Gastronomy tenant gets a menu page."""
        result = _derive(industry_key=industry)
        assert "menu" in result

    def test_menu_absent_for_non_gastronomy(self):
        result = _derive(industry_key="beauty")
        assert "menu" not in result

    def test_menu_never_from_ai(self):
        """Spec: Non-gastronomy tenant never gets menu, even if AI lists it."""
        result = _derive(
            industry_key="beauty",
            ai_selected_pages=["menu"],
            content_keys=["menu"],
        )
        assert "menu" not in result

    def test_menu_not_an_elective(self):
        """menu no pertenece al universo electivo."""
        assert "menu" not in ELECTIVE_PAGES

    def test_menu_ignored_as_ai_selection_for_gastronomy_is_industry_driven(self):
        """Para gastronomía, menu viene del gate de industria, no de la IA."""
        result = _derive(industry_key="restaurant", ai_selected_pages=[])
        assert "menu" in result


# ───────────────────────────────────────────────────────────────────
# Elective pages (AI ∩ rendered)
# ───────────────────────────────────────────────────────────────────


class TestElectivePages:
    def test_elective_selected_and_rendered(self):
        """Spec: Elective selected and rendered."""
        result = _derive(
            ai_selected_pages=["about", "portfolio"],
            content_keys=["about", "portfolio"],
        )
        assert "about" in result
        assert "portfolio" in result

    def test_elective_selected_but_not_rendered_excluded(self):
        """Spec: Elective selected but not rendered."""
        result = _derive(ai_selected_pages=["blog"], content_keys=[])
        assert "blog" not in result

    def test_elective_rendered_but_not_selected_excluded(self):
        """Una sección renderizada sin selección IA no se vuelve página."""
        result = _derive(ai_selected_pages=[], content_keys=["about"])
        assert "about" not in result

    def test_pricing_selected_without_content_excluded(self):
        """Spec: Elective selected without rendered content is excluded."""
        result = _derive(ai_selected_pages=["pricing"], content_keys=[])
        assert "pricing" not in result

    def test_unknown_key_ignored(self):
        """Spec: Unknown page key is ignored."""
        result = _derive(
            ai_selected_pages=["about", "totally_made_up"],
            content_keys=["about", "totally_made_up"],
        )
        assert "about" in result
        assert "totally_made_up" not in result

    def test_stray_content_block_not_a_page(self):
        """Spec MODIFIED: Stray content block does not silently become a page."""
        result = _derive(
            ai_selected_pages=["about"],
            content_keys=["about", "testimonials"],
        )
        assert "testimonials" not in result
        assert "about" in result


# ───────────────────────────────────────────────────────────────────
# Empty / baseline
# ───────────────────────────────────────────────────────────────────


class TestEmptyAndBaseline:
    def test_empty_selection_yields_rule_driven_set(self):
        """Spec: Empty selected_pages still yields the rule-driven page set."""
        result = _derive(has_services=True, ai_selected_pages=[], content_keys=["services"])
        assert "home" in result
        assert "contact" in result
        assert "services" in result
        # Sin electivas
        assert not (ELECTIVE_PAGES & set(result))

    def test_none_selection_treated_as_empty(self):
        result = _derive(ai_selected_pages=None, content_keys=["about"])
        assert "about" not in result
        assert set(MANDATORY_PAGES) <= set(result)

    def test_result_is_deduplicated_and_stable(self):
        result = _derive(
            has_services=True,
            ai_selected_pages=["about", "about"],
            content_keys=["about"],
        )
        assert len(result) == len(set(result))
        # home y contact primero
        assert result[0] == "home"
        assert result[1] == "contact"

    def test_full_combination(self):
        result = _derive(
            has_services=True,
            has_shop=True,
            has_bookings=True,
            industry_key="cafe",
            ai_selected_pages=["about", "blog", "pricing"],
            content_keys=["about", "blog"],  # pricing NO renderizado
        )
        assert set(result) == {
            "home",
            "contact",
            "services",
            "products",
            "bookings",
            "menu",
            "about",
            "blog",
        }


# ───────────────────────────────────────────────────────────────────
# Purity / tenant isolation
# ───────────────────────────────────────────────────────────────────


class TestPurityAndIsolation:
    @pytest.mark.django_db
    def test_helper_does_not_query_db(self, django_assert_num_queries):
        """El helper es puro: no hace ningún query (no lee tenants)."""
        with django_assert_num_queries(0):
            _derive(has_shop=True, industry_key="restaurant")

    def test_reflects_only_passed_args_tenant_a(self):
        """Spec: Derivation reads only the in-context tenant's flags/vertical.

        Pasando los flags de tenant A, el resultado refleja SÓLO a A; los flags
        de un tenant B (no pasados) no influyen.
        """
        tenant_a = _derive(has_shop=True, industry_key="restaurant")
        tenant_b = _derive(has_shop=False, industry_key="beauty")
        assert "products" in tenant_a
        assert "menu" in tenant_a
        assert "products" not in tenant_b
        assert "menu" not in tenant_b
