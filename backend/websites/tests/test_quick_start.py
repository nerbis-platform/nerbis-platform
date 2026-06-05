"""Tests del endpoint POST /api/websites/onboarding/quick-start/ (brand-color-from-logo).

Cubre los escenarios de aceptación del spec:
- (a) Upload válido persiste logo + colores al Tenant (scoped por tenant_id).
- (b) MIME inválido / archivo >5MB -> 400 sin romper.
- (c) Imagen corrupta (PIL no puede abrirla) -> 400.
- (d) Aislamiento cross-tenant: tenant A no escribe/lee el logo de tenant B.
- (e) Persistencia atómica: si la generación falla, no queda estado parcial inconsistente
      (el logo/colores ya persistidos son intencionales; el WebsiteConfig revierte a onboarding).
- (f) Backward-compat: payload JSON sin logo sigue devolviendo 2xx.

La generación con IA y Unsplash se mockean — no se hacen llamadas de red reales.
"""

import io
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

URL = "/api/websites/onboarding/quick-start/"


# ===================================
# HELPERS
# ===================================


def _png_bytes(size: tuple[int, int] = (64, 64), color: str = "#1C3B57") -> bytes:
    """Genera un PNG válido en memoria."""
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


def _png_upload(name: str = "logo.png") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, _png_bytes(), content_type="image/png")


def _webp_bytes(size: tuple[int, int] = (64, 64), color: str = "#0D9488") -> bytes:
    """Genera un WEBP válido en memoria."""
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, format="WEBP")
    return buffer.getvalue()


def _webp_upload(name: str = "logo.webp") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, _webp_bytes(), content_type="image/webp")


def _fake_generation_result() -> tuple:
    """Imita el retorno de AIService.generate_initial_content."""
    content_data = {
        "hero": {"title": "Bienvenido", "subtitle": "Tu negocio"},
        "about": {"text": "Sobre nosotros"},
        "contact": {"email": "x@y.com"},
    }
    seo_data = {"title": "SEO", "description": "desc"}
    tokens_in, tokens_out = 100, 50
    full_prompt = "prompt"
    raw_response = "{}"
    return content_data, seo_data, tokens_in, tokens_out, full_prompt, raw_response


@pytest.fixture()
def mock_ai():
    """Mockea AIService para evitar llamadas reales y forzar generación exitosa."""
    with (
        patch("websites.views.onboarding.AIService") as mock_cls,
        patch("websites.views.onboarding.UnsplashService") as mock_unsplash,
    ):
        instance = mock_cls.return_value
        instance.check_usage_limit.return_value = (True, 0, 10)
        instance.generate_initial_content.return_value = _fake_generation_result()
        instance.log_generation.return_value = None

        unsplash_instance = mock_unsplash.return_value
        unsplash_instance.get_images_for_generation.return_value = {}
        unsplash_instance.trigger_download.return_value = None

        yield instance


@pytest.fixture()
def template(seeded_industries):
    """Template activo mínimo para que resolve_template_for_industry no caiga a dead-end."""
    from websites.models import WebsiteTemplate

    industry = seeded_industries("generic")
    return WebsiteTemplate.objects.create(
        name="Generic",
        slug="generic",
        industry=industry,
        is_active=True,
        default_theme={"colors": {}},
        structure_schema={},
    )


def _payload(**overrides) -> dict:
    base = {
        "business_description": "Un spa de bienestar premium en Bogotá.",
        "main_services": "Masajes\nFaciales\nManicure",
    }
    base.update(overrides)
    return base


# ===================================
# (f) BACKWARD-COMPAT
# ===================================


@pytest.mark.django_db
def test_quick_start_without_logo_json_still_works(auth_admin_client, template, mock_ai):
    """(f) Payload JSON sin logo sigue funcionando (200/201)."""
    resp = auth_admin_client.post(URL, _payload(), format="json")
    assert resp.status_code in (200, 201), resp.data


# ===================================
# (a) UPLOAD VÁLIDO PERSISTE LOGO + COLORES
# ===================================


@pytest.mark.django_db
def test_valid_logo_upload_persists_logo_and_colors(auth_admin_client, tenant, template, mock_ai):
    """(a) Un upload válido persiste logo + colores al Tenant, scoped por tenant_id."""
    resp = auth_admin_client.post(
        URL,
        _payload(
            logo_file=_png_upload(),
            primary_color="#1C3B57",
            secondary_color="#0D9488",
        ),
        format="multipart",
    )
    assert resp.status_code in (200, 201), resp.data

    tenant.refresh_from_db()
    assert tenant.logo, "El logo debería haberse persistido"
    assert f"tenants/logos/{tenant.id}/" in tenant.logo.name
    assert tenant.primary_color == "#1C3B57"
    assert tenant.secondary_color == "#0D9488"


