# backend/websites/views/classify.py
"""View para clasificar la industria de un negocio con IA (Haiku).

Durante el onboarding, el usuario describe su negocio en texto libre. Esta
view le pide a Haiku que decida si la descripción encaja con una industria ya
existente (activa) o si conviene proponer una nueva. Las industrias propuestas
por la IA quedan en estado `proposed_by_model` para revisión de un admin.
"""

import json
import logging

from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..models import Industry, IndustryClassification
from ..serializers import ClassifyIndustrySerializer, ConfirmClassificationSerializer
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
        "Clasificas el negocio descrito en UNA industria de la lista provista, "
        "o propones una nueva si ninguna aplica. Responde SOLO JSON, sin texto extra:\n"
        '- Encaja: {"match": true, "industry_key": "<key_exacta>", "confidence": <0-1>}\n'
        '- No encaja: {"match": false, "new_label": "<nombre corto en español>", "confidence": <0-1>}\n'
        "industry_key debe ser una key literal de la lista. confidence es tu certeza 0-1."
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
        normalized = _normalize(business_description)[:255]

        active_industries = list(Industry.objects.filter(is_active=True).order_by("sort_order", "label"))

        # 1. Caché: ¿ya tenemos una clasificación confirmada por un humano para
        # esta misma descripción? Si sí, la reusamos sin gastar tokens.
        cached_industry = self._check_cache(normalized, active_industries)
        if cached_industry is not None:
            record = self._record(
                tenant,
                business_description,
                selected_modules,
                normalized,
                cached_industry.key,
                cached_industry.label,
                1.0,
                is_new=False,
                source="cache",
            )
            return self._build_response(record, cached_industry, 1.0, is_new=False)

        ai_service = AIService(tenant=tenant)

        # Sin API key: clasificación mock determinista para no bloquear el onboarding.
        if not ai_service.client:
            return self._mock_classify(tenant, business_description, selected_modules, normalized, active_industries)

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
            ai_service.log_generation(
                generation_type="classify_industry",
                tokens_input=0,
                tokens_output=0,
                is_successful=False,
                error_message=f"Anthropic no disponible: {e}",
                full_prompt=full_prompt,
                raw_response="",
            )
            return self._mock_classify(tenant, business_description, selected_modules, normalized, active_industries)

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
            return self._mock_classify(tenant, business_description, selected_modules, normalized, active_industries)

        industry, is_new, confidence = self._resolve_industry(result, active_industries)

        ai_service.log_generation(
            generation_type="classify_industry",
            tokens_input=tokens_in,
            tokens_output=tokens_out,
            is_successful=True,
            full_prompt=full_prompt,
            raw_response=raw_response,
        )

        record = self._record(
            tenant,
            business_description,
            selected_modules,
            normalized,
            industry.key,
            industry.label,
            confidence,
            is_new=is_new,
            source="haiku",
            model_used=model_config["model"],
            tokens_in=tokens_in,
            tokens_out=tokens_out,
        )

        return self._build_response(record, industry, confidence, is_new)

    # ───────────────────────────────────────────────────────────────────
    # Dataset propio / caché
    # ───────────────────────────────────────────────────────────────────

    def _check_cache(self, normalized: str, active_industries: list) -> Industry | None:
        """Busca una clasificación confirmada por un humano para la misma
        descripción normalizada. Devuelve la Industry (aún activa) o None.

        Esto es lo que permite resolver clasificaciones repetidas sin gastar
        tokens: el ground truth previo se reutiliza.
        """
        if not normalized:
            return None
        record = (
            IndustryClassification.objects.filter(description_normalized=normalized, user_action="confirmed")
            .exclude(final_key="")
            .order_by("-confirmed_at", "-created_at")
            .first()
        )
        if not record:
            return None
        # Solo sirve si la industria final sigue activa.
        return next((i for i in active_industries if i.key == record.final_key), None)

    def _record(
        self,
        tenant,
        description: str,
        modules: list,
        normalized: str,
        predicted_key: str,
        predicted_label: str,
        confidence: float,
        *,
        is_new: bool,
        source: str,
        model_used: str = "",
        tokens_in: int = 0,
        tokens_out: int = 0,
    ) -> IndustryClassification:
        """Crea el registro etiquetado (input + predicción). El feedback humano
        se completa luego vía el endpoint de confirmación."""
        return IndustryClassification.objects.create(
            tenant=tenant,
            business_description=description,
            selected_modules=modules,
            description_normalized=normalized,
            predicted_key=predicted_key,
            predicted_label=predicted_label,
            predicted_confidence=confidence,
            is_new=is_new,
            source=source,
            model_used=model_used,
            tokens_input=tokens_in,
            tokens_output=tokens_out,
        )

    def _build_response(
        self, record: IndustryClassification, industry: Industry, confidence: float, is_new: bool
    ) -> Response:
        return Response(
            {
                "classification_id": record.id,
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
            # La key ya existe. Si pertenece a la MISMA industria (mismo label
            # normalizado), la reutilizamos en vez de crear una variante: esto
            # deduplica requests concurrentes idénticos que crearon la fila
            # entre nuestro snapshot de active_industries y este punto.
            if _normalize(industry.label) == normalized:
                return industry, False, confidence
            # Key tomada por OTRA industria: probamos la siguiente variante.
            key = f"{base_key}-{suffix}"
            suffix += 1

    def _clamp_confidence(self, value) -> float:
        """Convierte confidence a float en [0, 1]; 0.0 si es inválido."""
        try:
            conf = float(value)
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, conf))

    def _mock_classify(
        self,
        tenant,
        description: str,
        modules: list,
        normalized: str,
        active_industries: list,
    ) -> Response:
        """Clasificación determinista sin API key (onboarding sin IA)."""
        generic = next((i for i in active_industries if i.key == "generic"), None)
        if not generic:
            generic, _ = Industry.objects.get_or_create(
                key="generic",
                defaults={"label": "Negocio General", "status": "reviewed", "is_active": True},
            )
        record = self._record(
            tenant,
            description,
            modules,
            normalized,
            generic.key,
            generic.label,
            0.0,
            is_new=False,
            source="mock",
        )
        return self._build_response(record, generic, 0.0, is_new=False)


