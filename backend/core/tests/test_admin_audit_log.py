"""
Tests unitarios para el modelo ``AdminAuditLog`` y el helper ``get_client_ip``.

Cubre:
- Creación con todos los campos requeridos.
- Formato de ``__str__``.
- Ordenamiento por ``-created_at``.
- Comportamiento ``SET_NULL`` cuando se elimina el actor.
- Enum de ``ACTION_CHOICES`` exacto (9 valores).
- Extracción de IP con ``X-Forwarded-For`` presente, ausente y múltiple.
"""

from __future__ import annotations

from django.test import RequestFactory, TestCase

from core.context import clear_current_tenant
from core.models import AdminAuditLog, Tenant, User
from core.utils import get_client_ip


def _make_superadmin(email: str = "root@nerbis.test") -> User:
    """Crea un superadmin de plataforma (tenant=None)."""
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


def _make_tenant(slug: str = "acme") -> Tenant:
    return Tenant.objects.create(
        name=f"Tenant {slug}",
        slug=slug,
        schema_name=f"{slug.replace('-', '_')}_db",
        industry="beauty",
        email=f"contact@{slug}.test",
        phone="123456789",
        country="Colombia",
        plan="trial",
    )


class AdminAuditLogModelTests(TestCase):
    """Tests del modelo ``AdminAuditLog``."""

    def setUp(self) -> None:
        clear_current_tenant()

    # ------------------------------------------------------------------
    # Creación y campos
    # ------------------------------------------------------------------
    def test_create_audit_log_with_all_fields(self) -> None:
        actor = _make_superadmin()
        tenant = _make_tenant()

        log = AdminAuditLog.objects.create(
            actor=actor,
            action=AdminAuditLog.ACTION_DEACTIVATE_TENANT,
            target_type="Tenant",
            target_id=str(tenant.id),
            target_repr=f"tenant: {tenant.slug}",
            details={"reason": "manual"},
            ip_address="10.0.0.1",
        )

        log.refresh_from_db()
        self.assertEqual(log.actor_id, actor.id)
        self.assertEqual(log.action, "deactivate_tenant")
        self.assertEqual(log.target_type, "Tenant")
        self.assertEqual(log.target_id, str(tenant.id))
        self.assertEqual(log.target_repr, f"tenant: {tenant.slug}")
        self.assertEqual(log.details, {"reason": "manual"})
        self.assertEqual(log.ip_address, "10.0.0.1")
        self.assertIsNotNone(log.created_at)

    def test_details_defaults_to_empty_dict(self) -> None:
        actor = _make_superadmin()
        log = AdminAuditLog.objects.create(
            actor=actor,
            action=AdminAuditLog.ACTION_ACTIVATE_TENANT,
            target_type="Tenant",
            target_id="abc",
            target_repr="tenant: abc",
        )
        self.assertEqual(log.details, {})
        self.assertIsNone(log.ip_address)

    def test_action_choices_enum_exact_nine_values(self) -> None:
        """Verifica que ACTION_CHOICES contiene exactamente los 9 valores del design."""
        expected = {
            "deactivate_tenant",
            "activate_tenant",
            "deactivate_user",
            "activate_user",
            "change_user_role",
            "delete_passkey",
            "disable_2fa",
            "unlink_social",
            "reset_password",
        }
        actual = {value for value, _ in AdminAuditLog.ACTION_CHOICES}
        self.assertEqual(actual, expected)
        self.assertEqual(len(AdminAuditLog.ACTION_CHOICES), 9)

    # ------------------------------------------------------------------
    # __str__
    # ------------------------------------------------------------------
    def test_str_format_with_actor(self) -> None:
        actor = _make_superadmin(email="ops@nerbis.test")
        log = AdminAuditLog.objects.create(
            actor=actor,
            action=AdminAuditLog.ACTION_DELETE_PASSKEY,
            target_type="WebAuthnCredential",
            target_id="7",
            target_repr="passkey: MacBook Pro",
        )
        self.assertEqual(str(log), "ops@nerbis.test -> delete_passkey on passkey: MacBook Pro")

    def test_str_format_with_null_actor(self) -> None:
        log = AdminAuditLog.objects.create(
            actor=None,
            action=AdminAuditLog.ACTION_RESET_PASSWORD,
            target_type="User",
            target_id="42",
            target_repr="user: juan@example.com",
        )
        self.assertEqual(str(log), "system -> reset_password on user: juan@example.com")

    # ------------------------------------------------------------------
    # Ordering + SET_NULL
    # ------------------------------------------------------------------
    def test_default_ordering_is_newest_first(self) -> None:
        actor = _make_superadmin()
        first = AdminAuditLog.objects.create(
            actor=actor,
            action=AdminAuditLog.ACTION_ACTIVATE_USER,
            target_type="User",
            target_id="1",
            target_repr="user: first@test.com",
        )
        second = AdminAuditLog.objects.create(
            actor=actor,
            action=AdminAuditLog.ACTION_DEACTIVATE_USER,
            target_type="User",
            target_id="2",
            target_repr="user: second@test.com",
        )
        third = AdminAuditLog.objects.create(
            actor=actor,
            action=AdminAuditLog.ACTION_CHANGE_USER_ROLE,
            target_type="User",
            target_id="3",
            target_repr="user: third@test.com",
        )

        logs = list(AdminAuditLog.objects.all())
        self.assertEqual([log.id for log in logs], [third.id, second.id, first.id])

    def test_actor_set_to_null_when_user_deleted(self) -> None:
        actor = _make_superadmin()
        log = AdminAuditLog.objects.create(
            actor=actor,
            action=AdminAuditLog.ACTION_DISABLE_2FA,
            target_type="User",
            target_id="99",
            target_repr="user: victim@test.com",
        )

        actor.delete()
        log.refresh_from_db()

        self.assertIsNone(log.actor)
        # El registro de auditoría sobrevive aun si el superadmin es eliminado.
        self.assertEqual(log.action, "disable_2fa")
        self.assertEqual(log.target_repr, "user: victim@test.com")


