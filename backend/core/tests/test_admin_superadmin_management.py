"""
Tests para gestion de superadmins: bloqueo, desbloqueo, eliminacion, cambio de rol,
sincronizacion de estado, auto-unblock en login, y audit log.

Cobertura: ~30 escenarios organizados en 9 clases de test.
"""

from datetime import timedelta

from django.core.cache import caches
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.admin_views import build_superadmin_tokens
from core.context import clear_current_tenant
from core.models import AdminAuditLog, Tenant, User

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PASSWORD = "Sup3rStr0ng!"


def _make_superadmin(
    email: str,
    internal_role: str = "admin",
    is_owner: bool = False,
    superadmin_status: str = "active",
    password: str = PASSWORD,
) -> User:
    """Create a superadmin user for testing."""
    user = User(
        email=email,
        username=email.split("@")[0],
        first_name="Test",
        last_name="Admin",
        tenant=None,
        is_superuser=True,
        is_staff=True,
        is_active=True,
        role="admin",
        uid=f"admin:{email}",
        internal_role=internal_role,
        is_owner=is_owner,
        superadmin_status=superadmin_status,
    )
    user.set_password(password)
    user.save()
    return user


def _make_tenant_with_admin(slug: str, email: str) -> tuple[Tenant, User]:
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


class _SuperadminTestBase(TestCase):
    """Base class: clears tenant context and throttle cache, provides auth helpers."""

    def setUp(self):
        clear_current_tenant()
        caches["throttle"].clear()
        self.client = APIClient()

    def tearDown(self):
        clear_current_tenant()
        caches["throttle"].clear()

    def auth_as(self, user: User):
        access = build_superadmin_tokens(user)["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")


# ===========================================================================
# 1. Model save() sync tests
# ===========================================================================


class TestSuperadminStatusSync(TestCase):
    def setUp(self):
        clear_current_tenant()

    def test_status_blocked_sets_is_active_false(self):
        user = _make_superadmin(email="sync-block@nerbis.test")
        user.superadmin_status = "blocked"
        user.save()
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_status_active_sets_is_active_true(self):
        user = _make_superadmin(email="sync-active@nerbis.test", superadmin_status="blocked")
        # After save with blocked status, is_active should be False
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        # Set back to active
        user.superadmin_status = "active"
        user.save()
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    def test_tenant_user_unaffected(self):
        tenant, user = _make_tenant_with_admin(slug="sync-t1", email="sync-tnt@x.test")
        user.superadmin_status = "blocked"
        user.save()
        user.refresh_from_db()
        # Tenant users are not affected by superadmin_status sync
        self.assertTrue(user.is_active)


# ===========================================================================
# 2. Block endpoint tests
# ===========================================================================


