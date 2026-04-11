# backend/core/tests/test_2fa.py
# Tests para 2FA (TOTP): setup, verify, disable, backup codes, challenge.

from unittest.mock import patch

import pyotp
from django.urls import reverse
from rest_framework import status

from core.models import TOTPDevice, User
from core.social_auth import SocialUserInfo
from core.test_base import TenantAwareTestCase


def _make_confirmed_device(user: User) -> tuple[TOTPDevice, str]:
    """Helper: crea y confirma un TOTPDevice para el usuario, devuelve (device, secret)."""
    secret = pyotp.random_base32()
    device = TOTPDevice(user=user, confirmed=True)
    device.set_secret(secret)
    device.save()
    return device, secret


class TwoFactorSetupTest(TenantAwareTestCase):
    """Tests de los endpoints de setup/verify/status."""

    def test_setup_returns_qr_and_uri(self):
        self.authenticate_as_admin()
        response = self.client.post(reverse("core:two_factor_setup"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("otpauth_uri", data)
        self.assertIn("qr_code_base64", data)
        self.assertTrue(data["otpauth_uri"].startswith("otpauth://totp/"))
        self.assertTrue(data["qr_code_base64"].startswith("data:image/png;base64,"))

        # El dispositivo existe pero no está confirmado
        device = TOTPDevice.objects.get(user=self.admin_user)
        self.assertFalse(device.confirmed)

    def test_verify_activates_device_and_returns_backup_codes(self):
        self.authenticate_as_admin()
        self.client.post(reverse("core:two_factor_setup"), {}, format="json")

        device = TOTPDevice.objects.get(user=self.admin_user)
        code = pyotp.TOTP(device.get_secret()).now()

        response = self.client.post(
            reverse("core:two_factor_verify"),
            {"code": code},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("backup_codes", data)
        self.assertEqual(len(data["backup_codes"]), 8)

        device.refresh_from_db()
        self.assertTrue(device.confirmed)
        self.assertEqual(len(device.backup_codes), 8)

    def test_verify_rejects_invalid_code(self):
        self.authenticate_as_admin()
        self.client.post(reverse("core:two_factor_setup"), {}, format="json")

        response = self.client.post(
            reverse("core:two_factor_verify"),
            {"code": "000000"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        device = TOTPDevice.objects.get(user=self.admin_user)
        self.assertFalse(device.confirmed)

    def test_status_reflects_confirmed_state(self):
        self.authenticate_as_admin()
        response = self.client.get(reverse("core:two_factor_status"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()["enabled"])

        _make_confirmed_device(self.admin_user)
        response = self.client.get(reverse("core:two_factor_status"))
        self.assertTrue(response.json()["enabled"])


class TwoFactorLoginChallengeTest(TenantAwareTestCase):
    """Tests del flujo de login con challenge 2FA."""

    def test_login_with_2fa_returns_challenge_not_jwt(self):
        _make_confirmed_device(self.admin_user)
        response = self.client.post(
            reverse("core:login"),
            {"email": "admin@test.com", "password": "Admin123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data.get("status"), "2fa_required")
        self.assertIn("challenge_token", data)
        self.assertNotIn("tokens", data)

    def test_challenge_with_valid_code_returns_jwt(self):
        _device, secret = _make_confirmed_device(self.admin_user)
        response = self.client.post(
            reverse("core:login"),
            {"email": "admin@test.com", "password": "Admin123!"},
            format="json",
        )
        challenge_token = response.json()["challenge_token"]

        code = pyotp.TOTP(secret).now()
        response = self.client.post(
            reverse("core:two_factor_challenge"),
            {"challenge_token": challenge_token, "code": code},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("tokens", data)
        self.assertIn("access", data["tokens"])
        self.assertIn("refresh", data["tokens"])
        self.assertEqual(data["user"]["email"], "admin@test.com")

    def test_challenge_with_invalid_code_fails(self):
        _make_confirmed_device(self.admin_user)
        response = self.client.post(
            reverse("core:login"),
            {"email": "admin@test.com", "password": "Admin123!"},
            format="json",
        )
        challenge_token = response.json()["challenge_token"]

        response = self.client.post(
            reverse("core:two_factor_challenge"),
            {"challenge_token": challenge_token, "code": "000000"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_challenge_with_backup_code_consumes_it(self):
        device, _secret = _make_confirmed_device(self.admin_user)
        plaintext_codes = device.generate_backup_codes()
        backup_code = plaintext_codes[0]

        # Primer uso: funciona
        response = self.client.post(
            reverse("core:login"),
            {"email": "admin@test.com", "password": "Admin123!"},
            format="json",
        )
        challenge_token_1 = response.json()["challenge_token"]
        response = self.client.post(
            reverse("core:two_factor_challenge"),
            {"challenge_token": challenge_token_1, "code": backup_code},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        device.refresh_from_db()
        self.assertEqual(len(device.backup_codes), 7)

        # Segundo uso del mismo código: falla
        response = self.client.post(
            reverse("core:login"),
            {"email": "admin@test.com", "password": "Admin123!"},
            format="json",
        )
        challenge_token_2 = response.json()["challenge_token"]
        response = self.client.post(
            reverse("core:two_factor_challenge"),
            {"challenge_token": challenge_token_2, "code": backup_code},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TwoFactorDisableTest(TenantAwareTestCase):
    """Tests del endpoint de disable."""

    def test_disable_requires_password_and_code_for_password_users(self):
        _device, secret = _make_confirmed_device(self.admin_user)
        self.authenticate_as_admin()

        code = pyotp.TOTP(secret).now()

        # Sin password: 400
        response = self.client.post(
            reverse("core:two_factor_disable"),
            {"code": code},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Password incorrecto: 401
        response = self.client.post(
            reverse("core:two_factor_disable"),
            {"password": "WrongPassword1!", "code": code},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Password correcto + code válido: 200
        code = pyotp.TOTP(secret).now()
        response = self.client.post(
            reverse("core:two_factor_disable"),
            {"password": "Admin123!", "code": code},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(TOTPDevice.objects.filter(user=self.admin_user).exists())

    def test_disable_requires_only_code_for_social_only_users(self):
        # Crear un usuario social-only (sin password usable)
        social_user = User.objects.create_user(
            email="socialonly@test.com",
            username="socialonly",
            tenant=self.tenant,
            role="customer",
        )
        social_user.set_unusable_password()
        social_user.save()

        _device, secret = _make_confirmed_device(social_user)

        self.authenticate_as(social_user)
        code = pyotp.TOTP(secret).now()

        response = self.client.post(
            reverse("core:two_factor_disable"),
            {"code": code},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(TOTPDevice.objects.filter(user=social_user).exists())


class TwoFactorBackupCodesRegenerateTest(TenantAwareTestCase):
    """Tests del endpoint de regenerar backup codes."""

    def test_regenerate_backup_codes_requires_valid_totp(self):
        device, secret = _make_confirmed_device(self.admin_user)
        device.generate_backup_codes()
        old_hashes = list(device.backup_codes)

        self.authenticate_as_admin()

        # Código inválido: 400
        response = self.client.post(
            reverse("core:two_factor_backup_codes_regenerate"),
            {"code": "000000"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Código válido: 200 y nuevos backup codes
        code = pyotp.TOTP(secret).now()
        response = self.client.post(
            reverse("core:two_factor_backup_codes_regenerate"),
            {"code": code},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data["backup_codes"]), 8)

        device.refresh_from_db()
        self.assertEqual(len(device.backup_codes), 8)
        self.assertNotEqual(device.backup_codes, old_hashes)


def _make_google_info(email="admin@test.com"):
    return SocialUserInfo(
        provider="google",
        provider_uid="google-uid-2fa",
        email=email,
        first_name="Admin",
        last_name="Test",
        extra_data={},
    )


class TwoFactorSocialLoginTest(TenantAwareTestCase):
    """Test de integración: social login NO exige 2FA (por diseño)."""

    @patch("core.views.verify_social_token")
    def test_social_login_with_2fa_skips_challenge(self, mock_verify):
        _make_confirmed_device(self.admin_user)
        mock_verify.return_value = _make_google_info(email="admin@test.com")

        response = self.client.post(
            "/api/auth/social/google/",
            {"token": "fake-token"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Social login bypasses 2FA — providers handle their own security
        self.assertNotEqual(data.get("status"), "2fa_required")
        self.assertIn("tokens", data)
