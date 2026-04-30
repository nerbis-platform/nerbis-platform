"""
Tests para autenticación y administración de superadmins de plataforma.

Cobertura: 38 escenarios (36 spec + 2 list/deactivate scope additions).
"""

from django.core.cache import caches
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from core.admin_views import build_superadmin_tokens
from core.context import clear_current_tenant
from core.models import Tenant, User


def _make_superadmin(email: str = "root@nerbis.test", password: str = "Sup3rStr0ng!", is_active: bool = True) -> User:
    """Crea un superadmin de plataforma directamente en BD."""
    user = User(
        email=email,
        username=email.split("@")[0],
        first_name="Root",
        last_name="Admin",
        tenant=None,
        is_superuser=True,
        is_staff=True,
        is_active=is_active,
        superadmin_status="active" if is_active else "deactivated",
        role="admin",
        uid=f"admin:{email}",
    )
    user.set_password(password)
    user.save()
    return user


def _make_tenant_with_admin(slug: str = "tnt-x", email: str = "tnt-admin@test.com") -> tuple[Tenant, User]:
    tenant = Tenant.objects.create(
        name=f"Tenant {slug}",
        slug=slug,
        schema_name=f"{slug.replace('-', '_')}_db",
        industry="beauty",
        email=f"contact@{slug}.test",
        phone="123456789",
        country="Colombia",
        plan="trial",
    )
    user = User.objects.create_user(
        email=email,
        password="Tenant123!",
        username=email.split("@")[0],
        first_name="Tenant",
        last_name="Admin",
        tenant=tenant,
        role="admin",
    )
    return tenant, user


def _tenant_jwt_for(user: User) -> str:
    """Construye un JWT estilo tenant (con claims tenant_id, role)."""
    refresh = RefreshToken.for_user(user)
    if user.tenant_id is not None:
        refresh["tenant_id"] = str(user.tenant_id)
        refresh["tenant_slug"] = user.tenant.slug
    refresh["role"] = user.role
    return str(refresh.access_token)


def _superadmin_access_for(user: User) -> str:
    return build_superadmin_tokens(user)["access"]


