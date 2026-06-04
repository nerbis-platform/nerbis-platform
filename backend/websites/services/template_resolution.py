# backend/websites/services/template_resolution.py
"""Resolución segura de template a partir de una industria.

El objetivo de este módulo es que el flujo quick-start NUNCA falle con un 400
"industria no soportada". Antes, si la industria del tenant no tenía un slug en
``TEMPLATE_SLUG_BY_VERTICAL``, el onboarding rápido quedaba en un callejón sin
salida. Ahora siempre se resuelve a algún template activo.

Orden de resolución (primero que aplique gana):
1. ``Industry.default_template`` de la industria clasificada (si está activo).
2. Mapeo vertical existente (``get_default_template_slug``) -> template por slug.
3. Template de la industria ``generic`` (default_template o por industria FK).
4. Template con slug ``generic``.
5. Primer template activo disponible (último recurso).

Devuelve ``None`` solo si no existe NINGÚN ``WebsiteTemplate`` activo en la base
(estado inválido de seed) — el caller debe tratar eso como error de sistema, no
como industria no soportada.
"""

from __future__ import annotations

from core.industry_defaults import get_default_template_slug

from ..models import Industry, WebsiteTemplate


def resolve_template_for_industry(industry_key: str | None) -> WebsiteTemplate | None:
    """Resuelve un ``WebsiteTemplate`` activo para una industria, sin dead-end.

    Args:
        industry_key: Clave de la industria (de classify-industry o del tenant).
            Puede ser ``None`` o desconocida — siempre se cae a un fallback.

    Returns:
        Un ``WebsiteTemplate`` activo, o ``None`` solo si no hay ningún template
        activo en la base (estado de seed inválido).
    """
    key = (industry_key or "").strip()

    industry = Industry.objects.filter(key=key).select_related("default_template").first() if key else None

    # 1. default_template de la industria clasificada.
    if industry and industry.default_template_id and industry.default_template.is_active:
        return industry.default_template

    # 2. Mapeo vertical (wellness -> belleza-elegante, etc.).
    slug = get_default_template_slug(key)
    if slug:
        template = WebsiteTemplate.objects.filter(slug=slug, is_active=True).first()
        if template:
            return template

    # 3. Template de la industria 'generic'.
    generic = Industry.objects.filter(key="generic").select_related("default_template").first()
    if generic:
        if generic.default_template_id and generic.default_template.is_active:
            return generic.default_template
        template = WebsiteTemplate.objects.filter(industry=generic, is_active=True).order_by("sort_order").first()
        if template:
            return template

    # 4. Template con slug 'generic'.
    template = WebsiteTemplate.objects.filter(slug="generic", is_active=True).first()
    if template:
        return template

    # 5. Último recurso: cualquier template activo.
    return WebsiteTemplate.objects.filter(is_active=True).order_by("sort_order").first()
