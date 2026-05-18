# backend/core/admin_views.py
"""
Vistas dedicadas a la autenticación y administración de superadmins de plataforma.

Este módulo está aislado por diseño:
- NO importa nada de `core/views.py`.
- NO referencia `request.tenant`.
- Construye sus propios JWT vía `build_superadmin_tokens` para garantizar
  que ningún claim de tenant se filtre en los tokens de superadmin.
"""

from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from core.cookies import clear_auth_cookies, set_auth_cookies
from core.models import AdminAuditLog, User
from core.permissions import HasInternalRole, IsSuperAdmin
from core.serializers import (
    AdminAuditLogSerializer,
    AdminBlockSerializer,
    AdminChangeRoleSerializer,
    AdminDeleteSerializer,
    AdminLoginSerializer,
    AdminRegisterSerializer,
    AdminUserSerializer,
    AdminUserUpdateSerializer,
)
from core.throttles import AdminLoginThrottle


def build_superadmin_tokens(user: User) -> dict:
    """
    Constructor dedicado de JWT para superadmins de plataforma.

    Contrato:
      - El payload DEBE contener `is_superuser=True` y `scope="admin"`.
      - El payload NO DEBE contener `tenant_id`, `tenant_slug` ni `role`.
      - Nunca compartir constructor con caminos de código de tenant.
    """
    refresh = RefreshToken.for_user(user)
    refresh["is_superuser"] = True
    refresh["scope"] = "admin"

    access = refresh.access_token
    access["is_superuser"] = True
    access["scope"] = "admin"

    # Borrado defensivo: si una subclase o señal añadió claims de tenant,
    # los limpiamos antes de serializar.
    for leaked in ("tenant_id", "tenant_slug", "role"):
        if leaked in refresh:
            del refresh[leaked]
        if leaked in access:
            del access[leaked]

    return {"access": str(access), "refresh": str(refresh)}