class TestBlockSuperadmin(_SuperadminTestBase):
    def setUp(self):
        super().setUp()
        self.actor = _make_superadmin(email="actor-block@nerbis.test", internal_role="admin")
        self.target = _make_superadmin(email="target-block@nerbis.test", internal_role="admin")
        self.owner = _make_superadmin(email="owner-block@nerbis.test", internal_role="owner", is_owner=True)

    def _url(self, pk: int) -> str:
        return f"/api/admin/superadmins/{pk}/block/"

    def test_block_active_superadmin(self):
        self.auth_as(self.actor)
        res = self.client.post(
            self._url(self.target.pk),
            {"reason": "Violated policy"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertEqual(self.target.superadmin_status, "blocked")
        self.assertFalse(self.target.is_active)
        self.assertEqual(self.target.block_reason, "Violated policy")
        self.assertEqual(self.target.blocked_by_id, self.actor.pk)
        # Audit log created
        log = AdminAuditLog.objects.filter(
            action=AdminAuditLog.ACTION_BLOCK_SUPERADMIN,
            target_id=str(self.target.pk),
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor_id, self.actor.pk)

    def test_block_owner_rejected(self):
        self.auth_as(self.actor)
        res = self.client.post(
            self._url(self.owner.pk),
            {"reason": "Test"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_self_block_rejected(self):
        self.auth_as(self.actor)
        res = self.client.post(
            self._url(self.actor.pk),
            {"reason": "Self-block"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_already_blocked_rejected(self):
        self.auth_as(self.actor)
        # Block first
        self.client.post(self._url(self.target.pk), {"reason": "First"}, format="json")
        # Re-auth because target might be different; but actor is same
        res = self.client.post(self._url(self.target.pk), {"reason": "Second"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_reason_rejected(self):
        self.auth_as(self.actor)
        res = self.client.post(self._url(self.target.pk), {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_support_viewer_cannot_block(self):
        support = _make_superadmin(email="support-block@nerbis.test", internal_role="support")
        self.auth_as(support)
        res = self.client.post(
            self._url(self.target.pk),
            {"reason": "Test"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        viewer = _make_superadmin(email="viewer-block@nerbis.test", internal_role="viewer")
        self.auth_as(viewer)
        res = self.client.post(
            self._url(self.target.pk),
            {"reason": "Test"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# 3. Unblock endpoint tests
# ===========================================================================


class TestUnblockSuperadmin(_SuperadminTestBase):
    def setUp(self):
        super().setUp()
        self.actor = _make_superadmin(email="actor-unblock@nerbis.test", internal_role="admin")
        self.blocked = _make_superadmin(
            email="blocked-unblock@nerbis.test",
            superadmin_status="blocked",
        )

    def _url(self, pk: int) -> str:
        return f"/api/admin/superadmins/{pk}/unblock/"

    def test_unblock_blocked_superadmin(self):
        self.auth_as(self.actor)
        res = self.client.post(self._url(self.blocked.pk), format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.blocked.refresh_from_db()
        self.assertEqual(self.blocked.superadmin_status, "active")
        self.assertTrue(self.blocked.is_active)
        self.assertEqual(self.blocked.block_reason, "")
        self.assertIsNone(self.blocked.blocked_until)
        self.assertIsNone(self.blocked.blocked_by)
        # Audit log
        log = AdminAuditLog.objects.filter(
            action=AdminAuditLog.ACTION_UNBLOCK_SUPERADMIN,
            target_id=str(self.blocked.pk),
        ).first()
        self.assertIsNotNone(log)

    def test_unblock_non_blocked_rejected(self):
        active = _make_superadmin(email="active-unblock@nerbis.test")
        self.auth_as(self.actor)
        res = self.client.post(self._url(active.pk), format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ===========================================================================
# 4. Delete endpoint tests
# ===========================================================================


class TestDeleteSuperadmin(_SuperadminTestBase):
    def setUp(self):
        super().setUp()
        self.actor = _make_superadmin(email="actor-del@nerbis.test", internal_role="admin")
        self.target = _make_superadmin(email="target-del@nerbis.test", internal_role="admin")
        self.owner = _make_superadmin(email="owner-del@nerbis.test", internal_role="owner", is_owner=True)

    def _url(self, pk: int) -> str:
        return f"/api/admin/superadmins/{pk}/"

    def test_delete_with_correct_password(self):
        self.auth_as(self.actor)
        target_pk = self.target.pk
        res = self.client.delete(
            self._url(target_pk),
            {"password": PASSWORD},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=target_pk).exists())
        # Audit log
        log = AdminAuditLog.objects.filter(
            action=AdminAuditLog.ACTION_DELETE_SUPERADMIN,
            target_id=str(target_pk),
        ).first()
        self.assertIsNotNone(log)

    def test_delete_owner_rejected(self):
        self.auth_as(self.actor)
        res = self.client.delete(
            self._url(self.owner.pk),
            {"password": PASSWORD},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_self_delete_rejected(self):
        self.auth_as(self.actor)
        res = self.client.delete(
            self._url(self.actor.pk),
            {"password": PASSWORD},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_wrong_password_rejected(self):
        self.auth_as(self.actor)
        res = self.client.delete(
            self._url(self.target.pk),
            {"password": "WrongPass123!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_not_found(self):
        self.auth_as(self.actor)
        res = self.client.delete(
            self._url(999999),
            {"password": PASSWORD},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 5. Role change tests
# ===========================================================================


class TestChangeRole(_SuperadminTestBase):
    def setUp(self):
        super().setUp()
        self.owner = _make_superadmin(email="owner-role@nerbis.test", internal_role="owner", is_owner=True)
        self.target = _make_superadmin(email="target-role@nerbis.test", internal_role="admin")

    def _url(self, pk: int) -> str:
        return f"/api/admin/superadmins/{pk}/role/"

    def test_owner_changes_role(self):
        self.auth_as(self.owner)
        res = self.client.patch(
            self._url(self.target.pk),
            {"internal_role": "support"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertEqual(self.target.internal_role, "support")
        # Audit log with old/new role
        log = AdminAuditLog.objects.filter(
            action=AdminAuditLog.ACTION_CHANGE_SUPERADMIN_ROLE,
            target_id=str(self.target.pk),
        ).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.details["old_role"], "admin")
        self.assertEqual(log.details["new_role"], "support")

    def test_non_owner_cannot_change_role(self):
        admin = _make_superadmin(email="admin-role@nerbis.test", internal_role="admin")
        self.auth_as(admin)
        res = self.client.patch(
            self._url(self.target.pk),
            {"internal_role": "viewer"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_change_own_role(self):
        self.auth_as(self.owner)
        res = self.client.patch(
            self._url(self.owner.pk),
            {"internal_role": "admin"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_set_owner_role(self):
        self.auth_as(self.owner)
        res = self.client.patch(
            self._url(self.target.pk),
            {"internal_role": "owner"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_role_rejected(self):
        self.auth_as(self.owner)
        res = self.client.patch(
            self._url(self.target.pk),
            {"internal_role": "invalid_role"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ===========================================================================
# 6. Audit log endpoint tests
# ===========================================================================


class TestAuditLogList(_SuperadminTestBase):
    URL = "/api/admin/audit-log/"

    def setUp(self):
        super().setUp()
        self.admin = _make_superadmin(email="admin-audit@nerbis.test", internal_role="admin")
        self.viewer = _make_superadmin(email="viewer-audit@nerbis.test", internal_role="viewer")
        # Create some audit entries
        for i in range(3):
            AdminAuditLog.objects.create(
                actor=self.admin,
                action=AdminAuditLog.ACTION_BLOCK_SUPERADMIN,
                target_type="User",
                target_id=str(i),
                target_repr=f"user: test{i}@nerbis.test",
            )
        AdminAuditLog.objects.create(
            actor=self.admin,
            action=AdminAuditLog.ACTION_UNBLOCK_SUPERADMIN,
            target_type="User",
            target_id="99",
            target_repr="user: unblocked@nerbis.test",
        )

    def test_paginated_list(self):
        self.auth_as(self.admin)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertIn("results", body)
        self.assertIn("count", body)
        self.assertEqual(body["count"], 4)

    def test_filter_by_action(self):
        self.auth_as(self.admin)
        res = self.client.get(self.URL, {"action": "block_superadmin"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(body["count"], 3)
        for entry in body["results"]:
            self.assertEqual(entry["action"], "block_superadmin")

    def test_all_roles_can_access(self):
        self.auth_as(self.viewer)
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)


# ===========================================================================
# 7. Auto-unblock tests
# ===========================================================================


class TestAutoUnblock(_SuperadminTestBase):
    LOGIN_URL = "/api/admin/auth/login/"

    def test_login_auto_unblocks_expired(self):
        user = _make_superadmin(
            email="auto-unblock@nerbis.test",
            superadmin_status="blocked",
            password=PASSWORD,
        )
        # Set blocked_until in the past directly via queryset to avoid save() sync
        User.objects.filter(pk=user.pk).update(
            blocked_until=timezone.now() - timedelta(hours=1),
            block_reason="Temporary block",
        )

        res = self.client.post(
            self.LOGIN_URL,
            {"email": "auto-unblock@nerbis.test", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.json())

        user.refresh_from_db()
        self.assertEqual(user.superadmin_status, "active")
        self.assertTrue(user.is_active)

        # Verify audit log with auto_unblock=True
        log = AdminAuditLog.objects.filter(
            action=AdminAuditLog.ACTION_UNBLOCK_SUPERADMIN,
            target_id=str(user.pk),
        ).first()
        self.assertIsNotNone(log)
        self.assertTrue(log.details.get("auto_unblock"))

    def test_login_blocked_no_expiry_rejected(self):
        user = _make_superadmin(
            email="perm-blocked@nerbis.test",
            superadmin_status="blocked",
            password=PASSWORD,
        )
        User.objects.filter(pk=user.pk).update(
            block_reason="Permanent block",
        )

        res = self.client.post(
            self.LOGIN_URL,
            {"email": "perm-blocked@nerbis.test", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        body = res.json()
        self.assertEqual(body["block_reason"], "Permanent block")
        self.assertIsNone(body.get("blocked_until"))


# ===========================================================================
# 8. Owner protection integration
# ===========================================================================


class TestOwnerProtection(_SuperadminTestBase):
    def setUp(self):
        super().setUp()
        self.admin = _make_superadmin(email="admin-prot@nerbis.test", internal_role="admin")
        self.owner = _make_superadmin(email="owner-prot@nerbis.test", internal_role="owner", is_owner=True)

    def test_owner_cannot_be_blocked_deactivated_deleted(self):
        self.auth_as(self.admin)

        # Block
        res = self.client.post(
            f"/api/admin/superadmins/{self.owner.pk}/block/",
            {"reason": "Test"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Deactivate
        res = self.client.patch(
            f"/api/admin/superadmins/{self.owner.pk}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Delete
        res = self.client.delete(
            f"/api/admin/superadmins/{self.owner.pk}/",
            {"password": PASSWORD},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Owner is still active
        self.owner.refresh_from_db()
        self.assertTrue(self.owner.is_active)


# ===========================================================================
# 9. Login block message tests
# ===========================================================================


class TestLoginBlockMessage(_SuperadminTestBase):
    LOGIN_URL = "/api/admin/auth/login/"

    def test_blocked_user_gets_reason(self):
        user = _make_superadmin(
            email="msg-blocked@nerbis.test",
            superadmin_status="blocked",
            password=PASSWORD,
        )
        until = timezone.now() + timedelta(days=7)
        User.objects.filter(pk=user.pk).update(
            block_reason="Abuso de permisos",
            blocked_until=until,
        )

        res = self.client.post(
            self.LOGIN_URL,
            {"email": "msg-blocked@nerbis.test", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        body = res.json()
        self.assertEqual(body["block_reason"], "Abuso de permisos")
        self.assertIn("blocked_until", body)
        self.assertIsNotNone(body["blocked_until"])

    def test_deactivated_user_generic_message(self):
        _make_superadmin(
            email="msg-deactivated@nerbis.test",
            superadmin_status="deactivated",
            password=PASSWORD,
        )

        res = self.client.post(
            self.LOGIN_URL,
            {"email": "msg-deactivated@nerbis.test", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        body = res.json()
        # Deactivated users get generic "Invalid credentials" (no block_reason)
        self.assertNotIn("block_reason", body)
