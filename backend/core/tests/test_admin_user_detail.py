"""
Tests de integración para los endpoints de detalle / update de usuario
del panel de superadmin de NERBIS:

- ``GET   /api/admin/users/<int:pk>/``
- ``PATCH /api/admin/users/<int:pk>/``

Cubre escenarios del spec ``sdd/tenant-user-management`` (#110, Phase 3):
- Detalle con bloque completo de métodos de autenticación (social,
  passkeys, TOTP).
- Detalle cuando el usuario no tiene métodos de autenticación configurados.
- Superadmins (tenant IS NULL) NO son accesibles vía este endpoint → 404.
- PATCH con allowlist (is_active, role) — ignora campos fuera de allowlist.
- Self-protection: el superadmin autenticado no puede modificar su propia
  cuenta aquí → 403.
- AdminAuditLog creado en cada transición destructiva
  (deactivate/activate user, change role) con IP.
- No-op (mismo valor) no dispara audit log.
- Permisos (401 sin token, 403 sin superadmin).
"""

from __future__ import annotations

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.admin_views import build_superadmin_tokens
from core.context import clear_current_tenant
from core.models import (
    AdminAuditLog,
    SocialAccount,
    Tenant,
    TOTPDevice,
    User,
    WebAuthnCredential,
)

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
) -> Tenant:
    return Tenant.objects.create(
        name=name or f"Tenant {slug}",
        slug=slug,
        schema_name=f"{slug.replace('-', '_')}_db",
        industry="beauty",
        email=f"contact@{slug}.test",
        phone="123456789",
        country="Colombia",
        plan="professional",
        is_active=True,
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
    refresh = RefreshToken.for_user(user)
    if user.tenant_id is not None:
        refresh["tenant_id"] = str(user.tenant_id)
        refresh["tenant_slug"] = user.tenant.slug
    refresh["role"] = user.role
    return str(refresh.access_token)


class _AdminUserDetailTestBase(TestCase):
    def setUp(self) -> None:
        clear_current_tenant()
        self.client_anon = APIClient()

        self.superadmin = _make_superadmin()
        self.admin_client = APIClient()
        self.admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_superadmin_access_for(self.superadmin)}")

        self.tenant = _make_tenant("cafe-bogota", name="Café Bogotá")


# ---------------------------------------------------------------------------
# Detalle — GET
# ---------------------------------------------------------------------------


