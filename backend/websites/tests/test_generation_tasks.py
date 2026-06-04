"""
Tests para la generacion asincrona de contenido con Celery.

Cubre:
- Tarea generate_website_content (exito, fallo, timeout)
- Views: GenerateContentView (202, 409), GenerationStatusView
- Tarea recover_stuck_generations
- Aislamiento de tenant
"""

from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from celery.exceptions import SoftTimeLimitExceeded
from django.utils import timezone
from rest_framework import status

from websites.models import WebsiteConfig, WebsiteTemplate

# ===================================
# FIXTURES
# ===================================


@pytest.fixture()
def template(db, seeded_industries):
    """Template de prueba para generacion."""
    return WebsiteTemplate.objects.create(
        name="Test Template",
        slug="test-template",
        industry=seeded_industries("beauty"),
        description="Template de prueba",
        structure_schema={"sections": [{"id": "hero"}, {"id": "about"}, {"id": "contact"}]},
        ai_system_prompt="Generate content for a beauty business.",
        default_theme={"primary_color": "#3b82f6", "font_heading": "Poppins"},
        is_active=True,
    )


@pytest.fixture()
def website_config(tenant, template):
    """WebsiteConfig de prueba vinculada al tenant."""
    return WebsiteConfig.objects.create(
        tenant=tenant,
        template=template,
        status="onboarding",
        subdomain=tenant.slug,
    )


@pytest.fixture()
def onboarding_responses():
    """Respuestas del onboarding para generar contenido."""
    return {
        "business_name": "Test Salon",
        "business_description": "Un salon de belleza premium",
        "main_services": "Cortes, Tintes, Manicure",
        "business_whatsapp": "+57300123456",
    }


@pytest.fixture()
def mock_ai_content():
    """Contenido simulado que devuelve AIService."""
    content_data = {
        "hero": {"title": "Bienvenido", "subtitle": "Salon premium"},
        "about": {"title": "Sobre nosotros", "content": "Somos un salon..."},
        "contact": {"title": "Contacto", "phone": "+57300123456"},
    }
    seo_data = {"title": "Test Salon", "description": "Salon de belleza"}
    tokens_in = 500
    tokens_out = 800
    full_prompt = "system prompt + user prompt"
    raw_response = '{"hero": ...}'
    return content_data, seo_data, tokens_in, tokens_out, full_prompt, raw_response


# ===================================
# TASK TESTS
# ===================================


