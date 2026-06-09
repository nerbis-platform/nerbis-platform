# backend/websites/services/pages.py
"""Derivación centralizada del set de páginas habilitadas de un sitio generado.

Este módulo expone una única función pura ``derive_enabled_pages`` que calcula,
de forma determinista, qué páginas debe tener un sitio recién generado.

La fórmula (autoritativa) es:

    enabled_pages = force(home, contact)
        ∪ module_gated(services/products/bookings por flags has_*)
        ∪ industry_gated(menu si la industria es gastronómica)
        ∪ (ELECTIVE_PAGES ∩ ai_selected_pages ∩ content_keys)

Las llaves desconocidas / fuera del universo se ignoran. La IA NUNCA es
autoritativa para páginas obligatorias, de módulo o de industria: sólo decide
sobre las electivas (about/blog/portfolio/pricing).

La función no toca la base de datos ni lee ningún tenant: recibe los flags y la
industria ya resueltos por el caller (lee sólo el tenant en contexto). Esto la
hace trivialmente testeable y evita cualquier query cruzado entre tenants.
"""

# Páginas electivas: las únicas que la IA puede decidir vía selected_pages.
ELECTIVE_PAGES: frozenset[str] = frozenset({"about", "blog", "portfolio", "pricing"})

# Páginas obligatorias: siempre presentes, force-inyectadas en el servidor.
MANDATORY_PAGES: tuple[str, ...] = ("home", "contact")

# Páginas gateadas por módulo: se incluyen sólo si el flag has_* está activo.
MODULE_PAGE_FLAGS: dict[str, str] = {
    "services": "has_services",
    "products": "has_shop",
    "bookings": "has_bookings",
}

# Industrias gastronómicas que habilitan la página de menú (gate por vertical,
# NO por flag de módulo y NUNCA por la IA).
GASTRONOMY_INDUSTRIES: frozenset[str] = frozenset({"restaurant", "cafe", "bakery"})

# Orden estable y determinista de las páginas en el resultado. Las llaves no
# listadas (no debería haberlas tras el filtrado) caen al final, ordenadas.
_PAGE_SORT_ORDER: tuple[str, ...] = (
    "home",
    "contact",
    "about",
    "services",
    "products",
    "bookings",
    "blog",
    "portfolio",
    "pricing",
    "menu",
)


def derive_enabled_pages(
    *,
    content_keys: list[str],
    ai_selected_pages: list[str] | None,
    has_services: bool,
    has_shop: bool,
    has_bookings: bool,
    industry_key: str | None,
) -> list[str]:
    """Calcula el set autoritativo de páginas para un sitio generado.

    Args:
        content_keys: Llaves de sección realmente emitidas en ``content_data``
            (sin prefijo ``_`` y sin header/footer). Una página electiva sólo
            cuenta si su sección se renderizó.
        ai_selected_pages: Páginas electivas que la IA seleccionó (``selected_pages``).
            ``None`` o lista vacía => no se añade ninguna electiva.
        has_services: Flag de módulo del tenant en contexto.
        has_shop: Flag de módulo del tenant en contexto.
        has_bookings: Flag de módulo del tenant en contexto.
        industry_key: Llave de industria del tenant/template en contexto.

    Returns:
        Lista de llaves de página, de-duplicada y ordenada de forma estable
        (home y contact primero). Sólo contiene páginas obligatorias,
        gateadas por módulo, gateadas por industria, y electivas que la IA
        seleccionó Y que efectivamente se renderizaron.
    """
    enabled: set[str] = set(MANDATORY_PAGES)

    # Módulo: una página por flag has_* activo.
    module_flags = {
        "has_services": has_services,
        "has_shop": has_shop,
        "has_bookings": has_bookings,
    }
    for page_key, flag_name in MODULE_PAGE_FLAGS.items():
        if module_flags.get(flag_name, False):
            enabled.add(page_key)

    # Industria: menu sólo para verticales gastronómicas (nunca vía IA).
    if industry_key in GASTRONOMY_INDUSTRIES:
        enabled.add("menu")

    # Electivas: intersección de (universo electivo ∩ selección IA ∩ renderizadas).
    selected = set(ai_selected_pages or [])
    rendered = set(content_keys or [])
    enabled |= ELECTIVE_PAGES & selected & rendered

    return _stable_sort(enabled)


def _stable_sort(pages: set[str]) -> list[str]:
    """Ordena las páginas de forma determinista (home/contact primero)."""
    order_index = {key: idx for idx, key in enumerate(_PAGE_SORT_ORDER)}
    return sorted(pages, key=lambda key: (order_index.get(key, len(_PAGE_SORT_ORDER)), key))