class AdminUserDetailGETTests(_AdminUserDetailTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.target = _make_user(
            tenant=self.tenant,
            email="juan@cafe.test",
            role="admin",
            first_name="Juan",
            last_name="Pérez",
        )
        self.url = reverse("admin-users-detail", args=[self.target.pk])

    def test_detail_without_auth_methods(self) -> None:
        response = self.admin_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Campos base
        self.assertEqual(data["email"], "juan@cafe.test")
        self.assertEqual(data["role"], "admin")
        self.assertEqual(data["tenant_id"], str(self.tenant.id))
        self.assertEqual(data["tenant_slug"], self.tenant.slug)
        self.assertEqual(data["tenant_name"], self.tenant.name)
        # Auth methods vacíos
        self.assertEqual(data["social_accounts"], [])
        self.assertEqual(data["passkeys"], [])
        self.assertFalse(data["totp_enabled"])
        self.assertIsNone(data["totp_confirmed_at"])

    def test_detail_with_all_auth_methods(self) -> None:
        # Social account
        SocialAccount.objects.create(
            tenant=self.tenant,
            user=self.target,
            provider="google",
            provider_uid="google-uid-abc",
            email="juan@gmail.com",
            extra_data={"name": "Juan Pérez"},
        )
        # Passkey
        WebAuthnCredential.objects.create(
            user=self.target,
            credential_id=b"cred-id-1",
            public_key=b"pubkey-1",
            sign_count=0,
            name="MacBook Pro Touch ID",
            transports=["internal"],
        )
        # TOTP confirmado
        device = TOTPDevice(user=self.target, confirmed=True)
        device.set_secret("JBSWY3DPEHPK3PXP")
        device.save()

        response = self.admin_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(len(data["social_accounts"]), 1)
        social = data["social_accounts"][0]
        self.assertEqual(social["provider"], "google")
        self.assertEqual(social["email"], "juan@gmail.com")
        # extra_data and provider_uid are intentionally NOT exposed.
        self.assertNotIn("extra_data", social)
        self.assertNotIn("provider_uid", social)
        self.assertIn("connected_at", social)

        self.assertEqual(len(data["passkeys"]), 1)
        passkey = data["passkeys"][0]
        self.assertEqual(passkey["name"], "MacBook Pro Touch ID")
        self.assertIn("last_used", passkey)
        self.assertIn("created_at", passkey)
        # NO expone credential_id ni public_key
        self.assertNotIn("credential_id", passkey)
        self.assertNotIn("public_key", passkey)

        self.assertTrue(data["totp_enabled"])
        self.assertIsNotNone(data["totp_confirmed_at"])

    def test_detail_with_unconfirmed_totp_returns_enabled_false(self) -> None:
        device = TOTPDevice(user=self.target, confirmed=False)
        device.set_secret("JBSWY3DPEHPK3PXP")
        device.save()

        response = self.admin_client.get(self.url)
        data = response.json()
        self.assertFalse(data["totp_enabled"])
        self.assertIsNone(data["totp_confirmed_at"])

    def test_detail_superadmin_returns_404(self) -> None:
        """Superadmins (tenant IS NULL) NO son accesibles vía este endpoint."""
        url = reverse("admin-users-detail", args=[self.superadmin.pk])
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_detail_nonexistent_user_returns_404(self) -> None:
        url = reverse("admin-users-detail", args=[999999])
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_detail_unauthenticated_returns_401(self) -> None:
        response = self.client_anon.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_detail_non_superadmin_forbidden(self) -> None:
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {_tenant_user_access_for(self.target)}")
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# PATCH / audit log
# ---------------------------------------------------------------------------


class AdminUserDetailPATCHTests(_AdminUserDetailTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.target = _make_user(
            tenant=self.tenant,
            email="juan@cafe.test",
            role="customer",
            is_active=True,
        )
        self.url = reverse("admin-users-detail", args=[self.target.pk])

    def _audit_logs(self) -> list[AdminAuditLog]:
        return list(AdminAuditLog.objects.all())

    # ------------------------------------------------------------------
    # is_active
    # ------------------------------------------------------------------

    def test_deactivate_user_creates_audit_log(self) -> None:
        response = self.admin_client.patch(
            self.url,
            data={"is_active": False},
            format="json",
            HTTP_X_FORWARDED_FOR="203.0.113.55",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()["is_active"])

        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)

        logs = self._audit_logs()
        self.assertEqual(len(logs), 1)
        log = logs[0]
        self.assertEqual(log.action, AdminAuditLog.ACTION_DEACTIVATE_USER)
        self.assertEqual(log.target_type, "User")
        self.assertEqual(log.target_id, str(self.target.pk))
        self.assertEqual(log.target_repr, f"user: {self.target.email}")
        self.assertEqual(log.actor_id, self.superadmin.id)
        self.assertEqual(log.ip_address, "203.0.113.55")
        self.assertEqual(
            log.details,
            {"previous_is_active": True, "new_is_active": False},
        )

    def test_activate_user_creates_audit_log(self) -> None:
        self.target.is_active = False
        self.target.save(update_fields=["is_active"])

        response = self.admin_client.patch(
            self.url,
            data={"is_active": True},
            format="json",
            HTTP_X_FORWARDED_FOR="198.51.100.22",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        logs = self._audit_logs()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].action, AdminAuditLog.ACTION_ACTIVATE_USER)
        self.assertEqual(logs[0].ip_address, "198.51.100.22")

    def test_noop_is_active_does_not_create_audit_log(self) -> None:
        response = self.admin_client.patch(
            self.url,
            data={"is_active": True},  # ya es True
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._audit_logs()), 0)

    # ------------------------------------------------------------------
    # role
    # ------------------------------------------------------------------

    def test_change_role_creates_audit_log_with_details(self) -> None:
        response = self.admin_client.patch(
            self.url,
            data={"role": "admin"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["role"], "admin")

        self.target.refresh_from_db()
        self.assertEqual(self.target.role, "admin")

        logs = self._audit_logs()
        self.assertEqual(len(logs), 1)
        log = logs[0]
        self.assertEqual(log.action, AdminAuditLog.ACTION_CHANGE_USER_ROLE)
        self.assertEqual(log.details, {"old_role": "customer", "new_role": "admin"})

    def test_noop_role_does_not_create_audit_log(self) -> None:
        response = self.admin_client.patch(
            self.url,
            data={"role": "customer"},  # ya es customer
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self._audit_logs()), 0)

    def test_change_role_and_is_active_creates_two_audit_logs(self) -> None:
        response = self.admin_client.patch(
            self.url,
            data={"role": "staff", "is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        actions = sorted(log.action for log in self._audit_logs())
        self.assertEqual(
            actions,
            sorted(
                [
                    AdminAuditLog.ACTION_DEACTIVATE_USER,
                    AdminAuditLog.ACTION_CHANGE_USER_ROLE,
                ]
            ),
        )

    # ------------------------------------------------------------------
    # Allowlist / self-protection
    # ------------------------------------------------------------------

    def test_patch_ignores_email_field(self) -> None:
        original_email = self.target.email
        response = self.admin_client.patch(
            self.url,
            data={"email": "hacked@evil.test"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertEqual(self.target.email, original_email)

    def test_patch_ignores_tenant_field(self) -> None:
        original_tenant_id = self.target.tenant_id
        other_tenant = _make_tenant("other-tenant", name="Other")
        response = self.admin_client.patch(
            self.url,
            data={"tenant": str(other_tenant.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertEqual(self.target.tenant_id, original_tenant_id)

    def test_cannot_modify_own_user(self) -> None:
        """Self-protection: el superadmin no puede modificarse via este endpoint.

        Para ejercitar el guard ``user.pk == request.user.pk``, creamos un
        superadmin real (tenant=None) que intenta PATCH su propio registro.
        Como el queryset excluye superadmins (tenant IS NULL), DRF devuelve
        404 antes de llegar al guard. Sin embargo, la protección sigue
        existiendo como defensa en profundidad. Verificamos el 404.

        Para cubrir la rama del guard explícitamente, creamos un superadmin
        con tenant asignado — ``IsSuperAdmin`` pasa porque ``tenant=None``
        y el usuario aparece en el queryset porque tiene tenant.
        """
        # Creamos un superadmin real (tenant=None) que también existe como
        # usuario de tenant — simulamos asignándole un tenant después de la
        # creación para que pase tanto IsSuperAdmin como el queryset filter.
        shadow_admin = _make_superadmin(email="shadow@nerbis.test")

        # Asignamos tenant para que aparezca en el queryset
        # (filter(tenant__isnull=False)).
        shadow_admin.tenant = self.tenant
        shadow_admin.save(update_fields=["tenant"])

        # Cliente autenticado como el shadow_admin (superadmin real con
        # tenant=None en el token, IsSuperAdmin pasa).
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {_superadmin_access_for(shadow_admin)}")

        # El guard ``user.pk == request.user.pk`` se activa y devuelve 403.
        url = reverse("admin-users-detail", args=[shadow_admin.pk])
        response = client.patch(url, data={"is_active": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ------------------------------------------------------------------
    # Método / 404
    # ------------------------------------------------------------------

    def test_patch_superadmin_returns_404(self) -> None:
        """No podemos modificar un superadmin via este endpoint."""
        url = reverse("admin-users-detail", args=[self.superadmin.pk])
        response = self.admin_client.patch(
            url,
            data={"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_nonexistent_returns_404(self) -> None:
        url = reverse("admin-users-detail", args=[999999])
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

    def test_patch_unauthenticated_returns_401(self) -> None:
        response = self.client_anon.patch(
            self.url,
            data={"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
