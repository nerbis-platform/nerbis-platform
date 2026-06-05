"""Tests del upload de avatar en ProfileView (PATCH /api/auth/profile/).

Cubre:
- Subida valida de png/jpeg/webp < 2 MB -> 200, avatar guardado en users/avatars/.
- Imagen sobredimensionada (> 2 MB) -> 400, avatar sin cambios.
- Contenido no-imagen renombrado a .png -> 400, nada almacenado.
- Aislamiento de dos tenants: subir para usuario de tenant A no afecta a tenant B.
- Regresion: PATCH JSON solo con first_name sigue funcionando -> 200.

Usa un MEDIA_ROOT temporal por test para no contaminar el repo.
"""

import io
import shutil
import tempfile

import pytest
from django.test import override_settings
from PIL import Image
from rest_framework.test import APIClient

from core.context import clear_current_tenant, set_current_tenant

PROFILE_URL = "/api/auth/profile/"


def _make_image_bytes(fmt: str = "PNG", size: tuple[int, int] = (16, 16)) -> bytes:
    """Genera bytes de una imagen real en memoria via Pillow."""
    buffer = io.BytesIO()
    Image.new("RGB", size, color=(120, 80, 200)).save(buffer, format=fmt)
    return buffer.getvalue()


def _upload(content: bytes, name: str, content_type: str):
    from django.core.files.uploadedfile import SimpleUploadedFile

    return SimpleUploadedFile(name, content, content_type=content_type)


def _auth_client(user) -> APIClient:
    """APIClient autenticado por JWT con header de tenant del usuario."""
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    if user.tenant:
        refresh["tenant_id"] = str(user.tenant.id)
        refresh["tenant_slug"] = user.tenant.slug
    refresh["role"] = user.role

    client = APIClient()
    if user.tenant:
        client.defaults["HTTP_X_TENANT_SLUG"] = user.tenant.slug
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


@pytest.fixture()
def media_root():
    """MEDIA_ROOT temporal aislado por test; se limpia al finalizar."""
    path = tempfile.mkdtemp(prefix="nerbis-avatar-test-")
    with override_settings(MEDIA_ROOT=path):
        yield path
    shutil.rmtree(path, ignore_errors=True)


@pytest.mark.django_db()
@pytest.mark.parametrize(
    ("fmt", "ext", "content_type"),
    [
        ("PNG", "png", "image/png"),
        ("JPEG", "jpg", "image/jpeg"),
        ("WEBP", "webp", "image/webp"),
    ],
)
def test_valid_image_upload_saves_avatar(media_root, customer_user, fmt, ext, content_type):
    set_current_tenant(customer_user.tenant)
    try:
        client = _auth_client(customer_user)
        upload = _upload(_make_image_bytes(fmt), f"avatar.{ext}", content_type)

        response = client.patch(PROFILE_URL, {"avatar": upload}, format="multipart")

        assert response.status_code == 200, response.content
        data = response.json()
        assert data["avatar"], "La respuesta debe incluir la URL del avatar"
        assert "users/avatars/" in data["avatar"]

        customer_user.refresh_from_db()
        assert customer_user.avatar
        assert customer_user.avatar.name.startswith("users/avatars/")
    finally:
        clear_current_tenant()


@pytest.mark.django_db()
def test_oversized_image_rejected(media_root, customer_user):
    set_current_tenant(customer_user.tenant)
    try:
        client = _auth_client(customer_user)
        # Imagen real grande (> 2 MB) generando un PNG de gran tamano.
        big = _make_image_bytes("PNG", size=(2000, 2000))
        # Asegurar > 2 MB rellenando con copias si fuese necesario no aplica:
        # un PNG ruidoso seria mas grande; usamos bytes crudos garantizados.
        payload = big + b"0" * (2 * 1024 * 1024)
        upload = _upload(payload, "big.png", "image/png")

        response = client.patch(PROFILE_URL, {"avatar": upload}, format="multipart")

        assert response.status_code == 400, response.content
        customer_user.refresh_from_db()
        assert not customer_user.avatar
    finally:
        clear_current_tenant()


@pytest.mark.django_db()
def test_non_image_renamed_to_png_rejected(media_root, customer_user):
    set_current_tenant(customer_user.tenant)
    try:
        client = _auth_client(customer_user)
        upload = _upload(b"not an image", "fake.png", "image/png")

        response = client.patch(PROFILE_URL, {"avatar": upload}, format="multipart")

        assert response.status_code == 400, response.content
        customer_user.refresh_from_db()
        assert not customer_user.avatar
    finally:
        clear_current_tenant()


@pytest.mark.django_db()
def test_tenant_isolation_per_user_path(media_root, customer_user, second_tenant_admin):
    """Subir avatar para usuario del tenant A no afecta al usuario del tenant B."""
    # Usuario A (tenant de prueba) sube su avatar.
    set_current_tenant(customer_user.tenant)
    try:
        client_a = _auth_client(customer_user)
        upload = _upload(_make_image_bytes("PNG"), "a.png", "image/png")
        resp_a = client_a.patch(PROFILE_URL, {"avatar": upload}, format="multipart")
        assert resp_a.status_code == 200, resp_a.content
    finally:
        clear_current_tenant()

    customer_user.refresh_from_db()
    second_tenant_admin.refresh_from_db()

    assert customer_user.avatar
    # El usuario del segundo tenant NO debe tener avatar.
    assert not second_tenant_admin.avatar
    # La ruta del avatar de A no debe coincidir con ninguna de B.
    assert customer_user.avatar.name != getattr(second_tenant_admin.avatar, "name", None)


@pytest.mark.django_db()
def test_json_only_first_name_patch_still_works(media_root, customer_user):
    """Regresion: PATCH JSON (sin multipart) con first_name sigue devolviendo 200."""
    set_current_tenant(customer_user.tenant)
    try:
        client = _auth_client(customer_user)

        response = client.patch(PROFILE_URL, {"first_name": "Nuevo"}, format="json")

        assert response.status_code == 200, response.content
        customer_user.refresh_from_db()
        assert customer_user.first_name == "Nuevo"
        assert not customer_user.avatar
    finally:
        clear_current_tenant()
