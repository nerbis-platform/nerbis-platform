# backend/websites/services/ai_pricing.py
"""
Pricing de modelos de IA y cálculo de costos de generación.
"""

from decimal import Decimal

from django.conf import settings

# Precios por modelo (USD por 1M tokens). Usados por calculate_cost cuando se
# generan sitios con un modelo distinto al configurado por defecto en settings.
# Si el modelo no está aquí, se usa el precio de settings.ANTHROPIC_PRICE_*.
MODEL_PRICING: dict[str, tuple[str, str]] = {
    # (input, output)
    "claude-sonnet-4-6": ("3.00", "15.00"),
    "claude-sonnet-4-5": ("3.00", "15.00"),
    "claude-haiku-4-5-20251001": ("1.00", "5.00"),
    "claude-3-haiku-20240307": ("0.25", "1.25"),
}


def calculate_cost(tokens_input: int, tokens_output: int, model: str | None = None) -> Decimal:
    """
    Calcula el costo estimado en COP.

    Args:
        tokens_input: Tokens de entrada
        tokens_output: Tokens de salida
        model: Modelo usado (si se pasa y está en MODEL_PRICING, se usa su
            tarifa; si no, cae a settings.ANTHROPIC_PRICE_*).

    Returns:
        Costo estimado en COP
    """
    # Resolver precio por modelo si aplica
    price_input_str = settings.ANTHROPIC_PRICE_INPUT
    price_output_str = settings.ANTHROPIC_PRICE_OUTPUT
    if model and model in MODEL_PRICING:
        price_input_str, price_output_str = MODEL_PRICING[model]

    price_input = Decimal(price_input_str)
    price_output = Decimal(price_output_str)
    cost_input = (Decimal(tokens_input) / 1_000_000) * price_input
    cost_output = (Decimal(tokens_output) / 1_000_000) * price_output
    cost_usd = cost_input + cost_output

    # Convertir a COP (tasa aproximada)
    usd_to_cop = Decimal("4200")  # TODO: Obtener tasa actual
    cost_cop = cost_usd * usd_to_cop

    return cost_cop.quantize(Decimal("0.01"))