@pytest.mark.django_db
def test_valid_webp_logo_upload_persists(auth_admin_client, tenant, template, mock_ai):
    """(a) Un WEBP válido también se acepta y persiste (formato alineado con el frontend)."""
    resp = auth_admin_client.post(
        URL,
        _payload(logo_file=_webp_upload(), primary_color="#0D9488"),
        format="multipart",
    )
    assert resp.status_code in (200, 201), resp.data

    tenant.refresh_from_db()
    assert tenant.logo, "El logo WEBP debería haberse persistido"
    assert f"tenants/logos/{tenant.id}/" in tenant.logo.name


# ===================================
# (b) MIME INVÁLIDO / >5MB -> 400
# ===================================


@pytest.mark.django_db
def test_invalid_mime_returns_400(auth_admin_client, tenant, template, mock_ai):
    """(b) Un content-type no soportado (no imagen) -> 400 sin romper."""
    bad = SimpleUploadedFile("logo.txt", b"not-an-image", content_type="text/plain")
    resp = auth_admin_client.post(URL, _payload(logo_file=bad), format="multipart")
    assert resp.status_code == 400
    tenant.refresh_from_db()
    assert not tenant.logo


@pytest.mark.django_db
def test_oversized_logo_returns_400(auth_admin_client, tenant, template, mock_ai):
    """(b) Un archivo >5MB -> 400."""
    from websites.serializers import QuickStartSerializer

    big = SimpleUploadedFile(
        "logo.png",
        b"\x89PNG\r\n\x1a\n" + b"0" * (QuickStartSerializer.MAX_LOGO_BYTES + 10),
        content_type="image/png",
    )
    resp = auth_admin_client.post(URL, _payload(logo_file=big), format="multipart")
    assert resp.status_code == 400
    tenant.refresh_from_db()
    assert not tenant.logo


# ===================================
# (c) IMAGEN CORRUPTA -> 400
# ===================================


@pytest.mark.django_db
def test_corrupt_image_returns_400(auth_admin_client, tenant, template, mock_ai):
    """(c) Un archivo con content-type de imagen pero contenido corrupto (PIL falla) -> 400."""
    corrupt = SimpleUploadedFile(
        "logo.png",
        b"\x89PNG\r\n\x1a\nthis-is-not-a-valid-png-body",
        content_type="image/png",
    )
    resp = auth_admin_client.post(URL, _payload(logo_file=corrupt), format="multipart")
    assert resp.status_code == 400
    tenant.refresh_from_db()
    assert not tenant.logo


# ===================================
# (d) AISLAMIENTO CROSS-TENANT
# ===================================


@pytest.mark.django_db
def test_cross_tenant_isolation(auth_admin_client, tenant, second_tenant, template, mock_ai):
    """(d) El logo del tenant A se persiste bajo su propio id; el tenant B queda intacto."""
    resp = auth_admin_client.post(
        URL,
        _payload(logo_file=_png_upload(), primary_color="#111111"),
        format="multipart",
    )
    assert resp.status_code in (200, 201), resp.data

    tenant.refresh_from_db()
    second_tenant.refresh_from_db()

    # El logo de A vive scoped por su id; B no recibió nada.
    assert f"tenants/logos/{tenant.id}/" in tenant.logo.name
    assert str(second_tenant.id) not in tenant.logo.name
    assert not second_tenant.logo
    assert tenant.primary_color == "#111111"


# ===================================
# (e) PERSISTENCIA ATÓMICA
# ===================================


@pytest.mark.django_db
def test_logo_persistence_is_atomic_on_generation_failure(auth_admin_client, tenant, template, mock_ai):
    """(e) Si la generación con IA falla, el WebsiteConfig revierte a onboarding.

    El logo + colores se persisten ANTES de generar (paso 0), por diseño: representan
    datos de marca del tenant, independientes del resultado de la generación. La
    atomicidad relevante es que un fallo posterior no deja el WebsiteConfig en estado
    'generating' colgado.
    """
    from websites.models import WebsiteConfig

    mock_ai.generate_initial_content.side_effect = RuntimeError("AI boom")

    resp = auth_admin_client.post(
        URL,
        _payload(logo_file=_png_upload(), primary_color="#222222"),
        format="multipart",
    )
    assert resp.status_code == 500, resp.data

    # El logo/colores SÍ se persistieron (paso 0, intencional).
    tenant.refresh_from_db()
    assert tenant.logo
    assert tenant.primary_color == "#222222"

    # El WebsiteConfig no quedó colgado en 'generating'.
    config = WebsiteConfig.objects.get(tenant=tenant)
    assert config.status == "onboarding"
