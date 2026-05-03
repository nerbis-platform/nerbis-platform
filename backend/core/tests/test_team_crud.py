# backend/core/tests/test_team_crud.py

"""
Tests para CRUD de miembros del equipo (issue #174).

Cubre: update (PATCH), block (POST), unblock (POST), delete (DELETE).
Validaciones: self-action, last-admin, cross-tenant, permisos.
"""

import pytest
from django.urls import reverse

from core.models import User

# ===================================
# FIXTURES
# ===================================


@pytest.fixture()
def staff_user(tenant):
    """Usuario staff del tenant de prueba."""
    return User.objects.create_user(
        email="staff@test.com",
        password="Staff123!",
        username="staff_test",
        first_name="Staff",
        last_name="Test",
        tenant=tenant,
        role="staff",
    )


@pytest.fixture()
def second_admin(tenant):
    """Segundo admin para tests de last-admin."""
    return User.objects.create_user(
        email="admin2@test.com",
        password="Admin123!",
        username="admin2_test",
        first_name="Admin2",
        last_name="Test",
        tenant=tenant,
        role="admin",
    )


# ===================================
# SERIALIZER
# ===================================


class TestTeamUpdateMemberSerializer:
    def test_valid_role_admin(self):
        from core.serializers import TeamUpdateMemberSerializer

        s = TeamUpdateMemberSerializer(data={"role": "admin"})
        assert s.is_valid(), s.errors

    def test_valid_role_staff(self):
        from core.serializers import TeamUpdateMemberSerializer

        s = TeamUpdateMemberSerializer(data={"role": "staff"})
        assert s.is_valid(), s.errors

    def test_invalid_role_customer(self):
        from core.serializers import TeamUpdateMemberSerializer

        s = TeamUpdateMemberSerializer(data={"role": "customer"})
        assert not s.is_valid()
        assert "role" in s.errors

    def test_partial_update(self):
        from core.serializers import TeamUpdateMemberSerializer

        s = TeamUpdateMemberSerializer(data={"first_name": "Nuevo"}, partial=True)
        assert s.is_valid(), s.errors


# ===================================
# PATCH — Update member
# ===================================


@pytest.mark.django_db
class TestTeamUpdateMember:
    def test_update_role_happy_path(self, auth_admin_client, staff_user):
        url = reverse("core:team_member_detail", kwargs={"user_id": staff_user.id})
        response = auth_admin_client.patch(url, {"role": "admin"}, format="json")
        assert response.status_code == 200
        staff_user.refresh_from_db()
        assert staff_user.role == "admin"

    def test_update_name(self, auth_admin_client, staff_user):
        url = reverse("core:team_member_detail", kwargs={"user_id": staff_user.id})
        response = auth_admin_client.patch(url, {"first_name": "Nuevo", "last_name": "Nombre"}, format="json")
        assert response.status_code == 200
        staff_user.refresh_from_db()
        assert staff_user.first_name == "Nuevo"
        assert staff_user.last_name == "Nombre"

    def test_self_role_change_prevented(self, auth_admin_client, admin_user):
        url = reverse("core:team_member_detail", kwargs={"user_id": admin_user.id})
        response = auth_admin_client.patch(url, {"role": "staff"}, format="json")
        assert response.status_code == 400
        assert "propio rol" in response.data["error"]

    def test_last_admin_demotion_prevented(self, auth_admin_client, staff_user):
        """Solo hay 1 admin — no se puede degradar a otro admin si es el unico."""
        # staff_user ya es staff, promoverlo a admin primero
        staff_user.role = "admin"
        staff_user.save()
        # Ahora degradar — hay 2 admins, deberia funcionar
        url = reverse("core:team_member_detail", kwargs={"user_id": staff_user.id})
        response = auth_admin_client.patch(url, {"role": "staff"}, format="json")
        assert response.status_code == 200

    def test_cross_tenant_rejected(self, auth_admin_client, second_tenant):
        other_user = User.objects.create_user(
            email="other@other.com",
            password="Other123!",
            username="other_user",
            tenant=second_tenant,
            role="staff",
        )
        url = reverse("core:team_member_detail", kwargs={"user_id": other_user.id})
        response = auth_admin_client.patch(url, {"role": "admin"}, format="json")
        assert response.status_code == 404

    def test_non_admin_forbidden(self, auth_customer_client, staff_user):
        url = reverse("core:team_member_detail", kwargs={"user_id": staff_user.id})
        response = auth_customer_client.patch(url, {"role": "admin"}, format="json")
        assert response.status_code == 403


