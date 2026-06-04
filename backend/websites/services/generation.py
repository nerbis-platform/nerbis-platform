# backend/websites/services/generation.py
"""
Servicio de generación de sitio web con IA.

Extrae la lógica de QuickStartView a una función reutilizable, invocable
desde el endpoint quick-start o desde cualquier flujo de onboarding unificado.
"""

import logging
import random

from core.models import Tenant
from websites.models import WebsiteConfig, WebsiteTemplate
from websites.services.ai_service import AIService
from websites.services.unsplash_service import UnsplashService

logger = logging.getLogger(__name__)


class GenerationResult:
    """Resultado de una generación exitosa."""

    def __init__(
        self,
        *,
        config: WebsiteConfig,
        content_data: dict,
        seo_data: dict,
        theme_data: dict,
        tokens_used: int,
        remaining_generations: int,
        template: WebsiteTemplate,
    ):
        self.config = config
        self.content_data = content_data
        self.seo_data = seo_data
        self.theme_data = theme_data
        self.tokens_used = tokens_used
        self.remaining_generations = remaining_generations
        self.template = template


class GenerationError(Exception):
    """Error durante la generación."""

    def __init__(self, message: str, *, status_code: int = 500, extra: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.extra = extra or {}


def generate_website(
    *,
    tenant: Tenant,
    business_description: str,
    main_services: str,
    business_whatsapp: str = "",
    website_sections: list[str] | None = None,
    brand_tone: str | None = None,
    primary_color: str | None = None,
    secondary_color: str | None = None,
) -> GenerationResult:
    """Genera un sitio web completo para un tenant.

    Combina: resolución de template + generación IA + Unsplash + guardado en WebsiteConfig.

    Args:
        tenant: Tenant para el cual generar el sitio.
        business_description: Descripción del negocio.
        main_services: Servicios principales (separados por coma o salto de línea).
        business_whatsapp: Número de WhatsApp (opcional).
        website_sections: Secciones seleccionadas por el usuario (opcional).
        brand_tone: Personalidad de marca (profesional, calido, moderno, etc.).
        primary_color: Color primario hex (ej: #1C3B57).
        secondary_color: Color secundario hex (ej: #0D9488).

    Returns:
        GenerationResult con toda la data generada.

    Raises:
        GenerationError: Si hay un problema con template, límite o generación.
    """
    from core.industry_defaults import get_default_template_slug

    # 1. Resolver template por industria
    slug = get_default_template_slug(tenant.industry)
    if not slug:
        raise GenerationError(
            "Tu industria aún no tiene un template asignado. Usa el flujo completo.",
            status_code=400,
        )

    template = WebsiteTemplate.objects.filter(slug=slug, is_active=True).first()
    if not template:
        raise GenerationError(
            f"Template '{slug}' no encontrado. Contacta soporte.",
            status_code=400,
        )

    # 2. Crear o actualizar WebsiteConfig
    config, _created = WebsiteConfig.objects.update_or_create(
        tenant=tenant,
        defaults={
            "template": template,
            "status": "generating",
            "subdomain": tenant.slug,
        },
    )

    # 3. Armar onboarding_responses
    responses_dict = {
        "business_name": tenant.name,
        "business_description": business_description,
        "main_services": main_services,
        "business_whatsapp": business_whatsapp or tenant.phone or "",
        "business_phone": tenant.phone or "",
        "business_email": tenant.email or "",
        "business_address": tenant.address or "",
    }
    if website_sections:
        responses_dict["website_sections"] = website_sections

    # Map brand_tone from frontend key to display label for the AI prompt
    TONE_MAP = {
        "profesional": "Profesional y elegante",
        "calido": "Cálido y cercano",
        "moderno": "Moderno y dinámico",
        "minimalista": "Minimalista y sofisticado",
        "juvenil": "Juvenil y fresco",
    }
    if brand_tone:
        responses_dict["brand_tone"] = TONE_MAP.get(brand_tone, brand_tone)
    if primary_color:
        responses_dict["primary_color"] = primary_color
    if secondary_color:
        responses_dict["secondary_color"] = secondary_color

    # 4. Verificar limite de generaciones
    ai_service = AIService(tenant=tenant, website_config=config)
    can_generate, used, limit = ai_service.check_usage_limit(tenant)
    if not can_generate:
        config.status = "onboarding"
        config.save(update_fields=["status"])
        raise GenerationError(
            "Has alcanzado el límite de generaciones este mes",
            status_code=402,
            extra={"used": used, "limit": limit},
        )

    try:
        # 5. Generar contenido con IA
        content_data, seo_data, tokens_in, tokens_out, full_prompt, raw_response = ai_service.generate_initial_content(
            template=template,
            onboarding_responses=responses_dict,
        )

        # 6. Enriquecer con imagenes de Unsplash
        try:
            unsplash = UnsplashService()
            section_ids = [k for k in content_data.keys() if not k.startswith("_")]
            images = unsplash.get_images_for_generation(
                sections=section_ids,
                onboarding_responses=responses_dict,
                tenant_industry=tenant.industry,
                template_industry=(template.industry.key if template.industry_id else "generic") or "generic",
            )
            _inject_images_and_variants(content_data, images)
        except Exception as e:
            logger.warning(f"Unsplash enrichment failed (non-fatal): {e}")

        # 7. Theme, media, header/footer, section order
        theme_data = dict(template.default_theme or {})
        # Override theme colors if user provided them
        if primary_color:
            theme_data["primary_color"] = primary_color
        if secondary_color:
            theme_data["secondary_color"] = secondary_color
        media_data = dict(config.media_data or {})

        if "header" not in content_data:
            content_data["header"] = {
                "logo_text": tenant.name,
                "cta_text": "",
                "cta_link": "#contact",
            }
        if "footer" not in content_data:
            content_data["footer"] = {}

        section_keys = [k for k in content_data.keys() if not k.startswith("_") and k not in ("header", "footer")]
        ordered = []
        if "hero" in section_keys:
            ordered.append("hero")
            section_keys.remove("hero")
        contact_at_end = "contact" in section_keys
        if contact_at_end:
            section_keys.remove("contact")
        ordered.extend(section_keys)
        if contact_at_end:
            ordered.append("contact")
        content_data["_section_order"] = ordered

        config.enabled_pages = [
            k for k in content_data.keys() if not k.startswith("_") and k not in ("hero", "header", "footer")
        ]

        # 8. Guardar
        config.content_data = content_data
        config.seo_data = seo_data
        config.theme_data = theme_data
        config.media_data = media_data
        config.status = "review"
        config.save(
            update_fields=[
                "content_data",
                "seo_data",
                "theme_data",
                "media_data",
                "status",
                "enabled_pages",
            ]
        )

        # 9. Log de generacion
        ai_service.log_generation(
            generation_type="quick_start",
            tokens_input=tokens_in,
            tokens_output=tokens_out,
            is_successful=True,
            full_prompt=full_prompt,
            raw_response=raw_response,
            onboarding_snapshot=responses_dict,
        )

        _, new_used, new_limit = ai_service.check_usage_limit(tenant)

        return GenerationResult(
            config=config,
            content_data=content_data,
            seo_data=seo_data,
            theme_data=theme_data,
            tokens_used=tokens_in + tokens_out,
            remaining_generations=max(0, new_limit - new_used),
            template=template,
        )

    except GenerationError:
        raise
    except Exception as e:
        logger.error(f"Error en website generation: {e}")
        config.status = "onboarding"
        config.save(update_fields=["status"])
        ai_service.log_generation(
            generation_type="quick_start",
            tokens_input=0,
            tokens_output=0,
            is_successful=False,
            error_message=str(e),
        )
        raise GenerationError("Error generando contenido. Intenta de nuevo.", status_code=500) from e


def _inject_images_and_variants(content: dict, images: dict) -> None:
    """Inyecta imagenes de Unsplash en el content_data."""
    unsplash = UnsplashService()

    if "hero" in content:
        hero_imgs = images.get("hero", [])
        if hero_imgs:
            content["hero"]["_image"] = hero_imgs[0]
            content["hero"]["_image_alternatives"] = hero_imgs[1:]
            unsplash.trigger_download(hero_imgs[0].get("download_location", ""))
            variant = random.choice(["split-image", "fullwidth-image", "diagonal-split"])
        else:
            variant = random.choice(["centered", "bold-typography", "glassmorphism"])
        content["hero"]["_variant"] = variant
        content["hero"]["_variant_ai_recommended"] = variant

    if "about" in content:
        about_imgs = images.get("about", [])
        if about_imgs:
            content["about"]["_image"] = about_imgs[0]
            content["about"]["_image_alternatives"] = about_imgs[1:]
            unsplash.trigger_download(about_imgs[0].get("download_location", ""))

    if "services" in content:
        svc_imgs = images.get("services", [])
        for idx, item in enumerate(content["services"].get("items", [])):
            if idx < len(svc_imgs):
                item["_image"] = svc_imgs[idx]
                unsplash.trigger_download(svc_imgs[idx].get("download_location", ""))
