"""Tests de validación de contenido generado (issue #285).

Cubre:
- Frases genéricas globales (FORBIDDEN_GENERIC_PHRASES) prohibidas en CUALQUIER
  industria.
- CTAs genéricos extendidos (FORBIDDEN_CTA_PHRASES) detectados.
- No-regresión: reglas por industria de beauty (FORBIDDEN_PHRASES_BY_INDUSTRY)
  siguen funcionando.
- Contenido específico y limpio no produce problemas.

``validate_generated_content`` recibe un ``template`` (puede ser un stub con
``industry`` y ``industry_id``). No requiere BD para la lógica de frases, pero se
usan stubs ligeros para evitar acoplar a migraciones.
"""

from types import SimpleNamespace

from websites.services.ai_validation import (
    FORBIDDEN_CTA_PHRASES,
    FORBIDDEN_GENERIC_PHRASES,
    FORBIDDEN_PHRASES_BY_INDUSTRY,
    validate_generated_content,
)


def _template(industry_key: str | None):
    """Stub mínimo de WebsiteTemplate: solo .industry.key e .industry_id."""
    if industry_key is None:
        return SimpleNamespace(industry=None, industry_id=None)
    return SimpleNamespace(industry=SimpleNamespace(key=industry_key), industry_id=1)


# ---------------------------------------------------------------------------
# Frases genéricas globales (nuevo, issue #285)
# ---------------------------------------------------------------------------


def test_generic_phrase_flagged_in_any_industry():
    content = {"hero": {"title": "Calidad garantizada en todo lo que hacemos"}}
    # Industria sin reglas propias -> igual debe detectar la frase genérica global.
    problems = validate_generated_content(content, _template("restaurant"))
    assert any("calidad garantizada" in p.lower() for p in problems)


def test_generic_phrase_flagged_with_no_industry():
    content = {"about": {"content": "Somos tu mejor opción para cualquier necesidad."}}
    problems = validate_generated_content(content, _template(None))
    assert any("tu mejor opción" in p.lower() for p in problems)


def test_anos_de_experiencia_flagged():
    content = {"about": {"content": "Con más de 20 años de experiencia en el sector."}}
    problems = validate_generated_content(content, _template("generic"))
    assert any("frase genérica prohibida" in p.lower() for p in problems)


# ---------------------------------------------------------------------------
# CTAs extendidos
# ---------------------------------------------------------------------------


def test_extended_cta_flagged():
    content = {"hero": {"cta_text": "Haz clic aquí"}}
    problems = validate_generated_content(content, _template("generic"))
    assert any("cta genérico" in p.lower() for p in problems)
    assert "haz clic aquí" in FORBIDDEN_CTA_PHRASES


def test_original_cta_still_flagged():
    content = {"hero": {"cta_text": "Saber más"}}
    problems = validate_generated_content(content, _template("generic"))
    assert any("saber más" in p.lower() for p in problems)


# ---------------------------------------------------------------------------
# No-regresión: reglas por industria (beauty)
# ---------------------------------------------------------------------------


def test_beauty_industry_phrase_still_flagged():
    assert "beauty" in FORBIDDEN_PHRASES_BY_INDUSTRY
    content = {"hero": {"title": "Tu belleza, nuestra pasión"}}
    problems = validate_generated_content(content, _template("beauty"))
    assert any("tu belleza, nuestra pasión" in p.lower() for p in problems)


def test_beauty_global_and_industry_combined():
    """Beauty: aplica tanto su regla de industria como las genéricas globales."""
    content = {
        "hero": {"title": "Bienvenido a nuestro centro"},
        "about": {"content": "Calidad garantizada siempre."},
    }
    problems = validate_generated_content(content, _template("beauty"))
    text = " ".join(problems).lower()
    assert "bienvenido a nuestro centro" in text  # regla beauty
    assert "calidad garantizada" in text  # regla global


# ---------------------------------------------------------------------------
# Contenido limpio
# ---------------------------------------------------------------------------


def test_specific_clean_content_has_no_phrase_problems():
    content = {
        "hero": {
            "title": "Pan de masa madre horneado cada mañana en La Candelaria",
            "subtitle": "Fermentación de 24 horas y entrega antes de las 7 a.m.",
            "cta_text": "Reserva tu hogaza",
        }
    }
    problems = validate_generated_content(content, _template("restaurant"))
    # No debe haber problemas de frases prohibidas / CTA / genéricas.
    assert not any(
        ("prohibida" in p.lower() or "cta genérico" in p.lower() or "genérica prohibida" in p.lower()) for p in problems
    )


def test_empty_content_returns_no_problems():
    assert validate_generated_content({}, _template("generic")) == []


def test_global_lists_are_non_empty():
    assert FORBIDDEN_GENERIC_PHRASES
    assert FORBIDDEN_CTA_PHRASES
