# backend/websites/tasks.py
"""
Tareas asincronas de Celery para el Website Builder.

Maneja la generacion de contenido con IA en background para no bloquear
el request HTTP del usuario.
"""

import logging
import random
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, soft_time_limit=90, time_limit=120, max_retries=1, acks_late=True)
def generate_website_content(
    self,
    website_config_id: int,
    tenant_id: int,
    user_id: int,
    onboarding_responses: dict,
    additional_instructions: str = "",
    regenerate_section: str | None = None,
    is_quick_start: bool = False,
):
    """
    Genera contenido del sitio web usando IA de forma asincrona.

    Extrae la logica de generacion de GenerateContentView.post() y
    QuickStartView.post() para ejecutarla en un worker de Celery.
    """
    from core.models import Tenant
    from websites.models import WebsiteConfig
    from websites.services import AIService, UnsplashService
    from websites.services.pages import derive_enabled_pages

    try:
        tenant = Tenant.objects.get(id=tenant_id)
        config = WebsiteConfig.objects.get(id=website_config_id)
    except (Tenant.DoesNotExist, WebsiteConfig.DoesNotExist) as e:
        logger.error(f"generate_website_content: entity not found: {e}")
        return {"success": False, "error": str(e)}

    # Guardar estado previo para rollback en caso de error
    previous_status = "onboarding" if is_quick_start else config.status
    if previous_status == "generating":
        previous_status = "onboarding"

    config.status = "generating"
    config.generation_task_id = self.request.id
    config.save(update_fields=["status", "generation_task_id"])

    ai_service = AIService(tenant=tenant, website_config=config)

    try:
        # Determinar tipo de generacion
        if regenerate_section:
            generation_type = "regenerate_section"
        elif is_quick_start:
            generation_type = "quick_start"
        else:
            generation_type = "initial"

        # Generar contenido con IA
        (
            content_data,
            seo_data,
            tokens_in,
            tokens_out,
            full_prompt,
            raw_response,
            selected_pages,
        ) = ai_service.generate_initial_content(
            template=config.template,
            onboarding_responses=onboarding_responses,
            additional_instructions=additional_instructions,
        )

        # Enriquecer con imagenes de Unsplash
        try:
            unsplash = UnsplashService()
            section_ids = [k for k in content_data.keys() if not k.startswith("_")]
            images = unsplash.get_images_for_generation(
                sections=section_ids,
                onboarding_responses=onboarding_responses,
                tenant_industry=tenant.industry,
                template_industry=(config.template.industry.key if config.template.industry_id else "generic")
                or "generic",
            )
            _inject_images_and_variants(content_data, images)
        except Exception as e:
            logger.warning(f"Unsplash enrichment failed (non-fatal): {e}")

        # Aplicar branding del onboarding al theme_data
        theme_data = dict(config.template.default_theme or {})
        if not is_quick_start:
            if onboarding_responses.get("primary_color"):
                theme_data["primary_color"] = onboarding_responses["primary_color"]
            if onboarding_responses.get("secondary_color"):
                theme_data["secondary_color"] = onboarding_responses["secondary_color"]

        # Logo y media
        media_data = dict(config.media_data or {})
        if not is_quick_start and onboarding_responses.get("logo_upload"):
            media_data["logo_url"] = onboarding_responses["logo_upload"]

        # Asegurar header y footer
        if "header" not in content_data:
            content_data["header"] = {
                "logo_text": tenant.name,
                "cta_text": "",
                "cta_link": "#contact",
            }
        if "footer" not in content_data:
            content_data["footer"] = {}

        # Ordenar secciones
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

        # Derivar paginas habilitadas con el helper centralizado (mismo que
        # generation.py — la logica vive en un solo lugar, no se duplica).
        content_keys = [
            k for k in content_data.keys() if not k.startswith("_") and k not in ("hero", "header", "footer")
        ]
        resolved_industry = (
            config.template.industry.key if config.template and config.template.industry_id else tenant.industry
        )
        config.enabled_pages = derive_enabled_pages(
            content_keys=content_keys,
            ai_selected_pages=selected_pages,
            has_services=getattr(tenant, "has_services", False),
            has_shop=getattr(tenant, "has_shop", False),
            has_bookings=getattr(tenant, "has_bookings", False),
            industry_key=resolved_industry,
        )

        # Guardar resultado
        config.content_data = content_data
        config.seo_data = seo_data
        config.theme_data = theme_data
        config.media_data = media_data
        config.status = "review"
        config.generation_task_id = None
        config.save(
            update_fields=[
                "content_data",
                "seo_data",
                "theme_data",
                "media_data",
                "status",
                "enabled_pages",
                "generation_task_id",
            ]
        )

        # Log de generacion exitosa
        ai_service.log_generation(
            generation_type=generation_type,
            tokens_input=tokens_in,
            tokens_output=tokens_out,
            section_id=regenerate_section or "",
            is_successful=True,
            full_prompt=full_prompt,
            raw_response=raw_response,
            onboarding_snapshot=onboarding_responses,
        )

        logger.info(
            f"generate_website_content: success for config {website_config_id} (tokens: {tokens_in + tokens_out})"
        )
        return {"success": True, "config_id": website_config_id}

    except (ConnectionError, TimeoutError, OSError) as e:
        # Transient errors — retry once
        logger.warning(
            f"generate_website_content: transient error for config {website_config_id}: {e}. "
            f"Retry {self.request.retries}/{self.max_retries}"
        )
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=10)
        # Max retries exhausted — fall through to rollback
        logger.error(f"generate_website_content: max retries exhausted for config {website_config_id}")
        config.status = previous_status
        config.generation_task_id = None
        config.save(update_fields=["status", "generation_task_id"])
        return {"success": False, "error": str(e)}

    except Exception as e:
        logger.error(f"generate_website_content: error for config {website_config_id}: {e}")

        # Rollback status
        config.status = previous_status
        config.generation_task_id = None
        config.save(update_fields=["status", "generation_task_id"])

        # Log de generacion fallida
        generation_type = "quick_start" if is_quick_start else "initial"
        ai_service.log_generation(
            generation_type=generation_type,
            tokens_input=0,
            tokens_output=0,
            is_successful=False,
            error_message=str(e),
        )

        return {"success": False, "error": str(e)}