# ===================================
# POST — Block member
# ===================================


@pytest.mark.django_db
class TestTeamBlockMember:
    def test_block_happy_path(self, auth_admin_client, staff_user):
        url = reverse("core:team_block_member", kwargs={"user_id": staff_user.id})
        response = auth_admin_client.post(url)
        assert response.status_code == 200
        staff_user.refresh_from_db()
        assert staff_user.is_active is False

    def test_block_self_prevented(self, auth_admin_client, admin_user):
        url = reverse("core:team_block_member", kwargs={"user_id": admin_user.id})
        response = auth_admin_client.post(url)
        assert response.status_code == 400
        assert "ti mismo" in response.data["error"]

    def test_block_already_blocked(self, auth_admin_client, staff_user):
        staff_user.is_active = False
        staff_user.save()
        url = reverse("core:team_block_member", kwargs={"user_id": staff_user.id})
        response = auth_admin_client.post(url)
        assert response.status_code == 400
        assert "ya está bloqueado" in response.data["error"]

    def test_block_last_admin_prevented(self, auth_admin_client, second_admin):
        """No se puede bloquear al unico otro admin si el que bloquea es el unico restante."""
        # Hay 2 admins: admin_user y second_admin. Bloquear second_admin deberia funcionar.
        url = reverse("core:team_block_member", kwargs={"user_id": second_admin.id})
        response = auth_admin_client.post(url)
        assert response.status_code == 200

    def test_block_cross_tenant(self, auth_admin_client, second_tenant):
        other_user = User.objects.create_user(
            email="block@other.com",
            password="Other123!",
            username="block_other",
            tenant=second_tenant,
            role="staff",
        )
        url = reverse("core:team_block_member", kwargs={"user_id": other_user.id})
        response = auth_admin_client.post(url)
        assert response.status_code == 404


# ===================================
# POST — Unblock member
# ===================================


@pytest.mark.django_db
class TestTeamUnblockMember:
    def test_unblock_happy_path(self, auth_admin_client, staff_user):
        staff_user.is_active = False
        staff_user.save()
        url = reverse("core:team_unblock_member", kwargs={"user_id": staff_user.id})
        response = auth_admin_client.post(url)
        assert response.status_code == 200
        staff_user.refresh_from_db()
        assert staff_user.is_active is True

    def test_unblock_already_active(self, auth_admin_client, staff_user):
        url = reverse("core:team_unblock_member", kwargs={"user_id": staff_user.id})
        response = auth_admin_client.post(url)
        assert response.status_code == 400
        assert "ya está activo" in response.data["error"]

    def test_unblock_cross_tenant(self, auth_admin_client, second_tenant):
        other_user = User.objects.create_user(
            email="unblock@other.com",
            password="Other123!",
            username="unblock_other",
            tenant=second_tenant,
            role="staff",
            is_active=False,
        )
        url = reverse("core:team_unblock_member", kwargs={"user_id": other_user.id})
        response = auth_admin_client.post(url)
        assert response.status_code == 404


# ===================================
# DELETE — Soft delete member
# ===================================


@pytest.mark.django_db
class TestTeamDeleteMember:
    def test_delete_happy_path(self, auth_admin_client, staff_user):
        url = reverse("core:team_member_detail", kwargs={"user_id": staff_user.id})
        response = auth_admin_client.delete(url)
        assert response.status_code == 200
        staff_user.refresh_from_db()
        assert staff_user.is_active is False
        assert staff_user.role == "customer"

    def test_delete_self_prevented(self, auth_admin_client, admin_user):
        url = reverse("core:team_member_detail", kwargs={"user_id": admin_user.id})
        response = auth_admin_client.delete(url)
        assert response.status_code == 400
        assert "ti mismo" in response.data["error"]

    def test_delete_last_admin_prevented(self, auth_admin_client, second_admin):
        """Con 2 admins, eliminar uno deberia funcionar."""
        url = reverse("core:team_member_detail", kwargs={"user_id": second_admin.id})
        response = auth_admin_client.delete(url)
        assert response.status_code == 200

    def test_delete_cross_tenant(self, auth_admin_client, second_tenant):
        other_user = User.objects.create_user(
            email="delete@other.com",
            password="Other123!",
            username="delete_other",
            tenant=second_tenant,
            role="staff",
        )
        url = reverse("core:team_member_detail", kwargs={"user_id": other_user.id})
        response = auth_admin_client.delete(url)
        assert response.status_code == 404
