"""
Tests de integración para el endpoint de listado de usuarios por tenant
del panel de superadmin de NERBIS:

- ``GET /api/admin/tenants/<uuid:pk>/users/``

Cubre escenarios del spec ``sdd/tenant-user-management`` (#110, Phase 3):
- Listado paginado (default 20 por página).
- Filtros por ``role`` (admin/staff/customer).
- Filtros por ``is_active`` (true/false).
- Search sobre email/first_name/last_name.
- 404 cuando el tenant no existe.
- 401/403 por permisos.
- No se filtran usuarios de otros tenants (aislamiento explícito).
"""

from __future__ import annotations

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.admin_views import build_superadmin_tokens
from core.context import clear_current_tenant
from core.models import Tenant, User

# ---------------------------------------------------------------------------
# Fixtures helpers
# ---------------------------------------------------------------------------


def _make_superadmin(email: str = "root@nerbis.test") -> User:
    user = User(
        email=email,
        username=email.split("@")[0],
        first_name="Root",
        last_name="Admin",
        tenant=None,
        is_superuser=True,
        is_staff=True,
        is_active=True,
        role="admin",
        uid=f"admin:{email}",
    )
    user.set_password("Sup3rStr0ng!")
    user.save()
    return user


def _make_tenant(
    slug: str = "acme",
    *,
    name: str | None = None,
    plan: str = "trial",
    is_active: bool = True,
) -> Tenant:
    return Tenant.objects.create(
        name=name or f"Tenant {slug}",
        slug=slug,
        schema_name=f"{slug.replace('-', '_')}_db",
        industry="beauty",
        email=f"contact@{slug}.test",
        phone="123456789",
        country="Colombia",
        plan=plan,
        is_active=is_active,
    )


def _make_user(
    *,
    tenant: Tenant | None,
    email: str,
    role: str = "customer",
    is_active: bool = True,
    first_name: str = "Test",
    last_name: str = "User",
) -> User:
    return User.objects.create_user(
        email=email,
        password="Test1234!",
        username=email.split("@")[0],
        first_name=first_name,
        last_name=last_name,
        tenant=tenant,
        role=role,
        is_active=is_active,
    )


def _superadmin_access_for(user: User) -> str:
    return build_superadmin_tokens(user)["access"]


def _tenant_user_access_for(user: User) -> str:
    """Construye un JWT estilo tenant — NO debe poder entrar al panel admin."""
    refresh = RefreshToken.for_user(user)
    if user.tenant_id is not None:
        refresh["tenant_id"] = str(user.tenant_id)
        refresh["tenant_slug"] = user.tenant.slug
    refresh["role"] = user.role
    return str(refresh.access_token)


