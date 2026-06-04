# backend/websites/views/classify.py
"""View para clasificar la industria de un negocio con IA (Haiku).

Durante el onboarding, el usuario describe su negocio en texto libre. Esta
view le pide a Haiku que decida si la descripción encaja con una industria ya
existente (activa) o si conviene proponer una nueva. Las industrias propuestas
por la IA quedan en estado `proposed_by_model` para revisión de un admin.
"""

import json
import logging

from django.utils.text import slugify
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..models import Industry
from ..serializers import ClassifyIndustrySerializer
from ..services import AIService

logger = logging.getLogger(__name__)


def _normalize(value: str) -> str:
    """Normaliza una etiqueta para deduplicar industrias.

    Usa slugify (minúsculas, sin acentos, guiones) de modo que 'Cafetería' y
    'cafeteria' colapsen a la misma clave.
    """
    return slugify(value or "").strip()


def _strip_json_fences(text: str) -> str:
    """Quita fences ```json ... ``` de la respuesta de la IA (igual que AIService)."""
    json_text = text.strip()
    if json_text.startswith("```json"):
        json_text = json_text[7:]
    if json_text.startswith("```"):
        json_text = json_text[3:]
    if json_text.endswith("```"):
        json_text = json_text[:-3]
    return json_text.strip()


