"""Regresión issue #284: borrar el WebsiteConfig no debe destruir los AIGenerationLog.

Antes, ``AIGenerationLog.website_config`` usaba ``on_delete=CASCADE``: al reiniciar
el onboarding (que borra el ``WebsiteConfig`` del tenant) se cascadeaba el borrado
de TODOS los logs de IA, reduciendo erróneamente el conteo mensual de uso y
destruyendo el historial de billing/auditoría.

Con ``on_delete=SET_NULL`` las filas sobreviven (conservan ``tenant`` y
``created_at``, que es lo que cuenta ``check_usage_limit``) y ``website_config``
queda en NULL.
"""

import pytest
from django.utils import timezone

from websites.models import AIGenerationLog, WebsiteConfig, WebsiteTemplate


@pytest.fixture()
def template(db, seeded_industries):
    """Template mínimo para crear un WebsiteConfig."""
    return WebsiteTemplate.objects.create(
        name="Test Template",
        slug="test-template",
        industry=seeded_industries("beauty"),
        description="Template de prueba",
        structure_schema={"sections": [{"id": "hero"}]},
        ai_system_prompt="Generate content.",
        default_theme={"primary_color": "#3b82f6"},
        is_active=True,
    )


@pytest.fixture()
def website_config(tenant, template):
    """WebsiteConfig del tenant de prueba."""
    return WebsiteConfig.objects.create(
        tenant=tenant,
        template=template,
        status="onboarding",
        subdomain=tenant.slug,
    )


def _usage_count(tenant) -> int:
    """Réplica del conteo de uso mensual que hace ``check_usage_limit``."""
    month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return AIGenerationLog.objects.filter(tenant=tenant, created_at__gte=month_start, is_successful=True).count()


@pytest.mark.django_db
def test_deleting_website_config_preserves_ai_logs_and_usage_count(tenant, website_config):
    """Borrar el WebsiteConfig conserva los AIGenerationLog (SET_NULL), sin reducir el uso."""
    n = 3
    for _ in range(n):
        AIGenerationLog.objects.create(
            tenant=tenant,
            website_config=website_config,
            generation_type="initial",
            is_successful=True,
        )

    # Antes de borrar: N usados este mes.
    assert _usage_count(tenant) == n

    config_id = website_config.id
    website_config.delete()

    # El WebsiteConfig ya no existe...
    assert not WebsiteConfig.objects.filter(id=config_id).exists()

    # ...pero los logs SIGUEN existiendo, ahora con website_config = NULL.
    logs = AIGenerationLog.objects.filter(tenant=tenant)
    assert logs.count() == n
    assert all(log.website_config_id is None for log in logs)

    # El conteo de uso mensual del tenant NO se redujo.
    assert _usage_count(tenant) == n


@pytest.mark.django_db
def test_deleting_website_config_is_tenant_scoped(tenant, second_tenant, template):
    """El borrado de un WebsiteConfig no afecta logs de otro tenant."""
    config_a = WebsiteConfig.objects.create(
        tenant=tenant, template=template, status="onboarding", subdomain=tenant.slug
    )
    AIGenerationLog.objects.create(
        tenant=tenant, website_config=config_a, generation_type="initial", is_successful=True
    )
    AIGenerationLog.objects.create(
        tenant=second_tenant, website_config=None, generation_type="initial", is_successful=True
    )

    config_a.delete()

    assert _usage_count(tenant) == 1
    assert _usage_count(second_tenant) == 1
