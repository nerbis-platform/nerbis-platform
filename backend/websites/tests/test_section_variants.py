"""Tests del catálogo de variantes de sección + resolución del hero (issue #296).

Cubre:
- `resolve_hero_variant`: respeta la elección de la IA si es una clave de hero
  ACTIVA del catálogo; si no, cae a la variante por defecto (`centered` cuando
  no hay imagen). Nunca usa aleatoriedad. `_variant_ai_recommended` guarda la
  elección real de la IA (o `None`).
- La migración 0036 siembra las 9 secciones canónicas con tokens base que
  coinciden con los dispatchers del renderer backend.
- glassmorphism (hero) y bento-grid (services/products) quedan desactivadas.
- `_build_variant_instructions` incluye guía blanda de mood e industrias.

`WebsiteSection`/`SectionVariant`/`Industry` son modelos GLOBALES (sin tenant).
La BD de test corre todas las migraciones, así que el catálogo ya está sembrado.
"""

import pytest

from websites.models import SectionVariant, WebsiteSection
from websites.services.ai_prompts import _build_variant_instructions
from websites.services.variants import (
    _active_hero_variant_keys,
    _active_variant_keys,
    resolve_hero_variant,
    resolve_section_variant,
)
from websites.tasks import _inject_images_and_variants

pytestmark = pytest.mark.django_db

CANONICAL_SECTION_KEYS = {
    "hero",
    "services",
    "products",
    "about",
    "testimonials",
    "pricing",
    "gallery",
    "faq",
    "contact",
}


# ---------------------------------------------------------------------------
# resolve_hero_variant — service logic
# ---------------------------------------------------------------------------


def test_resolve_respects_valid_ai_variant():
    """Si la IA propone una clave de hero ACTIVA, se respeta tal cual."""
    active = _active_hero_variant_keys()
    assert "split-image" in active
    content = {"hero": {"_variant": "split-image"}}
    resolve_hero_variant(content, has_image=True)
    assert content["hero"]["_variant"] == "split-image"
    assert content["hero"]["_variant_ai_recommended"] == "split-image"


def test_resolve_falls_back_for_unknown_ai_variant():
    """Una clave inexistente cae al default del catálogo; recommended preserva la cruda."""
    content = {"hero": {"_variant": "no-existe-xyz"}}
    resolve_hero_variant(content, has_image=False)
    assert content["hero"]["_variant"] == "centered"
    assert content["hero"]["_variant_ai_recommended"] == "no-existe-xyz"


def test_resolve_default_is_centered_when_no_ai_choice():
    """Sin `_variant` de la IA, el default es `centered` y recommended es None."""
    content = {"hero": {}}
    resolve_hero_variant(content, has_image=False)
    assert content["hero"]["_variant"] == "centered"
    assert content["hero"]["_variant_ai_recommended"] is None


def test_resolve_falls_back_for_deactivated_glassmorphism():
    """glassmorphism está desactivada: no se respeta aunque la IA la pida."""
    assert "glassmorphism" not in _active_hero_variant_keys()
    content = {"hero": {"_variant": "glassmorphism"}}
    resolve_hero_variant(content, has_image=False)
    assert content["hero"]["_variant"] == "centered"
    assert content["hero"]["_variant_ai_recommended"] == "glassmorphism"


def test_resolve_no_hero_is_noop():
    """Sin sección hero en el content, la función no toca nada."""
    content = {"services": {"_variant": "grid-cards"}}
    resolve_hero_variant(content, has_image=True)
    assert "hero" not in content
    assert content["services"]["_variant"] == "grid-cards"


# ---------------------------------------------------------------------------
# Catálogo sembrado por la migración 0036
# ---------------------------------------------------------------------------


def test_canonical_sections_seeded():
    """Las 9 secciones canónicas existen con sus claves exactas."""
    keys = set(WebsiteSection.objects.filter(key__in=CANONICAL_SECTION_KEYS).values_list("key", flat=True))
    assert keys == CANONICAL_SECTION_KEYS


def test_hero_keys_renamed_to_bare_tokens():
    """Las claves de hero usan tokens base, no el prefijo legacy `hero-*`."""
    hero_keys = set(SectionVariant.objects.filter(section__key="hero").values_list("key", flat=True))
    assert "centered" in hero_keys
    assert "split-image" in hero_keys
    assert not any(k.startswith("hero-") for k in hero_keys)