class ConfirmClassificationView(APIView):
    """
    POST /api/websites/classify-industry/<id>/confirm/

    Registra el feedback humano sobre una clasificación previa. Esto completa
    el dataset etiquetado: ``confirmed`` marca el ground truth (alimenta la
    caché); ``corrected`` marca la predicción como rechazada.

    Body:
        - action: "confirmed" | "corrected"
        - final_key: industria aceptada (opcional; default = la predicha al confirmar)
        - correction_text: texto libre del usuario al corregir (opcional)
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
        if not tenant:
            return Response(
                {"error": "Usuario no asociado a un tenant"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Aislamiento por tenant: un tenant solo confirma sus propias clasificaciones.
        try:
            record = IndustryClassification.objects.get(pk=pk, tenant=tenant)
        except IndustryClassification.DoesNotExist:
            return Response(
                {"error": "Clasificación no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ConfirmClassificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]
        final_key = serializer.validated_data.get("final_key", "").strip()
        correction_text = serializer.validated_data.get("correction_text", "").strip()

        if action == "confirmed":
            # Si no mandan final_key, el ground truth es la industria predicha.
            key = final_key or record.predicted_key
            industry = Industry.objects.filter(key=key).first()
            record.final_key = key
            record.final_label = industry.label if industry else record.predicted_label
            record.user_action = "confirmed"
        else:  # corrected
            record.user_action = "corrected"
            record.correction_text = correction_text
            if final_key:
                industry = Industry.objects.filter(key=final_key).first()
                record.final_key = final_key
                record.final_label = industry.label if industry else ""

        record.confirmed_at = timezone.now()
        record.save(
            update_fields=[
                "user_action",
                "final_key",
                "final_label",
                "correction_text",
                "confirmed_at",
            ]
        )

        return Response(
            {
                "id": record.id,
                "user_action": record.user_action,
                "final_key": record.final_key,
                "final_label": record.final_label,
            }
        )
