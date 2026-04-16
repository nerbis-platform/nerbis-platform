"""
Tests de integración para los endpoints del panel de superadmin de NERBIS:
- ``GET  /api/admin/tenants/``
- ``GET  /api/admin/tenants/<uuid>/``
- ``PATCH /api/admin/tenants/<uuid>/``

Cubre escenarios del spec ``sdd/tenant-user-management`` (#110, Phase 2):
- Listado paginado con filtros (is_active, plan, search).
- Búsqueda case-insensitive (incluye caracteres acentuados).
- Protección por permisos (401 sin token, 403 sin superadmin).
- Detalle con campos anotados (user_count, admin_count) y computados
  (subscription_status, days_remaining).
- PATCH con allowlist (is_active, plan, feature flags) — ignora campos
  fuera del allowlist.
- AdminAuditLog creado en transiciones de is_active con IP poblada.
"""

from __future__ import annotations

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.admin_views import build_superadmin_tokens
from core.context import clear_current_tenant
from core.models import AdminAuditLog, Tenant, User

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
    industry: str = "beauty",
    email: str | None = None,
) -> Tenant:
    return Tenant.objects.create(
        name=name or f"Tenant {slug}",
        slug=slug,
        schema_name=f"{slug.replace('-', '_')}_db",
        industry=industry,
        email=email or f"contact@{slug}.test",
        phone="123456789",
        country="Colombia",
        plan=plan,
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


class _AdminTenantTestBase(TestCase):
    """Base que limpia el contexto de tenant y prepara clientes."""

    def setUp(self) -> None:
        clear_current_tenant()
        self.client_anon = APIClient()

        self.superadmin = _make_superadmin()
        self.admin_client = APIClient()
        self.admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_superadmin_access_for(self.superadmin)}")


# ---------------------------------------------------------------------------
# Listado
# ---------------------------------------------------------------------------


