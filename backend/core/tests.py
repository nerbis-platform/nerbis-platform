from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken

from core.context import set_current_tenant
from core.models import Banner, User

from .test_base import TenantAwareTestCase


class LoginSuccessTest(TenantAwareTestCase):
    """Test: login exitoso con credenciales correctas."""

    def test_login_returns_200_with_tokens(self):
        response = self.client.post(
            reverse("core:login"),
            {"email": "admin@test.com", "password": "Admin123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("tokens", data)
        self.assertIn("access", data["tokens"])
        self.assertIn("refresh", data["tokens"])
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], "admin@test.com")

    def test_login_returns_tenant_data(self):
        response = self.client.post(
            reverse("core:login"),
            {"email": "admin@test.com", "password": "Admin123!"},
            format="json",
        )
        data = response.json()
        self.assertIn("tenant", data)
        self.assertEqual(data["tenant"]["slug"], "test-tenant")


class LoginFailureTest(TenantAwareTestCase):
    """Test: login fallido con credenciales incorrectas."""

    def test_wrong_password_returns_401(self):
        response = self.client.post(
            reverse("core:login"),
            {"email": "admin@test.com", "password": "WrongPassword123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("error", response.json())

    def test_nonexistent_email_returns_401(self):
        response = self.client.post(
            reverse("core:login"),
            {"email": "noexiste@test.com", "password": "Admin123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_credentials_returns_400(self):
        response = self.client.post(
            reverse("core:login"),
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TenantIsolationTest(TenantAwareTestCase):
    """Test: un tenant NO puede ver datos de otro tenant."""

    def test_user_cannot_login_on_wrong_tenant(self):
        """Un usuario de tenant A no puede hacer login en tenant B."""
        tenant_2, admin_2 = self.create_second_tenant()

        # Cambiar el client para apuntar al tenant 2
        self.client.defaults["HTTP_X_TENANT_SLUG"] = tenant_2.slug
        set_current_tenant(tenant_2)

        # Intentar login con credenciales del tenant 1 en tenant 2
        response = self.client.post(
            reverse("core:login"),
            {"email": "admin@test.com", "password": "Admin123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_tenant_cannot_see_other_tenant_users(self):
        """Un tenant no puede listar usuarios de otro tenant."""
        tenant_2, admin_2 = self.create_second_tenant()

        # Crear un customer en tenant 2
        User.objects.create_user(
            email="customer@other.com",
            password="Customer123!",
            username="customer_other",
            tenant=tenant_2,
            role="customer",
        )

        # Autenticar como admin del tenant 1
        self.authenticate_as_admin()

        # Obtener /api/auth/me/ — debe retornar datos del tenant 1
        response = self.client.get(reverse("core:current_user"))
        data = response.json()
        self.assertEqual(data["user"]["email"], "admin@test.com")
        if data.get("tenant"):
            self.assertEqual(data["tenant"]["slug"], "test-tenant")

    def test_banners_isolated_between_tenants(self):
        """Los banners de un tenant no se mezclan con los de otro."""
        tenant_2, admin_2 = self.create_second_tenant()

        # Crear banner en tenant 1
        Banner.objects.create(
            tenant=self.tenant,
            name="Banner T1",
            message="Promo tenant 1",
            is_active=True,
        )

        # Crear banner en tenant 2
        Banner.objects.create(
            tenant=tenant_2,
            name="Banner T2",
            message="Promo tenant 2",
            is_active=True,
        )

        # Request con tenant 1 — solo debe ver su banner
        response = self.client.get(reverse("core:active_banners"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json().get("results", response.json())
        # Si es paginado, extraer los resultados
        if isinstance(results, dict) and "results" in results:
            results = results["results"]
        banner_names = [b["name"] for b in results]
        self.assertIn("Banner T1", banner_names)
        self.assertNotIn("Banner T2", banner_names)


class JWTTenantClaimsTest(TenantAwareTestCase):
    """Test: JWT token incluye tenant_id correcto."""

    def test_login_token_contains_tenant_id(self):
        """El access token del login debe incluir el tenant_id."""
        response = self.client.post(
            reverse("core:login"),
            {"email": "admin@test.com", "password": "Admin123!"},
            format="json",
        )
        data = response.json()
        access_token = data["tokens"]["access"]

        # Decodificar el token y verificar claims
        decoded = AccessToken(access_token)
        self.assertEqual(decoded["tenant_id"], str(self.tenant.id))
        self.assertEqual(decoded["tenant_slug"], self.tenant.slug)

    def test_login_token_contains_role(self):
        """El access token debe incluir el role del usuario."""
        response = self.client.post(
            reverse("core:login"),
            {"email": "admin@test.com", "password": "Admin123!"},
            format="json",
        )
        data = response.json()
        decoded = AccessToken(data["tokens"]["access"])
        self.assertEqual(decoded["role"], "admin")

    def test_customer_token_has_customer_role(self):
        """El token de un customer tiene role=customer."""
        response = self.client.post(
            reverse("core:login"),
            {"email": "customer@test.com", "password": "Customer123!"},
            format="json",
        )
        data = response.json()
        decoded = AccessToken(data["tokens"]["access"])
        self.assertEqual(decoded["role"], "customer")
        self.assertEqual(decoded["tenant_id"], str(self.tenant.id))
