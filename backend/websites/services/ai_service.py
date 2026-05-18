# backend/websites/services/ai_service.py
"""
Servicio de IA para generación de contenido del Website Builder.

Integra con Claude (Anthropic) para:
- Generar contenido inicial del sitio
- Chat interactivo para ediciones
- Regenerar secciones específicas
- Optimización SEO
"""

import json
import logging
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


# ───────────────────────────────────────────────────────────────────────────
# Reglas de validacion de contenido generado por IA
#
# Las frases prohibidas viven por industria. Fuente de verdad por vertical:
# backend/websites/design-references/<industria>.md
# ───────────────────────────────────────────────────────────────────────────

# Minimo de palabras aceptable para la descripcion de un servicio.
# Menos que esto se considera generico ("Servicio 1 -- Descripcion del servicio").
MIN_SERVICE_DESCRIPTION_WORDS = 15

# CTAs genericos prohibidos en cualquier vertical.
FORBIDDEN_CTA_PHRASES = [
    "saber más",
    "descubre más",
    "conoce más",
]

# Frases prohibidas por industria (se comparan en minusculas, coincidencia parcial).
# Para wellness ver: backend/websites/design-references/wellness.md §5.
FORBIDDEN_PHRASES_BY_INDUSTRY: dict[str, list[str]] = {
    "beauty": [
        "tu belleza, nuestra pasión",
        "tu belleza es importante para nosotros",
        "bienvenido a nuestro centro",
        "bienvenida a nuestro centro",
        "con más de",  # matches "con más de X años de experiencia"
        "somos especialistas en",
        "la mejor opción para ti",
        "cuidado premium",
        "servicio premium",
        "experiencia única",
        "atención personalizada",
        "ofrecemos bienestar",
        "brindamos bienestar",
        "transformamos tu belleza",
        "descubre la diferencia",
        "te invitamos a conocer",
    ],
}

# Precios por modelo (USD por 1M tokens). Usados por calculate_cost cuando se
# generan sitios con un modelo distinto al configurado por defecto en settings.
# Si el modelo no esta aqui, se usa el precio de settings.ANTHROPIC_PRICE_*.
MODEL_PRICING: dict[str, tuple[str, str]] = {
    # (input, output)
    "claude-sonnet-4-6": ("3.00", "15.00"),
    "claude-sonnet-4-5": ("3.00", "15.00"),
    "claude-haiku-4-5-20251001": ("1.00", "5.00"),
    "claude-3-haiku-20240307": ("0.25", "1.25"),
}


