"""
Tests de integración para los endpoints de gestión de métodos de autenticación
del panel de superadmin de NERBIS (Phase 4, Issue #110):

- ``POST   /api/admin/users/<int:pk>/reset-password/``
- ``DELETE /api/admin/users/<int:pk>/passkeys/<int:passkey_pk>/``
- ``POST   /api/admin/users/<int:pk>/disable-2fa/``
- ``DELETE /api/admin/users/<int:pk>/social/<str:provider>/``

Escenarios cubiertos (contrato del spec):
- Happy path por cada acción + ``AdminAuditLog`` registrado con IP y details.
- Superadmins (``tenant IS NULL``) NO accesibles → 404.
- Self-protection en reset-password (no puedes resetearte a ti mismo).
- Reset-password para usuario inactivo también funciona (permite recuperación).
- Reset-password sin email → 400.
- Reset-password: se enqueuea la tarea Celery con ``user_id`` y ``token``
  correctos + se crea un ``PasswordSetToken`` válido.
- Passkey de otro usuario o inexistente → 404.
- Sin TOTP device → 404.
- Provider inválido → 400; provider válido no vinculado → 404.
- Permisos (401 sin token, 403 sin superadmin).
"""

from __future__ import annotations

from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.admin_views import build_superadmin_tokens
from core.context import clear_current_tenant
from core.models import (
    AdminAuditLog,
    PasswordSetToken,
    SocialAccount,
    Tenant,
    TOTPDevice,
    User,
    WebAuthnCredential,
)

# ---------------------------------------------------------------------------
# Fixtures helpers (mismos patrones que Phase 3)
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
    slug: str = "cafe-bogota",
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


class _AdminAuthMethodsTestBase(TestCase):
    def setUp(self) -> None:
        clear_current_tenant()
        self.client_anon = APIClient()
        self.superadmin = _make_superadmin()
        self.admin_client = APIClient()
        self.admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {_superadmin_access_for(self.superadmin)}")
        self.tenant = _make_tenant("cafe-bogota", name="Café Bogotá")
        self.target = _make_user(
            tenant=self.tenant,
            email="juan@cafe.test",
            first_name="Juan",
            last_name="Pérez",
            role="customer",
        )


# ---------------------------------------------------------------------------
# AdminResetPasswordView
# ---------------------------------------------------------------------------