@pytest.mark.django_db
class TestGenerateWebsiteContentTask:
    """Tests para la tarea generate_website_content."""

    @patch("websites.services.UnsplashService")
    @patch("websites.services.AIService")
    def test_generate_website_content_success(
        self, mock_ai_cls, mock_unsplash_cls, website_config, tenant, onboarding_responses, mock_ai_content
    ):
        """Tarea exitosa: status -> review, content_data poblado, generation_task_id limpiado."""
        content_data, seo_data, tokens_in, tokens_out, full_prompt, raw_response = mock_ai_content

        # Mock AIService
        mock_ai = MagicMock()
        mock_ai.generate_initial_content.return_value = (
            content_data,
            seo_data,
            tokens_in,
            tokens_out,
            full_prompt,
            raw_response,
        )
        mock_ai.log_generation.return_value = None
        mock_ai_cls.return_value = mock_ai

        # Mock UnsplashService
        mock_unsplash = MagicMock()
        mock_unsplash.get_images_for_generation.return_value = {}
        mock_unsplash_cls.return_value = mock_unsplash

        from websites.tasks import generate_website_content

        result = generate_website_content.delay(
            website_config_id=website_config.id,
            tenant_id=tenant.id,
            user_id=1,
            onboarding_responses=onboarding_responses,
        )

        assert result.get()["success"] is True

        website_config.refresh_from_db()
        assert website_config.status == "review"
        assert website_config.generation_task_id is None
        assert website_config.content_data["hero"]["title"] == "Bienvenido"
        assert website_config.seo_data == seo_data

    @patch("websites.services.UnsplashService")
    @patch("websites.services.AIService")
    def test_generate_website_content_failure(
        self, mock_ai_cls, mock_unsplash_cls, website_config, tenant, onboarding_responses
    ):
        """AIService lanza excepcion: status hace rollback, generation_task_id se limpia."""
        mock_ai = MagicMock()
        mock_ai.generate_initial_content.side_effect = RuntimeError("API timeout")
        mock_ai.log_generation.return_value = None
        mock_ai_cls.return_value = mock_ai

        from websites.tasks import generate_website_content

        result = generate_website_content.delay(
            website_config_id=website_config.id,
            tenant_id=tenant.id,
            user_id=1,
            onboarding_responses=onboarding_responses,
        )

        task_result = result.get()
        assert task_result["success"] is False
        assert "API timeout" in task_result["error"]

        website_config.refresh_from_db()
        assert website_config.status == "onboarding"
        assert website_config.generation_task_id is None

    @patch("websites.services.UnsplashService")
    @patch("websites.services.AIService")
    def test_generate_website_content_timeout(
        self, mock_ai_cls, mock_unsplash_cls, website_config, tenant, onboarding_responses
    ):
        """SoftTimeLimitExceeded: manejo graceful, rollback de estado."""
        mock_ai = MagicMock()
        mock_ai.generate_initial_content.side_effect = SoftTimeLimitExceeded("Task timed out")
        mock_ai.log_generation.return_value = None
        mock_ai_cls.return_value = mock_ai

        from websites.tasks import generate_website_content

        result = generate_website_content.delay(
            website_config_id=website_config.id,
            tenant_id=tenant.id,
            user_id=1,
            onboarding_responses=onboarding_responses,
        )

        task_result = result.get()
        assert task_result["success"] is False

        website_config.refresh_from_db()
        assert website_config.status == "onboarding"
        assert website_config.generation_task_id is None


# ===================================
# VIEW TESTS
# ===================================


@pytest.mark.django_db
class TestGenerateContentView:
    """Tests para POST /api/websites/generate/."""

    @patch("websites.services.UnsplashService")
    @patch("websites.services.AIService")
    def test_generate_content_returns_202(
        self, mock_ai_cls, mock_unsplash_cls, auth_admin_client, website_config, tenant, mock_ai_content
    ):
        """POST retorna 202 con task_id cuando se despacha exitosamente."""
        content_data, seo_data, tokens_in, tokens_out, full_prompt, raw_response = mock_ai_content

        # Mock AIService (used in both view and task since EAGER mode)
        mock_ai = MagicMock()
        mock_ai.check_usage_limit.return_value = (True, 0, 10)
        mock_ai.generate_initial_content.return_value = (
            content_data,
            seo_data,
            tokens_in,
            tokens_out,
            full_prompt,
            raw_response,
        )
        mock_ai.log_generation.return_value = None
        mock_ai_cls.return_value = mock_ai

        # Mock UnsplashService
        mock_unsplash = MagicMock()
        mock_unsplash.get_images_for_generation.return_value = {}
        mock_unsplash_cls.return_value = mock_unsplash

        response = auth_admin_client.post("/api/websites/generate/", {}, format="json")

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert "task_id" in response.data
        assert response.data["status"] == "generating"

    def test_generate_content_409_when_already_generating(self, auth_admin_client, website_config):
        """POST retorna 409 si ya hay una generacion activa."""
        # Simular tarea activa
        website_config.generation_task_id = "fake-task-id-12345"
        website_config.status = "generating"
        website_config.save(update_fields=["generation_task_id", "status"])

        with patch("celery.result.AsyncResult") as mock_async_result:
            mock_result = MagicMock()
            mock_result.state = "STARTED"
            mock_async_result.return_value = mock_result

            response = auth_admin_client.post("/api/websites/generate/", {}, format="json")

        assert response.status_code == status.HTTP_409_CONFLICT
        assert "Ya hay una generación en progreso" in response.data["error"]
        assert response.data["task_id"] == "fake-task-id-12345"


