"""Tests del endpoint POST /api/websites/classify-industry/ (issue-262).

Cubre los escenarios de aceptación:
- happy path (match -> industria existente).
- no-match -> crea Industry(created_by_ai=True, status=proposed_by_model,
  is_active=True), is_new=True.
- dedup (descripción equivalente no crea duplicados).
- auth (401 sin autenticación; funciona para usuario autenticado del tenant).
- logging (fila AIGenerationLog con generation_type=classify_industry).
- sin API key -> mock determinista que devuelve generic.
- rate-limit (ScopedRateThrottle 10/hour -> 429 tras el límite).

La IA se mockea — no se hacen llamadas de red reales.
"""

import json
from unittest.mock import MagicMock, patch

import pytest
from django.urls import reverse

from websites.models import AIGenerationLog, Industry

URL = "/api/websites/classify-industry/"


def _fake_anthropic_response(payload: dict, tokens_in: int = 120, tokens_out: int = 30):
    """Construye un objeto que imita la respuesta de anthropic messages.create."""
    response = MagicMock()
    block = MagicMock()
    block.text = json.dumps(payload)
    response.content = [block]
    response.usage.input_tokens = tokens_in
    response.usage.output_tokens = tokens_out
    return response


def _fake_client(payload: dict):
    """Cliente anthropic mock cuyo messages.create devuelve `payload` como JSON."""
    client = MagicMock()
    client.messages.create.return_value = _fake_anthropic_response(payload)
    return client


@pytest.fixture()
def patched_client():
    """Parchea AIService._get_client para inyectar un cliente mock.

    Devuelve un setter que configura el payload JSON que la IA "responde".
    """
    with patch("websites.services.ai_service.AIService._get_client") as mock_get:
        holder = {"client": None}

        def _set(payload: dict):
            client = _fake_client(payload)
            holder["client"] = client
            mock_get.return_value = client
            return client

        # Por defecto: match a generic.
        _set({"match": True, "industry_key": "generic", "confidence": 0.5})
        yield _set


@pytest.mark.django_db
class TestClassifyIndustryAuth:
    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.post(URL, {"business_description": "Un salón"}, format="json")
        assert response.status_code == 401

    def test_authenticated_tenant_user_ok(self, auth_admin_client, patched_client):
        patched_client({"match": True, "industry_key": "beauty", "confidence": 0.9})
        response = auth_admin_client.post(URL, {"business_description": "Un salón de belleza"}, format="json")
        assert response.status_code == 200
        assert response.data["industry_key"] == "beauty"

    def test_url_name_resolves(self):
        assert reverse("classify-industry") == URL


@pytest.mark.django_db
class TestClassifyIndustryMatch:
    def test_happy_path_returns_existing_industry(self, auth_admin_client, patched_client):
        patched_client({"match": True, "industry_key": "restaurant", "confidence": 0.95})
        before = Industry.objects.count()

        response = auth_admin_client.post(URL, {"business_description": "Restaurante italiano"}, format="json")

        assert response.status_code == 200
        assert response.data["industry_key"] == "restaurant"
        assert response.data["is_new"] is False
        assert response.data["confidence"] == pytest.approx(0.95)
        assert Industry.objects.count() == before  # no se creó nada

    def test_match_with_unknown_key_falls_through_to_new(self, auth_admin_client, patched_client):
        """Si la IA dice match pero la key no existe, se trata como no-match."""
        patched_client({"match": True, "industry_key": "no-existe-xyz", "new_label": "Floristería", "confidence": 0.6})
        response = auth_admin_client.post(URL, {"business_description": "Vendemos flores"}, format="json")
        assert response.status_code == 200
        assert response.data["is_new"] is True


