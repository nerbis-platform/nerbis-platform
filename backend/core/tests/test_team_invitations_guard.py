"""
Tests para el guard de invitaciones al equipo basado en website_status.

Verifica que solo se puedan enviar/reenviar invitaciones cuando el sitio web
del tenant tenga status 'published' o 'review'.
"""

from django.urls import reverse
from rest_framework import status

from core.test_base import TenantAwareTestCase
from websites.models import WebsiteConfig, WebsiteTemplate


class TeamInvitationsGuardBaseTestCase(TenantAwareTestCase):
    """Clase base con helpers para tests del guard de invitaciones."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.template = WebsiteTemplate.objects.create(
            name="Template Test",
            slug="template-test",
            industry="generic",
            description="Template para tests",
        )

    def _create_website_config(self, tenant_status: str) -> WebsiteConfig:
        """Crear o actualizar WebsiteConfig con el status dado."""
        config, _created = WebsiteConfig.objects.update_or_create(
            tenant=self.tenant,
            defaults={"template": self.template, "status": tenant_status},
        )
        return config

    def _delete_website_config(self):
        """Eliminar WebsiteConfig del tenant si existe."""
        WebsiteConfig.objects.filter(tenant=self.tenant).delete()


class TeamInvitationsGuardBlockedTest(TeamInvitationsGuardBaseTestCase):
    """Test: POST invitaciones bloqueado cuando website_status no es published/review."""

    def setUp(self):
        super().setUp()
        self.authenticate_as_admin()
        self.url = reverse("core:team_invitations")
        self.payload = {"email": "nuevo@equipo.com", "role": "staff"}

    def test_blocked_when_status_draft(self):
        self._create_website_config("draft")
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("detail", response.json())

    def test_blocked_when_status_generating(self):
        self._create_website_config("generating")
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_blocked_when_status_onboarding(self):
        self._create_website_config("onboarding")
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_blocked_when_no_website_config(self):
        self._delete_website_config()
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TeamInvitationsGuardAllowedTest(TeamInvitationsGuardBaseTestCase):
    """Test: POST invitaciones permitido cuando website_status es published o review."""

    def setUp(self):
        super().setUp()
        self.authenticate_as_admin()
        self.url = reverse("core:team_invitations")
        self.payload = {"email": "nuevo@equipo.com", "role": "staff"}

    def test_allowed_when_status_published(self):
        self._create_website_config("published")
        response = self.client.post(self.url, self.payload, format="json")
        # No debe ser 403 — puede ser 201 o cualquier otro código de la lógica normal
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_allowed_when_status_review(self):
        self._create_website_config("review")
        response = self.client.post(self.url, self.payload, format="json")
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ResendInvitationGuardBlockedTest(TeamInvitationsGuardBaseTestCase):
    """Test: resend invitación bloqueado cuando website_status no permite invitaciones."""

    def setUp(self):
        super().setUp()
        self.authenticate_as_admin()

    def test_resend_blocked_when_status_draft(self):
        self._create_website_config("draft")
        # Usamos pk=99999 — el guard debe bloquear antes de buscar la invitación
        url = reverse("core:resend_invitation", kwargs={"pk": 99999})
        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("detail", response.json())

    def test_resend_blocked_when_no_website_config(self):
        self._delete_website_config()
        url = reverse("core:resend_invitation", kwargs={"pk": 99999})
        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
