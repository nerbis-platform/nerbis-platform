# backend/websites/services/variants.py
"""Resolución determinista de variantes de sección a partir del catálogo.

Reemplaza la antigua elección aleatoria (`random.choice`) por una resolución
basada en el catálogo `SectionVariant`, para CUALQUIER sección:

1. Si la IA propuso un `_variant` y ese token coincide con una variante ACTIVA
   del catálogo de esa sección, se respeta.
2. Si no, se cae a la variante marcada como `is_default` (ordenada por
   `sort_order`). Para el hero existe además un fallback canónico (`centered`).
3. `_variant_ai_recommended` guarda SIEMPRE la elección real de la IA (o `None`
   si no propuso ninguna), para que el panel de edición pueda mostrarla.

El catálogo es la fuente de verdad: las claves activas se leen de la BD, no se
hardcodean. `SectionVariant`/`WebsiteSection` son modelos GLOBALES (sin tenant).
"""

# Default canónico cuando el catálogo no tiene ninguna variante de hero marcada
# como `is_default` (defensivo). Coincide con el `default:` del switch del
# frontend y con `_render_hero_centered` del renderer backend.
_HERO_FALLBACK_KEY = "centered"


def _active_variant_keys(section_key: str) -> set[str]:
    """Devuelve las claves de variantes ACTIVAS del catálogo para una sección."""
    from websites.models import SectionVariant

    return set(
        SectionVariant.objects.filter(
            is_active=True,
            section__key=section_key,
        ).values_list("key", flat=True)
    )


def _active_hero_variant_keys() -> set[str]:
    """Claves de variantes de hero ACTIVAS (compatibilidad retro)."""
    return _active_variant_keys("hero")


def _default_variant_key(section_key: str) -> str | None:
    """Clave de la variante por defecto ACTIVA de una sección (o None).

    Prefiere la variante activa marcada como `is_default`, ordenada por
    `sort_order`. Para el hero cae al fallback canónico (`centered`) si no hay
    ninguna marcada como default.
    """
    from websites.models import SectionVariant

    default_key = (
        SectionVariant.objects.filter(
            is_active=True,
            section__key=section_key,
            is_default=True,
        )
        .order_by("sort_order")
        .values_list("key", flat=True)
        .first()
    )
    if default_key:
        return default_key
    if section_key == "hero":
        return _HERO_FALLBACK_KEY
    return None


def resolve_section_variant(content: dict, section_key: str) -> None:
    """Resuelve `_variant` de una sección de forma determinista (sin aleatoriedad).

    Muta `content[section_key]` in-place:
    - `_variant_ai_recommended`: la elección REAL de la IA (str) o `None`.
    - `_variant`: la recomendación de la IA si es una clave activa del catálogo
      de esa sección; en caso contrario, la variante por defecto del catálogo.

    No hace nada si `section_key` no está en `content`.
    """
    if section_key not in content:
        return

    section = content[section_key]
    ai_choice = section.get("_variant")
    active_keys = _active_variant_keys(section_key)

    # Registrar la elección real de la IA (o None si no propuso nada).
    section["_variant_ai_recommended"] = ai_choice if ai_choice else None

    if ai_choice and ai_choice in active_keys:
        section["_variant"] = ai_choice
    else:
        default_key = _default_variant_key(section_key)
        if default_key is not None:
            section["_variant"] = default_key


def resolve_hero_variant(content: dict, has_image: bool) -> None:
    """Resuelve el `_variant` del hero (delega en `resolve_section_variant`).

    `has_image` se conserva en la firma por compatibilidad con los llamadores
    (generation.py / onboarding.py); hoy el default del catálogo (`centered`) ya
    es el indicado cuando no hay imagen, así que el parámetro no se usa.
    """
    resolve_section_variant(content, "hero")
