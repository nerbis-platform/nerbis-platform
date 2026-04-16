# backend/core/admin_views.py
"""
Vistas dedicadas a la autenticación y administración de superadmins de plataforma.

Este módulo está aislado por diseño:
- NO importa nada de `core/views.py`.
- NO referencia `request.tenant`.
- Construye sus propios JWT vía `build_superadmin_tokens` para garantizar
  que ningún claim de tenant se filtre en los tokens de superadmin.
"""

from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from core.cookies import clear_auth_cookies, set_auth_cookies
from core.models import User
from core.permissions import IsSuperAdmin
from core.serializers import (
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
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            old_token = RefreshToken(refresh_raw)
        except TokenError:
            return Response(
                {"detail": "invalid refresh token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if old_token.get("scope") != "admin":
            return Response(
                {"detail": "invalid refresh token"},
                status=status.HTTP_400_BAD_REQUEST,
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
                status=status.HTTP_400_BAD_REQUEST,
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
    """PATCH /api/admin/superadmins/<id>/ — (de)activar un superadmin."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

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
            if user.pk == request.user.pk and serializer.validated_data["is_active"] is False:
                return Response(
                    {"detail": "No puedes desactivar tu propia cuenta."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.is_active = serializer.validated_data["is_active"]
            user.save(update_fields=["is_active"])
        return Response(AdminUserSerializer(user).data, status=status.HTTP_200_OK)
