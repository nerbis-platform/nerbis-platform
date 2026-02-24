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
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


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

    def _get_client(self):
        """Obtiene el cliente de Anthropic."""
        try:
            import anthropic
            api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
            if not api_key:
                logger.warning("ANTHROPIC_API_KEY no configurada")
                return None
            return anthropic.Anthropic(api_key=api_key)
        except ImportError:
            logger.error("anthropic package no instalado. Ejecutar: pip install anthropic")
            return None

    def _build_system_prompt(self, template, onboarding_responses: Dict) -> str:
        """
        Construye el prompt del sistema basado en el template y respuestas.

        Args:
            template: WebsiteTemplate seleccionado
            onboarding_responses: Dict de respuestas del onboarding

        Returns:
            String con el prompt del sistema
        """
        # Prompt base del template (si existe)
        template_prompt = template.ai_system_prompt if template else ""

        # Construir contexto del negocio desde las respuestas
        business_context = self._format_business_context(onboarding_responses)

        system_prompt = f"""Eres un experto en crear contenido para sitios web de negocios.
Tu objetivo es generar contenido profesional, atractivo y personalizado.

## Información del Negocio
{business_context}

## Instrucciones del Template
{template_prompt}

## Reglas Generales
1. Escribe en español (España/Latinoamérica según el contexto)
2. Usa un tono {onboarding_responses.get('brand_tone', 'profesional y cercano')}
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

    def _format_business_context(self, responses: Dict) -> str:
        """Formatea las respuestas del onboarding como contexto."""
        context_lines = []

        # Mapeo de claves a descripciones legibles
        key_labels = {
            'business_name': 'Nombre del negocio',
            'business_tagline': 'Slogan',
            'business_description': 'Descripción',
            'target_audience': 'Audiencia objetivo',
            'unique_selling_point': 'Propuesta de valor única',
            'brand_tone': 'Tono de comunicación',
            'website_sections': 'Secciones seleccionadas para el sitio',
            'business_address': 'Dirección',
            'business_phone': 'Teléfono',
            'business_email': 'Email',
            'business_whatsapp': 'WhatsApp',
            'business_hours': 'Horario de atención',
        }

        for key, value in responses.items():
            if value:  # Solo incluir si tiene valor
                label = key_labels.get(key, key.replace('_', ' ').title())
                if isinstance(value, list):
                    value = ', '.join(str(v) for v in value)
                context_lines.append(f"- {label}: {value}")

        return '\n'.join(context_lines) if context_lines else "No se proporcionó información adicional."

    def generate_initial_content(
        self,
        template,
        onboarding_responses: Dict,
        additional_instructions: str = ""
    ) -> Tuple[Dict, Dict, int, int, str, str]:
        """
        Genera el contenido inicial del sitio web.

        Args:
            template: WebsiteTemplate seleccionado
            onboarding_responses: Dict con respuestas del onboarding
            additional_instructions: Instrucciones adicionales

        Returns:
            Tuple de (content_data, seo_data, tokens_input, tokens_output, full_prompt, raw_response)
        """
        if not self.client:
            return (*self._mock_generate_content(template, onboarding_responses), "", "")

        # Obtener estructura de secciones del template
        sections = template.structure_schema.get('sections', self._default_sections())

        # Filtrar secciones según selección del usuario (reduce tokens)
        sections = self._filter_sections_by_selection(sections, onboarding_responses)

        # Construir el prompt
        system_prompt = self._build_system_prompt(template, onboarding_responses)

        user_prompt = f"""Genera el contenido completo para un sitio web.

## Secciones Requeridas
{json.dumps(sections, indent=2, ensure_ascii=False)}

