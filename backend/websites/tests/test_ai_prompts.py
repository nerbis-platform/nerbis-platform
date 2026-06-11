"""Tests de ensamblado del system prompt (issue #285 — mejora-calidad-ia-promptblocks).

Cubre:
- Path dinámico vs legacy: con PromptBlocks activos se ensambla desde BD; sin
  bloques cae al prompt legacy hardcodeado.
- Scope filtering en ``_get_active_blocks`` (global / template / industry).
- Seguridad de placeholders y de llaves literales: ``str.format_map`` no debe
  reventar ni con placeholders desconocidos ni con ``{{``/``}}`` doblados, y las
  llaves dobladas se renderizan como una sola llave.
- El bloque premium (rules-premium-anticliche) se incluye cuando existe.

PromptBlock/Industry/WebsiteTemplate son modelos GLOBALES — no se filtran por
tenant. Los bloques se crean por ORM en cada test (no se depende de migraciones
de datos en la BD de test).
"""

import importlib

import pytest

from websites.models import Industry, PromptBlock, WebsiteTemplate
from websites.services.ai_prompts import (
    _build_legacy_prompt,
    _get_active_blocks,
    build_system_prompt,
)

# El nombre del módulo de migración empieza por dígito, así que no se puede
# importar con `import`. Cargamos el dict PREMIUM_BLOCK real que se siembra.
_migration_0030 = importlib.import_module(
    "websites.migrations.0030_seed_premium_global_block"
)
PREMIUM_BLOCK = _migration_0030.PREMIUM_BLOCK

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------


def _make_industry(key: str) -> Industry:
    industry, _ = Industry.objects.get_or_create(
        key=key,
        defaults={"label": key.title(), "is_active": True, "status": "reviewed"},
    )
    return industry


def _make_template(industry: Industry | None = None, slug: str = "tpl") -> WebsiteTemplate:
    return WebsiteTemplate.objects.create(
        name="Tpl",
        slug=slug,
        industry=industry,
        description="desc",
        ai_system_prompt="Instrucciones del template",
    )


@pytest.fixture(autouse=True)
def _clean_prompt_blocks(db):
    """Aísla cada test del seed de migraciones.

    La BD de test corre TODAS las migraciones, incluidas las que siembran
    PromptBlocks (0020 y 0030). Para que estos tests controlen su propio universo
    de bloques, limpiamos la tabla antes de cada test y creamos vía ORM lo que
    cada caso necesita.
    """
    PromptBlock.objects.all().delete()
    yield


# ---------------------------------------------------------------------------
# Dynamic vs legacy path
# ---------------------------------------------------------------------------


def test_no_blocks_falls_back_to_legacy_prompt():
    """Sin PromptBlocks activos, build_system_prompt == legacy."""
    industry = _make_industry("generic")
    template = _make_template(industry=industry)
    responses = {"business_name": "Café Lola"}

    assert PromptBlock.objects.count() == 0
    result = build_system_prompt(template, responses)
    legacy = _build_legacy_prompt(template, responses)
    assert result == legacy
    # El safety net anti-cliché debe estar en el legacy.
    assert "anti-cliché" in result.lower() or "anti-cliche" in result.lower()


def test_blocks_present_use_dynamic_assembly():
    """Con un bloque activo, se ensambla dinámicamente (no legacy)."""
    industry = _make_industry("generic")
    template = _make_template(industry=industry)
    PromptBlock.objects.create(
        key="system-role",
        label="Rol",
        content="Eres un experto en copy.",
        category="system",
        scope="global",
        sort_order=0,
    )
    result = build_system_prompt(template, {"business_name": "X"})
    assert "Eres un experto en copy." in result
    assert result != _build_legacy_prompt(template, {"business_name": "X"})


# ---------------------------------------------------------------------------
# Scope filtering
# ---------------------------------------------------------------------------


def test_scope_filtering_global_template_industry():
    industry = _make_industry("beauty")
    other_industry = _make_industry("restaurant")
    template = _make_template(industry=industry, slug="t1")
    other_template = _make_template(industry=other_industry, slug="t2")

    g = PromptBlock.objects.create(key="b-global", label="g", content="GLOBAL", category="rules", scope="global")
    t_match = PromptBlock.objects.create(
        key="b-tpl-match", label="t", content="TPL", category="rules", scope="template", template=template
    )
    PromptBlock.objects.create(
        key="b-tpl-other", label="t", content="TPL-OTHER", category="rules", scope="template", template=other_template
    )
    i_match = PromptBlock.objects.create(
        key="b-ind-match", label="i", content="IND", category="rules", scope="industry", industry=industry
    )
    PromptBlock.objects.create(
        key="b-ind-other", label="i", content="IND-OTHER", category="rules", scope="industry", industry=other_industry
    )

    blocks = _get_active_blocks(template=template, industry="beauty")
    keys = {b.key for b in blocks}
    assert keys == {g.key, t_match.key, i_match.key}


