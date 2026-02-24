# backend/core/permissions.py

from rest_framework import permissions


class IsTenantUser(permissions.BasePermission):
    """Usuario debe pertenecer al tenant del request"""

    message = "No perteneces a este tenant"

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.tenant == request.tenant


class IsTenantAdmin(permissions.BasePermission):
    """Usuario debe ser admin del tenant"""

    message = "Debes ser administrador del tenant"

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.tenant != request.tenant:
            return False
        return request.user.role == "admin"


class IsTenantStaffOrAdmin(permissions.BasePermission):
    """Usuario debe ser staff o admin del tenant"""

    message = "Debes ser staff o administrador"

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.tenant != request.tenant:
            return False
        return request.user.role in ["admin", "staff"]


class IsOwnerOrStaff(permissions.BasePermission):
    """Dueño del objeto o staff/admin"""

    message = "No tienes permiso para acceder a este objeto"

    def has_object_permission(self, request, view, obj):
        # Staff y admin tienen acceso
        if request.user.role in ["admin", "staff"]:
            return True
        # Para Appointment, verificar customer
        if hasattr(obj, "customer"):
            return obj.customer == request.user
        # Para otros modelos, verificar user
        if hasattr(obj, "user"):
            return obj.user == request.user
        # Si el objeto es un User
        if obj.__class__.__name__ == "User":
            return obj == request.user
        return False