class AIService:
    """
    Servicio para interactuar con la API de Claude.

    Maneja la generación de contenido, chat y tracking de uso.
    """

    def __init__(self, tenant=None, website_config=None):
        """
        Inicializa el servicio.

        Args:
            tenant: Tenant que usa el servicio (para tracking)
            website_config: Configuración del sitio web
        """
        self.tenant = tenant
        self.website_config = website_config
        self.client = self._get_client()
        # Modelo realmente usado en la ultima llamada a la API (puede diferir de
        # settings.ANTHROPIC_MODEL cuando se usa ANTHROPIC_MODEL_INITIAL). Lo
        # consume log_generation para calcular el costo y registrar el modelo.
        self._last_model_used: str | None = None

    def _get_client(self):
        """Obtiene el cliente de Anthropic."""
        try:
            import anthropic

            api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
            if not api_key:
                logger.warning("ANTHROPIC_API_KEY no configurada")
                return None
            return anthropic.Anthropic(api_key=api_key)
        except ImportError:
            logger.error("anthropic package no instalado. Ejecutar: pip install anthropic")
            return None

    def _build_system_prompt(self, template, onboarding_responses: dict) -> str:
        """
        Construye el prompt del sistema basado en el template y respuestas.

        Args:
            template: WebsiteTemplate seleccionado
            onboarding_responses: dict de respuestas del onboarding

        Returns:
            String con el prompt del sistema
        """
        # Prompt base del template (si existe)
        template_prompt = template.ai_system_prompt if template else ""

        # Construir contexto del negocio desde las respuestas
        business_context = self._format_business_context(onboarding_responses)

        # Configuracion visual del template (paleta + tipografia). Ayuda a que
        # el copy armonice con la identidad visual.
        visual_context = self._format_visual_config(template, onboarding_responses)

        system_prompt = f"""Eres un experto en crear contenido para sitios web de negocios.
Tu objetivo es generar contenido profesional, atractivo y personalizado.

## Información del Negocio
{business_context}

## Configuración Visual
{visual_context}

## Instrucciones del Template
{template_prompt}

## Reglas Generales
1. Escribe en español (España/Latinoamérica según el contexto)
2. Usa un tono {onboarding_responses.get("brand_tone", "profesional y cercano")}
3. Sé conciso pero impactante
4. Incluye llamadas a la acción claras
5. Personaliza el contenido según la industria y audiencia
6. No inventes información que no se haya proporcionado
7. Si falta información, usa placeholders descriptivos como "[Tu teléfono]"

## Formato de Respuesta
Responde SIEMPRE en formato JSON válido con la estructura solicitada.
No incluyas explicaciones fuera del JSON.
"""
        return system_prompt

    def _format_visual_config(self, template, onboarding_responses: dict) -> str:
        """Formatea paleta + tipografia del template para el prompt."""
        if not template or not template.default_theme:
            return "Sin configuración visual específica. Usa un tono neutro."

        theme = dict(template.default_theme)
        # El onboarding puede sobrescribir los colores; usarlos si estan
        if onboarding_responses.get("primary_color"):
            theme["primary_color"] = onboarding_responses["primary_color"]
        if onboarding_responses.get("secondary_color"):
            theme["secondary_color"] = onboarding_responses["secondary_color"]

        lines = []
        if theme.get("primary_color"):
            lines.append(f"- Color primario: {theme['primary_color']}")
        if theme.get("secondary_color"):
            lines.append(f"- Color secundario: {theme['secondary_color']}")
        if theme.get("accent_color"):
            lines.append(f"- Color de acento: {theme['accent_color']}")
        if theme.get("font_heading"):
            lines.append(f"- Tipografía de títulos: {theme['font_heading']}")
        if theme.get("font_body"):
            lines.append(f"- Tipografía de texto: {theme['font_body']}")
        if theme.get("style"):
            lines.append(f"- Estilo visual: {theme['style']}")

        if not lines:
            return "Sin configuración visual específica."

        lines.append(
            "\nEl copy generado debe armonizar con esta identidad visual "
            "(tono, ritmo y vocabulario coherentes con los colores y tipografía)."
        )
        return "\n".join(lines)

    def _apply_industry_defaults(self, onboarding_responses: dict) -> dict:
        """Rellena campos faltantes del onboarding con defaults del vertical.

        Esto permite que el onboarding corto (3 campos) genere copy de la misma
        calidad que el onboarding completo (17 campos), porque la IA recibe
        brand_tone, business_hours y website_sections derivados de la industria.

        **No sobrescribe** datos que el usuario ya proporciono.

        Returns:
            Copia del dict con defaults inyectados.
        """
        from core.industry_defaults import (
            get_default_brand_tone,
            get_default_business_hours,
            get_default_sections,
        )

        industry = getattr(self.tenant, "industry", None)
        if not industry:
            return dict(onboarding_responses)

        merged = dict(onboarding_responses)

        if not merged.get("brand_tone"):
            tone = get_default_brand_tone(industry)
            if tone:
                merged["brand_tone"] = tone

        if not merged.get("business_hours"):
            hours = get_default_business_hours(industry)
            if hours:
                merged["business_hours"] = hours

        if not merged.get("website_sections"):
            sections = get_default_sections(industry)
            if sections:
                merged["website_sections"] = sections

        return merged

    def _format_business_context(self, responses: dict) -> str:
        """Formatea las respuestas del onboarding como contexto."""
        context_lines = []

        # Mapeo de claves a descripciones legibles
        key_labels = {
            "business_name": "Nombre del negocio",
            "business_tagline": "Slogan",
            "business_description": "Descripción",
            "target_audience": "Audiencia objetivo",
            "unique_selling_point": "Propuesta de valor única",
            "brand_tone": "Tono de comunicación",
            "website_sections": "Secciones seleccionadas para el sitio",
            "business_address": "Dirección",
            "business_phone": "Teléfono",
            "business_email": "Email",
            "business_whatsapp": "WhatsApp",
            "business_hours": "Horario de atención",
        }

        for key, value in responses.items():
            if value:  # Solo incluir si tiene valor
                label = key_labels.get(key, key.replace("_", " ").title())
                if isinstance(value, list):
                    value = ", ".join(str(v) for v in value)
                context_lines.append(f"- {label}: {value}")

        return "\n".join(context_lines) if context_lines else "No se proporcionó información adicional."

    def _validate_generated_content(self, content_data: dict, template) -> list[str]:
        """
        Valida el contenido generado contra las reglas del vertical.

        Devuelve lista de problemas detectados (vacia si todo OK). El caller
        puede decidir si reintenta o solo loggea.

        Reglas aplicadas:
        1. Cada servicio debe tener descripcion >= MIN_SERVICE_DESCRIPTION_WORDS.
        2. Si la industria del template tiene frases prohibidas, el contenido
           completo no debe contenerlas (match en minusculas, parcial).
        3. CTAs genericos prohibidos en cualquier industria.
        """
        if not content_data:
            return []

        problems: list[str] = []

        # 1. Descripciones de servicios
        services_items = (content_data.get("services") or {}).get("items") or []
        for idx, item in enumerate(services_items, start=1):
            desc = (item.get("description") or "").strip()
            word_count = len(desc.split())
            if word_count < MIN_SERVICE_DESCRIPTION_WORDS:
                name = item.get("name") or f"servicio {idx}"
                problems.append(
                    f"Descripción de '{name}' muy corta ({word_count} palabras, "
                    f"mínimo {MIN_SERVICE_DESCRIPTION_WORDS})."
                )

        # 2. Frases prohibidas segun industria
        industry = (template.industry if template else "").lower()
        forbidden = FORBIDDEN_PHRASES_BY_INDUSTRY.get(industry, [])
        if forbidden or FORBIDDEN_CTA_PHRASES:
            content_text = json.dumps(content_data, ensure_ascii=False).lower()
            for phrase in forbidden:
                if phrase.lower() in content_text:
                    problems.append(f"Contiene frase prohibida: '{phrase}'.")
            for cta in FORBIDDEN_CTA_PHRASES:
                if cta in content_text:
                    problems.append(f"Contiene CTA genérico prohibido: '{cta}'.")

        return problems

    def generate_initial_content(
        self, template, onboarding_responses: dict, additional_instructions: str = ""
    ) -> tuple[dict, dict, int, int, str, str]:
        """
        Genera el contenido inicial del sitio web.

        Args:
            template: WebsiteTemplate seleccionado
            onboarding_responses: dict con respuestas del onboarding
            additional_instructions: Instrucciones adicionales

        Returns:
            tuple de (content_data, seo_data, tokens_input, tokens_output, full_prompt, raw_response)
        """
        # Inyectar defaults del vertical para campos faltantes (Fase 2:
        # onboarding corto). Esto es un merge -- no sobrescribe datos del usuario.
        onboarding_responses = self._apply_industry_defaults(onboarding_responses)

        if not self.client:
            return (*self._mock_generate_content(template, onboarding_responses), "", "")

        # Obtener estructura de secciones del template
        sections = template.structure_schema.get("sections", self._default_sections())

        # Filtrar secciones según selección del usuario (reduce tokens)
        sections = self._filter_sections_by_selection(sections, onboarding_responses)

        # Construir el prompt
        system_prompt = self._build_system_prompt(template, onboarding_responses)

        user_prompt = f"""Genera el contenido completo para un sitio web.

## Secciones Requeridas
{json.dumps(sections, indent=2, ensure_ascii=False)}

## Instrucciones Adicionales
{additional_instructions if additional_instructions else "Ninguna"}

## Formato de Respuesta Esperado
Responde con un JSON con esta estructura (incluye SOLO las secciones indicadas arriba):
{{
    "content": {{
        "hero": {{
            "title": "...",
            "subtitle": "...",
            "cta_text": "...",
            "cta_link": "#contacto"
        }},
        "about": {{
            "title": "Sobre Nosotros",
            "content": "...",
            "highlights": ["...", "...", "..."]
        }},
        "services": {{
            "title": "Nuestros Servicios",
            "subtitle": "...",
            "items": [
                {{"name": "...", "description": "...", "icon": "spa"}}
            ]
        }},
        "products": {{
            "title": "Nuestros Productos",
            "subtitle": "...",
            "items": [
                {{"name": "...", "description": "...", "price": "$..."}}
            ]
        }},
        "testimonials": {{
            "title": "Lo que dicen nuestros clientes",
            "items": [
                {{"name": "...", "role": "...", "content": "..."}}
            ]
        }},
        "gallery": {{
            "title": "Galería",
            "subtitle": "...",
            "items": []
        }},
        "pricing": {{
            "title": "Precios",
            "subtitle": "...",
            "items": [
                {{"name": "...", "price": "...", "description": "..."}}
            ]
        }},
        "faq": {{
            "title": "Preguntas Frecuentes",
            "items": [
                {{"question": "...", "answer": "..."}}
            ]
        }},
        "contact": {{
            "title": "Contáctanos",
            "subtitle": "...",
            "address": "...",
            "phone": "...",
            "email": "...",
            "whatsapp": "...",
            "hours": "..."
        }}
    }},
    "seo": {{
        "meta_title": "...",
        "meta_description": "...",
        "keywords": ["...", "..."]
    }}
}}

Genera contenido profesional y atractivo basado en la información del negocio."""

        # Para la generacion inicial usamos un modelo mas capaz (Sonnet) por
        # defecto. El chat de ediciones posteriores sigue usando el modelo
        # barato (Haiku) via settings.ANTHROPIC_MODEL. Si el env var no esta
        # definido, cae a ANTHROPIC_MODEL para no romper entornos existentes.
        model = getattr(settings, "ANTHROPIC_MODEL_INITIAL", None) or settings.ANTHROPIC_MODEL
        self._last_model_used = model

        try:
            content_data, seo_data, tokens_input, tokens_output, response_text = self._call_generation(
                model=model, system_prompt=system_prompt, user_prompt=user_prompt
            )

            # Validacion post-generacion. Si hay problemas, reintentamos una
            # vez con instruccion explicita de corregirlos. Si el retry sigue
            # fallando, usamos el mejor de los dos resultados y loggeamos.
            problems = self._validate_generated_content(content_data, template)
            if problems:
                logger.warning(
                    "Generación IA con problemas de calidad (intento 1): %s",
                    problems,
                )
                retry_prompt = (
                    user_prompt
                    + "\n\n## Problemas a corregir de la generación anterior\n"
                    + "\n".join(f"- {p}" for p in problems)
                    + "\n\nReescribe el contenido evitando estos problemas, "
                    "manteniendo la estructura JSON especificada."
                )
                try:
                    content_data2, seo_data2, tokens_in2, tokens_out2, response_text2 = self._call_generation(
                        model=model, system_prompt=system_prompt, user_prompt=retry_prompt
                    )
                    tokens_input += tokens_in2
                    tokens_output += tokens_out2
                    problems_after = self._validate_generated_content(content_data2, template)
                    if len(problems_after) < len(problems):
                        content_data, seo_data, response_text = content_data2, seo_data2, response_text2
                        if problems_after:
                            logger.warning(
                                "Retry mejoró pero aún quedan problemas: %s",
                                problems_after,
                            )
                    else:
                        logger.warning("Retry no mejoró calidad; se mantiene el primer resultado.")
                except Exception as retry_error:
                    logger.warning(f"Retry de generación falló: {retry_error}")

            full_prompt = f"=== SYSTEM PROMPT ===\n{system_prompt}\n\n=== USER PROMPT ===\n{user_prompt}"
            return content_data, seo_data, tokens_input, tokens_output, full_prompt, response_text

        except Exception as e:
            logger.error(f"Error llamando a Claude API: {e}")
            return (*self._mock_generate_content(template, onboarding_responses), "", "")

    def _call_generation(self, model: str, system_prompt: str, user_prompt: str) -> tuple[dict, dict, int, int, str]:
        """
        Hace una llamada a Claude y parsea la respuesta JSON.

        Returns:
            tuple (content_data, seo_data, tokens_input, tokens_output, response_text).
            Si el parse falla, content_data contiene {"error": ..., "raw": ...}.
        """
        response = self.client.messages.create(
            model=model,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        response_text = response.content[0].text
        tokens_input = response.usage.input_tokens
        tokens_output = response.usage.output_tokens

        try:
            json_text = response_text.strip()
            if json_text.startswith("```json"):
                json_text = json_text[7:]
            if json_text.startswith("```"):
                json_text = json_text[3:]
            if json_text.endswith("```"):
                json_text = json_text[:-3]

            result = json.loads(json_text.strip())
            content_data = result.get("content", {})
            seo_data = result.get("seo", {})
        except json.JSONDecodeError as e:
            logger.error(f"Error parseando JSON de IA: {e}")
            logger.debug(f"Respuesta: {response_text}")
            content_data = {"error": "Error parseando respuesta", "raw": response_text}
            seo_data = {}

        return content_data, seo_data, tokens_input, tokens_output, response_text

    def chat_edit(
        self, message: str, current_content: dict, chat_history: list[dict], section_id: str | None = None
    ) -> tuple[str, dict | None, str | None, int, int]:
        """
        Procesa un mensaje del chat para editar contenido.

        Args:
            message: Mensaje del usuario
            current_content: Contenido actual del sitio
            chat_history: Historial de mensajes previos
            section_id: Sección específica a editar (opcional)

        Returns:
            tuple de (response_message, updated_content, affected_section, tokens_in, tokens_out)
        """
        if not self.client:
            return self._mock_chat_response(message, section_id)

        system_prompt = f"""Eres un asistente para editar el contenido de un sitio web.
El usuario te pedirá cambios en el contenido. Tu trabajo es:
1. Entender qué quiere cambiar
2. Hacer los cambios solicitados
3. Devolver el contenido actualizado

## Contenido Actual del Sitio
{json.dumps(current_content, indent=2, ensure_ascii=False)}

## Reglas
- Solo modifica lo que el usuario pide
- Mantén el formato JSON del contenido
- Si el cambio afecta una sección específica, indica cuál
- Responde de forma amigable explicando los cambios

## Formato de Respuesta
{{
    "message": "Explicación de los cambios realizados",
    "updated_section": "id_de_seccion_modificada",
    "updated_content": {{...contenido de la sección actualizada...}}
}}

Si el usuario hace una pregunta sin pedir cambios, responde solo con:
{{
    "message": "Tu respuesta",
    "updated_section": null,
    "updated_content": null
}}"""

        # Construir mensajes con historial
        messages = []
        for msg in chat_history[-10:]:  # Últimos 10 mensajes para contexto
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Agregar mensaje actual
        context_prefix = f"[Editando sección: {section_id}] " if section_id else ""
        messages.append({"role": "user", "content": f"{context_prefix}{message}"})

        try:
            response = self.client.messages.create(
                model=settings.ANTHROPIC_MODEL, max_tokens=2048, system=system_prompt, messages=messages
            )

            response_text = response.content[0].text
            tokens_input = response.usage.input_tokens
            tokens_output = response.usage.output_tokens

            # Parsear respuesta
            try:
                json_text = response_text.strip()
                if json_text.startswith("```json"):
                    json_text = json_text[7:]
                if json_text.endswith("```"):
                    json_text = json_text[:-3]

                result = json.loads(json_text.strip())
                return (
                    result.get("message", "Cambios aplicados"),
                    result.get("updated_content"),
                    result.get("updated_section"),
                    tokens_input,
                    tokens_output,
                )
            except json.JSONDecodeError:
                return response_text, None, None, tokens_input, tokens_output

        except Exception as e:
            logger.error(f"Error en chat con Claude: {e}")
            return self._mock_chat_response(message, section_id)

    def calculate_cost(self, tokens_input: int, tokens_output: int, model: str | None = None) -> Decimal:
        """
        Calcula el costo estimado en COP.

        Args:
            tokens_input: Tokens de entrada
            tokens_output: Tokens de salida
            model: Modelo usado (si se pasa y esta en MODEL_PRICING, se usa su
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

    def check_usage_limit(self, tenant) -> tuple[bool, int, int]:
        """
        Verifica si el tenant ha excedido su límite de generaciones.

        Args:
            tenant: Tenant a verificar

        Returns:
            tuple de (can_generate, used_this_month, limit)
        """
        from billing.models import Subscription

        # Obtener suscripción activa o trial
        subscription = Subscription.objects.filter(tenant=tenant, status__in=["active", "trial"]).first()

        if not subscription:
            return False, 0, 0

        # Obtener límite del módulo web (configurable desde admin)
        web_sm = (
            subscription.subscription_modules.filter(module__slug="web", is_active=True)
            .select_related("module")
            .first()
        )
        if not web_sm:
            limit = 10
        else:
            limit = web_sm.module.get_ai_limit_for_subscription(subscription)

        # Contar uso del mes actual
        from websites.models import AIGenerationLog

        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        used = AIGenerationLog.objects.filter(tenant=tenant, created_at__gte=month_start, is_successful=True).count()

        can_generate = used < limit
        return can_generate, used, limit

    def log_generation(
        self,
        generation_type: str,
        tokens_input: int,
        tokens_output: int,
        section_id: str = "",
        is_successful: bool = True,
        error_message: str = "",
        full_prompt: str = "",
        raw_response: str = "",
        onboarding_snapshot: dict | None = None,
    ):
        """
        Registra una generación de IA para billing y análisis.

        Args:
            generation_type: Tipo de generación
            tokens_input: Tokens de entrada
            tokens_output: Tokens de salida
            section_id: Sección afectada
            is_successful: Si fue exitosa
            error_message: Mensaje de error si falló
            full_prompt: System prompt + user prompt completo
            raw_response: Respuesta cruda de la IA
            onboarding_snapshot: Respuestas del onboarding usadas
        """
        from websites.models import AIGenerationLog

        if not self.tenant:
            logger.warning("No se puede registrar generación sin tenant")
            return None

        # Modelo efectivamente usado en la ultima llamada (lo setea
        # generate_initial_content cuando usa ANTHROPIC_MODEL_INITIAL).
        model_used = self._last_model_used or settings.ANTHROPIC_MODEL
        cost = self.calculate_cost(tokens_input, tokens_output, model=model_used)

        # Verificar si es billable (excede limite)
        can_generate, used, limit = self.check_usage_limit(self.tenant)
        is_billable = used >= limit

        log = AIGenerationLog.objects.create(
            tenant=self.tenant,
            website_config=self.website_config,
            generation_type=generation_type,
            section_id=section_id,
            model_used=model_used,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            cost_estimated=cost,
            is_successful=is_successful,
            error_message=error_message,
            is_billable=is_billable,
            full_prompt=full_prompt,
            raw_response=raw_response,
            onboarding_snapshot=onboarding_snapshot or {},
        )

        # Actualizar contador en website_config
        if self.website_config and is_successful:
            self.website_config.ai_generations_count += 1
            self.website_config.last_generation_at = timezone.now()
            self.website_config.save(update_fields=["ai_generations_count", "last_generation_at"])

        return log

    # ===================================
    # SEO AI Suggestions
    # ===================================

    def suggest_seo(
        self,
        keywords: list[str],
        business_name: str = "",
        business_description: str = "",
        current_title: str = "",
        current_description: str = "",
    ) -> tuple[dict, int, int]:
        """
        Genera sugerencias SEO optimizadas basadas en las keywords del usuario.

        Args:
            keywords: lista de palabras clave del negocio
            business_name: Nombre del negocio
            business_description: Descripción breve
            current_title: Título actual (para mejorar)
            current_description: Descripción actual (para mejorar)

        Returns:
            tuple de (suggestions_dict, tokens_input, tokens_output)
        """
        if not self.client:
            return self._mock_seo_suggestions(keywords, business_name), 0, 0

        keywords_str = ", ".join(keywords) if keywords else "negocio"

        system_prompt = """Eres un experto en SEO para negocios pequeños y medianos.
Tu trabajo es generar un título y descripción optimizados para Google.

## Reglas
1. El TÍTULO debe tener entre 30 y 60 caracteres — obligatorio
2. La DESCRIPCIÓN debe tener entre 120 y 155 caracteres — obligatorio
3. Usa las palabras clave como CONTEXTO para entender el negocio, NO las copies literalmente
4. El título debe empezar con el nombre del negocio, seguido de un guion y una frase que describa lo que hacen
5. Escribe en español, tono profesional pero cercano
6. El título debe ser atractivo para que la gente haga clic en Google
7. La descripción debe explicar qué ofrece el negocio y motivar a visitar el sitio
8. Sugiere 3-5 keywords adicionales relevantes que el usuario no haya pensado
9. NUNCA uses palabras genéricas como "Mi Negocio", "Tu empresa", "Servicios" solas
10. NO uses emojis
11. Si el negocio ya tiene un título actual, mejóralo conservando su esencia

## Formato de Respuesta — JSON estricto
{
    "title": "Título SEO optimizado (30-60 chars)",
    "description": "Meta descripción optimizada (120-155 chars)",
    "extra_keywords": ["keyword1", "keyword2", "keyword3"]
}"""

        user_prompt = f"""Genera título y descripción SEO para este negocio:

- Nombre del negocio: {business_name or "No especificado"}
- Palabras clave que describen el negocio: {keywords_str}
{f"- Título actual (mejóralo conservando su esencia): {current_title}" if current_title else ""}
{f"- Descripción actual (mejórala): {current_description}" if current_description else ""}

Responde SOLO con el JSON, sin explicaciones."""

        try:
            response = self.client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=512,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            response_text = response.content[0].text
            tokens_input = response.usage.input_tokens
            tokens_output = response.usage.output_tokens

            # Parse JSON
            json_text = response_text.strip()
            if json_text.startswith("```json"):
                json_text = json_text[7:]
            if json_text.startswith("```"):
                json_text = json_text[3:]
            if json_text.endswith("```"):
                json_text = json_text[:-3]

            result = json.loads(json_text.strip())
            return result, tokens_input, tokens_output

        except Exception as e:
            logger.error(f"Error generando sugerencias SEO: {e}")
            return self._mock_seo_suggestions(keywords, business_name), 0, 0

    def _mock_seo_suggestions(self, keywords: list[str], business_name: str) -> dict:
        """Sugerencias SEO mock cuando no hay API key."""
        kw_str = ", ".join(keywords[:3]) if keywords else ""
        name = business_name or "Tu Negocio"
        subtitle = f" - Especialistas en {kw_str}" if kw_str else ""
        return {
            "title": f"{name}{subtitle}"[:60],
            "description": f"Conoce {name}: ofrecemos {kw_str or 'soluciones'} con calidad y atención personalizada. Visítanos y descubre todo lo que tenemos para ti.",
            "extra_keywords": ["calidad", "confianza", "profesional"],
        }

    # ===================================
    # MÉTODOS MOCK (para desarrollo sin API)
    # ===================================

    def _mock_generate_content(self, template, responses: dict) -> tuple[dict, dict, int, int]:
        """Genera contenido mock para desarrollo."""
        business_name = responses.get("business_name", "Mi Negocio")
        tagline = responses.get("business_tagline", "Tu mejor opción")
        description = responses.get("business_description", "Descripción del negocio...")

        # Determinar secciones seleccionadas (compatible con formato viejo y nuevo)
        selected_sections = responses.get("website_sections", [])
        # Nuevo formato: "Servicios" y "Productos" por separado
        # Viejo formato: "Servicios / Productos" combinado
        wants_services = "Servicios" in selected_sections or "Servicios / Productos" in selected_sections
        wants_products = "Productos" in selected_sections or "Servicios / Productos" in selected_sections
        has_about = "Sobre nosotros" in selected_sections
        has_gallery = "Galería de fotos" in selected_sections
        has_testimonials = "Testimonios / Reseñas" in selected_sections
        has_pricing = "Precios / Tarifas" in selected_sections
        has_faq = "Preguntas frecuentes" in selected_sections

        # Hero y contact son siempre obligatorios
        content_data = {
            "hero": {
                "title": f"Bienvenido a {business_name}",
                "subtitle": tagline,
                "cta_text": "Contáctanos",
                "cta_link": "#contacto",
            },
            "contact": {
                "title": "Contáctanos",
                "subtitle": "Estamos aquí para ayudarte",
                "phone": responses.get("business_phone", "[Tu teléfono]"),
                "email": responses.get("business_email", "[Tu email]"),
                "address": responses.get("business_address", "[Tu dirección]"),
                "hours": responses.get("business_hours", "Lunes a Viernes: 9am - 6pm"),
            },
        }

        if has_about or not selected_sections:
            content_data["about"] = {
                "title": "Sobre Nosotros",
                "content": description,
                "highlights": ["Años de experiencia", "Atención personalizada", "Calidad garantizada"],
            }

        # Servicios: solo si seleccionó y el tenant tiene has_services
        if wants_services and getattr(self.tenant, "has_services", False):
            content_data["services"] = {
                "title": "Nuestros Servicios",
                "subtitle": "Descubre todo lo que podemos hacer por ti",
                "items": [
                    {"name": "Servicio 1", "description": "Descripción del servicio", "icon": "spa"},
                    {"name": "Servicio 2", "description": "Descripción del servicio", "icon": "star"},
                ],
            }

        # Productos: solo si seleccionó y el tenant tiene has_shop
        if wants_products and getattr(self.tenant, "has_shop", False):
            content_data["products"] = {
                "title": "Nuestros Productos",
                "subtitle": "Encuentra lo mejor para ti",
                "items": [
                    {"name": "Producto 1", "description": "Descripción del producto", "price": "$29.900"},
                    {"name": "Producto 2", "description": "Descripción del producto", "price": "$49.900"},
                    {"name": "Producto 3", "description": "Descripción del producto", "price": "$19.900"},
                ],
            }

        if has_testimonials:
            content_data["testimonials"] = {
                "title": "Lo que dicen nuestros clientes",
                "items": [
                    {
                        "name": "Cliente 1",
                        "role": "Cliente frecuente",
                        "content": "Excelente servicio, siempre vuelvo.",
                    },
                    {"name": "Cliente 2", "role": "Cliente nuevo", "content": "Muy buena experiencia, lo recomiendo."},
                ],
            }

        if has_gallery:
            content_data["gallery"] = {"title": "Galería", "subtitle": "Conoce nuestro trabajo", "items": []}

        if has_pricing:
            content_data["pricing"] = {
                "title": "Precios",
                "subtitle": "Planes adaptados a tus necesidades",
                "items": [
                    {"name": "Básico", "price": "$50.000/mes", "description": "Ideal para empezar"},
                    {"name": "Premium", "price": "$120.000/mes", "description": "Para negocios en crecimiento"},
                ],
            }

        if has_faq:
            content_data["faq"] = {
                "title": "Preguntas Frecuentes",
                "items": [
                    {
                        "question": "¿Cuáles son los horarios de atención?",
                        "answer": responses.get("business_hours", "Lunes a Viernes: 9am - 6pm"),
                    },
                    {
                        "question": "¿Cómo puedo contactarlos?",
                        "answer": f"Puedes llamarnos al {responses.get('business_phone', '[teléfono]')} o escribirnos a {responses.get('business_email', '[email]')}.",
                    },
                ],
            }

        keywords = [business_name.lower()]
        if "services" in content_data:
            keywords.append("servicios")
        if "products" in content_data:
            keywords.append("productos")
        keywords.append("contacto")

        seo_data = {
            "meta_title": f"{business_name} - {tagline}",
            "meta_description": description[:160] if description else f"Bienvenido a {business_name}",
            "keywords": keywords,
        }

        # Simular tokens usados
        return content_data, seo_data, 500, 800

    def _mock_chat_response(self, message: str, section_id: str | None) -> tuple:
        """Respuesta mock del chat."""
        return (
            f"Entendido. He procesado tu solicitud: '{message}'. "
            f"{'He actualizado la sección ' + section_id if section_id else 'No se requieren cambios en el contenido.'}",
            None,
            section_id,
            100,
            150,
        )

    # Mapeo: opción del multi_choice → IDs de sección del template
    SECTION_OPTION_MAP = {
        "Sobre nosotros": ["about"],
        "Servicios": ["services"],
        "Productos": ["products"],
        "Servicios / Productos": ["services", "products"],  # backwards compat
        "Galería de fotos": ["gallery"],
        "Testimonios / Reseñas": ["testimonials"],
        "Precios / Tarifas": ["pricing"],
        "Preguntas frecuentes": ["faq"],
    }

    def _filter_sections_by_selection(self, sections: list[dict], responses: dict) -> list[dict]:
        """
        Filtra secciones del template según lo que el usuario seleccionó
        y los módulos activos del tenant.

        Las secciones 'required' (hero, contact) siempre se incluyen.
        Las demás solo se incluyen si el usuario las seleccionó.
        'services' solo si el tenant tiene has_services.
        'products' solo si el tenant tiene has_shop.
        """
        selected = responses.get("website_sections", [])
        if not selected or not isinstance(selected, list):
            return sections  # Sin filtro si no hay selección

        # IDs de sección permitidos
        allowed_ids = set()
        for option in selected:
            for section_id in self.SECTION_OPTION_MAP.get(option, []):
                allowed_ids.add(section_id)

        # Filtrar services/products según módulos del tenant
        if self.tenant:
            if not getattr(self.tenant, "has_services", False) and "services" in allowed_ids:
                allowed_ids.discard("services")
            if not getattr(self.tenant, "has_shop", False) and "products" in allowed_ids:
                allowed_ids.discard("products")
            # Asegurar que al menos uno quede si seleccionó servicios/productos
            services_or_products = {"Servicios", "Productos", "Servicios / Productos"}
            if services_or_products & set(selected) and not allowed_ids & {"services", "products"}:
                # Si ninguno quedó por los flags, incluir genérico
                allowed_ids.add("services")

        return [s for s in sections if s.get("required", False) or s.get("id") in allowed_ids]

    def _default_sections(self) -> list[dict]:
        """Secciones por defecto si el template no las define."""
        return [
            {"id": "hero", "name": "Encabezado Principal", "required": True},
            {"id": "about", "name": "Sobre Nosotros", "required": False},
            {"id": "services", "name": "Servicios", "required": False},
            {"id": "products", "name": "Productos", "required": False},
            {"id": "testimonials", "name": "Testimonios", "required": False},
            {"id": "contact", "name": "Contacto", "required": True},
        ]
