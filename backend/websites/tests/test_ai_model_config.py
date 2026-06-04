"""Tests para AIService.get_model_for_task (issue-262).

Verifican que el servicio resuelve el modelo + parámetros por tarea desde
``AIModelConfig`` (sembrado por la migración 0021) y cae a los defaults de
settings cuando no hay fila. También cubre el cálculo de costo por modelo vía
``ai_pricing.MODEL_PRICING``.
"""

from decimal import Decimal

import pytest

from websites.models import AIModelConfig
from websites.services import ai_service as ai_service_module
from websites.services.ai_pricing import calculate_cost
from websites.services.ai_service import AIService


@pytest.fixture(autouse=True)
def _clear_model_cache():
    """El cache de configuración de modelo es a nivel de módulo (TTL 60s).

    Se limpia antes y después de cada test para que no haya filtración de
    configuración entre tests.
    """
    ai_service_module._MODEL_CONFIG_CACHE.clear()
    yield
    ai_service_module._MODEL_CONFIG_CACHE.clear()


@pytest.mark.django_db
class TestGetModelForTask:
    def test_reads_seeded_row_for_classify(self):
        config = AIService().get_model_for_task("classify_industry")
        row = AIModelConfig.objects.get(task="classify_industry")
        assert config["model"] == row.model
        assert config["max_tokens"] == row.max_tokens
        assert config["temperature"] == float(row.temperature)

    def test_web_content_returns_sonnet_row(self):
        config = AIService().get_model_for_task("web_content")
        assert "sonnet" in config["model"].lower()
        assert config["max_tokens"] == 4096

    def test_settings_fallback_when_row_absent(self, settings):
        """Sin fila para la tarea (inactiva), cae al modelo de settings."""
        AIModelConfig.objects.filter(task="seo").update(is_active=False)
        ai_service_module._MODEL_CONFIG_CACHE.clear()

        settings.ANTHROPIC_MODEL = "settings-default-model"
        config = AIService().get_model_for_task("seo")
        assert config["model"] == "settings-default-model"

    def test_web_content_fallback_prefers_initial_model(self, settings):
        """web_content cae a ANTHROPIC_MODEL_INITIAL (Sonnet) si no hay fila."""
        AIModelConfig.objects.filter(task="web_content").delete()
        ai_service_module._MODEL_CONFIG_CACHE.clear()

        settings.ANTHROPIC_MODEL_INITIAL = "sonnet-initial"
        settings.ANTHROPIC_MODEL = "haiku-default"
        config = AIService().get_model_for_task("web_content")
        assert config["model"] == "sonnet-initial"

    def test_cache_returns_same_config(self):
        """Una segunda llamada devuelve la config cacheada (mismo contenido)."""
        first = AIService().get_model_for_task("chat_edit")
        # Modificar la DB no debe afectar mientras el cache esté caliente.
        AIModelConfig.objects.filter(task="chat_edit").update(model="changed-model")
        second = AIService().get_model_for_task("chat_edit")
        assert second == first


@pytest.mark.django_db
class TestPerModelCost:
    def test_haiku_cheaper_than_sonnet(self):
        haiku = calculate_cost(1_000_000, 1_000_000, model="claude-3-haiku-20240307")
        sonnet = calculate_cost(1_000_000, 1_000_000, model="claude-sonnet-4-6")
        assert haiku < sonnet

    def test_known_model_uses_pricing_table(self):
        # Haiku: 0.25 input + 1.25 output USD por 1M tokens, * 4200 COP.
        cost = calculate_cost(1_000_000, 1_000_000, model="claude-3-haiku-20240307")
        expected = (Decimal("0.25") + Decimal("1.25")) * Decimal("4200")
        assert cost == expected.quantize(Decimal("0.01"))
