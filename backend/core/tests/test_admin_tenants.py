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

from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
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

    def test_patch_updates_name_field(self) -> None:
        response = self.admin_client.patch(
            self.url,
            data={"name": "New Business Name"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.name, "New Business Name")
        logs = self._audit_logs()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].action, AdminAuditLog.ACTION_EDIT_TENANT_DATA)
        self.assertEqual(
            logs[0].details["changes"]["name"],
            {"old": "Widget Co", "new": "New Business Name"},
        )

    def test_patch_updates_email_field(self) -> None:
        response = self.admin_client.patch(
            self.url,
            data={"email": "new@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.email, "new@example.com")
        logs = self._audit_logs()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].action, AdminAuditLog.ACTION_EDIT_TENANT_DATA)
        self.assertEqual(
            logs[0].details["changes"]["email"],
            {"old": "contact@widget-co.test", "new": "new@example.com"},
        )

    def test_patch_updates_phone_and_industry(self) -> None:
        response = self.admin_client.patch(
            self.url,
            data={"phone": "+1234567890", "industry": "tech"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.phone, "+1234567890")
        self.assertEqual(self.tenant.industry, "tech")
        logs = self._audit_logs()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].action, AdminAuditLog.ACTION_EDIT_TENANT_DATA)
        self.assertEqual(
            logs[0].details["changes"]["phone"],
            {"old": "123456789", "new": "+1234567890"},
        )
        self.assertEqual(
            logs[0].details["changes"]["industry"],
            {"old": "beauty", "new": "tech"},
        )

    def test_patch_no_audit_when_business_data_unchanged(self) -> None:
        """PATCH with same values should not create audit log."""
        response = self.admin_client.patch(
            self.url,
            data={"name": self.tenant.name},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._audit_logs()), 0)

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


# ---------------------------------------------------------------------------
# Reset AI usage (POST /api/admin/tenants/<uuid>/reset-ai-usage/) — Issue #284
# ---------------------------------------------------------------------------


def _make_active_web_subscription(
    tenant: Tenant,
    *,
    ai_limit: int = 50,
    period_start=None,
    period_end=None,
):
    """Asegura una suscripción activa con módulo ``web`` y un límite de IA dado.

    Al crear un ``Tenant``, una señal de ``billing`` auto-crea una suscripción
    trial con el módulo base ``web`` adjunto. Este helper reutiliza esa
    suscripción: la pasa a ``active`` y fija ``Module.included_ai_requests`` para
    que ``get_ai_limit_for_subscription`` (rama mensual / ``active``) devuelva
    ``ai_limit``. Si no existiera (entorno sin módulo base), la crea.

    El período se ancla por defecto a ``[now - 15d, now + 15d]`` para que
    ``check_usage_limit`` (que cuenta desde ``current_period_start``, no desde el
    mes calendario — issue #289) incluya los logs creados relativos a ``now``.
    """
    from billing.models.modules import Module
    from billing.models.subscriptions import Subscription, SubscriptionModule

    now = timezone.now()
    if period_start is None:
        period_start = now - timedelta(days=15)
    if period_end is None:
        period_end = now + timedelta(days=15)
    module, _ = Module.objects.get_or_create(
        slug="web",
        defaults={
            "name": "Web",
            "description": "Módulo web base",
            "is_base": True,
            "monthly_price": 0,
            "included_ai_requests": ai_limit,
        },
    )
    if module.included_ai_requests != ai_limit:
        module.included_ai_requests = ai_limit
        module.save(update_fields=["included_ai_requests"])

    subscription = Subscription.objects.filter(tenant=tenant).first()
    if subscription is None:
        subscription = Subscription.objects.create(
            tenant=tenant,
            status="active",
            billing_period="monthly",
            current_period_start=period_start,
            current_period_end=period_end,
        )
    else:
        subscription.status = "active"
        subscription.billing_period = "monthly"
        subscription.current_period_start = period_start
        subscription.current_period_end = period_end
        subscription.save(
            update_fields=["status", "billing_period", "current_period_start", "current_period_end"]
        )

    SubscriptionModule.objects.update_or_create(
        subscription=subscription,
        module=module,
        defaults={"is_active": True},
    )
    return subscription


def _add_ai_logs(tenant: Tenant, *, count: int, created_at) -> None:
    """Crea ``count`` logs de IA exitosos con un ``created_at`` específico.

    ``created_at`` es ``auto_now_add`` en el modelo, así que se sobreescribe
    vía ``.update()`` tras la creación.
    """
    from websites.models import AIGenerationLog

    for _ in range(count):
        log = AIGenerationLog.objects.create(
            tenant=tenant,
            generation_type="edit_content",
            is_successful=True,
        )
        AIGenerationLog.objects.filter(pk=log.pk).update(created_at=created_at)


