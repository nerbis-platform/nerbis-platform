"""Tests del endpoint POST /api/websites/onboarding/suggest-colors/ (issue #275).

Cubre los escenarios de aceptación del spec:
- happy path: la IA devuelve un hex válido -> 200 con ese color.
- fallback hex inválido / ausente -> 200 con un primario curado por sector.
- fallback excepción de la IA -> 200 con un primario curado.
- business_description faltante / sobre-cap -> 400 (validación de entrada).
- sin API key (cliente None) -> 200 con primario curado (mock path).
- logging: fila AIGenerationLog tenant-scoped + aislamiento cross-tenant.
- el servicio lee la fila activa AIModelConfig y cae a settings si no hay.
- la migración 0028 sembró la fila suggest_colors de forma idempotente.

La IA se mockea — no se hacen llamadas de red reales.
"""

import json
from unittest.mock import MagicMock, patch

import pytest
from django.urls import reverse

from websites.models import AIGenerationLog, AIModelConfig
from websites.services import ai_service as ai_service_module

URL = "/api/websites/onboarding/suggest-colors/"


# ===================================
# HELPERS
# ===================================


def _fake_anthropic_response(payload: dict, tokens_in: int = 90, tokens_out: int = 20):
    """Construye un objeto que imita la respuesta de anthropic messages.create."""
    response = MagicMock()
    block = MagicMock()
    block.text = json.dumps(payload) if isinstance(payload, dict) else payload
    response.content = [block]
    response.usage.input_tokens = tokens_in
    response.usage.output_tokens = tokens_out
    return response


def _fake_client(payload):
    """Cliente anthropic mock cuyo messages.create devuelve `payload`."""
    client = MagicMock()
    client.messages.create.return_value = _fake_anthropic_response(payload)
    return client


@pytest.fixture(autouse=True)
def _clear_model_cache():
    """El cache de configuración de modelo es a nivel de módulo (TTL 60s)."""
    ai_service_module._MODEL_CONFIG_CACHE.clear()
    yield
    ai_service_module._MODEL_CONFIG_CACHE.clear()


@pytest.fixture()
def patched_client():
    """Parchea AIService._get_client para inyectar un cliente mock.

    Devuelve un setter que configura el payload que la IA "responde".
    """
    with patch("websites.services.ai_service.AIService._get_client") as mock_get:
        def _set(payload):
            client = _fake_client(payload)
            mock_get.return_value = client
            return client

        # Por defecto: un hex válido.
        _set({"primary_hex": "#1C3B57", "rationale": "Azul profesional"})
        yield _set


def _payload(**overrides) -> dict:
    base = {
        "business_description": "Un spa de bienestar premium en Bogotá.",
        "industry_key": "beauty",
        "industry_label": "Belleza / Spa",
        "tone": "premium",
    }
    base.update(overrides)
    return base


# ===================================
# AUTH
# ===================================


@pytest.mark.django_db
class TestSuggestColorsAuth:
    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.post(URL, _payload(), format="json")
        assert response.status_code == 401

    def test_url_name_resolves(self):
        assert reverse("onboarding-suggest-colors") == URL

    def test_authenticated_tenant_user_ok(self, auth_admin_client, patched_client):
        response = auth_admin_client.post(URL, _payload(), format="json")
        assert response.status_code == 200


# ===================================
# HAPPY PATH
# ===================================


@pytest.mark.django_db
class TestSuggestColorsHappy:
    def test_valid_hex_returned(self, auth_admin_client, patched_client):
        patched_client({"primary_hex": "#0D9488", "rationale": "Verde bienestar"})
        response = auth_admin_client.post(URL, _payload(), format="json")
        assert response.status_code == 200
        assert response.data["primary_hex"] == "#0D9488"
        assert response.data["rationale"] == "Verde bienestar"

    def test_lowercase_hex_is_uppercased(self, auth_admin_client, patched_client):
        patched_client({"primary_hex": "#abcdef", "rationale": "ok"})
        response = auth_admin_client.post(URL, _payload(), format="json")
        assert response.status_code == 200
        assert response.data["primary_hex"] == "#ABCDEF"


# ===================================
# FALLBACK (hex inválido / ausente / excepción)
# ===================================


@pytest.mark.django_db
class TestSuggestColorsFallback:
    def test_invalid_hex_falls_back_to_sector_primary(self, auth_admin_client, patched_client):
        patched_client({"primary_hex": "not-a-color", "rationale": "x"})
        response = auth_admin_client.post(URL, _payload(industry_key="beauty"), format="json")
        assert response.status_code == 200
        # Primario curado para beauty (ver _FALLBACK_SECTOR_PRIMARIES).
        assert response.data["primary_hex"] == "#C2589A"

    def test_missing_hex_falls_back(self, auth_admin_client, patched_client):
        patched_client({"rationale": "sin color"})
        response = auth_admin_client.post(URL, _payload(industry_key="restaurant"), format="json")
        assert response.status_code == 200
        assert response.data["primary_hex"] == "#B91C1C"

    def test_malformed_json_falls_back(self, auth_admin_client, patched_client):
        patched_client("esto no es json {{{")
        response = auth_admin_client.post(URL, _payload(industry_key="generic"), format="json")
        assert response.status_code == 200
        assert response.data["primary_hex"] == "#1C3B57"

    def test_unknown_sector_uses_global_default(self, auth_admin_client, patched_client):
        patched_client({"primary_hex": "zzz"})
        response = auth_admin_client.post(URL, _payload(industry_key="sector-inexistente"), format="json")
        assert response.status_code == 200
        assert response.data["primary_hex"] == "#1C3B57"

    def test_ai_exception_falls_back(self, auth_admin_client):
        """Si la API lanza una excepción, se devuelve 200 con primario curado."""
        client = MagicMock()
        client.messages.create.side_effect = RuntimeError("API boom")
        with patch("websites.services.ai_service.AIService._get_client", return_value=client):
            response = auth_admin_client.post(URL, _payload(industry_key="fitness"), format="json")
        assert response.status_code == 200
        assert response.data["primary_hex"] == "#EA580C"


