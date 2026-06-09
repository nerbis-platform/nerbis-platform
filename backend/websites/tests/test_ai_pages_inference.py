"""Tests para los cambios de IA en la inferencia de páginas (issue #262).

Cubre:
- SECTION_OPTION_MAP filtra por page keys (y por labels legacy).
- _call_generation parsea selected_pages y default [] cuando falta.
- _coerce_selected_pages sanea tipos.
"""

import json
from unittest.mock import MagicMock

from websites.services.ai_constants import SECTION_OPTION_MAP
from websites.services.ai_service import AIService, _coerce_selected_pages

# ───────────────────────────────────────────────────────────────────
# SECTION_OPTION_MAP + _filter_sections_by_selection
# ───────────────────────────────────────────────────────────────────


def _sections() -> list[dict]:
    return [
        {"id": "hero", "name": "Hero", "required": True},
        {"id": "about", "name": "Sobre nosotros", "required": False},
        {"id": "blog", "name": "Blog", "required": False},
        {"id": "services", "name": "Servicios", "required": False},
        {"id": "products", "name": "Productos", "required": False},
        {"id": "contact", "name": "Contacto", "required": True},
    ]


class _FakeTenant:
    has_services = True
    has_shop = True


class TestSectionOptionMap:
    def test_map_has_page_keys(self):
        """El map resuelve page keys (lo que el frontend envía hoy)."""
        assert SECTION_OPTION_MAP["about"] == ["about"]
        assert SECTION_OPTION_MAP["blog"] == ["blog"]
        assert SECTION_OPTION_MAP["portfolio"] == ["portfolio"]

    def test_map_keeps_legacy_label_aliases(self):
        """Aliases legacy en español siguen resolviendo (backward-compat)."""
        assert SECTION_OPTION_MAP["Sobre nosotros"] == ["about"]
        assert SECTION_OPTION_MAP["Servicios / Productos"] == ["services", "products"]

    def test_key_based_payload_filters_sections(self):
        """Spec: Key-based payload now filters sections (no es no-op)."""
        svc = AIService.__new__(AIService)
        svc.tenant = _FakeTenant()
        svc.SECTION_OPTION_MAP = SECTION_OPTION_MAP

        filtered = svc._filter_sections_by_selection(_sections(), {"website_sections": ["about", "services"]})
        ids = {s["id"] for s in filtered}
        # required siempre + las seleccionadas
        assert "hero" in ids
        assert "contact" in ids
        assert "about" in ids
        assert "services" in ids
        # blog NO seleccionado => excluido
        assert "blog" not in ids
        # No es el fallback degenerado (sólo required)
        assert ids != {"hero", "contact"}

    def test_label_payload_still_resolves(self):
        """Spec: Label-only payload still resolves via aliases."""
        svc = AIService.__new__(AIService)
        svc.tenant = _FakeTenant()
        svc.SECTION_OPTION_MAP = SECTION_OPTION_MAP

        filtered = svc._filter_sections_by_selection(_sections(), {"website_sections": ["Sobre nosotros"]})
        ids = {s["id"] for s in filtered}
        assert "about" in ids

    def test_services_guard_recognizes_key_form(self):
        """El guard services_or_products reconoce page keys, no sólo labels."""
        tenant = _FakeTenant()
        tenant.has_services = False
        tenant.has_shop = False
        svc = AIService.__new__(AIService)
        svc.tenant = tenant
        svc.SECTION_OPTION_MAP = SECTION_OPTION_MAP

        filtered = svc._filter_sections_by_selection(_sections(), {"website_sections": ["services"]})
        ids = {s["id"] for s in filtered}
        # Aunque los flags están en False, el guard fuerza al menos services.
        assert "services" in ids


# ───────────────────────────────────────────────────────────────────
# _coerce_selected_pages
# ───────────────────────────────────────────────────────────────────


class TestCoerceSelectedPages:
    def test_list_of_strings_passthrough(self):
        assert _coerce_selected_pages(["about", "blog"]) == ["about", "blog"]

    def test_non_list_returns_empty(self):
        assert _coerce_selected_pages(None) == []
        assert _coerce_selected_pages("about") == []
        assert _coerce_selected_pages({"about": True}) == []

    def test_drops_non_string_items(self):
        assert _coerce_selected_pages(["about", 3, None, "blog"]) == ["about", "blog"]


# ───────────────────────────────────────────────────────────────────
# _call_generation parses selected_pages
# ───────────────────────────────────────────────────────────────────


def _mock_response(payload: dict) -> MagicMock:
    response = MagicMock()
    block = MagicMock()
    block.text = json.dumps(payload)
    response.content = [block]
    response.usage.input_tokens = 10
    response.usage.output_tokens = 20
    return response


class TestCallGenerationParsesSelectedPages:
    def test_parses_selected_pages(self):
        """Spec: Model returns selected_pages within the generation response."""
        svc = AIService.__new__(AIService)
        svc.client = MagicMock()
        svc.client.messages.create.return_value = _mock_response(
            {
                "content": {"hero": {"title": "x"}},
                "seo": {"meta_title": "t"},
                "selected_pages": ["about", "blog"],
            }
        )
        *_, selected_pages = svc._call_generation(model="m", system_prompt="s", user_prompt="u")
        assert selected_pages == ["about", "blog"]
        # Spec: No extra AI call is made — exactly one create call.
        assert svc.client.messages.create.call_count == 1

    def test_defaults_to_empty_when_missing(self):
        """Spec: selected_pages default [] cuando falta el campo."""
        svc = AIService.__new__(AIService)
        svc.client = MagicMock()
        svc.client.messages.create.return_value = _mock_response({"content": {}, "seo": {}})
        *_, selected_pages = svc._call_generation(model="m", system_prompt="s", user_prompt="u")
        assert selected_pages == []

    def test_malformed_selected_pages_coerced_to_empty(self):
        svc = AIService.__new__(AIService)
        svc.client = MagicMock()
        svc.client.messages.create.return_value = _mock_response({"content": {}, "seo": {}, "selected_pages": "about"})
        *_, selected_pages = svc._call_generation(model="m", system_prompt="s", user_prompt="u")
        assert selected_pages == []
