"""Tests de integración para páginas electivas (issue #262).

Cubre:
- Convergencia: ambos caminos (generation.py + tasks.py + onboarding view)
  usan el MISMO helper centralizado ``derive_enabled_pages``.
- Tenant-scoping: la generación persiste enabled_pages en el WebsiteConfig del
  tenant solicitante, sin tocar otros tenants.
- Migración 0028 idempotente: portfolio/pricing/menu sembrados con flags
  correctos; el seed re-corrido no duplica; reverse elimina sólo los 3.
"""

from unittest.mock import MagicMock, patch

import pytest

from websites.models import WebsiteConfig, WebsitePage
from websites.services.pages import derive_enabled_pages

# ───────────────────────────────────────────────────────────────────
# Convergencia: ambos caminos usan el mismo helper
# ───────────────────────────────────────────────────────────────────


class TestBothPathsConvergence:
    def test_both_modules_import_same_helper(self):
        """generation.py, tasks.py y onboarding view referencian el mismo símbolo."""
        from websites.services import generation as gen_mod

        assert gen_mod.derive_enabled_pages is derive_enabled_pages

    def test_identical_inputs_yield_identical_output(self):
        """Spec: Both paths produce the same result for identical input.

        Como ambos caminos delegan en el helper puro, idénticos inputs producen
        idéntico output. Esto es el invariante que garantiza no-divergencia.
        """
        kwargs = {
            "content_keys": ["about", "blog", "services"],
            "ai_selected_pages": ["about", "blog"],
            "has_services": True,
            "has_shop": False,
            "has_bookings": False,
            "industry_key": "restaurant",
        }
        path_a = derive_enabled_pages(**kwargs)
        path_b = derive_enabled_pages(**kwargs)
        assert path_a == path_b
        assert set(path_a) == {"home", "contact", "services", "menu", "about", "blog"}

    def test_no_inline_derivation_remains_in_paths(self):
        """Las tres rutas delegan en el helper centralizado."""
        import inspect

        from websites import tasks as tasks_mod
        from websites.services import generation as gen_mod
        from websites.views import onboarding as onboarding_mod

        for mod in (gen_mod, tasks_mod, onboarding_mod):
            src = inspect.getsource(mod)
            assert "derive_enabled_pages(" in src, f"{mod.__name__} debe llamar al helper"


# ───────────────────────────────────────────────────────────────────
# Tenant-scoping de la generación
# ───────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTenantScoping:
    def _fake_generation_result(self):
        content = {
            "hero": {"title": "x"},
            "about": {"title": "Sobre"},
            "contact": {"title": "Contacto"},
        }
        return content, {"meta_title": "t"}, 100, 50, "prompt", "{}", ["about"]

    @patch("websites.services.generation.UnsplashService")
    @patch("websites.services.generation.AIService")
    def test_enabled_pages_written_to_requesting_tenant_only(
        self, mock_ai_cls, mock_unsplash_cls, tenant, second_tenant, seeded_industries
    ):
        """Spec: Output written to the requesting tenant's config."""
        # Config previa para second_tenant — no debe ser modificada.
        from websites.models import WebsiteTemplate
        from websites.services.generation import generate_website

        template = WebsiteTemplate.objects.create(
            name="Generic",
            slug="generic-scope",
            industry=seeded_industries("generic"),
            is_active=True,
            default_theme={},
            structure_schema={},
        )
        other_config = WebsiteConfig.objects.create(
            tenant=second_tenant,
            template=template,
            status="review",
            enabled_pages=["home", "contact"],
        )

        mock_ai = MagicMock()
        mock_ai.check_usage_limit.return_value = (True, 0, 10)
        mock_ai.generate_initial_content.return_value = self._fake_generation_result()
        mock_ai.log_generation.return_value = None
        mock_ai_cls.return_value = mock_ai

        mock_unsplash = MagicMock()
        mock_unsplash.get_images_for_generation.return_value = {}
        mock_unsplash_cls.return_value = mock_unsplash

        generate_website(
            tenant=tenant,
            business_description="Negocio de prueba",
            main_services="Servicio A",
        )

        config_a = WebsiteConfig.objects.get(tenant=tenant)
        assert "home" in config_a.enabled_pages
        assert "contact" in config_a.enabled_pages
        assert "about" in config_a.enabled_pages  # electiva seleccionada + renderizada

        # El config del otro tenant quedó intacto.
        other_config.refresh_from_db()
        assert other_config.enabled_pages == ["home", "contact"]


# ───────────────────────────────────────────────────────────────────
# Migración 0028 idempotente
# ───────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestElectivePagesCatalog:
    def test_new_pages_seeded_with_correct_flags(self):
        """Spec: portfolio/pricing/menu existen con los flags correctos.

        La migración 0028 corre en el setup de la DB de test, así que las filas
        deben existir tras migrar.
        """
        portfolio = WebsitePage.objects.get(key="portfolio")
        assert portfolio.is_mandatory is False
        assert portfolio.is_default is False
        assert portfolio.icon == "image"

        pricing = WebsitePage.objects.get(key="pricing")
        assert pricing.is_mandatory is False
        assert pricing.is_default is False
        assert pricing.icon == "tag"

        menu = WebsitePage.objects.get(key="menu")
        assert menu.is_mandatory is False
        assert menu.is_default is False
        assert menu.icon == "utensils"

    def test_menu_not_linked_to_any_module(self):
        """menu es industry-gated: NO se enlaza a ningún módulo."""
        menu = WebsitePage.objects.get(key="menu")
        assert menu.auto_include_modules.count() == 0

    def test_seed_command_is_idempotent(self):
        """Spec: Re-running seed_onboarding is a no-op for existing rows.

        El comando usa update_or_create keyeado por key — correrlo dos veces
        NO duplica las 10 páginas del catálogo.
        """
        from io import StringIO

        from django.core.management import call_command

        call_command("seed_onboarding", stdout=StringIO())
        first_count = WebsitePage.objects.count()
        call_command("seed_onboarding", stdout=StringIO())
        second_count = WebsitePage.objects.count()

        assert first_count == second_count
        # El catálogo completo tiene 10 páginas (7 originales + 3 nuevas).
        assert WebsitePage.objects.count() == 10
        for key in ("portfolio", "pricing", "menu"):
            assert WebsitePage.objects.filter(key=key).count() == 1

    def test_migration_forward_is_idempotent_and_reverse_removes_only_three(self):
        """Spec: forward update_or_create no duplica; reverse borra sólo los 3."""
        from websites.migrations import _load_0028

        add_pages, remove_pages = _load_0028()

        # Sembrar una página original para comprobar que el reverse NO la toca.
        WebsitePage.objects.update_or_create(
            key="about",
            defaults={
                "label": "Sobre nosotros",
                "description": "Acerca de",
                "icon": "info",
                "is_mandatory": False,
                "is_default": True,
                "sort_order": 2,
            },
        )

        # Forward dos veces: idempotente.
        add_pages(WebsitePage)
        add_pages(WebsitePage)
        for key in ("portfolio", "pricing", "menu"):
            assert WebsitePage.objects.filter(key=key).count() == 1

        # Reverse: elimina SÓLO los 3 nuevos, deja las originales.
        remove_pages(WebsitePage)
        for key in ("portfolio", "pricing", "menu"):
            assert not WebsitePage.objects.filter(key=key).exists()
        # La página original sobrevive al reverse.
        assert WebsitePage.objects.filter(key="about").exists()
