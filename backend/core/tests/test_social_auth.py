# backend/core/tests/test_social_auth.py
# Tests para social authentication (Google, Apple, Facebook).

from unittest.mock import patch

from django.core.cache import caches
from django.test import override_settings
from rest_framework import status

from core.models import SocialAccount, User
from core.social_auth import SocialAuthError, SocialUserInfo, social_login_or_create
from core.test_base import TenantAwareTestCase

SOCIAL_SETTINGS = {
    "GOOGLE_OAUTH_CLIENT_ID": "test-google-client-id",
    "APPLE_CLIENT_ID": "test.apple.client.id",
    "APPLE_TEAM_ID": "TESTTEAMID",
    "FACEBOOK_APP_ID": "123456789",
    "FACEBOOK_APP_SECRET": "test-fb-secret",
}


def _make_google_info(uid="google-uid-123", email="social@example.com"):
    return SocialUserInfo(
        provider="google",
        provider_uid=uid,
        email=email,
        first_name="Social",
        last_name="User",
        avatar_url="https://example.com/avatar.jpg",
        extra_data={"picture": "https://example.com/avatar.jpg"},
    )


def _make_apple_info(uid="apple-uid-456", email="apple@example.com"):
    return SocialUserInfo(
        provider="apple",
        provider_uid=uid,
        email=email,
        first_name="Apple",
        last_name="User",
        extra_data={"is_private_email": False},
    )


@override_settings(**SOCIAL_SETTINGS)
class SocialLoginOrCreateTest(TenantAwareTestCase):
    """Tests para la función core social_login_or_create."""

    def test_create_new_user_via_social(self):
        """Crear usuario nuevo cuando no existe."""
        info = _make_google_info()
        user = social_login_or_create(info, self.tenant)

        self.assertEqual(user.email, "social@example.com")
        self.assertEqual(user.tenant, self.tenant)
        self.assertEqual(user.first_name, "Social")
        self.assertEqual(user.role, "customer")
        self.assertFalse(user.has_usable_password())

        # SocialAccount creado
        sa = SocialAccount.objects.get(user=user, tenant=self.tenant)
        self.assertEqual(sa.provider, "google")
        self.assertEqual(sa.provider_uid, "google-uid-123")

    def test_existing_social_account_returns_user(self):
        """Si ya existe SocialAccount, retornar el usuario directamente."""
        info = _make_google_info()
        user1 = social_login_or_create(info, self.tenant)
        user2 = social_login_or_create(info, self.tenant)

        self.assertEqual(user1.pk, user2.pk)
        # Solo 1 SocialAccount
        self.assertEqual(SocialAccount.objects.filter(tenant=self.tenant, provider="google").count(), 1)

    def test_email_with_password_auto_links(self):
        """Si el email ya existe con password, auto-vincula (el proveedor verificó la identidad)."""
        info = _make_google_info(email="admin@test.com")

        user = social_login_or_create(info, self.tenant)

        self.assertEqual(user.email, "admin@test.com")
        self.assertTrue(user.has_usable_password())
        self.assertTrue(SocialAccount.objects.filter(user=user, tenant=self.tenant, provider="google").exists())

    def test_guest_user_auto_link(self):
        """Guest user se vincula automáticamente."""
        guest = User.objects.create_user(
            email="guest@example.com",
            username="guest_user",
            tenant=self.tenant,
            role="customer",
            is_guest=True,
        )
        guest.set_unusable_password()
        guest.save()

        info = _make_google_info(email="guest@example.com")
        user = social_login_or_create(info, self.tenant)

        self.assertEqual(user.pk, guest.pk)
        self.assertFalse(user.is_guest)
        self.assertEqual(user.first_name, "Social")
        self.assertTrue(SocialAccount.objects.filter(user=user, tenant=self.tenant).exists())

    def test_tenant_isolation(self):
        """Mismo provider_uid en diferentes tenants = diferentes SocialAccounts."""
        tenant_2, _ = self.create_second_tenant()
        info = _make_google_info()

        user1 = social_login_or_create(info, self.tenant)
        user2 = social_login_or_create(info, tenant_2)

        self.assertNotEqual(user1.pk, user2.pk)
        self.assertEqual(user1.tenant, self.tenant)
        self.assertEqual(user2.tenant, tenant_2)

    def test_unusable_password_user_gets_linked(self):
        """User sin password (creado via otro social) se vincula con nuevo provider."""
        # Crear usuario con Apple (sin password)
        apple_info = _make_apple_info(email="multi@example.com")
        user = social_login_or_create(apple_info, self.tenant)

        # Ahora Google con mismo email
        google_info = _make_google_info(email="multi@example.com")
        user2 = social_login_or_create(google_info, self.tenant)

        self.assertEqual(user.pk, user2.pk)
        # 2 SocialAccounts para el mismo usuario
        self.assertEqual(SocialAccount.objects.filter(user=user).count(), 2)