@pytest.mark.django_db
class TestClassifyIndustryNoMatch:
    def test_creates_proposed_industry(self, auth_admin_client, patched_client):
        patched_client({"match": False, "new_label": "Floristería Artesanal", "confidence": 0.7})

        response = auth_admin_client.post(URL, {"business_description": "Arreglos florales a medida"}, format="json")

        assert response.status_code == 200
        assert response.data["is_new"] is True
        key = response.data["industry_key"]
        created = Industry.objects.get(key=key)
        assert created.created_by_ai is True
        assert created.status == "proposed_by_model"
        assert created.is_active is True
        assert created.label == "Floristería Artesanal"

    def test_dedup_equivalent_label_no_duplicate(self, auth_admin_client, patched_client):
        """Una etiqueta equivalente (acentos/case) reusa la industria existente."""
        Industry.objects.create(key="floristeria", label="Floristería", status="reviewed", is_active=True)
        before = Industry.objects.count()

        patched_client({"match": False, "new_label": "FLORISTERIA", "confidence": 0.8})
        response = auth_admin_client.post(URL, {"business_description": "Flores"}, format="json")

        assert response.status_code == 200
        assert response.data["is_new"] is False
        assert response.data["industry_key"] == "floristeria"
        assert Industry.objects.count() == before  # no duplicó

    def test_repeated_request_does_not_create_duplicate(self, auth_admin_client, patched_client):
        patched_client({"match": False, "new_label": "Heladería Premium", "confidence": 0.7})

        first = auth_admin_client.post(URL, {"business_description": "Helados"}, format="json")
        assert first.data["is_new"] is True
        count_after_first = Industry.objects.count()

        second = auth_admin_client.post(URL, {"business_description": "Helados"}, format="json")
        assert second.data["is_new"] is False
        assert Industry.objects.count() == count_after_first


@pytest.mark.django_db
class TestClassifyIndustryLogging:
    def test_logs_generation(self, auth_admin_client, patched_client, tenant):
        patched_client({"match": True, "industry_key": "beauty", "confidence": 0.9})

        auth_admin_client.post(URL, {"business_description": "Salón"}, format="json")

        log = AIGenerationLog.objects.filter(tenant=tenant, generation_type="classify_industry").first()
        assert log is not None
        assert log.is_successful is True
        assert log.tokens_input == 120
        assert log.tokens_output == 30


@pytest.mark.django_db
class TestClassifyIndustryNoApiKey:
    def test_mock_path_returns_generic(self, auth_admin_client):
        """Sin API key, el cliente es None -> clasificación mock determinista."""
        with patch("websites.services.ai_service.AIService._get_client", return_value=None):
            response = auth_admin_client.post(URL, {"business_description": "Cualquier negocio"}, format="json")
        assert response.status_code == 200
        assert response.data["industry_key"] == "generic"
        assert response.data["is_new"] is False
        assert response.data["confidence"] == 0.0


@pytest.mark.django_db
class TestClassifyIndustryRateLimit:
    def test_throttle_429_after_limit(self, auth_admin_client, patched_client):
        """ScopedRateThrottle 10/hour -> el 11º request devuelve 429.

        ``SimpleRateThrottle.THROTTLE_RATES`` se enlaza a
        ``api_settings.DEFAULT_THROTTLE_RATES`` en tiempo de definición de la
        clase, por lo que sobreescribir ``settings.REST_FRAMEWORK`` no afecta a
        la clase ya importada. Se parchea el atributo de clase directamente.
        """
        from django.core.cache import caches
        from rest_framework.throttling import ScopedRateThrottle

        rates = {**ScopedRateThrottle.THROTTLE_RATES, "classify_industry": "10/hour"}

        try:
            caches["default"].clear()
        except Exception:
            pass

        patched_client({"match": True, "industry_key": "beauty", "confidence": 0.9})

        with patch.object(ScopedRateThrottle, "THROTTLE_RATES", rates):
            statuses = []
            for _ in range(11):
                resp = auth_admin_client.post(URL, {"business_description": "Salón"}, format="json")
                statuses.append(resp.status_code)

        assert statuses[:10] == [200] * 10
        assert statuses[10] == 429