class AdminResetAIUsageViewTests(_AdminTenantTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = _make_tenant("ai-shop", name="AI Shop", plan="professional")
        self.subscription = _make_active_web_subscription(self.tenant, ai_limit=50)
        self.url = reverse("admin-tenant-reset-ai-usage", args=[self.tenant.id])

    def _check_usage(self, tenant: Tenant) -> tuple[bool, int, int]:
        from websites.services.ai_service import AIService

        return AIService(tenant=tenant).check_usage_limit(tenant)

    def test_reset_ai_usage_non_superadmin_forbidden(self) -> None:
        tenant_user = User.objects.create_user(
            email="user@ai-shop.test",
            password="Tenant123!",
            username="ai-user",
            first_name="AI",
            last_name="User",
            tenant=self.tenant,
            role="admin",
        )
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {_tenant_user_access_for(tenant_user)}")
        response = client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reset_ai_usage_nonexistent_tenant_returns_404(self) -> None:
        url = reverse(
            "admin-tenant-reset-ai-usage",
            args=["00000000-0000-0000-0000-000000000000"],
        )
        response = self.admin_client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reset_drops_usage_count_to_zero(self) -> None:
        # 3 generaciones recientes (antes del reset) → used == 3 antes del reset.
        _add_ai_logs(self.tenant, count=3, created_at=timezone.now() - timedelta(minutes=10))
        _, used_before, limit = self._check_usage(self.tenant)
        self.assertEqual(used_before, 3)
        self.assertEqual(limit, 50)

        response = self.admin_client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.tenant.refresh_from_db()
        self.assertIsNotNone(self.tenant.ai_usage_reset_at)
        _, used_after, _ = self._check_usage(self.tenant)
        self.assertEqual(used_after, 0)

    def test_reset_creates_audit_log(self) -> None:
        response = self.admin_client.post(self.url, HTTP_X_FORWARDED_FOR="203.0.113.99")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        logs = AdminAuditLog.objects.all()
        self.assertEqual(len(logs), 1)
        log = logs[0]
        self.assertEqual(log.action, "reset_ai_usage")
        self.assertEqual(log.target_type, "Tenant")
        self.assertEqual(log.target_id, str(self.tenant.id))
        self.assertEqual(log.target_repr, f"tenant: {self.tenant.slug}")
        self.assertEqual(log.actor_id, self.superadmin.id)
        self.assertEqual(log.ip_address, "203.0.113.99")

    def test_reset_isolated_between_tenants(self) -> None:
        # Tenant B con su propia suscripción y logs.
        tenant_b = _make_tenant("ai-shop-b", name="AI Shop B", plan="professional")
        _make_active_web_subscription(tenant_b, ai_limit=50)
        # Logs creados antes del reset (este mes, pero en el pasado reciente).
        past = timezone.now() - timedelta(minutes=10)
        _add_ai_logs(self.tenant, count=2, created_at=past)
        _add_ai_logs(tenant_b, count=4, created_at=past)

        # Reset solo en A.
        response = self.admin_client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.tenant.refresh_from_db()
        _, used_a, _ = self._check_usage(self.tenant)
        _, used_b, _ = self._check_usage(tenant_b)
        self.assertEqual(used_a, 0)
        self.assertEqual(used_b, 4)  # B no fue tocado.

        tenant_b.refresh_from_db()
        self.assertIsNone(tenant_b.ai_usage_reset_at)

    def test_reset_is_idempotent_on_double_call(self) -> None:
        _add_ai_logs(self.tenant, count=5, created_at=timezone.now() - timedelta(minutes=10))

        first = self.admin_client.post(self.url)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()
        first_reset_at = self.tenant.ai_usage_reset_at
        self.assertIsNotNone(first_reset_at)

        second = self.admin_client.post(self.url)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()
        # El contador sigue en 0 y se registra una segunda entrada de auditoría.
        _, used_after, _ = self._check_usage(self.tenant)
        self.assertEqual(used_after, 0)
        self.assertGreaterEqual(self.tenant.ai_usage_reset_at, first_reset_at)
        self.assertEqual(AdminAuditLog.objects.filter(action="reset_ai_usage").count(), 2)

    def test_cutoff_excludes_pre_reset_logs(self) -> None:
        now = timezone.now()
        # 3 logs antes del reset (este mes) → no deben contar tras el reset.
        _add_ai_logs(self.tenant, count=3, created_at=now - timedelta(hours=2))

        response = self.admin_client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()

        _, used, _ = self._check_usage(self.tenant)
        self.assertEqual(used, 0)

    def test_cutoff_includes_post_reset_logs(self) -> None:
        now = timezone.now()
        _add_ai_logs(self.tenant, count=3, created_at=now - timedelta(hours=2))

        response = self.admin_client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()

        # 2 logs después del reset → sí cuentan.
        _add_ai_logs(self.tenant, count=2, created_at=self.tenant.ai_usage_reset_at + timedelta(minutes=5))

        _, used, _ = self._check_usage(self.tenant)
        self.assertEqual(used, 2)

    def test_null_reset_at_counts_from_period_start(self) -> None:
        """Sin reinicio manual (NULL), el cutoff es ``current_period_start`` (#289)."""
        self.tenant.refresh_from_db()
        self.assertIsNone(self.tenant.ai_usage_reset_at)

        period_start = self.subscription.current_period_start
        # 2 logs dentro del período (después de period_start) cuentan.
        _add_ai_logs(self.tenant, count=2, created_at=period_start + timedelta(hours=1))
        # 1 log anterior al período (antes de period_start) NO cuenta.
        _add_ai_logs(self.tenant, count=1, created_at=period_start - timedelta(days=2))

        _, used, _ = self._check_usage(self.tenant)
        self.assertEqual(used, 2)

    def test_past_period_reset_at_expires_on_renewal(self) -> None:
        """Un ``reset_at`` de un período anterior no excluye logs del período actual.

        Al renovar la suscripción, ``current_period_start`` (más reciente que el
        reset viejo) gana en ``max(period_start, reset_at)``.
        """
        period_start = self.subscription.current_period_start
        # reset_at fijado antes del período actual (período anterior).
        self.tenant.ai_usage_reset_at = period_start - timedelta(days=10)
        self.tenant.save(update_fields=["ai_usage_reset_at"])

        # 4 generaciones de este período → deben contarse (period_start manda).
        _add_ai_logs(self.tenant, count=4, created_at=period_start + timedelta(hours=3))

        _, used, _ = self._check_usage(self.tenant)
        self.assertEqual(used, 4)


class AIUsagePeriodAnchorTests(TestCase):
    """Issue #289: el límite de IA se ancla al período de la suscripción, no al mes calendario.

    Antes, ``check_usage_limit`` contaba desde ``month_start`` (día 1 del mes),
    lo que daba trato desigual según la fecha de registro: registrarse a fin de
    mes regalaba una segunda ventana de quota al rolar el día 1. Ahora la base es
    ``subscription.current_period_start``, que se renueva con la suscripción.
    """

    def setUp(self) -> None:
        clear_current_tenant()
        self.tenant = _make_tenant("period-shop", name="Period Shop", plan="professional")

    def _check_usage(self, tenant: Tenant) -> tuple[bool, int, int]:
        from websites.services.ai_service import AIService

        return AIService(tenant=tenant).check_usage_limit(tenant)

    def test_end_of_month_registration_does_not_duplicate_quota(self) -> None:
        """Logs de un mes calendario anterior, pero dentro del período, sí cuentan.

        Con la lógica vieja (``month_start``), un log del mes pasado no contaba y
        el día 1 reseteaba la quota a 0. Anclando al período, todos los logs del
        período cuentan aunque crucen el cambio de mes → no se duplica la quota.
        """
        now = timezone.now()
        # Período de 45 días que cruza al menos un cambio de mes calendario.
        _make_active_web_subscription(
            self.tenant,
            ai_limit=50,
            period_start=now - timedelta(days=40),
            period_end=now + timedelta(days=5),
        )

        # 2 logs en un mes calendario anterior a "hoy" pero dentro del período.
        _add_ai_logs(self.tenant, count=2, created_at=now - timedelta(days=38))
        # 1 log reciente, dentro del mismo período.
        _add_ai_logs(self.tenant, count=1, created_at=now - timedelta(days=1))

        _, used, _ = self._check_usage(self.tenant)
        self.assertEqual(used, 3)

    def test_counter_resets_on_subscription_renewal(self) -> None:
        """Al renovar (avanza ``current_period_start``), los logs del período previo no cuentan."""
        now = timezone.now()
        period_start = now - timedelta(days=3)
        _make_active_web_subscription(
            self.tenant,
            ai_limit=50,
            period_start=period_start,
            period_end=now + timedelta(days=27),
        )

        # 5 logs del período anterior (antes de la renovación) → no cuentan.
        _add_ai_logs(self.tenant, count=5, created_at=period_start - timedelta(days=2))
        # 2 logs del período actual → cuentan.
        _add_ai_logs(self.tenant, count=2, created_at=period_start + timedelta(hours=1))

        _, used, limit = self._check_usage(self.tenant)
        self.assertEqual(used, 2)
        self.assertEqual(limit, 50)

    def test_yearly_period_anchors_to_period_start(self) -> None:
        """Con ``billing_period`` anual, el conteo también parte de ``current_period_start``."""
        from billing.models.modules import Module

        now = timezone.now()
        period_start = now - timedelta(days=200)
        subscription = _make_active_web_subscription(
            self.tenant,
            ai_limit=50,
            period_start=period_start,
            period_end=now + timedelta(days=165),
        )
        subscription.billing_period = "yearly"
        subscription.save(update_fields=["billing_period"])
        # Límite anual configurado en el módulo web.
        module = Module.objects.get(slug="web")
        module.annual_included_ai_requests = 600
        module.save(update_fields=["annual_included_ai_requests"])

        # Logs repartidos a lo largo del año, todos dentro del período → cuentan.
        _add_ai_logs(self.tenant, count=3, created_at=period_start + timedelta(days=10))
        _add_ai_logs(self.tenant, count=2, created_at=now - timedelta(days=1))
        # 1 log anterior al período anual → no cuenta.
        _add_ai_logs(self.tenant, count=1, created_at=period_start - timedelta(days=1))

        subscription.refresh_from_db()
        _, used, limit = self._check_usage(self.tenant)
        self.assertEqual(used, 5)
        self.assertEqual(limit, 600)