class GetClientIpHelperTests(TestCase):
    """Tests para ``core.utils.get_client_ip``."""

    def setUp(self) -> None:
        self.factory = RequestFactory()

    def test_extracts_ip_from_x_forwarded_for_single(self) -> None:
        request = self.factory.get("/", HTTP_X_FORWARDED_FOR="203.0.113.10")
        self.assertEqual(get_client_ip(request), "203.0.113.10")

    def test_extracts_first_ip_from_x_forwarded_for_multiple(self) -> None:
        request = self.factory.get(
            "/",
            HTTP_X_FORWARDED_FOR="203.0.113.10, 10.0.0.1, 172.16.0.1",
        )
        self.assertEqual(get_client_ip(request), "203.0.113.10")

    def test_falls_back_to_remote_addr_when_no_forwarded_header(self) -> None:
        request = self.factory.get("/", REMOTE_ADDR="198.51.100.5")
        # RequestFactory ya setea REMOTE_ADDR por defecto; lo forzamos explícito.
        request.META["REMOTE_ADDR"] = "198.51.100.5"
        request.META.pop("HTTP_X_FORWARDED_FOR", None)
        self.assertEqual(get_client_ip(request), "198.51.100.5")

    def test_returns_none_when_no_ip_headers_present(self) -> None:
        request = self.factory.get("/")
        request.META.pop("HTTP_X_FORWARDED_FOR", None)
        request.META.pop("REMOTE_ADDR", None)
        self.assertIsNone(get_client_ip(request))

    def test_returns_none_when_request_is_none(self) -> None:
        self.assertIsNone(get_client_ip(None))

    def test_ignores_empty_x_forwarded_for_and_uses_remote_addr(self) -> None:
        request = self.factory.get("/", HTTP_X_FORWARDED_FOR="   ")
        request.META["REMOTE_ADDR"] = "198.51.100.9"
        self.assertEqual(get_client_ip(request), "198.51.100.9")