# ===================================
# SIN API KEY (mock path)
# ===================================


@pytest.mark.django_db
class TestSuggestColorsNoApiKey:
    def test_no_api_key_returns_sector_primary(self, auth_admin_client):
        with patch("websites.services.ai_service.AIService._get_client", return_value=None):
            response = auth_admin_client.post(URL, _payload(industry_key="health"), format="json")
        assert response.status_code == 200
        assert response.data["primary_hex"] == "#2563EB"
        assert response.data["rationale"]


# ===================================
# VALIDACIÓN DE ENTRADA
# ===================================


@pytest.mark.django_db
class TestSuggestColorsValidation:
    def test_missing_description_returns_400(self, auth_admin_client, patched_client):
        response = auth_admin_client.post(URL, {"industry_key": "beauty"}, format="json")
        assert response.status_code == 400

    def test_blank_description_returns_400(self, auth_admin_client, patched_client):
        response = auth_admin_client.post(URL, _payload(business_description=""), format="json")
        assert response.status_code == 400

    def test_over_cap_description_returns_400(self, auth_admin_client, patched_client):
        response = auth_admin_client.post(
            URL, _payload(business_description="x" * 1001), format="json"
        )
        assert response.status_code == 400

    def test_optional_fields_can_be_omitted(self, auth_admin_client, patched_client):
        response = auth_admin_client.post(
            URL, {"business_description": "Una tienda de ropa."}, format="json"
        )
        assert response.status_code == 200


# ===================================
# LOGGING + AISLAMIENTO CROSS-TENANT
# ===================================


@pytest.mark.django_db
class TestSuggestColorsLogging:
    def test_logs_generation_tenant_scoped(self, auth_admin_client, patched_client, tenant):
        auth_admin_client.post(URL, _payload(), format="json")
        log = AIGenerationLog.objects.filter(tenant=tenant, generation_type="suggest_colors").first()
        assert log is not None
        assert log.is_successful is True
        assert log.tokens_input == 90
        assert log.tokens_output == 20

    def test_cross_tenant_isolation(self, auth_admin_client, patched_client, tenant, second_tenant):
        """El log se asocia al tenant que hizo la request, no al otro."""
        auth_admin_client.post(URL, _payload(), format="json")
        assert AIGenerationLog.objects.filter(
            tenant=tenant, generation_type="suggest_colors"
        ).exists()
        assert not AIGenerationLog.objects.filter(
            tenant=second_tenant, generation_type="suggest_colors"
        ).exists()


# ===================================
# SERVICIO: CONFIG ACTIVA + FALLBACK A SETTINGS
# ===================================


@pytest.mark.django_db
class TestSuggestColorsServiceConfig:
    def test_reads_active_model_config(self):
        from websites.services.ai_service import AIService

        config = AIService().get_model_for_task("suggest_colors")
        row = AIModelConfig.objects.get(task="suggest_colors")
        assert config["model"] == row.model
        assert config["max_tokens"] == row.max_tokens
        assert config["temperature"] == float(row.temperature)

    def test_falls_back_to_settings_when_no_active_row(self, settings):
        from websites.services.ai_service import AIService

        AIModelConfig.objects.filter(task="suggest_colors").update(is_active=False)
        ai_service_module._MODEL_CONFIG_CACHE.clear()

        settings.ANTHROPIC_MODEL = "settings-default-model"
        config = AIService().get_model_for_task("suggest_colors")
        assert config["model"] == "settings-default-model"


# ===================================
# MIGRACIÓN: SEED IDEMPOTENTE
# ===================================


@pytest.mark.django_db
class TestSuggestColorsSeed:
    def test_seed_row_present(self):
        row = AIModelConfig.objects.get(task="suggest_colors")
        assert row.model == "claude-haiku-4-5-20251001"
        assert row.max_tokens == 256
        assert float(row.temperature) == pytest.approx(0.7)
        assert row.is_active is True

    def test_seed_is_idempotent(self):
        """Re-ejecutar la lógica de seed no duplica ni rompe la fila existente."""
        import importlib

        from django.apps import apps as django_apps

        seed_mod = importlib.import_module(
            "websites.migrations.0029_seed_suggest_colors_config"
        )
        before = AIModelConfig.objects.filter(task="suggest_colors").count()
        seed_mod.seed_suggest_colors_config(django_apps, None)
        after = AIModelConfig.objects.filter(task="suggest_colors").count()
        assert before == after == 1

    def test_only_one_row_per_task(self):
        assert AIModelConfig.objects.filter(task="suggest_colors").count() == 1