class ClassifyIndustryView(APIView):
    """
    POST /api/websites/classify-industry/

    Body:
        - business_description (str, requerido)
        - selected_modules (list[str], opcional)

    Respuesta:
        {"industry_key", "industry_label", "confidence", "is_new"}
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "classify_industry"

    SYSTEM_PROMPT = (
        "Eres un clasificador de industrias para una plataforma de sitios web. "
        "Recibes la descripción de un negocio y una lista de industrias disponibles. "
        "Tu tarea es decidir si el negocio encaja con UNA de las industrias de la "
        "lista o si ninguna aplica y hay que proponer una nueva.\n\n"
        "Responde SIEMPRE en JSON estricto, sin texto adicional, con uno de estos "
        "dos formatos:\n"
        '- Si encaja: {"match": true, "industry_key": "<key_exacta_de_la_lista>", '
        '"confidence": <0-1>}\n'
        '- Si NO encaja ninguna: {"match": false, "new_label": "<nombre corto de la '
        'industria propuesta>", "confidence": <0-1>}\n\n'
        "Reglas:\n"
        "- industry_key DEBE ser exactamente una de las keys de la lista.\n"
        "- new_label debe ser un nombre legible y corto en español (ej: 'Floristería').\n"
        "- confidence es tu certeza entre 0 y 1."
    )

    def post(self, request):
        tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ClassifyIndustrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        business_description = serializer.validated_data["business_description"]
        selected_modules = serializer.validated_data.get("selected_modules", [])

        active_industries = list(Industry.objects.filter(is_active=True).order_by("sort_order", "label"))

        ai_service = AIService(tenant=tenant)

        # Sin API key: clasificación mock determinista para no bloquear el onboarding.
        if not ai_service.client:
            return self._mock_classify(active_industries)

        model_config = ai_service.get_model_for_task("classify_industry")
        full_prompt, user_prompt = self._build_prompts(business_description, selected_modules, active_industries)

        try:
            response = ai_service.client.messages.create(
                model=model_config["model"],
                max_tokens=min(model_config["max_tokens"], 512),
                temperature=model_config["temperature"],
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            )
            raw_response = response.content[0].text
            tokens_in = response.usage.input_tokens
            tokens_out = response.usage.output_tokens
            ai_service._last_model_used = model_config["model"]
        except Exception as e:
            logger.error("Error llamando a Claude para classify-industry: %s", e)
            return self._mock_classify(active_industries)

        try:
            result = json.loads(_strip_json_fences(raw_response))
        except json.JSONDecodeError as e:
            logger.error("Error parseando JSON de classify-industry: %s", e)
            ai_service.log_generation(
                generation_type="classify_industry",
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                is_successful=False,
                error_message=f"JSON inválido: {e}",
                full_prompt=full_prompt,
                raw_response=raw_response,
            )
            return self._mock_classify(active_industries)

        industry, is_new, confidence = self._resolve_industry(result, active_industries)

        ai_service.log_generation(
            generation_type="classify_industry",
            tokens_input=tokens_in,
            tokens_output=tokens_out,
            is_successful=True,
            full_prompt=full_prompt,
            raw_response=raw_response,
        )

        return Response(
            {
                "industry_key": industry.key,
                "industry_label": industry.label,
                "confidence": confidence,
                "is_new": is_new,
            }
        )

    # ───────────────────────────────────────────────────────────────────
    # Helpers
    # ───────────────────────────────────────────────────────────────────

    def _build_prompts(
        self, business_description: str, selected_modules: list[str], active_industries: list
    ) -> tuple[str, str]:
        """Construye (full_prompt, user_prompt). full_prompt se loggea."""
        industries_list = "\n".join(f"- {i.key}: {i.label}" for i in active_industries)
        modules_line = ", ".join(selected_modules) if selected_modules else "ninguno"

        user_prompt = (
            f"## Descripción del negocio\n{business_description}\n\n"
            f"## Módulos seleccionados\n{modules_line}\n\n"
            f"## Industrias disponibles\n{industries_list}\n\n"
            "Clasifica el negocio según las reglas. Responde SOLO con el JSON."
        )
        full_prompt = f"=== SYSTEM PROMPT ===\n{self.SYSTEM_PROMPT}\n\n=== USER PROMPT ===\n{user_prompt}"
        return full_prompt, user_prompt

    def _resolve_industry(self, result: dict, active_industries: list) -> tuple[Industry, bool, float]:
        """Resuelve la respuesta de la IA a una Industry concreta.

        Returns:
            (industry, is_new, confidence)
        """
        confidence = self._clamp_confidence(result.get("confidence"))

        if result.get("match"):
            key = result.get("industry_key") or ""
            existing = next((i for i in active_industries if i.key == key), None)
            if existing:
                return existing, False, confidence
            # La IA dijo match pero la key no existe -> tratar como no-match.

        new_label = (result.get("new_label") or "").strip()
        if not new_label:
            # Sin etiqueta utilizable -> fallback a 'generic' si existe.
            generic = next((i for i in active_industries if i.key == "generic"), None)
            if generic:
                return generic, False, confidence
            generic, _ = Industry.objects.get_or_create(
                key="generic",
                defaults={"label": "Negocio General", "status": "reviewed", "is_active": True},
            )
            return generic, False, confidence

        return self._get_or_create_industry(new_label, active_industries, confidence)

    def _get_or_create_industry(
        self, new_label: str, active_industries: list, confidence: float
    ) -> tuple[Industry, bool, float]:
        """Deduplica por clave normalizada; crea la industria si no existe."""
        normalized = _normalize(new_label)

        # Dedup contra industrias activas por key o label normalizados.
        for industry in active_industries:
            if _normalize(industry.key) == normalized or _normalize(industry.label) == normalized:
                return industry, False, confidence

        # Crear de forma atómica, generando una key única si colisiona con
        # industrias existentes (incluidas inactivas). get_or_create evita la
        # ventana de carrera entre la verificación y la creación.
        base_key = normalized or "industria"
        key = base_key
        suffix = 2
        defaults = {
            "label": new_label,
            "created_by_ai": True,
            "status": "proposed_by_model",
            "is_active": True,
        }
        while True:
            industry, created = Industry.objects.get_or_create(key=key, defaults=defaults)
            if created:
                return industry, True, confidence
            key = f"{base_key}-{suffix}"
            suffix += 1

    def _clamp_confidence(self, value) -> float:
        """Convierte confidence a float en [0, 1]; 0.0 si es inválido."""
        try:
            conf = float(value)
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, conf))

    def _mock_classify(self, active_industries: list) -> Response:
        """Clasificación determinista sin API key (onboarding sin IA)."""
        generic = next((i for i in active_industries if i.key == "generic"), None)
        if not generic:
            generic, _ = Industry.objects.get_or_create(
                key="generic",
                defaults={"label": "Negocio General", "status": "reviewed", "is_active": True},
            )
        return Response(
            {
                "industry_key": generic.key,
                "industry_label": generic.label,
                "confidence": 0.0,
                "is_new": False,
            }
        )