def test_bento_grid_and_glassmorphism_deactivated():
    """bento-grid (services/products) y glassmorphism (hero) NO están activas.

    Las claves son BARE (token), así que se identifican por (section, key), no
    por una clave prefijada global. bento-grid existe pero inactiva; glassmorphism
    queda inactiva (0037 garantiza su existencia inactiva en BD fresca).
    """
    services_bento = SectionVariant.objects.filter(section__key="services", key="bento-grid")
    products_bento = SectionVariant.objects.filter(section__key="products", key="bento-grid")
    assert services_bento.exists()
    assert products_bento.exists()
    assert not services_bento.filter(is_active=True).exists()
    assert not products_bento.filter(is_active=True).exists()

    # glassmorphism nunca debe estar ACTIVA en hero (esté presente o no).
    assert not SectionVariant.objects.filter(section__key="hero", key="glassmorphism", is_active=True).exists()
    # 0037 la siembra inactiva, así que debe existir como inactiva.
    assert SectionVariant.objects.filter(section__key="hero", key="glassmorphism", is_active=False).exists()


# Tokens canónicos por sección, verificados 1:1 contra los dispatchers
# `_render_<section>_<token>` de rendering.py y los `case '<token>'` de
# frontend/.../sections/*.tsx. Las claves del catálogo deben ser EXACTAMENTE
# estos tokens BARE (sin prefijo de sección).
CANONICAL_TOKENS = {
    "hero": {"centered", "split-image", "fullwidth-image", "bold-typography", "diagonal-split"},
    "services": {
        "grid-cards",
        "grid-cards-image",
        "list-detailed",
        "featured-highlight",
        "horizontal-scroll",
        "icon-minimal",
    },
    "products": {
        "grid-cards",
        "grid-cards-image",
        "showcase-large",
        "catalog-compact",
        "masonry-staggered",
        "price-table",
    },
    "about": {
        "text-only",
        "split-image",
        "stats-banner",
        "timeline",
        "overlapping-cards",
        "fullwidth-banner",
        "asymmetric",
    },
    "testimonials": {"cards-grid", "carousel", "single-highlight"},
    "pricing": {"cards", "comparison-table", "minimal-list"},
    "gallery": {"masonry", "grid-uniform", "slider"},
    "faq": {"classic", "side-by-side", "cards"},
    "contact": {"cards-grid", "split-form", "centered-minimal"},
}


def test_active_variant_keys_are_exact_bare_tokens():
    """Cada clave ACTIVA es EXACTAMENTE un token bare del renderer (sin prefijo).

    Comprueba `v.key` SIN ningún stripping: si una clave volviera a sembrarse
    prefijada (`services-grid-cards`), este test falla — que es justo el bug que
    se nos escapó antes.
    """
    for section_key, tokens in CANONICAL_TOKENS.items():
        active_keys = set(
            SectionVariant.objects.filter(section__key=section_key, is_active=True).values_list("key", flat=True)
        )
        assert active_keys == tokens, (
            f"Sección {section_key}: claves activas {active_keys} != tokens del renderer {tokens}"
        )


def test_each_section_has_exactly_one_active_default():
    """Cada sección canónica tiene exactamente una variante activa por defecto."""
    for section_key in CANONICAL_SECTION_KEYS:
        defaults = SectionVariant.objects.filter(section__key=section_key, is_active=True, is_default=True)
        assert defaults.count() == 1, f"La sección {section_key} debe tener 1 default activo"


# ---------------------------------------------------------------------------
# Prompt instructions — guía blanda de mood / industrias
# ---------------------------------------------------------------------------


def test_variant_instructions_include_mood_and_industries():
    """El prompt de variantes incluye Mood e Industrias (selección blanda)."""
    text = _build_variant_instructions(["hero", "services", "contact"])
    assert "## Variantes de Diseno Disponibles" in text
    assert "Mood:" in text
    assert "Industrias:" in text
    # Mensaje de selección blanda con fallback al default.
    assert "[DEFAULT]" in text


# ---------------------------------------------------------------------------
# resolve_section_variant — secciones no-hero
# ---------------------------------------------------------------------------


def test_resolve_section_respects_valid_ai_variant_non_hero():
    """Una clave activa BARE del catálogo de `about` se respeta tal cual."""
    active = _active_variant_keys("about")
    assert "split-image" in active
    content = {"about": {"_variant": "split-image"}}
    resolve_section_variant(content, "about")
    assert content["about"]["_variant"] == "split-image"
    assert content["about"]["_variant_ai_recommended"] == "split-image"


def test_resolve_section_falls_back_to_default_when_ai_omits_non_hero():
    """Sin `_variant`, `about` cae a su default activo y recommended es None."""
    default_key = (
        SectionVariant.objects.filter(section__key="about", is_active=True, is_default=True)
        .order_by("sort_order")
        .values_list("key", flat=True)
        .first()
    )
    content = {"about": {}}
    resolve_section_variant(content, "about")
    assert content["about"]["_variant"] == default_key
    assert content["about"]["_variant_ai_recommended"] is None


