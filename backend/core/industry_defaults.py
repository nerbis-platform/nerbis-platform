"""
Defaults por industria para onboarding acelerado.

Este modulo centraliza los valores que se aplican automaticamente al registrar
un tenant segun su industria, con el objetivo de reducir la friccion del flujo
post-registro (< 60 segundos de registro a sitio generado).

Usos:
- TenantRegisterSerializer: activar flags de modulos recomendados por vertical.
- StartOnboardingView: resolver automaticamente que template corresponde.
- AIService: aplicar tono de marca, horario y secciones default cuando el
  onboarding corto no los captura.

Convencion: el "vertical" agrupa varias industrias afines. Por ejemplo, el
vertical `wellness` cubre `beauty`, `spa` y `nails`, y todos comparten el
mismo template (`belleza-elegante`) y los mismos defaults de copy.
"""

from __future__ import annotations

# -- Agrupacion industria -> vertical ------------------------------------------
# Solo se lista la equivalencia cuando la industria cae en un vertical. El
# resto usa los defaults genericos.
INDUSTRY_TO_VERTICAL: dict[str, str] = {
    "beauty": "wellness",
    "spa": "wellness",
    "nails": "wellness",
}

# -- Flags de modulos por vertical ---------------------------------------------
# Al registrar un tenant solo seteamos los flags que NO son controlados por
# billing. El signal `sync_modules_to_tenant` (billing/signals.py) sobrescribe
# has_shop, has_bookings, has_services y has_marketing con base en los
# SubscriptionModule activos -- por eso aca solo tocamos:
#
# - has_website: no lo maneja el sync, es el modulo base y siempre queda True.
# - modules_configured: bypass de la pantalla /dashboard/setup (Fase 2).
#
# Cuando el dueno quiera activar shop/bookings/services/marketing, lo hara
# desde settings -> flujo de billing que agrega el SubscriptionModule.
_BASE_FLAGS: dict[str, bool] = {
    "has_website": True,
    "modules_configured": True,
}

# Reservado para futuro: si un vertical necesitara overrides especificos en
# campos que si sobrevivan al sync (ej: defaults de campos del Tenant model
# que no sean feature flags), se agregan aca.
MODULE_FLAGS_BY_VERTICAL: dict[str, dict[str, bool]] = {}

# -- Template slug default por vertical ----------------------------------------
TEMPLATE_SLUG_BY_VERTICAL: dict[str, str] = {
    "wellness": "belleza-elegante",
}

# -- Tono de marca default por vertical ----------------------------------------
BRAND_TONE_BY_VERTICAL: dict[str, str] = {
    "wellness": "Calido y cercano",
}

# -- Horario default por vertical ----------------------------------------------
# Formato conversacional, se muestra tal cual en la seccion de contacto y el
# usuario puede editarlo en el editor.
BUSINESS_HOURS_BY_VERTICAL: dict[str, str] = {
    "wellness": "Lunes a viernes 10:00-20:00, sabados 10:00-14:00",
}

# -- Secciones website default por vertical ------------------------------------
SECTIONS_BY_VERTICAL: dict[str, list[str]] = {
    "wellness": [
        "Sobre nosotros",
        "Servicios",
        "Testimonios / Resenas",
        "Preguntas frecuentes",
    ],
}


def get_vertical(industry: str | None) -> str | None:
    """Retorna el vertical asociado a una industria, o None si no tiene."""
    if not industry:
        return None
    return INDUSTRY_TO_VERTICAL.get(industry)


def get_module_flags(industry: str | None) -> dict[str, bool]:
    """Flags de modulos que deben activarse al registrar un tenant.

    Siempre se activa `has_website=True` y `modules_configured=True` para que
    el usuario no quede bloqueado en la pantalla de seleccion de modulos.
    """
    vertical = get_vertical(industry)
    if vertical and vertical in MODULE_FLAGS_BY_VERTICAL:
        return dict(MODULE_FLAGS_BY_VERTICAL[vertical])
    return dict(_BASE_FLAGS)


def get_default_template_slug(industry: str | None) -> str | None:
    """Slug del template que debe auto-seleccionarse para esta industria."""
    vertical = get_vertical(industry)
    if not vertical:
        return None
    return TEMPLATE_SLUG_BY_VERTICAL.get(vertical)


def get_default_brand_tone(industry: str | None) -> str | None:
    """Tono de marca default cuando el onboarding no captura el campo."""
    vertical = get_vertical(industry)
    if not vertical:
        return None
    return BRAND_TONE_BY_VERTICAL.get(vertical)


def get_default_business_hours(industry: str | None) -> str | None:
    """Horario default cuando el onboarding no captura el campo."""
    vertical = get_vertical(industry)
    if not vertical:
        return None
    return BUSINESS_HOURS_BY_VERTICAL.get(vertical)


def get_default_sections(industry: str | None) -> list[str]:
    """Secciones default del sitio cuando el onboarding no las captura."""
    vertical = get_vertical(industry)
    if not vertical:
        return []
    return list(SECTIONS_BY_VERTICAL.get(vertical, []))
