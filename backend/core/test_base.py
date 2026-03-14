from django.core.cache import caches
from django.test import RequestFactory, TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.context import clear_current_tenant, set_current_tenant
from core.models import Tenant, User


class TenantAwareTestCase(TestCase):
    """
    Clase base para todos los tests que requieren contexto de tenant.

    Configura automáticamente:
    - Un tenant de prueba
    - Un usuario admin del tenant
    - Un usuario customer del tenant
    - El APIClient con header X-Tenant-Slug
    - El thread-local tenant context

    Uso:
        class MiTest(TenantAwareTestCase):
            def test_algo(self):
                # self.tenant, self.admin_user, self.customer_user ya existen
                response = self.client.get("/api/algo/")
    """

    @classmethod
    def setUpTestData(cls):
        """Crear datos compartidos entre todos los tests de la clase."""
        cls.tenant = Tenant.objects.create(
            name="Test Tenant",
            slug="test-tenant",
            schema_name="test_tenant_db",
            industry="beauty",
            email="test@tenant.com",
            phone="123456789",
            country="Colombia",
            plan="trial",
        )

        cls.admin_user = User.objects.create_user(
            email="admin@test.com",
            password="Admin123!",
            username="admin_test",
            first_name="Admin",
            last_name="Test",
            tenant=cls.tenant,
            role="admin",
        )

        cls.customer_user = User.objects.create_user(
            email="customer@test.com",
            password="Customer123!",
            username="customer_test",
            first_name="Customer",
            last_name="Test",
            tenant=cls.tenant,
            role="customer",
        )

    def setUp(self):
        """Configurar el client y el contexto de tenant para cada test."""
        self.client = APIClient()
        self.client.defaults["HTTP_X_TENANT_SLUG"] = self.tenant.slug
        set_current_tenant(self.tenant)
        self.factory = RequestFactory()
        # Limpiar cache de throttling para evitar 429 entre tests
        caches["throttle"].clear()

    def tearDown(self):
        """Limpiar el contexto de tenant."""
        clear_current_tenant()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def authenticate_as(self, user: User) -> str:
        """
        Autenticar el client como un usuario y retornar el access token.

        Args:
            user: instancia de User para autenticar

        Returns:
            El access token JWT como string
        """
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        return access_token

    def authenticate_as_admin(self) -> str:
        """Shortcut para autenticar como admin."""
        return self.authenticate_as(self.admin_user)

    def authenticate_as_customer(self) -> str:
        """Shortcut para autenticar como customer."""
        return self.authenticate_as(self.customer_user)

    def create_second_tenant(self) -> tuple[Tenant, User]:
        """
        Crear un segundo tenant con su admin para tests de aislamiento.

        Returns:
            Tupla (tenant_2, admin_2)
        """
        tenant_2 = Tenant.objects.create(
            name="Other Tenant",
            slug="other-tenant",
            schema_name="other_tenant_db",
            industry="gym",
            email="other@tenant.com",
            phone="987654321",
            country="Colombia",
            plan="trial",
        )
        admin_2 = User.objects.create_user(
            email="admin@other.com",
            password="Admin123!",
            username="admin_other",
            first_name="Admin",
            last_name="Other",
            tenant=tenant_2,
            role="admin",
        )
        return tenant_2, admin_2