@override_settings(**SOCIAL_SETTINGS)
class SocialLoginViewTest(TenantAwareTestCase):
    """Tests para el endpoint POST /api/auth/social/<provider>/."""

    ENDPOINT = "/api/auth/social/{provider}/"

    def setUp(self):
        super().setUp()
        caches["throttle"].clear()

    @patch("core.views.verify_social_token")
    def test_successful_social_login_creates_user(self, mock_verify):
        """Social login exitoso crea usuario y retorna JWT."""
        mock_verify.return_value = _make_google_info()

        response = self.client.post(
            self.ENDPOINT.format(provider="google"),
            {"token": "fake-google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)
        self.assertIn("user", response.data)
        self.assertIn("tenant", response.data)
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])

    @patch("core.views.verify_social_token")
    def test_invalid_token_returns_401(self, mock_verify):
        """Token inválido retorna 401."""
        mock_verify.side_effect = SocialAuthError("Token inválido")

        response = self.client.post(
            self.ENDPOINT.format(provider="google"),
            {"token": "invalid-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("core.views.verify_social_token")
    def test_email_with_password_auto_links(self, mock_verify):
        """Email con password existente se auto-vincula y retorna 200."""
        mock_verify.return_value = _make_google_info(email="admin@test.com")

        response = self.client.post(
            self.ENDPOINT.format(provider="google"),
            {"token": "fake-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)
        self.assertEqual(response.data["user"]["email"], "admin@test.com")

    def test_missing_token_returns_400(self):
        """Sin token retorna 400."""
        response = self.client.post(
            self.ENDPOINT.format(provider="google"),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(**SOCIAL_SETTINGS)
class SocialLinkViewTest(TenantAwareTestCase):
    """Tests para el endpoint POST /api/auth/social/link/."""

    ENDPOINT = "/api/auth/social/link/"

    def setUp(self):
        super().setUp()
        caches["throttle"].clear()

    @patch("core.views.verify_social_token")
    def test_successful_link(self, mock_verify):
        """Vincular cuenta social con password correcto."""
        mock_verify.return_value = _make_google_info(email="admin@test.com")

        response = self.client.post(
            self.ENDPOINT,
            {
                "provider": "google",
                "token": "fake-token",
                "password": "Admin123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)

        # SocialAccount creado
        self.assertTrue(
            SocialAccount.objects.filter(
                user=self.admin_user,
                tenant=self.tenant,
                provider="google",
            ).exists()
        )

    @patch("core.views.verify_social_token")
    def test_wrong_password_returns_401(self, mock_verify):
        """Contraseña incorrecta retorna 401."""
        mock_verify.return_value = _make_google_info(email="admin@test.com")

        response = self.client.post(
            self.ENDPOINT,
            {
                "provider": "google",
                "token": "fake-token",
                "password": "WrongPassword!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(**SOCIAL_SETTINGS)
class PlatformSocialLoginViewTest(TenantAwareTestCase):
    """Tests para el endpoint POST /api/public/platform-social-login/."""

    ENDPOINT = "/api/public/platform-social-login/"

    def setUp(self):
        super().setUp()
        caches["throttle"].clear()

    @patch("core.views.verify_social_token")
    def test_existing_social_account_cross_tenant(self, mock_verify):
        """Login cross-tenant con SocialAccount existente."""
        info = _make_google_info(email="admin@test.com")
        mock_verify.return_value = info

        # Crear SocialAccount primero
        SocialAccount.objects.create(
            user=self.admin_user,
            tenant=self.tenant,
            provider="google",
            provider_uid="google-uid-123",
            email="admin@test.com",
        )

        # Platform login sin tenant header
        client = self.client.__class__()
        response = client.post(
            self.ENDPOINT,
            {"provider": "google", "token": "fake-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)

    @patch("core.views.verify_social_token")
    def test_no_user_found_returns_404(self, mock_verify):
        """Email no registrado retorna 404."""
        mock_verify.return_value = _make_google_info(email="nonexistent@example.com")

        client = self.client.__class__()
        response = client.post(
            self.ENDPOINT,
            {"provider": "google", "token": "fake-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_missing_fields_returns_400(self):
        """Sin provider o token retorna 400."""
        client = self.client.__class__()
        response = client.post(self.ENDPOINT, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("core.views.verify_social_token")
    def test_email_with_password_auto_links(self, mock_verify):
        """Email con password en platform login se auto-vincula y retorna 200."""
        mock_verify.return_value = _make_google_info(email="admin@test.com")

        client = self.client.__class__()
        response = client.post(
            self.ENDPOINT,
            {"provider": "google", "token": "fake-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)