def test_inactive_blocks_excluded():
    _make_industry("generic")
    PromptBlock.objects.create(
        key="inactive", label="x", content="NO", category="rules", scope="global", is_active=False
    )
    assert _get_active_blocks(template=None, industry="generic") == []


# ---------------------------------------------------------------------------
# Placeholder + literal-brace safety
# ---------------------------------------------------------------------------


def test_doubled_braces_render_as_single_brace():
    """{{ }} en el contenido del bloque debe renderizar como { } (no romper)."""
    industry = _make_industry("generic")
    template = _make_template(industry=industry)
    PromptBlock.objects.create(
        key="json-example",
        label="ex",
        content='Ejemplo: {{"hero": {{"title": "X"}}}}',
        category="rules",
        scope="global",
    )
    result = build_system_prompt(template, {"business_name": "X"})
    assert '{"hero": {"title": "X"}}' in result


def test_unknown_placeholder_does_not_raise():
    """Un placeholder desconocido no debe reventar (defaultdict / except)."""
    industry = _make_industry("generic")
    template = _make_template(industry=industry)
    PromptBlock.objects.create(
        key="weird", label="w", content="Valor: {placeholder_inexistente}", category="rules", scope="global"
    )
    # No debe lanzar.
    result = build_system_prompt(template, {"business_name": "X"})
    assert isinstance(result, str)


def test_known_placeholder_is_replaced():
    industry = _make_industry("generic")
    template = _make_template(industry=industry)
    PromptBlock.objects.create(
        key="ctx", label="c", content="## Negocio\n{business_context}", category="business", scope="global"
    )
    result = build_system_prompt(template, {"business_name": "Café Lola"})
    assert "Café Lola" in result


# ---------------------------------------------------------------------------
# Premium block
# ---------------------------------------------------------------------------


def test_premium_block_included_when_present():
    """El bloque premium global se incluye en el prompt ensamblado."""
    industry = _make_industry("generic")
    template = _make_template(industry=industry)
    PromptBlock.objects.create(
        key="rules-premium-anticliche",
        label="premium",
        content=('## Calidad del copy (premium)\nEjemplo BIEN: {{"hero": {{"title": "Pan de masa madre"}}}}'),
        category="rules",
        scope="global",
        sort_order=5,
    )
    result = build_system_prompt(template, {"business_name": "X"})
    assert "Calidad del copy (premium)" in result
    # Las llaves dobladas del ejemplo deben colapsar a una sola.
    assert '{"hero": {"title": "Pan de masa madre"}}' in result


def test_migration_premium_block_renders_safely():
    """El contenido REAL sembrado por la migración 0030 se renderiza sin romper.

    Guarda el riesgo load-bearing del escape de llaves: si algún ``{``/``}`` del
    few-shot JSON no estuviera doblado, ``format_map`` lanzaría KeyError y el
    assembler caería a contenido crudo con ``{{``/``}}`` visibles. Validamos que:
    - las llaves dobladas colapsan a una sola (no quedan ``{{``/``}}`` residuales),
    - el few-shot específico ('Estampados DTF') llega íntegro al prompt.
    """
    industry = _make_industry("generic")
    template = _make_template(industry=industry)
    PromptBlock.objects.create(
        key=PREMIUM_BLOCK["key"],
        label=PREMIUM_BLOCK["label"],
        content=PREMIUM_BLOCK["content"],
        category=PREMIUM_BLOCK["category"],
        scope=PREMIUM_BLOCK["scope"],
        sort_order=PREMIUM_BLOCK["sort_order"],
    )
    result = build_system_prompt(template, {"business_name": "X"})

    # El few-shot premium llega íntegro.
    assert "Calidad premium (anti-cliché)" in result
    assert "Estampados DTF en 24 horas" in result
    assert "Impresión DTF textil" in result

    # Las llaves dobladas del JSON colapsaron a una sola (no hubo fallback crudo).
    assert "{{" not in result
    assert "}}" not in result
    assert '{"title": "Estampados DTF en 24 horas"' in result