class _AdminAuthTestBase(TestCase):
    """Base para tests admin: limpia el contexto de tenant y la cache de throttle."""

    def setUp(self):
        clear_current_tenant()
        caches["throttle"].clear()
        self.client = APIClient()

    def tearDown(self):
        clear_current_tenant()
        caches["throttle"].clear()

    def auth_as_superadmin(self, user: User):
        access = _superadmin_access_for(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        return access

    def auth_as_tenant(self, user: User):
        access = _tenant_jwt_for(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        return access


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


class TestAdminLoginEndpoint(_AdminAuthTestBase):
    URL = "/api/admin/auth/login/"

    def setUp(self):
        super().setUp()
        self.superadmin = _make_superadmin(email="root@nerbis.test", password="Sup3rStr0ng!")

    def test_happy_path_returns_tokens_and_user(self):
        res = self.client.post(self.URL, {"email": "root@nerbis.test", "password": "Sup3rStr0ng!"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertIn("access", body)
        self.assertIn("refresh", body)
        self.assertIn("user", body)
        self.assertEqual(body["user"]["email"], "root@nerbis.test")
        self.assertTrue(body["user"]["is_superuser"])

    def test_access_token_has_is_superuser_and_scope_admin(self):
        res = self.client.post(self.URL, {"email": "root@nerbis.test", "password": "Sup3rStr0ng!"}, format="json")
        access = AccessToken(res.json()["access"])
        self.assertTrue(access["is_superuser"])
        self.assertEqual(access["scope"], "admin")

    def test_access_token_has_no_tenant_claims(self):
        res = self.client.post(self.URL, {"email": "root@nerbis.test", "password": "Sup3rStr0ng!"}, format="json")
        access = AccessToken(res.json()["access"])
        self.assertNotIn("tenant_id", access)
        self.assertNotIn("tenant_slug", access)
        self.assertNotIn("role", access)

    def test_wrong_password_returns_401(self):
        res = self.client.post(self.URL, {"email": "root@nerbis.test", "password": "wrong"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_wrong_password_does_not_leak_email_existence(self):
        a = self.client.post(self.URL, {"email": "root@nerbis.test", "password": "wrong"}, format="json")
        b = self.client.post(self.URL, {"email": "ghost@nerbis.test", "password": "wrong"}, format="json")
        self.assertEqual(a.status_code, b.status_code)
        self.assertEqual(a.json(), b.json())

    def test_tenant_user_credentials_rejected(self):
        _tenant, tenant_admin = _make_tenant_with_admin(slug="t-login-1", email="tnt@x.test")
        res = self.client.post(self.URL, {"email": "tnt@x.test", "password": "Tenant123!"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_superadmin_rejected(self):
        _make_superadmin(email="inactive@nerbis.test", password="Sup3rStr0ng!", is_active=False)
        res = self.client.post(self.URL, {"email": "inactive@nerbis.test", "password": "Sup3rStr0ng!"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sixth_attempt_in_one_minute_returns_429(self):
        from core.throttles import AdminLoginThrottle

        caches["throttle"].clear()
        original = AdminLoginThrottle.THROTTLE_RATES.get("admin_login")
        AdminLoginThrottle.THROTTLE_RATES["admin_login"] = "5/min"
        try:
            for _ in range(5):
                self.client.post(self.URL, {"email": "root@nerbis.test", "password": "wrong"}, format="json")
            res = self.client.post(self.URL, {"email": "root@nerbis.test", "password": "wrong"}, format="json")
            self.assertEqual(res.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        finally:
            AdminLoginThrottle.THROTTLE_RATES["admin_login"] = original
            caches["throttle"].clear()

    def test_admin_login_throttle_scope_independent_from_tenant_login(self):
        from core.throttles import AdminLoginThrottle, LoginThrottle

        caches["throttle"].clear()
        original_admin = AdminLoginThrottle.THROTTLE_RATES.get("admin_login")
        original_login = LoginThrottle.THROTTLE_RATES.get("login")
        AdminLoginThrottle.THROTTLE_RATES["admin_login"] = "5/min"
        LoginThrottle.THROTTLE_RATES["login"] = "5/min"
        try:
            # Saturar el throttle de tenant login no debe afectar admin_login
            cache = caches["throttle"]
            for i in range(10):
                cache.set(f"throttle_login_127.0.0.{i}", "x")
            # admin_login sigue libre
            res = self.client.post(
                self.URL,
                {"email": "root@nerbis.test", "password": "Sup3rStr0ng!"},
                format="json",
            )
            self.assertEqual(res.status_code, status.HTTP_200_OK)
        finally:
            AdminLoginThrottle.THROTTLE_RATES["admin_login"] = original_admin
            LoginThrottle.THROTTLE_RATES["login"] = original_login
            caches["throttle"].clear()


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------


class TestAdminRegisterEndpoint(_AdminAuthTestBase):
    URL = "/api/admin/auth/register/"

    def setUp(self):
        super().setUp()
        self.superadmin = _make_superadmin(email="root@nerbis.test")

    def test_unauthenticated_returns_401(self):
        res = self.client.post(
            self.URL,
            {"email": "new@nerbis.test", "password": "Sup3rStr0ng!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_tenant_jwt_returns_403(self):
        _t, tnt_admin = _make_tenant_with_admin(slug="t-reg-1", email="ta@x.test")
        self.auth_as_tenant(tnt_admin)
        res = self.client.post(
            self.URL,
            {"email": "new@nerbis.test", "password": "Sup3rStr0ng!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_superadmin_jwt_creates_user_201(self):
        self.auth_as_superadmin(self.superadmin)
        res = self.client.post(
            self.URL,
            {"email": "new@nerbis.test", "password": "Sup3rStr0ng!", "first_name": "New", "last_name": "Admin"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="new@nerbis.test", tenant__isnull=True).exists())

    def test_created_user_has_expected_flags(self):
        self.auth_as_superadmin(self.superadmin)
        self.client.post(
            self.URL,
            {"email": "flagged@nerbis.test", "password": "Sup3rStr0ng!"},
            format="json",
        )
        u = User.objects.get(email="flagged@nerbis.test", tenant__isnull=True)
        self.assertTrue(u.is_superuser)
        self.assertTrue(u.is_staff)
        self.assertTrue(u.is_active)
        self.assertIsNone(u.tenant_id)

    def test_created_user_has_no_tenant_field_in_response(self):
        self.auth_as_superadmin(self.superadmin)
        res = self.client.post(
            self.URL,
            {"email": "notenant@nerbis.test", "password": "Sup3rStr0ng!"},
            format="json",
        )
        body = res.json()
        self.assertNotIn("tenant", body)
        self.assertNotIn("tenant_slug", body)
        self.assertNotIn("role", body)

    def test_new_superadmin_can_login_immediately(self):
        self.auth_as_superadmin(self.superadmin)
        self.client.post(
            self.URL,
            {"email": "fresh@nerbis.test", "password": "Sup3rStr0ng!"},
            format="json",
        )
        # logout creds
        self.client.credentials()
        res = self.client.post(
            "/api/admin/auth/login/",
            {"email": "fresh@nerbis.test", "password": "Sup3rStr0ng!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_duplicate_email_case_insensitive_returns_400_from_serializer(self):
        self.auth_as_superadmin(self.superadmin)
        res = self.client.post(
            self.URL,
            {"email": "ROOT@nerbis.test", "password": "Sup3rStr0ng!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_email_db_level_raises_integrity_error(self):
        # Bypass serializer check creating directly to verify DB constraint
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                _make_superadmin(email="root@nerbis.test")

    def test_weak_password_returns_400(self):
        self.auth_as_superadmin(self.superadmin)
        res = self.client.post(
            self.URL,
            {"email": "weak@nerbis.test", "password": "abc"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Me
# ---------------------------------------------------------------------------


class TestAdminMeEndpoint(_AdminAuthTestBase):
    URL = "/api/admin/auth/me/"

    def setUp(self):
        super().setUp()
        self.superadmin = _make_superadmin(email="root@nerbis.test")

    def test_superadmin_jwt_returns_profile(self):
        self.auth_as_superadmin(self.superadmin)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["email"], "root@nerbis.test")

    def test_me_response_has_no_tenant_field(self):
        self.auth_as_superadmin(self.superadmin)
        body = self.client.get(self.URL).json()
        self.assertNotIn("tenant", body)
        self.assertNotIn("tenant_slug", body)
        self.assertNotIn("role", body)

    def test_tenant_jwt_returns_403(self):
        _t, tnt_admin = _make_tenant_with_admin(slug="t-me-1", email="me-tnt@x.test")
        self.auth_as_tenant(tnt_admin)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_returns_401(self):
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------


class TestAdminLogoutEndpoint(_AdminAuthTestBase):
    URL = "/api/admin/auth/logout/"

    def setUp(self):
        super().setUp()
        self.superadmin = _make_superadmin(email="root@nerbis.test")

    def test_successful_logout_blacklists_refresh_token(self):
        tokens = build_superadmin_tokens(self.superadmin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        res = self.client.post(self.URL, {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(res.status_code, status.HTTP_205_RESET_CONTENT)

    def test_blacklisted_refresh_cannot_be_used_on_refresh_endpoint(self):
        tokens = build_superadmin_tokens(self.superadmin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.client.post(self.URL, {"refresh": tokens["refresh"]}, format="json")
        # Now try to refresh
        self.client.credentials()
        res = self.client.post(
            "/api/admin/auth/refresh/",
            {"refresh": tokens["refresh"]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Tenant isolation on admin routes
# ---------------------------------------------------------------------------


class TestTenantIsolationOnAdminRoutes(_AdminAuthTestBase):
    def setUp(self):
        super().setUp()
        self.superadmin = _make_superadmin(email="root@nerbis.test")

    def test_stray_x_tenant_slug_header_is_ignored_on_admin_me(self):
        self.auth_as_superadmin(self.superadmin)
        res = self.client.get("/api/admin/auth/me/", HTTP_X_TENANT_SLUG="some-tenant")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_missing_tenant_header_does_not_400_admin_login(self):
        # No HTTP_X_TENANT_SLUG header set
        res = self.client.post(
            "/api/admin/auth/login/",
            {"email": "root@nerbis.test", "password": "Sup3rStr0ng!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_tenant_jwt_rejected_on_admin_me_403(self):
        _t, tnt_admin = _make_tenant_with_admin(slug="t-iso-1", email="iso@x.test")
        self.auth_as_tenant(tnt_admin)
        res = self.client.get("/api/admin/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_misconfigured_user_with_is_superuser_and_tenant_id_rejected_403(self):
        tenant, _admin = _make_tenant_with_admin(slug="t-iso-2", email="bad@x.test")
        # Forge a malformed user: is_superuser=True AND has a tenant
        bad_user = User(
            email="bad-super@x.test",
            username="bad_super",
            tenant=tenant,
            is_superuser=True,
            is_staff=True,
            is_active=True,
            role="admin",
            uid="bad:bad-super@x.test",
        )
        bad_user.set_password("Bad12345!")
        bad_user.save()
        # Build a superadmin-style token for them and call admin endpoint
        access = _superadmin_access_for(bad_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        res = self.client.get("/api/admin/auth/me/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# JWT claim shape
# ---------------------------------------------------------------------------


class TestSuperadminJwtClaimShape(_AdminAuthTestBase):
    def setUp(self):
        super().setUp()
        self.superadmin = _make_superadmin(email="root@nerbis.test")

    def test_build_superadmin_tokens_payload_has_is_superuser_and_scope(self):
        tokens = build_superadmin_tokens(self.superadmin)
        access = AccessToken(tokens["access"])
        self.assertTrue(access["is_superuser"])
        self.assertEqual(access["scope"], "admin")

    def test_build_superadmin_tokens_payload_has_no_tenant_claims(self):
        tokens = build_superadmin_tokens(self.superadmin)
        access = AccessToken(tokens["access"])
        self.assertNotIn("tenant_id", access)
        self.assertNotIn("tenant_slug", access)

    def test_build_superadmin_tokens_payload_has_no_role_claim(self):
        tokens = build_superadmin_tokens(self.superadmin)
        access = AccessToken(tokens["access"])
        self.assertNotIn("role", access)


# ---------------------------------------------------------------------------
# User.save() is_staff sync fix
# ---------------------------------------------------------------------------


class TestUserSaveIsStaffSyncFix(_AdminAuthTestBase):
    def test_createsuperuser_user_retains_is_staff_true(self):
        # Simulate Django's createsuperuser path: tenant=None, is_superuser=True, is_staff=True, role default
        u = User(
            email="cli@nerbis.test",
            username="cli",
            tenant=None,
            is_superuser=True,
            is_staff=True,
            is_active=True,
            role="customer",  # default role; should NOT flip is_staff
            uid="admin:cli@nerbis.test",
        )
        u.set_password("Sup3rStr0ng!")
        u.save()
        u.refresh_from_db()
        self.assertTrue(u.is_staff)
        self.assertTrue(u.is_superuser)

    def test_tenant_admin_still_gets_is_staff_true(self):
        _t, tnt_admin = _make_tenant_with_admin(slug="t-staff-1", email="ta-staff@x.test")
        self.assertTrue(tnt_admin.is_staff)
        self.assertEqual(tnt_admin.role, "admin")

    def test_tenant_customer_still_has_is_staff_false(self):
        tenant, _ = _make_tenant_with_admin(slug="t-staff-2", email="ta-staff2@x.test")
        cust = User.objects.create_user(
            email="cust@x.test",
            password="Cust123!",
            username="cust",
            tenant=tenant,
            role="customer",
        )
        self.assertFalse(cust.is_staff)

    def test_superadmin_resave_preserves_is_staff_true(self):
        u = _make_superadmin(email="resave@nerbis.test")
        u.first_name = "Updated"
        u.save()
        u.refresh_from_db()
        self.assertTrue(u.is_staff)


# ---------------------------------------------------------------------------
# Partial unique index on superadmin email
# ---------------------------------------------------------------------------


class TestPartialUniqueIndexOnSuperadminEmail(_AdminAuthTestBase):
    def test_duplicate_superadmin_email_raises_integrity_error(self):
        _make_superadmin(email="dup@nerbis.test")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                _make_superadmin(email="dup@nerbis.test")

    def test_tenant_user_with_same_email_as_superadmin_allowed(self):
        _make_superadmin(email="shared@x.test")
        # Tenant user with same email is allowed (constraint only applies to tenant IS NULL)
        _t, _u = _make_tenant_with_admin(slug="t-share-1", email="shared@x.test")
        self.assertTrue(User.objects.filter(email="shared@x.test", tenant__isnull=False).exists())
        self.assertTrue(User.objects.filter(email="shared@x.test", tenant__isnull=True).exists())


# ---------------------------------------------------------------------------
# Superadmin list endpoint (NEW scope)
# ---------------------------------------------------------------------------


class TestAdminSuperadminListEndpoint(_AdminAuthTestBase):
    URL = "/api/admin/superadmins/"

    def setUp(self):
        super().setUp()
        self.superadmin = _make_superadmin(email="root@nerbis.test")
        _make_superadmin(email="extra1@nerbis.test")
        _make_superadmin(email="extra2@nerbis.test")
        self._tenant, self._tnt_admin = _make_tenant_with_admin(slug="t-list-1", email="ta-list@x.test")

    def test_superadmin_jwt_returns_paginated_list(self):
        self.auth_as_superadmin(self.superadmin)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        # Paginated response includes "results"
        self.assertIn("results", body)
        self.assertGreaterEqual(len(body["results"]), 3)

    def test_tenant_jwt_returns_403(self):
        self.auth_as_tenant(self._tnt_admin)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_response_excludes_tenant_users(self):
        self.auth_as_superadmin(self.superadmin)
        res = self.client.get(self.URL)
        emails = [u["email"] for u in res.json()["results"]]
        self.assertNotIn("ta-list@x.test", emails)


# ---------------------------------------------------------------------------
# Superadmin deactivate endpoint (NEW scope)
# ---------------------------------------------------------------------------


class TestAdminSuperadminDeactivateEndpoint(_AdminAuthTestBase):
    def setUp(self):
        super().setUp()
        self.superadmin = _make_superadmin(email="root@nerbis.test")
        self.target = _make_superadmin(email="target@nerbis.test")
        self._tenant, self._tnt_admin = _make_tenant_with_admin(slug="t-deact-1", email="ta-deact@x.test")

    def url_for(self, pk: int) -> str:
        return f"/api/admin/superadmins/{pk}/"

    def test_patch_is_active_false_deactivates(self):
        self.auth_as_superadmin(self.superadmin)
        res = self.client.patch(self.url_for(self.target.pk), {"is_active": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)

    def test_tenant_jwt_returns_403(self):
        self.auth_as_tenant(self._tnt_admin)
        res = self.client.patch(self.url_for(self.target.pk), {"is_active": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_on_non_superadmin_user_returns_404(self):
        self.auth_as_superadmin(self.superadmin)
        res = self.client.patch(self.url_for(self._tnt_admin.pk), {"is_active": False}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