class AdminLoginView(APIView):
    """POST /api/admin/auth/login/ — Login de superadmin."""

    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes = [AdminLoginThrottle]

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = User.objects.filter(
            email__iexact=email,
            tenant__isnull=True,
            is_superuser=True,
            is_active=True,
        ).first()
        if user is None or not user.check_password(password):
            # Try to find the user regardless of is_active to provide block info
            blocked_user = User.objects.filter(
                email__iexact=email,
                is_superuser=True,
                tenant__isnull=True,
            ).first()

            if blocked_user and blocked_user.superadmin_status == "blocked":
                # Check auto-unblock
                if blocked_user.blocked_until and blocked_user.blocked_until <= timezone.now():
                    blocked_user.superadmin_status = "active"
                    blocked_user.block_reason = ""
                    blocked_user.blocked_until = None
                    blocked_user.blocked_by = None
                    blocked_user.save(
                        update_fields=[
                            "superadmin_status",
                            "block_reason",
                            "blocked_until",
                            "blocked_by",
                            "is_active",
                        ]
                    )
                    AdminAuditLog.objects.create(
                        actor=None,
                        action=AdminAuditLog.ACTION_UNBLOCK_SUPERADMIN,
                        target_type="User",
                        target_id=str(blocked_user.pk),
                        target_repr=f"user: {blocked_user.email}",
                        details={"auto_unblock": True, "reason": "blocked_until expired"},
                        ip_address=request.META.get("REMOTE_ADDR"),
                    )
                    # Let the login proceed if password matches
                    if blocked_user.check_password(password):
                        user = blocked_user
                    else:
                        return Response(
                            {"detail": "Invalid credentials"},
                            status=status.HTTP_401_UNAUTHORIZED,
                        )
                else:
                    return Response(
                        {
                            "detail": "Tu cuenta está bloqueada.",
                            "block_reason": blocked_user.block_reason,
                            "blocked_until": (
                                blocked_user.blocked_until.isoformat() if blocked_user.blocked_until else None
                            ),
                        },
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
            else:
                return Response(
                    {"detail": "Invalid credentials"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

        tokens = build_superadmin_tokens(user)
        response = Response(
            {
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user": AdminUserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
        set_auth_cookies(
            response,
            tokens["access"],
            tokens["refresh"],
            cookie_prefix="nerbis_admin",
        )
        return response


class AdminRegisterView(APIView):
    """POST /api/admin/auth/register/ — Crear nuevo superadmin (requiere superadmin)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request):
        serializer = AdminRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        AdminAuditLog.objects.create(
            actor=request.user,
            action=AdminAuditLog.ACTION_CREATE_SUPERADMIN,
            target_type="User",
            target_id=str(user.pk),
            target_repr=f"user: {user.email}",
            details={"internal_role": user.internal_role},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response(
            AdminUserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class AdminMeView(APIView):
    """GET /api/admin/auth/me/ — Perfil del superadmin actual."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        return Response(
            AdminUserSerializer(request.user).data,
            status=status.HTTP_200_OK,
        )


class AdminLogoutView(APIView):
    """POST /api/admin/auth/logout/ — Blacklist del refresh token."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request):
        refresh = request.data.get("refresh") or request.COOKIES.get("nerbis_admin_refresh")
        if not refresh:
            return Response(
                {"detail": "refresh token required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh)
            if token.get("scope") != "admin" or str(token.get("user_id")) != str(request.user.id):
                return Response(
                    {"detail": "invalid refresh token"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": "invalid refresh token"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        response = Response(status=status.HTTP_205_RESET_CONTENT)
        clear_auth_cookies(response, cookie_prefix="nerbis_admin")
        return response


class AdminTokenRefreshView(APIView):
    """POST /api/admin/auth/refresh/ — Refresh admin JWT tokens.

    Reads the refresh token from the request body (``refresh`` field) or
    from the ``nerbis_admin_refresh`` httpOnly cookie.  Returns new tokens
    and sets updated cookies.
    """

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_raw = request.data.get("refresh") or request.COOKIES.get("nerbis_admin_refresh")
        if not refresh_raw:
            return Response(
                {"detail": "refresh token required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            old_token = RefreshToken(refresh_raw)
        except TokenError:
            return Response(
                {"detail": "invalid refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if old_token.get("scope") != "admin":
            return Response(
                {"detail": "invalid refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Rotate: blacklist old, issue new pair
        try:
            old_token.blacklist()
        except AttributeError:
            pass  # blacklisting not enabled

        user_id = old_token.get("user_id")
        try:
            user = User.objects.get(pk=user_id, is_superuser=True, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "invalid refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        tokens = build_superadmin_tokens(user)
        response = Response(
            {"access": tokens["access"], "refresh": tokens["refresh"]},
            status=status.HTTP_200_OK,
        )
        set_auth_cookies(
            response,
            tokens["access"],
            tokens["refresh"],
            cookie_prefix="nerbis_admin",
        )
        return response


class AdminSuperadminPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminSuperadminListView(GenericAPIView):
    """GET /api/admin/superadmins/ — Listado paginado de superadmins."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = AdminSuperadminPagination
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        return User.objects.filter(tenant__isnull=True, is_superuser=True).order_by("id")

    def get(self, request):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = AdminUserSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = AdminUserSerializer(queryset, many=True)
        return Response(serializer.data)


class AdminSuperadminDetailView(APIView):
    """PATCH/DELETE /api/admin/superadmins/<id>/ — (de)activar o eliminar un superadmin."""

    permission_classes = [IsAuthenticated, IsSuperAdmin, HasInternalRole("owner", "admin")]

    def patch(self, request, pk: int):
        user = User.objects.filter(
            pk=pk,
            tenant__isnull=True,
            is_superuser=True,
        ).first()
        if user is None:
            return Response(
                {"detail": "Not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AdminUserUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if "is_active" in serializer.validated_data:
            if user.is_owner:
                return Response(
                    {"detail": "No se puede desactivar al owner de la plataforma."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if user.pk == request.user.pk and serializer.validated_data["is_active"] is False:
                return Response(
                    {"detail": "No puedes desactivar tu propia cuenta."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            new_active = serializer.validated_data["is_active"]
            user.is_active = new_active
            if new_active:
                user.superadmin_status = "active"
                user.block_reason = ""
                user.blocked_until = None
                user.blocked_by = None
                user.save(
                    update_fields=[
                        "is_active",
                        "superadmin_status",
                        "block_reason",
                        "blocked_until",
                        "blocked_by",
                    ]
                )
                action = AdminAuditLog.ACTION_ACTIVATE_USER
            else:
                user.superadmin_status = "deactivated"
                user.save(update_fields=["is_active", "superadmin_status"])
                action = AdminAuditLog.ACTION_DEACTIVATE_USER
            AdminAuditLog.objects.create(
                actor=request.user,
                action=action,
                target_type="User",
                target_id=str(user.pk),
                target_repr=f"user: {user.email}",
                details={"is_active": new_active},
                ip_address=request.META.get("REMOTE_ADDR"),
            )
        return Response(AdminUserSerializer(user).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        target = get_object_or_404(User, pk=pk, is_superuser=True, tenant__isnull=True)

        if target.pk == request.user.pk:
            return Response(
                {"detail": "No puedes eliminar tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target.is_owner:
            return Response(
                {"detail": "No se puede eliminar al owner de la plataforma."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AdminDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data["password"]):
            return Response(
                {"detail": "Contraseña incorrecta."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Snapshot for audit log before deletion
        AdminAuditLog.objects.create(
            actor=request.user,
            action=AdminAuditLog.ACTION_DELETE_SUPERADMIN,
            target_type="User",
            target_id=str(target.pk),
            target_repr=f"user: {target.email}",
            details={
                "email": target.email,
                "first_name": target.first_name,
                "last_name": target.last_name,
                "internal_role": target.internal_role,
            },
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        try:
            target.delete()
        except models.ProtectedError as e:
            # Build a summary of what's blocking deletion
            blocking = {}
            for obj in e.protected_objects:
                model_name = obj._meta.verbose_name_plural or obj._meta.model_name
                blocking[model_name] = blocking.get(model_name, 0) + 1
            detail_parts = [f"{count} {name}" for name, count in blocking.items()]
            return Response(
                {
                    "detail": "No se puede eliminar este usuario porque tiene "
                    "registros asociados. Desactívalo en su lugar.",
                    "blocking": blocking,
                    "blocking_summary": ", ".join(detail_parts),
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminBlockSuperadminView(APIView):
    """POST /api/admin/superadmins/<id>/block/ — Bloquear un superadmin."""

    permission_classes = [IsAuthenticated, IsSuperAdmin, HasInternalRole("owner", "admin")]

    def post(self, request, pk):
        target = get_object_or_404(User, pk=pk, is_superuser=True, tenant__isnull=True)

        if target.pk == request.user.pk:
            return Response(
                {"detail": "No puedes bloquear tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target.is_owner:
            return Response(
                {"detail": "No se puede bloquear al owner de la plataforma."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target.superadmin_status == "blocked":
            return Response(
                {"detail": "Este usuario ya está bloqueado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AdminBlockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target.superadmin_status = "blocked"
        target.block_reason = serializer.validated_data["reason"]
        target.blocked_until = serializer.validated_data.get("blocked_until")
        target.blocked_by = request.user
        target.save(
            update_fields=[
                "superadmin_status",
                "block_reason",
                "blocked_until",
                "blocked_by",
                "is_active",
            ]
        )

        AdminAuditLog.objects.create(
            actor=request.user,
            action=AdminAuditLog.ACTION_BLOCK_SUPERADMIN,
            target_type="User",
            target_id=str(target.pk),
            target_repr=f"user: {target.email}",
            details={
                "reason": target.block_reason,
                "blocked_until": str(target.blocked_until) if target.blocked_until else None,
            },
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response(AdminUserSerializer(target).data, status=status.HTTP_200_OK)


class AdminUnblockSuperadminView(APIView):
    """POST /api/admin/superadmins/<id>/unblock/ — Desbloquear un superadmin."""

    permission_classes = [IsAuthenticated, IsSuperAdmin, HasInternalRole("owner", "admin")]

    def post(self, request, pk):
        target = get_object_or_404(User, pk=pk, is_superuser=True, tenant__isnull=True)

        if target.superadmin_status != "blocked":
            return Response(
                {"detail": "Este usuario no está bloqueado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target.superadmin_status = "active"
        target.block_reason = ""
        target.blocked_until = None
        target.blocked_by = None
        target.save(
            update_fields=[
                "superadmin_status",
                "block_reason",
                "blocked_until",
                "blocked_by",
                "is_active",
            ]
        )

        AdminAuditLog.objects.create(
            actor=request.user,
            action=AdminAuditLog.ACTION_UNBLOCK_SUPERADMIN,
            target_type="User",
            target_id=str(target.pk),
            target_repr=f"user: {target.email}",
            details={},
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response(AdminUserSerializer(target).data, status=status.HTTP_200_OK)


class AdminChangeRoleView(APIView):
    """PATCH /api/admin/superadmins/<id>/role/ — Cambiar rol interno de un superadmin."""

    permission_classes = [IsAuthenticated, IsSuperAdmin, HasInternalRole("owner")]

    def patch(self, request, pk):
        target = get_object_or_404(User, pk=pk, is_superuser=True, tenant__isnull=True)

        if target.pk == request.user.pk:
            return Response(
                {"detail": "No puedes cambiar tu propio rol."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AdminChangeRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_role = target.internal_role
        new_role = serializer.validated_data["internal_role"]

        target.internal_role = new_role
        target.save(update_fields=["internal_role"])

        AdminAuditLog.objects.create(
            actor=request.user,
            action=AdminAuditLog.ACTION_CHANGE_SUPERADMIN_ROLE,
            target_type="User",
            target_id=str(target.pk),
            target_repr=f"user: {target.email}",
            details={"old_role": old_role, "new_role": new_role},
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response(AdminUserSerializer(target).data, status=status.HTTP_200_OK)


class AdminAuditLogListView(APIView):
    """GET /api/admin/audit-log/ — Listado paginado del log de auditoría."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        queryset = AdminAuditLog.objects.select_related("actor").order_by("-created_at")

        # Filters
        action = request.query_params.get("action")
        if action:
            queryset = queryset.filter(action=action)

        actor_id = request.query_params.get("actor_id")
        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)

        target_type = request.query_params.get("target_type")
        if target_type:
            queryset = queryset.filter(target_type=target_type)

        paginator = PageNumberPagination()
        paginator.page_size = int(request.query_params.get("page_size", 20))
        paginator.page_size_query_param = "page_size"
        paginator.max_page_size = 100

        page = paginator.paginate_queryset(queryset, request)
        serializer = AdminAuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