## Instrucciones Adicionales
{additional_instructions if additional_instructions else 'Ninguna'}

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

        try:
            response = self.client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )

            # Parsear respuesta
            response_text = response.content[0].text
            tokens_input = response.usage.input_tokens
            tokens_output = response.usage.output_tokens

            # Intentar parsear JSON
            try:
                # Limpiar posibles caracteres extra
                json_text = response_text.strip()
                if json_text.startswith('```json'):
                    json_text = json_text[7:]
                if json_text.startswith('```'):
                    json_text = json_text[3:]
                if json_text.endswith('```'):
                    json_text = json_text[:-3]

                result = json.loads(json_text.strip())
                content_data = result.get('content', {})
                seo_data = result.get('seo', {})

            except json.JSONDecodeError as e:
                logger.error(f"Error parseando JSON de IA: {e}")
                logger.debug(f"Respuesta: {response_text}")
                content_data = {"error": "Error parseando respuesta", "raw": response_text}
                seo_data = {}

            full_prompt = f"=== SYSTEM PROMPT ===\n{system_prompt}\n\n=== USER PROMPT ===\n{user_prompt}"
            return content_data, seo_data, tokens_input, tokens_output, full_prompt, response_text

        except Exception as e:
            logger.error(f"Error llamando a Claude API: {e}")
            return (*self._mock_generate_content(template, onboarding_responses), "", "")

    def chat_edit(
        self,
        message: str,
        current_content: Dict,
        chat_history: List[Dict],
        section_id: Optional[str] = None
    ) -> Tuple[str, Optional[Dict], Optional[str], int, int]:
        """
        Procesa un mensaje del chat para editar contenido.

        Args:
            message: Mensaje del usuario
            current_content: Contenido actual del sitio
            chat_history: Historial de mensajes previos
            section_id: Sección específica a editar (opcional)

        Returns:
            Tuple de (response_message, updated_content, affected_section, tokens_in, tokens_out)
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
            messages.append({
                "role": msg['role'],
                "content": msg['content']
            })

        # Agregar mensaje actual
        context_prefix = f"[Editando sección: {section_id}] " if section_id else ""
        messages.append({
            "role": "user",
            "content": f"{context_prefix}{message}"
        })

        try:
            response = self.client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=2048,
                system=system_prompt,
                messages=messages
            )

            response_text = response.content[0].text
            tokens_input = response.usage.input_tokens
            tokens_output = response.usage.output_tokens

            # Parsear respuesta
            try:
                json_text = response_text.strip()
                if json_text.startswith('```json'):
                    json_text = json_text[7:]
                if json_text.endswith('```'):
                    json_text = json_text[:-3]

                result = json.loads(json_text.strip())
                return (
                    result.get('message', 'Cambios aplicados'),
                    result.get('updated_content'),
                    result.get('updated_section'),
                    tokens_input,
                    tokens_output
                )
            except json.JSONDecodeError:
                return response_text, None, None, tokens_input, tokens_output

        except Exception as e:
            logger.error(f"Error en chat con Claude: {e}")
            return self._mock_chat_response(message, section_id)

    def calculate_cost(self, tokens_input: int, tokens_output: int) -> Decimal:
        """
        Calcula el costo estimado en COP.

        Args:
            tokens_input: Tokens de entrada
            tokens_output: Tokens de salida

        Returns:
            Costo estimado en COP
        """
        # Calcular costo en USD (precios configurados en settings)
        price_input = Decimal(settings.ANTHROPIC_PRICE_INPUT)
        price_output = Decimal(settings.ANTHROPIC_PRICE_OUTPUT)
        cost_input = (Decimal(tokens_input) / 1_000_000) * price_input
        cost_output = (Decimal(tokens_output) / 1_000_000) * price_output
        cost_usd = cost_input + cost_output

        # Convertir a COP (tasa aproximada)
        usd_to_cop = Decimal('4200')  # TODO: Obtener tasa actual
        cost_cop = cost_usd * usd_to_cop

        return cost_cop.quantize(Decimal('0.01'))

    def check_usage_limit(self, tenant) -> Tuple[bool, int, int]:
        """
        Verifica si el tenant ha excedido su límite de generaciones.

        Args:
            tenant: Tenant a verificar

        Returns:
            Tuple de (can_generate, used_this_month, limit)
        """
        from billing.models import Subscription

        # Obtener suscripción activa o trial
        subscription = Subscription.objects.filter(
            tenant=tenant,
            status__in=['active', 'trial']
        ).first()

        if not subscription:
            return False, 0, 0

        # Obtener límite del módulo web (configurable desde admin)
        web_sm = subscription.subscription_modules.filter(
            module__slug='web',
            is_active=True
        ).select_related('module').first()
        if not web_sm:
            limit = 5
        else:
            limit = web_sm.module.get_ai_limit_for_subscription(subscription)

        # Contar uso del mes actual
        from websites.models import AIGenerationLog
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        used = AIGenerationLog.objects.filter(
            tenant=tenant,
            created_at__gte=month_start,
            is_successful=True
        ).count()

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

        cost = self.calculate_cost(tokens_input, tokens_output)

        # Verificar si es billable (excede límite)
        can_generate, used, limit = self.check_usage_limit(self.tenant)
        is_billable = used >= limit

        log = AIGenerationLog.objects.create(
            tenant=self.tenant,
            website_config=self.website_config,
            generation_type=generation_type,
            section_id=section_id,
            model_used=settings.ANTHROPIC_MODEL,
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
            self.website_config.save(update_fields=['ai_generations_count', 'last_generation_at'])

        return log

    # ===================================
    # MÉTODOS MOCK (para desarrollo sin API)
    # ===================================

    def _mock_generate_content(self, template, responses: Dict) -> Tuple[Dict, Dict, int, int]:
        """Genera contenido mock para desarrollo."""
        business_name = responses.get('business_name', 'Mi Negocio')
        tagline = responses.get('business_tagline', 'Tu mejor opción')
        description = responses.get('business_description', 'Descripción del negocio...')

        # Determinar secciones seleccionadas (compatible con formato viejo y nuevo)
        selected_sections = responses.get('website_sections', [])
        # Nuevo formato: "Servicios" y "Productos" por separado
        # Viejo formato: "Servicios / Productos" combinado
        wants_services = (
            'Servicios' in selected_sections
            or 'Servicios / Productos' in selected_sections
        )
        wants_products = (
            'Productos' in selected_sections
            or 'Servicios / Productos' in selected_sections
        )
        has_about = 'Sobre nosotros' in selected_sections
        has_gallery = 'Galería de fotos' in selected_sections
        has_testimonials = 'Testimonios / Reseñas' in selected_sections
        has_pricing = 'Precios / Tarifas' in selected_sections
        has_faq = 'Preguntas frecuentes' in selected_sections

        # Hero y contact son siempre obligatorios
        content_data = {
            "hero": {
                "title": f"Bienvenido a {business_name}",
                "subtitle": tagline,
                "cta_text": "Contáctanos",
                "cta_link": "#contacto"
            },
            "contact": {
                "title": "Contáctanos",
                "subtitle": "Estamos aquí para ayudarte",
                "phone": responses.get('business_phone', '[Tu teléfono]'),
                "email": responses.get('business_email', '[Tu email]'),
                "address": responses.get('business_address', '[Tu dirección]'),
                "hours": responses.get('business_hours', 'Lunes a Viernes: 9am - 6pm')
            }
        }

        if has_about or not selected_sections:
            content_data["about"] = {
                "title": "Sobre Nosotros",
                "content": description,
                "highlights": [
                    "Años de experiencia",
                    "Atención personalizada",
                    "Calidad garantizada"
                ]
            }

        # Servicios: solo si seleccionó y el tenant tiene has_services
        if wants_services and getattr(self.tenant, 'has_services', False):
            content_data["services"] = {
                "title": "Nuestros Servicios",
                "subtitle": "Descubre todo lo que podemos hacer por ti",
                "items": [
                    {"name": "Servicio 1", "description": "Descripción del servicio", "icon": "spa"},
                    {"name": "Servicio 2", "description": "Descripción del servicio", "icon": "star"},
                ]
            }

        # Productos: solo si seleccionó y el tenant tiene has_shop
        if wants_products and getattr(self.tenant, 'has_shop', False):
            content_data["products"] = {
                "title": "Nuestros Productos",
                "subtitle": "Encuentra lo mejor para ti",
                "items": [
                    {"name": "Producto 1", "description": "Descripción del producto", "price": "$29.900"},
                    {"name": "Producto 2", "description": "Descripción del producto", "price": "$49.900"},
                    {"name": "Producto 3", "description": "Descripción del producto", "price": "$19.900"},
                ]
            }

        if has_testimonials:
            content_data["testimonials"] = {
                "title": "Lo que dicen nuestros clientes",
                "items": [
                    {"name": "Cliente 1", "role": "Cliente frecuente", "content": "Excelente servicio, siempre vuelvo."},
                    {"name": "Cliente 2", "role": "Cliente nuevo", "content": "Muy buena experiencia, lo recomiendo."},
                ]
            }

        if has_gallery:
            content_data["gallery"] = {
                "title": "Galería",
                "subtitle": "Conoce nuestro trabajo",
                "items": []
            }

        if has_pricing:
            content_data["pricing"] = {
                "title": "Precios",
                "subtitle": "Planes adaptados a tus necesidades",
                "items": [
                    {"name": "Básico", "price": "$50.000/mes", "description": "Ideal para empezar"},
                    {"name": "Premium", "price": "$120.000/mes", "description": "Para negocios en crecimiento"},
                ]
            }

        if has_faq:
            content_data["faq"] = {
                "title": "Preguntas Frecuentes",
                "items": [
                    {"question": "¿Cuáles son los horarios de atención?", "answer": responses.get('business_hours', 'Lunes a Viernes: 9am - 6pm')},
                    {"question": "¿Cómo puedo contactarlos?", "answer": f"Puedes llamarnos al {responses.get('business_phone', '[teléfono]')} o escribirnos a {responses.get('business_email', '[email]')}."},
                ]
            }

        keywords = [business_name.lower()]
        if 'services' in content_data:
            keywords.append("servicios")
        if 'products' in content_data:
            keywords.append("productos")
        keywords.append("contacto")

        seo_data = {
            "meta_title": f"{business_name} - {tagline}",
            "meta_description": description[:160] if description else f"Bienvenido a {business_name}",
            "keywords": keywords
        }

        # Simular tokens usados
        return content_data, seo_data, 500, 800

    def _mock_chat_response(self, message: str, section_id: Optional[str]) -> Tuple:
        """Respuesta mock del chat."""
        return (
            f"Entendido. He procesado tu solicitud: '{message}'. "
            f"{'He actualizado la sección ' + section_id if section_id else 'No se requieren cambios en el contenido.'}",
            None,
            section_id,
            100,
            150
        )

    # Mapeo: opción del multi_choice → IDs de sección del template
    SECTION_OPTION_MAP = {
        'Sobre nosotros': ['about'],
        'Servicios': ['services'],
        'Productos': ['products'],
        'Servicios / Productos': ['services', 'products'],  # backwards compat
        'Galería de fotos': ['gallery'],
        'Testimonios / Reseñas': ['testimonials'],
        'Precios / Tarifas': ['pricing'],
        'Preguntas frecuentes': ['faq'],
    }

    def _filter_sections_by_selection(
        self, sections: List[Dict], responses: Dict
    ) -> List[Dict]:
        """
        Filtra secciones del template según lo que el usuario seleccionó
        y los módulos activos del tenant.

        Las secciones 'required' (hero, contact) siempre se incluyen.
        Las demás solo se incluyen si el usuario las seleccionó.
        'services' solo si el tenant tiene has_services.
        'products' solo si el tenant tiene has_shop.
        """
        selected = responses.get('website_sections', [])
        if not selected or not isinstance(selected, list):
            return sections  # Sin filtro si no hay selección

        # IDs de sección permitidos
        allowed_ids = set()
        for option in selected:
            for section_id in self.SECTION_OPTION_MAP.get(option, []):
                allowed_ids.add(section_id)

        # Filtrar services/products según módulos del tenant
        if self.tenant:
            if not getattr(self.tenant, 'has_services', False) and 'services' in allowed_ids:
                allowed_ids.discard('services')
            if not getattr(self.tenant, 'has_shop', False) and 'products' in allowed_ids:
                allowed_ids.discard('products')
            # Asegurar que al menos uno quede si seleccionó servicios/productos
            services_or_products = {'Servicios', 'Productos', 'Servicios / Productos'}
            if services_or_products & set(selected) and not allowed_ids & {'services', 'products'}:
                # Si ninguno quedó por los flags, incluir genérico
                allowed_ids.add('services')

        return [
            s for s in sections
            if s.get('required', False) or s.get('id') in allowed_ids
        ]

    def _default_sections(self) -> List[Dict]:
        """Secciones por defecto si el template no las define."""
        return [
            {"id": "hero", "name": "Encabezado Principal", "required": True},
            {"id": "about", "name": "Sobre Nosotros", "required": False},
            {"id": "services", "name": "Servicios", "required": False},
            {"id": "products", "name": "Productos", "required": False},
            {"id": "testimonials", "name": "Testimonios", "required": False},
            {"id": "contact", "name": "Contacto", "required": True},
        ]