class _AdminTenantUsersTestBase(TestCase):
    """Base que limpia el contexto de tenant y prepara clientes."""

    def setUp(self) -> None:
        clear_current_tenant()
        self.client_anon = APIClient()

        self.superadmin = _make_superadmin()
        self.admin_client = APIClient()
        self.admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_superadmin_access_for(self.superadmin)}")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class AdminTenantUsersListViewTests(_AdminTenantUsersTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = _make_tenant("cafe-bogota", name="Café Bogotá")
        # Segundo tenant para verificar aislamiento.
        self.other_tenant = _make_tenant("spa-medellin", name="Spa Medellín")

        self.admin_user = _make_user(
            tenant=self.tenant,
            email="owner@cafe.test",
            role="admin",
            first_name="Owner",
            last_name="Cafe",
        )
        self.staff_user = _make_user(
            tenant=self.tenant,
            email="staff@cafe.test",
            role="staff",
            first_name="Empleado",
            last_name="Cafe",
        )
        self.customer_active = _make_user(
            tenant=self.tenant,
            email="alice@cafe.test",
            role="customer",
            is_active=True,
            first_name="Alice",
            last_name="Smith",
        )
        self.customer_inactive = _make_user(
            tenant=self.tenant,
            email="bob@cafe.test",
            role="customer",
            is_active=False,
            first_name="Bob",
            last_name="Jones",
        )

        # Usuario del otro tenant — nunca debería aparecer.
        self.other_user = _make_user(
            tenant=self.other_tenant,
            email="foreign@spa.test",
            role="admin",
        )

        self.url = reverse("admin-tenant-users-list", args=[self.tenant.id])

    # ------------------------------------------------------------------
    # Básicos
    # ------------------------------------------------------------------

    def test_list_returns_all_tenant_users(self) -> None:
        response = self.admin_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["count"], 4)
        emails = {row["email"] for row in data["results"]}
        self.assertEqual(
            emails,
            {"owner@cafe.test", "staff@cafe.test", "alice@cafe.test", "bob@cafe.test"},
        )

    def test_list_does_not_leak_users_from_other_tenants(self) -> None:
        response = self.admin_client.get(self.url)
        emails = {row["email"] for row in response.json()["results"]}
        self.assertNotIn(self.other_user.email, emails)

    def test_list_serializer_has_expected_fields(self) -> None:
        response = self.admin_client.get(self.url)
        first = response.json()["results"][0]
        expected = {
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "is_guest",
            "last_login",
            "date_joined",
        }
        self.assertEqual(set(first.keys()), expected)

    # ------------------------------------------------------------------
    # Paginación
    # ------------------------------------------------------------------

    def test_list_paginated_page_size_20(self) -> None:
        """Con 25 usuarios adicionales, la primera página trae 20."""
        for idx in range(25):
            _make_user(
                tenant=self.tenant,
                email=f"user{idx}@cafe.test",
                role="customer",
            )
        response = self.admin_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["count"], 29)  # 4 iniciales + 25 nuevos
        self.assertEqual(len(data["results"]), 20)
        self.assertIsNotNone(data["next"])

    # ------------------------------------------------------------------
    # Filtros
    # ------------------------------------------------------------------

    def test_filter_role_admin(self) -> None:
        response = self.admin_client.get(self.url, {"role": "admin"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [row["email"] for row in response.json()["results"]]
        self.assertEqual(emails, ["owner@cafe.test"])

    def test_filter_role_staff(self) -> None:
        response = self.admin_client.get(self.url, {"role": "staff"})
        emails = [row["email"] for row in response.json()["results"]]
        self.assertEqual(emails, ["staff@cafe.test"])

    def test_filter_role_invalid_is_ignored(self) -> None:
        """Un valor fuera del allowlist no rompe la query — se ignora."""
        response = self.admin_client.get(self.url, {"role": "superadmin"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["count"], 4)

    def test_filter_is_active_true(self) -> None:
        response = self.admin_client.get(self.url, {"is_active": "true"})
        emails = {row["email"] for row in response.json()["results"]}
        self.assertEqual(emails, {"owner@cafe.test", "staff@cafe.test", "alice@cafe.test"})

    def test_filter_is_active_false(self) -> None:
        response = self.admin_client.get(self.url, {"is_active": "false"})
        emails = [row["email"] for row in response.json()["results"]]
        self.assertEqual(emails, ["bob@cafe.test"])

    def test_search_by_email(self) -> None:
        response = self.admin_client.get(self.url, {"search": "alice"})
        emails = [row["email"] for row in response.json()["results"]]
        self.assertEqual(emails, ["alice@cafe.test"])

    def test_search_by_first_name_case_insensitive(self) -> None:
        response = self.admin_client.get(self.url, {"search": "OWNER"})
        emails = [row["email"] for row in response.json()["results"]]
        self.assertEqual(emails, ["owner@cafe.test"])

    # ------------------------------------------------------------------
    # 404 / permisos
    # ------------------------------------------------------------------

    def test_tenant_not_found_returns_404(self) -> None:
        url = reverse(
            "admin-tenant-users-list",
            args=["00000000-0000-0000-0000-000000000000"],
        )
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_returns_401(self) -> None:
        response = self.client_anon.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_superadmin_forbidden(self) -> None:
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {_tenant_user_access_for(self.admin_user)}")
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