@pytest.mark.django_db
class TestGenerationStatusView:
    """Tests para GET /api/websites/generation-status/."""

    def test_generation_status_while_generating(self, auth_admin_client, website_config):
        """GET retorna status=generating con task_id cuando esta generando."""
        website_config.status = "generating"
        website_config.generation_task_id = "celery-task-abc123"
        website_config.save(update_fields=["status", "generation_task_id"])

        response = auth_admin_client.get("/api/websites/generation-status/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "generating"
        assert response.data["task_id"] == "celery-task-abc123"
        assert "content_data" not in response.data

    def test_generation_status_after_completion(self, auth_admin_client, website_config):
        """GET retorna status=review con content_data cuando la generacion termino."""
        website_config.status = "review"
        website_config.generation_task_id = None
        website_config.content_data = {"hero": {"title": "Mi Sitio"}}
        website_config.seo_data = {"title": "SEO Title"}
        website_config.theme_data = {"primary_color": "#ff0000"}
        website_config.save(update_fields=["status", "generation_task_id", "content_data", "seo_data", "theme_data"])

        response = auth_admin_client.get("/api/websites/generation-status/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "review"
        assert response.data["task_id"] is None
        assert response.data["content_data"]["hero"]["title"] == "Mi Sitio"
        assert response.data["seo_data"]["title"] == "SEO Title"
        assert response.data["theme_data"]["primary_color"] == "#ff0000"


# ===================================
# RECOVERY TASK TESTS
# ===================================


@pytest.mark.django_db
class TestRecoverStuckGenerations:
    """Tests para la tarea recover_stuck_generations."""

    def test_recover_stuck_generations(self, website_config):
        """Configs con tarea terminal se resetean a onboarding."""
        website_config.status = "generating"
        website_config.generation_task_id = "dead-task-999"
        website_config.save(update_fields=["status", "generation_task_id"])

        with patch("celery.result.AsyncResult") as mock_async_result:
            mock_result = MagicMock()
            mock_result.state = "FAILURE"
            mock_async_result.return_value = mock_result

            from websites.tasks import recover_stuck_generations

            result = recover_stuck_generations()

        assert "1" in result  # "Recovered: 1"

        website_config.refresh_from_db()
        assert website_config.status == "onboarding"
        assert website_config.generation_task_id is None

    def test_recover_orphaned_generations(self, website_config):
        """Configs sin task_id pero stuck por mas de 5 min se recuperan."""
        website_config.status = "generating"
        website_config.generation_task_id = None
        website_config.save(update_fields=["status", "generation_task_id"])

        # Forzar updated_at a hace 10 minutos
        WebsiteConfig.objects.filter(id=website_config.id).update(updated_at=timezone.now() - timedelta(minutes=10))

        from websites.tasks import recover_stuck_generations

        result = recover_stuck_generations()

        assert "1" in result

        website_config.refresh_from_db()
        assert website_config.status == "onboarding"


# ===================================
# TENANT ISOLATION TESTS
# ===================================


@pytest.mark.django_db
class TestGenerationTenantIsolation:
    """Tests de aislamiento de tenant para generacion."""

    def test_generation_status_tenant_isolation(self, auth_admin_client, second_tenant, template):
        """Usuario de tenant A no puede ver generation status de tenant B."""
        # Crear config para el segundo tenant
        WebsiteConfig.objects.create(
            tenant=second_tenant,
            template=template,
            status="review",
            content_data={"hero": {"title": "Secret Data"}},
            seo_data={"title": "Secret SEO"},
        )

        # El admin del primer tenant no tiene website_config propia
        # (no se crea en este test), asi que deberia recibir 404
        response = auth_admin_client.get("/api/websites/generation-status/")

        # No debe ver datos del otro tenant
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_generation_status_shows_own_tenant_data(self, auth_admin_client, website_config):
        """Usuario ve solo los datos de su propio tenant."""
        website_config.status = "review"
        website_config.content_data = {"hero": {"title": "My Data"}}
        website_config.seo_data = {"title": "My SEO"}
        website_config.theme_data = {"primary_color": "#000"}
        website_config.save(update_fields=["status", "content_data", "seo_data", "theme_data"])

        response = auth_admin_client.get("/api/websites/generation-status/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["content_data"]["hero"]["title"] == "My Data"