@shared_task
def recover_stuck_generations():
    """
    Tarea programada para recuperar generaciones atascadas.

    Busca WebsiteConfig con status="generating" cuya tarea de Celery
    ya no esta activa (estado terminal) y las resetea a "onboarding".
    Se ejecuta cada 5 minutos via Celery Beat.
    """
    from celery.result import AsyncResult

    from websites.models import WebsiteConfig

    stuck_configs = WebsiteConfig.objects.filter(
        status="generating",
        generation_task_id__isnull=False,
    )

    recovered = 0
    for config in stuck_configs:
        result = AsyncResult(config.generation_task_id)
        # Estados terminales de Celery: SUCCESS, FAILURE, REVOKED
        if result.state in ("SUCCESS", "FAILURE", "REVOKED"):
            config.status = "onboarding"
            config.generation_task_id = None
            config.save(update_fields=["status", "generation_task_id"])
            recovered += 1
            logger.info(
                f"recover_stuck_generations: recovered config {config.id} "
                f"(task {config.generation_task_id} was {result.state})"
            )

    # Tambien recuperar configs sin task_id pero stuck en "generating"
    # por mas de 5 minutos (safety net para tareas que nunca registraron su ID)
    cutoff = timezone.now() - timedelta(minutes=5)
    orphaned = WebsiteConfig.objects.filter(
        status="generating",
        generation_task_id__isnull=True,
        updated_at__lte=cutoff,
    )
    orphaned_count = orphaned.update(status="onboarding")
    recovered += orphaned_count

    if recovered:
        logger.info(f"recover_stuck_generations: recovered {recovered} stuck configs")

    return f"Recovered: {recovered}"


def _inject_images_and_variants(content: dict, images: dict) -> None:
    """
    Inyecta imagenes de Unsplash y auto-selecciona variantes de seccion.

    Logica extraida de GenerateContentView._inject_images_and_variants()
    para reutilizar en la tarea asincrona.
    """
    from websites.services import UnsplashService

    unsplash = UnsplashService()

    # Hero
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

    # About
    if "about" in content:
        about_imgs = images.get("about", [])
        if about_imgs:
            content["about"]["_image"] = about_imgs[0]
            content["about"]["_image_alternatives"] = about_imgs[1:]
            unsplash.trigger_download(about_imgs[0].get("download_location", ""))
            variant = random.choice(["split-image", "stats-banner", "fullwidth-banner"])
        else:
            variant = random.choice(["text-only", "stats-banner", "timeline", "overlapping-cards", "fullwidth-banner"])
        content["about"]["_variant"] = variant
        content["about"]["_variant_ai_recommended"] = variant

    # Services
    if "services" in content:
        section_imgs = images.get("services", [])
        items = content["services"].get("items", [])
        has_images = False
        for i, item in enumerate(items):
            if i < len(section_imgs):
                item["_image"] = section_imgs[i]
                unsplash.trigger_download(section_imgs[i].get("download_location", ""))
                has_images = True
        if has_images:
            variant = random.choice(["grid-cards-image", "featured-highlight"])
        else:
            variant = random.choice(["grid-cards", "list-detailed", "horizontal-scroll", "icon-minimal"])
        content["services"]["_variant"] = variant
        content["services"]["_variant_ai_recommended"] = variant

    # Products
    if "products" in content:
        variant = random.choice(["grid-cards", "price-table"])
        content["products"]["_variant"] = variant
        content["products"]["_variant_ai_recommended"] = variant