class AdminTenantListViewTests(_AdminTenantTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.url = reverse("admin-tenants-list")

        self.tenant_trial = _make_tenant(
            "cafe-bogota",
            name="Café Bogotá",
            plan="trial",
            is_active=True,
        )
        self.tenant_pro = _make_tenant(
            "spa-medellin",
            name="Spa Medellín",
            plan="professional",
            is_active=True,
        )
        self.tenant_inactive = _make_tenant(
            "inactive-shop",
            name="Inactive Shop",
            plan="basic",
            is_active=False,
        )

        # Usuario en uno de los tenants para verificar user_count != 0
        User.objects.create_user(
            email="owner@cafe.test",
            password="Test1234!",
            username="owner",
            first_name="Owner",
            last_name="One",
            tenant=self.tenant_trial,
            role="admin",
        )

    def test_list_tenants_as_superadmin_returns_paginated(self) -> None:
        response = self.admin_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("count", data)
        self.assertIn("results", data)
        self.assertEqual(data["count"], 3)
        self.assertEqual(len(data["results"]), 3)
        # Orden default: -created_at (inactive es el último creado)
        slugs = [row["slug"] for row in data["results"]]
        self.assertEqual(slugs[0], self.tenant_inactive.slug)

    def test_list_tenants_user_count_annotated(self) -> None:
        response = self.admin_client.get(self.url)
        rows = {row["slug"]: row for row in response.json()["results"]}
        self.assertIsInstance(rows[self.tenant_trial.slug]["user_count"], int)
        self.assertEqual(rows[self.tenant_trial.slug]["user_count"], 1)
        self.assertEqual(rows[self.tenant_pro.slug]["user_count"], 0)

    def test_list_tenants_filter_plan(self) -> None:
        response = self.admin_client.get(self.url, {"plan": "trial"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [row["slug"] for row in response.json()["results"]]
        self.assertEqual(slugs, [self.tenant_trial.slug])

    def test_list_tenants_filter_is_active(self) -> None:
        response = self.admin_client.get(self.url, {"is_active": "false"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [row["slug"] for row in response.json()["results"]]
        self.assertEqual(slugs, [self.tenant_inactive.slug])

    def test_list_tenants_search_case_insensitive_accented(self) -> None:
        """Búsqueda ``café`` debe matchear tenant ``Café Bogotá``."""
        response = self.admin_client.get(self.url, {"search": "café"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [row["slug"] for row in response.json()["results"]]
        self.assertIn(self.tenant_trial.slug, slugs)

    def test_list_tenants_search_by_slug(self) -> None:
        response = self.admin_client.get(self.url, {"search": "medellin"})
        slugs = [row["slug"] for row in response.json()["results"]]
        self.assertEqual(slugs, [self.tenant_pro.slug])

    def test_list_tenants_unauthenticated_returns_401(self) -> None:
        response = self.client_anon.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_tenants_non_superadmin_forbidden(self) -> None:
        tenant_user = User.objects.create_user(
            email="tenant-admin@cafe.test",
            password="Tenant123!",
            username="tenant-admin",
            first_name="Tenant",
            last_name="Admin",
            tenant=self.tenant_trial,
            role="admin",
        )
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {_tenant_user_access_for(tenant_user)}")
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# Detalle (GET)
# ---------------------------------------------------------------------------


class AdminTenantDetailViewTests(_AdminTenantTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = _make_tenant(
            "bakery-cali",
            name="Bakery Cali",
            plan="professional",
            is_active=True,
        )
        # Dos usuarios: 1 admin + 1 staff
        User.objects.create_user(
            email="admin@bakery.test",
            password="Test1234!",
            username="admin-bakery",
            first_name="Admin",
            last_name="B",
            tenant=self.tenant,
            role="admin",
        )
        User.objects.create_user(
            email="staff@bakery.test",
            password="Test1234!",
            username="staff-bakery",
            first_name="Staff",
            last_name="B",
            tenant=self.tenant,
            role="staff",
        )
        self.url = reverse("admin-tenants-detail", args=[self.tenant.id])

    def test_tenant_detail_returns_full_info(self) -> None:
        response = self.admin_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["slug"], self.tenant.slug)
        self.assertEqual(data["name"], self.tenant.name)
        self.assertEqual(data["plan"], "professional")
        # Campos computados:
        self.assertIn(data["subscription_status"], {"active", "trial", "expired", "inactive"})
        self.assertIn("days_remaining", data)
        # Anotados:
        self.assertEqual(data["user_count"], 2)
        self.assertEqual(data["admin_count"], 1)
        # Nunca deberían aparecer estos campos internos:
        self.assertNotIn("schema_name", data)

    def test_tenant_detail_404_on_unknown_uuid(self) -> None:
        url = reverse(
            "admin-tenants-detail",
            args=["00000000-0000-0000-0000-000000000000"],
        )
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_tenant_detail_unauthenticated_returns_401(self) -> None:
        response = self.client_anon.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# PATCH / audit log
# ---------------------------------------------------------------------------


class AdminTenantUpdateViewTests(_AdminTenantTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = _make_tenant(
            "widget-co",
            name="Widget Co",
            plan="basic",
            is_active=True,
        )
        self.url = reverse("admin-tenants-detail", args=[self.tenant.id])

    def _audit_logs(self) -> list[AdminAuditLog]:
        return list(AdminAuditLog.objects.all())

    def test_patch_deactivate_creates_audit_log(self) -> None:
        response = self.admin_client.patch(
            self.url,
            data={"is_active": False},
            format="json",
            HTTP_X_FORWARDED_FOR="203.0.113.77",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()["is_active"])

        self.tenant.refresh_from_db()
        self.assertFalse(self.tenant.is_active)

        logs = self._audit_logs()
        self.assertEqual(len(logs), 1)
        log = logs[0]
        self.assertEqual(log.action, AdminAuditLog.ACTION_DEACTIVATE_TENANT)
        self.assertEqual(log.target_type, "Tenant")
        self.assertEqual(log.target_id, str(self.tenant.id))
        self.assertEqual(log.target_repr, f"tenant: {self.tenant.slug}")
        self.assertEqual(log.actor_id, self.superadmin.id)
        self.assertEqual(log.ip_address, "203.0.113.77")

    def test_patch_activate_creates_audit_log(self) -> None:
        self.tenant.is_active = False
        self.tenant.save(update_fields=["is_active"])

        response = self.admin_client.patch(
            self.url,
            data={"is_active": True},
            format="json",
            HTTP_X_FORWARDED_FOR="198.51.100.10",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["is_active"])

        logs = self._audit_logs()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].action, AdminAuditLog.ACTION_ACTIVATE_TENANT)
        self.assertEqual(logs[0].ip_address, "198.51.100.10")

    def test_patch_noop_is_active_no_audit_entry(self) -> None:
        """Si el valor no cambia, no se registra entrada en el audit log."""
        response = self.admin_client.patch(
            self.url,
            data={"is_active": True},  # ya es True
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._audit_logs()), 0)

    def test_patch_plan_change_no_audit_entry(self) -> None:
        """Cambiar plan no es destructivo — no dispara audit log."""
        response = self.admin_client.patch(
            self.url,
            data={"plan": "enterprise"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.plan, "enterprise")
        self.assertEqual(len(self._audit_logs()), 0)

    def test_patch_ignores_name_field(self) -> None:
        original_name = self.tenant.name
        response = self.admin_client.patch(
            self.url,
            data={"name": "Hacked Name", "is_active": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.name, original_name)

    def test_patch_ignores_slug_field(self) -> None:
        original_slug = self.tenant.slug
        response = self.admin_client.patch(
            self.url,
            data={"slug": "hacked-slug"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.slug, original_slug)

    def test_patch_nonexistent_returns_404(self) -> None:
        url = reverse(
            "admin-tenants-detail",
            args=["00000000-0000-0000-0000-000000000000"],
        )
        response = self.admin_client.patch(
            url,
            data={"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_put_not_allowed(self) -> None:
        response = self.admin_client.put(
            self.url,
            data={"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_patch_feature_flags(self) -> None:
        response = self.admin_client.patch(
            self.url,
            data={"has_website": True, "has_shop": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()
        self.assertTrue(self.tenant.has_website)
        self.assertTrue(self.tenant.has_shop)
        self.assertEqual(len(self._audit_logs()), 0)

    def test_patch_unauthenticated_returns_401(self) -> None:
        response = self.client_anon.patch(
            self.url,
            data={"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
