"""
Fixtures globales de pytest para el proyecto NERBIS.

Provee tenant, usuarios y APIClient pre-configurados.
Los tests pueden usar estas fixtures en lugar de heredar de TenantAwareTestCase.

Ejemplo:
    def test_algo(api_client, tenant):
        response = api_client.get("/api/algo/")
        assert response.status_code == 200
"""

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.context import clear_current_tenant, set_current_tenant
from core.models import Tenant, User

# ===================================
# TENANT
# ===================================


@pytest.fixture()
def tenant(db):
    """Tenant de prueba."""
    return Tenant.objects.create(
        name="Test Tenant",
        slug="test-tenant",
        schema_name="test_tenant_db",
        industry="beauty",
        email="test@tenant.com",
        phone="123456789",
        country="Colombia",
        plan="trial",
    )


@pytest.fixture()
def tenant_context(tenant):
    """Setea el tenant en el thread-local context y lo limpia al final."""
    set_current_tenant(tenant)
    yield tenant
    clear_current_tenant()


@pytest.fixture()
def second_tenant(db):
    """Segundo tenant para tests de aislamiento."""
    return Tenant.objects.create(
        name="Other Tenant",
        slug="other-tenant",
        schema_name="other_tenant_db",
        industry="gym",
        email="other@tenant.com",
        phone="987654321",
        country="Colombia",
        plan="trial",
    )


# ===================================
# USERS
# ===================================


@pytest.fixture()
def admin_user(tenant):
    """Usuario admin del tenant de prueba."""
    return User.objects.create_user(
        email="admin@test.com",
        password="Admin123!",
        username="admin_test",
        first_name="Admin",
        last_name="Test",
        tenant=tenant,
        role="admin",
    )


@pytest.fixture()
def customer_user(tenant):
    """Usuario customer del tenant de prueba."""
    return User.objects.create_user(
        email="customer@test.com",
        password="Customer123!",
        username="customer_test",
        first_name="Customer",
        last_name="Test",
        tenant=tenant,
        role="customer",
    )


@pytest.fixture()
def second_tenant_admin(second_tenant):
    """Usuario admin del segundo tenant."""
    return User.objects.create_user(
        email="admin@other.com",
        password="Admin123!",
        username="admin_other",
        first_name="Admin",
        last_name="Other",
        tenant=second_tenant,
        role="admin",
    )


# ===================================
# API CLIENT
# ===================================


@pytest.fixture()
def api_client(tenant_context):
    """APIClient con header X-Tenant-Slug configurado y tenant context activo."""
    client = APIClient()
    client.defaults["HTTP_X_TENANT_SLUG"] = tenant_context.slug
    return client


@pytest.fixture()
def auth_admin_client(tenant_context, admin_user):
    """APIClient autenticado como admin con JWT (instancia independiente)."""
    client = APIClient()
    client.defaults["HTTP_X_TENANT_SLUG"] = tenant_context.slug
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {_make_jwt(admin_user)}")
    return client


@pytest.fixture()
def auth_customer_client(tenant_context, customer_user):
    """APIClient autenticado como customer con JWT (instancia independiente)."""
    client = APIClient()
    client.defaults["HTTP_X_TENANT_SLUG"] = tenant_context.slug
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {_make_jwt(customer_user)}")
    return client


# ===================================
# HELPERS (privados)
# ===================================


def _make_jwt(user: User) -> str:
    """Genera un access token JWT con claims de tenant y role."""
    refresh = RefreshToken.for_user(user)
    if user.tenant:
        refresh["tenant_id"] = str(user.tenant.id)
        refresh["tenant_slug"] = user.tenant.slug
    refresh["role"] = user.role
    return str(refresh.access_token)