def test_resolve_section_falls_back_for_unknown_token_non_hero():
    """Un token inexistente cae al default; recommended preserva el crudo."""
    default_key = (
        SectionVariant.objects.filter(section__key="services", is_active=True, is_default=True)
        .order_by("sort_order")
        .values_list("key", flat=True)
        .first()
    )
    content = {"services": {"_variant": "no-existe-xyz"}}
    resolve_section_variant(content, "services")
    assert content["services"]["_variant"] == default_key
    assert content["services"]["_variant_ai_recommended"] == "no-existe-xyz"


def test_resolve_section_no_section_is_noop():
    """Sin la sección en el content, no se toca nada."""
    content = {"hero": {"_variant": "centered"}}
    resolve_section_variant(content, "products")
    assert "products" not in content


# ---------------------------------------------------------------------------
# tasks.py — la inyección ya no produce variantes aleatorias/fuera del catálogo
# ---------------------------------------------------------------------------


def test_inject_images_and_variants_uses_catalog_only():
    """`_inject_images_and_variants` resuelve variantes del catálogo, no random.

    Sin elección de la IA, cada sección debe quedar con su variante por defecto
    ACTIVA del catálogo (determinista), y nunca con un token fuera del catálogo.
    """
    content = {
        "hero": {},
        "about": {},
        "services": {"items": [{}, {}]},
        "products": {},
    }
    # Sin imágenes: ejercita la rama "sin imagen" de cada sección.
    _inject_images_and_variants(content, images={})

    for section_key in ("hero", "about", "services", "products"):
        resolved = content[section_key]["_variant"]
        active = _active_variant_keys(section_key)
        assert resolved in active, f"{section_key}: '{resolved}' no es una variante activa del catálogo"
        # La elección real de la IA fue None (no propuso ninguna).
        assert content[section_key]["_variant_ai_recommended"] is None


def test_inject_images_and_variants_respects_ai_choice():
    """Si la IA propuso una variante válida (BARE token), se respeta tal cual."""
    content = {
        "hero": {"_variant": "split-image"},
        "services": {"_variant": "list-detailed", "items": []},
    }
    _inject_images_and_variants(content, images={})
    assert content["hero"]["_variant"] == "split-image"
    assert content["hero"]["_variant_ai_recommended"] == "split-image"
    assert content["services"]["_variant"] == "list-detailed"
    assert content["services"]["_variant_ai_recommended"] == "list-detailed"


# ---------------------------------------------------------------------------
# Contrato de token end-to-end: la variante resuelta DEBE mapear a un
# `_render_<section>_<token>` real del renderer (no caer al default).
# Este test habría atrapado el bug de las claves prefijadas.
# ---------------------------------------------------------------------------


# El renderer despacha `getattr(self, f"_render_<section>_<token>", default)`.
# Tokens que el dispatcher resuelve SIN un método dedicado (caen a su default o a
# un método especial nombrado distinto) — válidos pero no tienen
# `_render_<section>_<token>` literal:
_DISPATCH_SPECIAL_TOKENS = {
    ("services", "grid-cards"),  # -> _render_services_default
    ("services", "grid-cards-image"),  # -> _render_services_image
    ("products", "grid-cards"),  # -> _render_services_default
    ("products", "grid-cards-image"),  # -> _render_services_image
}


def _renderer_method_for(section_key: str, token: str) -> str:
    """Nombre del método que el renderer buscaría para (section, token)."""
    return f"_render_{section_key}_{token.replace('-', '_')}"


def test_resolved_non_hero_variant_maps_to_real_renderer_method():
    """Cada token ACTIVO no-hero mapea a un `_render_<section>_<token>` real.

    Reproduce el contrato del dispatcher de `rendering.py`: el token resuelto por
    `resolve_section_variant` debe (a) tener un método `_render_<section>_<token>`
    dedicado, o (b) ser uno de los tokens con manejo especial documentado. Si la
    clave volviera a ser prefijada (`about-split-image`), el método
    `_render_about_about_split_image` no existiría y este test fallaría — que es
    exactamente el bug que se nos escapó.
    """
    from websites.rendering import SiteRenderer

    non_hero = [k for k in CANONICAL_SECTION_KEYS if k != "hero"]
    for section_key in non_hero:
        active_tokens = _active_variant_keys(section_key)
        for token in active_tokens:
            # La IA propone el token; el resolver lo respeta (es activo).
            content = {section_key: {"_variant": token}}
            resolve_section_variant(content, section_key)
            resolved = content[section_key]["_variant"]
            assert resolved == token, f"{section_key}: resolver alteró un token activo ({token} -> {resolved})"

            if (section_key, resolved) in _DISPATCH_SPECIAL_TOKENS:
                continue
            method_name = _renderer_method_for(section_key, resolved)
            assert hasattr(SiteRenderer, method_name), (
                f"{section_key}: token '{resolved}' no tiene método de renderer '{method_name}' "
                f"(caería al default — bug de catálogo no funcional)"
            )