class AdminResetPasswordTests(_AdminAuthMethodsTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.url = reverse("admin-users-reset-password", args=[self.target.pk])

    @patch("notifications.tasks.send_admin_password_reset_email.delay")
    def test_reset_password_success_enqueues_task_and_writes_audit(self, mock_delay) -> None:
        response = self.admin_client.post(
            self.url,
            data={},
            format="json",
            HTTP_X_FORWARDED_FOR="203.0.113.42",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("detail", response.json())

        # Token creado
        tokens = list(PasswordSetToken.objects.filter(user=self.target))
        self.assertEqual(len(tokens), 1)
        self.assertTrue(tokens[0].is_valid)

        # Tarea Celery encolada con args correctos
        mock_delay.assert_called_once()
        args, _kwargs = mock_delay.call_args
        self.assertEqual(args[0], self.target.id)
        self.assertEqual(args[1], tokens[0].token)

        # Audit log
        logs = list(AdminAuditLog.objects.all())
        self.assertEqual(len(logs), 1)
        log = logs[0]
        self.assertEqual(log.action, AdminAuditLog.ACTION_RESET_PASSWORD)
        self.assertEqual(log.target_type, "User")
        self.assertEqual(log.target_id, str(self.target.pk))
        self.assertEqual(log.target_repr, f"user: {self.target.email}")
        self.assertEqual(log.actor_id, self.superadmin.id)
        self.assertEqual(log.ip_address, "203.0.113.42")
        self.assertEqual(log.details, {"email": self.target.email})

    @patch("notifications.tasks.send_admin_password_reset_email.delay")
    def test_reset_password_inactive_user_still_works(self, mock_delay) -> None:
        self.target.is_active = False
        self.target.save(update_fields=["is_active"])

        response = self.admin_client.post(self.url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_delay.assert_called_once()

    @patch("notifications.tasks.send_admin_password_reset_email.delay")
    def test_reset_password_invalidates_previous_tokens(self, mock_delay) -> None:
        # Token antiguo existente.
        _old = PasswordSetToken.create_for_user(self.target, hours_valid=24)

        response = self.admin_client.post(self.url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        tokens = list(PasswordSetToken.objects.filter(user=self.target, used_at__isnull=True))
        # ``create_for_user`` elimina tokens no usados previos, por lo que
        # sólo queda el nuevo.
        self.assertEqual(len(tokens), 1)
        mock_delay.assert_called_once()
        self.assertEqual(mock_delay.call_args.args[1], tokens[0].token)

    def test_reset_password_no_email_returns_400(self) -> None:
        self.target.email = ""
        self.target.save(update_fields=["email"])

        response = self.admin_client.post(self.url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(PasswordSetToken.objects.filter(user=self.target).exists())
        self.assertEqual(AdminAuditLog.objects.count(), 0)

    def test_reset_password_self_returns_400(self) -> None:
        url = reverse("admin-users-reset-password", args=[self.superadmin.pk])
        response = self.admin_client.post(url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AdminAuditLog.objects.count(), 0)

    def test_reset_password_superadmin_target_returns_404(self) -> None:
        """Para superadmins existe otro endpoint — aquí se oculta como 404."""
        other_super = _make_superadmin("other-super@nerbis.test")
        url = reverse("admin-users-reset-password", args=[other_super.pk])
        response = self.admin_client.post(url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reset_password_nonexistent_returns_404(self) -> None:
        url = reverse("admin-users-reset-password", args=[999999])
        response = self.admin_client.post(url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_reset_password_unauthenticated_returns_401(self) -> None:
        response = self.client_anon.post(self.url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reset_password_non_superadmin_forbidden(self) -> None:
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {_tenant_user_access_for(self.target)}")
        response = client.post(self.url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# AdminDeletePasskeyView
# ---------------------------------------------------------------------------


class AdminDeletePasskeyTests(_AdminAuthMethodsTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.passkey = WebAuthnCredential.objects.create(
            user=self.target,
            credential_id=b"cred-id-1",
            public_key=b"pub-key-1",
            sign_count=0,
            name="MacBook Pro Touch ID",
            transports=["internal"],
        )
        self.url = reverse(
            "admin-users-delete-passkey",
            args=[self.target.pk, self.passkey.pk],
        )

    def test_delete_passkey_success(self) -> None:
        response = self.admin_client.delete(
            self.url,
            HTTP_X_FORWARDED_FOR="198.51.100.10",
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(WebAuthnCredential.objects.filter(pk=self.passkey.pk).exists())

        logs = list(AdminAuditLog.objects.all())
        self.assertEqual(len(logs), 1)
        log = logs[0]
        self.assertEqual(log.action, AdminAuditLog.ACTION_DELETE_PASSKEY)
        self.assertEqual(log.target_type, "User")
        self.assertEqual(log.target_id, str(self.target.pk))
        self.assertEqual(log.target_repr, f"user: {self.target.email}")
        self.assertEqual(log.ip_address, "198.51.100.10")
        self.assertEqual(log.details, {"passkey_name": "MacBook Pro Touch ID"})

    def test_delete_passkey_wrong_user_returns_404(self) -> None:
        other_user = _make_user(tenant=self.tenant, email="otro@cafe.test")
        url = reverse(
            "admin-users-delete-passkey",
            args=[other_user.pk, self.passkey.pk],
        )
        response = self.admin_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # El passkey debe seguir existiendo.
        self.assertTrue(WebAuthnCredential.objects.filter(pk=self.passkey.pk).exists())

    def test_delete_passkey_missing_returns_404(self) -> None:
        url = reverse("admin-users-delete-passkey", args=[self.target.pk, 999999])
        response = self.admin_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_passkey_superadmin_target_returns_404(self) -> None:
        url = reverse(
            "admin-users-delete-passkey",
            args=[self.superadmin.pk, self.passkey.pk],
        )
        response = self.admin_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_passkey_unauthenticated_returns_401(self) -> None:
        response = self.client_anon.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_passkey_non_superadmin_forbidden(self) -> None:
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {_tenant_user_access_for(self.target)}")
        response = client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# AdminDisable2FAView
# ---------------------------------------------------------------------------


class AdminDisable2FATests(_AdminAuthMethodsTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.device = TOTPDevice(user=self.target, confirmed=True)
        self.device.set_secret("JBSWY3DPEHPK3PXP")
        self.device.save()
        self.url = reverse("admin-users-disable-2fa", args=[self.target.pk])

    def test_disable_2fa_success(self) -> None:
        response = self.admin_client.post(
            self.url,
            data={},
            format="json",
            HTTP_X_FORWARDED_FOR="198.51.100.99",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(TOTPDevice.objects.filter(user=self.target).exists())

        logs = list(AdminAuditLog.objects.all())
        self.assertEqual(len(logs), 1)
        log = logs[0]
        self.assertEqual(log.action, AdminAuditLog.ACTION_DISABLE_2FA)
        self.assertEqual(log.target_type, "User")
        self.assertEqual(log.target_id, str(self.target.pk))
        self.assertEqual(log.ip_address, "198.51.100.99")
        self.assertEqual(log.details, {"was_confirmed": True})

    def test_disable_2fa_no_device_returns_404(self) -> None:
        self.device.delete()
        response = self.admin_client.post(self.url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(AdminAuditLog.objects.count(), 0)

    def test_disable_2fa_unconfirmed_device_still_deletes(self) -> None:
        """Si existe TOTPDevice aunque no esté confirmado, también lo elimina."""
        self.device.confirmed = False
        self.device.save(update_fields=["confirmed"])

        response = self.admin_client.post(self.url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(TOTPDevice.objects.filter(user=self.target).exists())
        log = AdminAuditLog.objects.first()
        self.assertIsNotNone(log)
        self.assertEqual(log.details, {"was_confirmed": False})

    def test_disable_2fa_superadmin_target_returns_404(self) -> None:
        url = reverse("admin-users-disable-2fa", args=[self.superadmin.pk])
        response = self.admin_client.post(url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_disable_2fa_unauthenticated_returns_401(self) -> None:
        response = self.client_anon.post(self.url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_disable_2fa_non_superadmin_forbidden(self) -> None:
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {_tenant_user_access_for(self.target)}")
        response = client.post(self.url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# AdminUnlinkSocialView
# ---------------------------------------------------------------------------


class AdminUnlinkSocialTests(_AdminAuthMethodsTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.social = SocialAccount.objects.create(
            tenant=self.tenant,
            user=self.target,
            provider="google",
            provider_uid="google-uid-abc",
            email="juan@gmail.com",
            extra_data={"name": "Juan"},
        )

    def _url(self, user_pk: int, provider: str) -> str:
        return reverse("admin-users-unlink-social", args=[user_pk, provider])

    def test_unlink_google_success(self) -> None:
        url = self._url(self.target.pk, "google")
        response = self.admin_client.delete(
            url,
            HTTP_X_FORWARDED_FOR="192.0.2.77",
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SocialAccount.objects.filter(pk=self.social.pk).exists())

        logs = list(AdminAuditLog.objects.all())
        self.assertEqual(len(logs), 1)
        log = logs[0]
        self.assertEqual(log.action, AdminAuditLog.ACTION_UNLINK_SOCIAL)
        self.assertEqual(log.target_type, "User")
        self.assertEqual(log.target_id, str(self.target.pk))
        self.assertEqual(log.ip_address, "192.0.2.77")
        self.assertEqual(log.details, {"provider": "google", "email": "juan@gmail.com"})

    def test_unlink_invalid_provider_returns_400(self) -> None:
        url = self._url(self.target.pk, "twitter")
        response = self.admin_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(SocialAccount.objects.filter(pk=self.social.pk).exists())

    def test_unlink_not_linked_returns_404(self) -> None:
        # Provider válido pero el usuario no lo tiene vinculado.
        url = self._url(self.target.pk, "apple")
        response = self.admin_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unlink_wrong_user_returns_404(self) -> None:
        other_user = _make_user(tenant=self.tenant, email="otro@cafe.test")
        url = self._url(other_user.pk, "google")
        response = self.admin_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(SocialAccount.objects.filter(pk=self.social.pk).exists())

    def test_unlink_superadmin_target_returns_404(self) -> None:
        url = self._url(self.superadmin.pk, "google")
        response = self.admin_client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unlink_unauthenticated_returns_401(self) -> None:
        url = self._url(self.target.pk, "google")
        response = self.client_anon.delete(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unlink_non_superadmin_forbidden(self) -> None:
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {_tenant_user_access_for(self.target)}")
        url = self._url(self.target.pk, "google")
        response = client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
