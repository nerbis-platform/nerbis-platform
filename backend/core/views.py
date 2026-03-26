# backend/core/views.py

import logging

from django.db import transaction
from django.shortcuts import render
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, inline_serializer
from rest_framework import generics, status
from rest_framework import serializers as drf_serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Banner, OTPToken, PasswordSetToken, SocialAccount, Tenant, User
from .serializers import (
    BannerSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    SetPasswordSerializer,
    SocialLinkSerializer,
    SocialLoginSerializer,
    TenantRegisterSerializer,
    TenantSerializer,
    UpdateProfileSerializer,
    UserSerializer,
    UserSessionSerializer,
)
from .social_auth import LinkingRequired, SocialAuthError, social_login_or_create, verify_social_token
from .throttles import (
    LoginThrottle,
    OTPRequestThrottle,
    OTPVerifyThrottle,
    PasswordResetThrottle,
    RegisterThrottle,
    SocialLoginThrottle,
)

logger = logging.getLogger(__name__)
from django.db.models import Q

# ===================================
# VISTA DE SUSCRIPCION EXPIRADA
# ===================================


def subscription_expired_view(request):
    """
    Vista que muestra cuando la suscripcion del tenant ha expirado.

    El usuario es redirigido aqui por el SubscriptionMiddleware cuando:
    - Su trial de 30 dias ha expirado
    - Su suscripcion pagada ha expirado
    """
    tenant = (
        getattr(request.user, "tenant", None) if hasattr(request, "user") and request.user.is_authenticated else None
    )

    return render(
        request,
        "subscription_expired.html",
        {
            "tenant": tenant,
        },
    )


class RegisterView(generics.CreateAPIView):
    """POST /api/core/auth/register/ - Registro de usuarios

    Si existe un usuario inactivo con el mismo email, lo reactiva automáticamente.
    """

    queryset = User.objects.all()
    authentication_classes = []  # No requiere autenticación (evita CSRF)
    permission_classes = [AllowAny]
    throttle_classes = [RegisterThrottle]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        email = request.data.get("email", "").lower()
        tenant = request.tenant

        # Verificar si existe un usuario inactivo con este email
        try:
            inactive_user = User.objects.get(email__iexact=email, tenant=tenant, is_active=False)

            # Reactivar usuario existente
            serializer = self.get_serializer(inactive_user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            user = serializer.save(is_active=True)

            # Enviar email de bienvenida
            self._send_welcome_email(user)

            # Generar tokens
            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    "user": UserSessionSerializer(user).data,
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                    "message": "Cuenta reactivada exitosamente",
                },
                status=status.HTTP_200_OK,
            )
        except User.DoesNotExist:
            # No existe usuario inactivo, crear uno nuevo
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()

            # Enviar email de bienvenida
            self._send_welcome_email(user)

            # Generar tokens
            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    "user": UserSessionSerializer(user).data,
                    "tokens": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                    "message": "Usuario creado exitosamente",
                },
                status=status.HTTP_201_CREATED,
            )

    def _send_welcome_email(self, user):
        """Enviar email de bienvenida (sin bloquear el registro si falla)."""
        try:
            from notifications.tasks import send_welcome_email

            try:
                send_welcome_email.delay(user.id)
            except Exception:
                # Si Celery no está disponible, enviar sincrónicamente
                send_welcome_email(user.id)
        except Exception as e:
            logger.warning(f"No se pudo enviar email de bienvenida a {user.email}: {e}")


class CheckBusinessNameView(APIView):
    """
    GET /api/public/check-business-name/?name=xxx

    Endpoint público para verificar si ya existe un negocio con ese nombre.
    Retorna exists=true/false para mostrar un aviso suave en el frontend.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="name",
                type=str,
                location=OpenApiParameter.QUERY,
                required=True,
                description="Nombre del negocio a verificar",
            )
        ],
        responses={
            200: inline_serializer(
                name="CheckBusinessNameResponse",
                fields={
                    "exists": drf_serializers.BooleanField(),
                },
            ),
        },
    )
    def get(self, request):
        name = request.query_params.get("name", "").strip()

        if not name or len(name) < 2:
            return Response({"exists": False})

        from django.utils.text import slugify

        slug = slugify(name)
        exists = Tenant.objects.filter(slug=slug).exists()

        return Response({"exists": exists})


class CheckTenantEmailView(APIView):
    """
    GET /api/public/check-tenant-email/?email=xxx

    Endpoint público para verificar si ya existe un tenant con ese email.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="email",
                type=str,
                location=OpenApiParameter.QUERY,
                required=True,
                description="Email a verificar",
            )
        ],
        responses={
            200: inline_serializer(
                name="CheckTenantEmailResponse",
                fields={
                    "exists": drf_serializers.BooleanField(),
                },
            ),
        },
    )
    def get(self, request):
        email = request.query_params.get("email", "").strip().lower()

        if not email or "@" not in email:
            return Response({"exists": False})

        exists = Tenant.objects.filter(email__iexact=email).exists()

        return Response({"exists": exists})


class TenantRegisterView(generics.CreateAPIView):
    """
    POST /api/public/register-tenant/ - Registro de nuevos negocios.

    Endpoint público (sin tenant middleware).
    Crea Tenant + Usuario admin + Suscripción trial.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [RegisterThrottle]
    serializer_class = TenantRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Enviar email de bienvenida
        self._send_welcome_email(user)

        # Generar tokens
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSessionSerializer(user).data,
                "tenant": TenantSerializer(user.tenant).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "message": "Negocio creado exitosamente. Bienvenido a NERBIS!",
            },
            status=status.HTTP_201_CREATED,
        )

    def _send_welcome_email(self, user):
        """Enviar email de bienvenida (sin bloquear el registro si falla)."""
        try:
            from notifications.tasks import send_welcome_email

            try:
                send_welcome_email.delay(user.id)
            except Exception:
                send_welcome_email(user.id)
        except Exception as e:
            logger.warning(f"No se pudo enviar email de bienvenida a {user.email}: {e}")


class LoginView(APIView):
    """
    POST /api/core/auth/login/ - Login por email

    El tenant se obtiene del request (header X-Tenant-Slug o query param ?tenant=).

    Flujo de autenticación multi-tenant:
    1. Obtener tenant del request (middleware)
    2. Buscar usuario por email dentro del tenant
    3. Verificar contraseña
    4. Generar tokens JWT con información del tenant
    """

    authentication_classes = []  # No requiere autenticación (evita CSRF)
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: inline_serializer(
                name="LoginResponse",
                fields={
                    "user": UserSerializer(),
                    "tenant": TenantSerializer(),
                    "tokens": inline_serializer(
                        name="TokenPair",
                        fields={
                            "refresh": drf_serializers.CharField(),
                            "access": drf_serializers.CharField(),
                        },
                    ),
                },
            ),
            401: OpenApiResponse(description="Credenciales inválidas"),
        },
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        # 1. Obtener tenant del request (inyectado por middleware)
        tenant = request.tenant

        # 2. Buscar usuario por email en el tenant (case-insensitive)
        try:
            user = User.objects.get(email__iexact=email, tenant=tenant)
        except User.DoesNotExist:
            return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

        # 3. Verificar contraseña
        if not user.check_password(password):
            return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

        # 4. Si el usuario está inactivo, notificar que necesita reactivación
        if not user.is_active:
            return Response(
                {
                    "error": "Tu cuenta fue desactivada",
                    "code": "ACCOUNT_INACTIVE",
                    "email": user.email,
                    "message": "Tu cuenta fue desactivada previamente. ¿Deseas reactivarla?",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # 5. Generar tokens JWT con claims del tenant
        refresh = RefreshToken.for_user(user)
        refresh["tenant_id"] = str(user.tenant.id)
        refresh["tenant_slug"] = user.tenant.slug
        refresh["role"] = user.role

        return Response(
            {
                "user": UserSessionSerializer(user).data,
                "tenant": TenantSerializer(tenant).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            }
        )


class PlatformLoginView(APIView):
    """
    POST /api/public/platform-login/ - Login desde la plataforma NERBIS

    A diferencia del LoginView normal (que requiere tenant context del middleware),
    este endpoint busca al usuario por email en TODOS los tenants.
    Está diseñado para el formulario de login de la plataforma (nerbis.com),
    donde el usuario no tiene un subdominio de tenant.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        # Buscar usuario por email en TODOS los tenants
        try:
            user = User.objects.select_related("tenant").get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)
        except User.MultipleObjectsReturned:
            # Email existe en múltiples tenants — usar el más reciente
            user = User.objects.select_related("tenant").filter(email__iexact=email).order_by("-date_joined").first()

        # Verificar contraseña
        if not user.check_password(password):
            return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

        # Si el usuario está inactivo
        if not user.is_active:
            return Response(
                {
                    "error": "Tu cuenta fue desactivada",
                    "code": "ACCOUNT_INACTIVE",
                    "email": user.email,
                    "message": "Tu cuenta fue desactivada previamente. ¿Deseas reactivarla?",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Verificar que el tenant esté activo
        if not user.tenant.is_active:
            return Response(
                {"error": "El negocio asociado a esta cuenta no está activo."}, status=status.HTTP_403_FORBIDDEN
            )

        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        refresh["tenant_id"] = str(user.tenant.id)
        refresh["tenant_slug"] = user.tenant.slug
        refresh["role"] = user.role

        return Response(
            {
                "user": UserSessionSerializer(user).data,
                "tenant": TenantSerializer(user.tenant).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            }
        )


class PlatformForgotPasswordView(APIView):
    """
    POST /api/public/platform-forgot-password/ - Solicitar OTP desde la plataforma

    Versión cross-tenant de RequestPasswordResetOTPView.
    Busca al usuario por email en TODOS los tenants.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPRequestThrottle]

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response({"error": "El email es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar usuario en todos los tenants
        try:
            user = User.objects.select_related("tenant").get(email__iexact=email)
        except User.DoesNotExist:
            # Por seguridad, no revelar si el email existe
            return Response(
                {
                    "message": "Si el email existe, recibirás un código de verificación",
                    "email": email,
                }
            )
        except User.MultipleObjectsReturned:
            user = User.objects.select_related("tenant").filter(email__iexact=email).order_by("-date_joined").first()

        # Crear OTP
        otp = OTPToken.create_for_user(user, purpose="password_reset")

        # Enviar email con OTP (async con Celery)
        from notifications.tasks import send_otp_email

        send_otp_email.delay(user.id, otp.code, "password_reset")

        return Response(
            {
                "message": "Si el email existe, recibirás un código de verificación",
                "email": email,
            }
        )


class PlatformVerifyResetOTPView(APIView):
    """
    POST /api/public/platform-verify-reset-otp/ - Verificar OTP desde la plataforma

    Versión cross-tenant de VerifyPasswordResetOTPView.
    Busca al usuario por email en TODOS los tenants.
    Retorna user + tenant + tokens para auto-login.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPVerifyThrottle]

    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        new_password = request.data.get("new_password")

        if not all([email, code, new_password]):
            return Response(
                {"error": "Email, código y nueva contraseña son requeridos"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Buscar usuario en todos los tenants
        try:
            user = User.objects.select_related("tenant").get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        except User.MultipleObjectsReturned:
            user = User.objects.select_related("tenant").filter(email__iexact=email).order_by("-date_joined").first()

        # Buscar OTP válido
        try:
            otp = OTPToken.objects.get(user=user, purpose="password_reset", used_at__isnull=True)
        except OTPToken.DoesNotExist:
            return Response(
                {"error": "No hay un código de verificación activo. Solicita uno nuevo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar OTP
        success, error = otp.verify(code)
        if not success:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        # Validar fortaleza de la nueva contraseña
        if len(new_password) < 8:
            return Response(
                {"error": "La contraseña debe tener al menos 8 caracteres"}, status=status.HTTP_400_BAD_REQUEST
            )
        has_upper = any(c.isupper() for c in new_password)
        has_lower = any(c.islower() for c in new_password)
        has_digit = any(c.isdigit() for c in new_password)
        if not (has_upper and has_lower and has_digit):
            return Response(
                {"error": "La contraseña debe incluir mayúsculas, minúsculas y números"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cambiar contraseña (sin generar tokens — el usuario debe iniciar sesión manualmente)
        user.set_password(new_password)
        user.save()

        return Response(
            {
                "message": "Contraseña restablecida exitosamente. Inicia sesión con tu nueva contraseña.",
            }
        )


class LogoutView(APIView):
    """POST /api/core/auth/logout/ - Logout"""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=inline_serializer(name="LogoutRequest", fields={"refresh": drf_serializers.CharField()}),
        responses={
            200: inline_serializer(name="LogoutResponse", fields={"message": drf_serializers.CharField()}),
            400: OpenApiResponse(description="Token inválido"),
        },
    )
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Logout exitoso"})
        except Exception:
            return Response({"error": "Token inválido"}, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    """GET /api/core/auth/me/ - Usuario actual"""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: inline_serializer(
                name="CurrentUserResponse",
                fields={
                    "user": UserSerializer(),
                    "tenant": TenantSerializer(),
                },
            ),
        }
    )
    def get(self, request):
        # Usar request.user.tenant para obtener el tenant del usuario autenticado
        # (más confiable que request.tenant del middleware)
        tenant = getattr(request.user, "tenant", None)
        tenant_data = TenantSerializer(tenant).data if tenant else None
        return Response({"user": UserSessionSerializer(request.user).data, "tenant": tenant_data})


class ProfileView(APIView):
    """
    GET /api/core/auth/profile/ - Obtener perfil completo
    PUT/PATCH /api/core/auth/profile/ - Actualizar perfil
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        """Obtener perfil completo del usuario"""
        return Response(UserSerializer(request.user).data)

    @extend_schema(
        request=UpdateProfileSerializer,
        responses={
            200: inline_serializer(
                name="UpdateProfileResponse",
                fields={
                    "message": drf_serializers.CharField(),
                    "user": UserSerializer(),
                },
            ),
            400: OpenApiResponse(description="Datos inválidos"),
        },
    )
    def put(self, request):
        """Actualizar perfil del usuario"""
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()

        return Response(UserSerializer(updated_user).data)

    # Alias PATCH al método PUT
    patch = put


class ChangePasswordView(APIView):
    """POST /api/core/auth/change-password/ - Cambiar contraseña"""

    permission_classes = [IsAuthenticated]
    throttle_classes = [PasswordResetThrottle]

    @extend_schema(
        request=ChangePasswordSerializer,
        responses={
            200: inline_serializer(name="ChangePasswordResponse", fields={"message": drf_serializers.CharField()}),
            400: OpenApiResponse(description="Contraseña actual incorrecta"),
        },
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        # Verificar contraseña actual
        if not user.check_password(serializer.validated_data["current_password"]):
            return Response({"error": "La contraseña actual es incorrecta"}, status=status.HTTP_400_BAD_REQUEST)

        # Cambiar contraseña
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        return Response({"message": "Contraseña cambiada exitosamente"})


class SetPasswordView(APIView):
    """
    POST /api/core/auth/set-password/ - Establecer contraseña con token

    Usado por usuarios creados via guest booking que necesitan
    establecer su contraseña por primera vez.
    """

    authentication_classes = []  # No requiere autenticación (evita CSRF)
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="token",
                type=str,
                location=OpenApiParameter.QUERY,
                required=True,
                description="Token de verificación para establecer contraseña",
            )
        ],
        responses={
            200: inline_serializer(
                name="TokenValidResponse",
                fields={
                    "valid": drf_serializers.BooleanField(),
                    "email": drf_serializers.EmailField(),
                    "first_name": drf_serializers.CharField(),
                },
            ),
            400: OpenApiResponse(description="Token inválido o expirado"),
        },
    )
    def get(self, request):
        """
        GET /api/core/auth/set-password/?token=xxx

        Verificar si un token es válido (para mostrar el formulario o error)
        """
        token_str = request.query_params.get("token")

        if not token_str:
            return Response({"error": "Token requerido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = PasswordSetToken.objects.get(token=token_str)
        except PasswordSetToken.DoesNotExist:
            return Response({"error": "Token inválido o expirado"}, status=status.HTTP_400_BAD_REQUEST)

        if not token.is_valid:
            return Response({"error": "Token inválido o expirado"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "valid": True,
                "email": token.user.email,
                "first_name": token.user.first_name,
            }
        )

    @extend_schema(
        request=SetPasswordSerializer,
        responses={
            200: inline_serializer(
                name="SetPasswordResponse",
                fields={
                    "message": drf_serializers.CharField(),
                    "user": UserSerializer(),
                    "tokens": inline_serializer(
                        name="SetPasswordTokens",
                        fields={
                            "refresh": drf_serializers.CharField(),
                            "access": drf_serializers.CharField(),
                        },
                    ),
                },
            ),
            400: OpenApiResponse(description="Token inválido o expirado"),
        },
    )
    def post(self, request):
        """
        POST /api/core/auth/set-password/

        Establecer la contraseña usando el token
        """
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_str = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        # Buscar token
        try:
            token = PasswordSetToken.objects.get(token=token_str)
        except PasswordSetToken.DoesNotExist:
            return Response({"error": "Token inválido o expirado"}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar validez
        if not token.is_valid:
            return Response({"error": "Token inválido o expirado"}, status=status.HTTP_400_BAD_REQUEST)

        # Establecer contraseña
        user = token.user
        user.set_password(password)
        user.is_guest = False  # Ya no es cuenta de invitado
        user.save()

        # Marcar token como usado
        token.mark_as_used()

        # Generar tokens JWT para auto-login
        refresh = RefreshToken.for_user(user)
        refresh["tenant_id"] = str(user.tenant.id)
        refresh["tenant_slug"] = user.tenant.slug
        refresh["role"] = user.role

        return Response(
            {
                "message": "Contraseña establecida exitosamente",
                "user": UserSessionSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            }
        )


# Vistas de testing (mantener)
@extend_schema(
    responses={
        200: inline_serializer(
            name="TenantInfoResponse",
            fields={
                "tenant": TenantSerializer(),
                "users_count": drf_serializers.IntegerField(),
            },
        ),
    }
)
@api_view(["GET"])
@permission_classes([AllowAny])
def tenant_info(request):
    """GET /api/core/tenant-info/ - Info del tenant"""
    if not hasattr(request, "tenant"):
        return Response({"error": "Tenant no detectado"}, status=500)

    return Response(
        {
            "tenant": TenantSerializer(request.tenant).data,
            "users_count": request.tenant.users.count(),
        }
    )


@extend_schema(
    request=inline_serializer(
        name="ConfigureModulesRequest",
        fields={
            "industry": drf_serializers.CharField(required=False),
            "has_website": drf_serializers.BooleanField(required=False),
            "has_shop": drf_serializers.BooleanField(required=False),
            "has_bookings": drf_serializers.BooleanField(required=False),
            "has_services": drf_serializers.BooleanField(required=False),
            "has_marketing": drf_serializers.BooleanField(required=False),
        },
    ),
    responses={200: TenantSerializer},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def configure_modules(request):
    """POST /api/core/configure-modules/ - Configura módulos del tenant (solo admin)."""
    if not hasattr(request, "tenant"):
        return Response({"error": "Tenant no detectado"}, status=500)

    if request.user.role != "admin":
        return Response({"error": "Solo el administrador puede configurar módulos"}, status=403)

    tenant = request.tenant
    module_fields = {"has_website", "has_shop", "has_bookings", "has_services", "has_marketing"}
    updated_fields = ["modules_configured"]

    # Guardar campos del tenant si se envían
    tenant_text_fields = {"industry": "industry", "business_name": "name", "country": "country"}
    for payload_key, model_field in tenant_text_fields.items():
        value = request.data.get(payload_key)
        if value and isinstance(value, str) and value.strip():
            setattr(tenant, model_field, value.strip())
            updated_fields.append(model_field)

    for field in module_fields:
        if field in request.data:
            setattr(tenant, field, bool(request.data[field]))
            updated_fields.append(field)

    tenant.modules_configured = True
    tenant.save(update_fields=updated_fields)

    # Actualizar perfil del usuario si se envían campos
    user = request.user
    user_updated = False
    for user_field in ("first_name", "last_name"):
        value = request.data.get(user_field)
        if value and isinstance(value, str) and value.strip():
            setattr(user, user_field, value.strip())
            user_updated = True
    if user_updated:
        user.save(update_fields=["first_name", "last_name"])

    return Response(TenantSerializer(tenant).data)


class DeleteAccountView(APIView):
    """POST /api/core/auth/delete-account/ - Eliminar cuenta de usuario"""

    permission_classes = [IsAuthenticated]
    throttle_classes = [PasswordResetThrottle]

    @extend_schema(
        request=inline_serializer(name="DeleteAccountRequest", fields={"password": drf_serializers.CharField()}),
        responses={
            200: inline_serializer(name="DeleteAccountResponse", fields={"message": drf_serializers.CharField()}),
            400: OpenApiResponse(description="Contraseña incorrecta"),
        },
    )
    def post(self, request):
        password = request.data.get("password")

        if not password:
            return Response(
                {"error": "Debes ingresar tu contraseña para confirmar"}, status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        # Verificar contraseña
        if not user.check_password(password):
            return Response({"error": "La contraseña es incorrecta"}, status=status.HTTP_400_BAD_REQUEST)

        # Eliminar usuario
        user.is_active = False
        user.save()
        # O eliminarlo completamente: user.delete()

        return Response({"message": "Cuenta eliminada exitosamente"})


class ReactivateAccountView(APIView):
    """POST /api/auth/reactivate-account/ - Reactivar cuenta inactiva"""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    @extend_schema(
        request=inline_serializer(
            name="ReactivateAccountRequest",
            fields={"email": drf_serializers.EmailField(), "password": drf_serializers.CharField()},
        ),
        responses={
            200: inline_serializer(
                name="ReactivateAccountResponse",
                fields={
                    "user": UserSerializer(),
                    "tokens": inline_serializer(
                        name="TokenPair",
                        fields={
                            "refresh": drf_serializers.CharField(),
                            "access": drf_serializers.CharField(),
                        },
                    ),
                    "message": drf_serializers.CharField(),
                },
            ),
            400: OpenApiResponse(description="Error en reactivación"),
        },
    )
    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        tenant = request.tenant

        if not email or not password:
            return Response({"error": "Email y contraseña son requeridos"}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar usuario inactivo
        try:
            user = User.objects.get(email__iexact=email, tenant=tenant, is_active=False)
        except User.DoesNotExist:
            return Response(
                {"error": "No se encontró una cuenta inactiva con este email"}, status=status.HTTP_404_NOT_FOUND
            )

        # Verificar contraseña
        if not user.check_password(password):
            return Response({"error": "Contraseña incorrecta"}, status=status.HTTP_401_UNAUTHORIZED)

        # Reactivar cuenta
        user.is_active = True
        user.save()

        # Generar tokens
        refresh = RefreshToken.for_user(user)
        refresh["tenant_id"] = str(user.tenant.id)
        refresh["tenant_slug"] = user.tenant.slug
        refresh["role"] = user.role

        return Response(
            {
                "user": UserSessionSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "message": "Cuenta reactivada exitosamente",
            },
            status=status.HTTP_200_OK,
        )


class ActiveBannersView(generics.ListAPIView):
    """
    GET /api/core/banners/ - Lista de banners activos

    Devuelve los banners que:
    - Pertenecen al tenant actual
    - Están marcados como activos (is_active=True)
    - Su fecha de inicio ya pasó (o no tiene fecha de inicio)
    - Su fecha de fin aún no llegó (o no tiene fecha de fin)

    Ordenados por prioridad (mayor primero) y fecha de creación.
    """

    authentication_classes = []  # Público
    permission_classes = [AllowAny]
    serializer_class = BannerSerializer

    @extend_schema(
        responses={200: BannerSerializer(many=True)},
        parameters=[
            OpenApiParameter(
                name="position",
                type=str,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Filtrar por posición: 'top' o 'bottom'",
                enum=["top", "bottom"],
            ),
        ],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        tenant = self.request.tenant
        now = timezone.now()

        # Filtrar banners activos considerando fechas
        queryset = (
            Banner.objects.filter(
                tenant=tenant,
                is_active=True,
            )
            .filter(
                # start_date es null O ya pasó
                Q(start_date__isnull=True) | Q(start_date__lte=now)
            )
            .filter(
                # end_date es null O aún no llegó
                Q(end_date__isnull=True) | Q(end_date__gte=now)
            )
            .order_by("-priority", "-created_at")
        )

        # Filtrar por posición si se especifica
        position = self.request.query_params.get("position")
        if position in ["top", "bottom"]:
            queryset = queryset.filter(position=position)

        return queryset


# ===================================
# VISTAS OTP - Verificación por email
# ===================================


class RequestPasswordResetOTPView(APIView):
    """
    POST /api/auth/forgot-password/ - Solicitar OTP para restablecer contraseña

    Envía un código OTP de 6 dígitos al email del usuario.
    El código expira en 10 minutos.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPRequestThrottle]

    @extend_schema(
        request=inline_serializer(name="RequestPasswordResetRequest", fields={"email": drf_serializers.EmailField()}),
        responses={
            200: inline_serializer(
                name="RequestPasswordResetResponse",
                fields={
                    "message": drf_serializers.CharField(),
                    "email": drf_serializers.EmailField(),
                },
            ),
        },
    )
    def post(self, request):
        email = request.data.get("email")
        tenant = request.tenant

        if not email:
            return Response({"error": "El email es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar usuario (activo o inactivo)
        try:
            user = User.objects.get(email__iexact=email, tenant=tenant)
        except User.DoesNotExist:
            # Por seguridad, no revelar si el email existe o no
            return Response(
                {
                    "message": "Si el email existe, recibirás un código de verificación",
                    "email": email,
                }
            )

        # Crear OTP
        otp = OTPToken.create_for_user(user, purpose="password_reset")

        # Enviar email con OTP (async con Celery)
        from notifications.tasks import send_otp_email

        send_otp_email.delay(user.id, otp.code, "password_reset")

        return Response(
            {
                "message": "Si el email existe, recibirás un código de verificación",
                "email": email,
            }
        )


class VerifyPasswordResetOTPView(APIView):
    """
    POST /api/auth/verify-reset-otp/ - Verificar OTP y establecer nueva contraseña

    Verifica el código OTP y permite establecer una nueva contraseña.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPVerifyThrottle]

    @extend_schema(
        request=inline_serializer(
            name="VerifyPasswordResetRequest",
            fields={
                "email": drf_serializers.EmailField(),
                "code": drf_serializers.CharField(),
                "new_password": drf_serializers.CharField(),
            },
        ),
        responses={
            200: inline_serializer(
                name="VerifyPasswordResetResponse",
                fields={
                    "message": drf_serializers.CharField(),
                    "user": UserSerializer(),
                    "tokens": inline_serializer(
                        name="TokenPair",
                        fields={
                            "refresh": drf_serializers.CharField(),
                            "access": drf_serializers.CharField(),
                        },
                    ),
                },
            ),
            400: OpenApiResponse(description="Código inválido o expirado"),
        },
    )
    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        new_password = request.data.get("new_password")
        tenant = request.tenant

        if not all([email, code, new_password]):
            return Response(
                {"error": "Email, código y nueva contraseña son requeridos"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Buscar usuario
        try:
            user = User.objects.get(email__iexact=email, tenant=tenant)
        except User.DoesNotExist:
            return Response({"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        # Buscar OTP válido
        try:
            otp = OTPToken.objects.get(user=user, purpose="password_reset", used_at__isnull=True)
        except OTPToken.DoesNotExist:
            return Response(
                {"error": "No hay un código de verificación activo. Solicita uno nuevo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar OTP
        success, error = otp.verify(code)
        if not success:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        # Validar fortaleza de la nueva contraseña
        if len(new_password) < 8:
            return Response(
                {"error": "La contraseña debe tener al menos 8 caracteres"}, status=status.HTTP_400_BAD_REQUEST
            )
        has_upper = any(c.isupper() for c in new_password)
        has_lower = any(c.islower() for c in new_password)
        has_digit = any(c.isdigit() for c in new_password)
        if not (has_upper and has_lower and has_digit):
            return Response(
                {"error": "La contraseña debe incluir mayúsculas, minúsculas y números"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cambiar contraseña (sin generar tokens — el usuario debe iniciar sesión manualmente)
        user.set_password(new_password)
        user.save()

        return Response(
            {
                "message": "Contraseña restablecida exitosamente. Inicia sesión con tu nueva contraseña.",
            }
        )


class RequestReactivationOTPView(APIView):
    """
    POST /api/auth/request-reactivation/ - Solicitar OTP para reactivar cuenta

    Envía un código OTP de 6 dígitos al email del usuario inactivo.
    El código expira en 10 minutos.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPRequestThrottle]

    @extend_schema(
        request=inline_serializer(
            name="RequestReactivationRequest",
            fields={
                "email": drf_serializers.EmailField(),
                "password": drf_serializers.CharField(),
            },
        ),
        responses={
            200: inline_serializer(
                name="RequestReactivationResponse",
                fields={
                    "message": drf_serializers.CharField(),
                    "email": drf_serializers.EmailField(),
                },
            ),
            401: OpenApiResponse(description="Contraseña incorrecta"),
            404: OpenApiResponse(description="Cuenta no encontrada"),
        },
    )
    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        tenant = request.tenant

        if not email or not password:
            return Response({"error": "Email y contraseña son requeridos"}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar usuario inactivo
        try:
            user = User.objects.get(email__iexact=email, tenant=tenant, is_active=False)
        except User.DoesNotExist:
            return Response(
                {"error": "No se encontró una cuenta inactiva con este email"}, status=status.HTTP_404_NOT_FOUND
            )

        # Verificar contraseña
        if not user.check_password(password):
            return Response({"error": "Contraseña incorrecta"}, status=status.HTTP_401_UNAUTHORIZED)

        # Crear OTP
        otp = OTPToken.create_for_user(user, purpose="account_reactivation")

        # Enviar email con OTP (async con Celery)
        from notifications.tasks import send_otp_email

        send_otp_email.delay(user.id, otp.code, "account_reactivation")

        return Response(
            {
                "message": "Te hemos enviado un código de verificación a tu email",
                "email": email,
            }
        )


class VerifyReactivationOTPView(APIView):
    """
    POST /api/auth/verify-reactivation/ - Verificar OTP y reactivar cuenta

    Verifica el código OTP y reactiva la cuenta del usuario.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPVerifyThrottle]

    @extend_schema(
        request=inline_serializer(
            name="VerifyReactivationRequest",
            fields={
                "email": drf_serializers.EmailField(),
                "code": drf_serializers.CharField(),
            },
        ),
        responses={
            200: inline_serializer(
                name="VerifyReactivationResponse",
                fields={
                    "message": drf_serializers.CharField(),
                    "user": UserSerializer(),
                    "tokens": inline_serializer(
                        name="TokenPair",
                        fields={
                            "refresh": drf_serializers.CharField(),
                            "access": drf_serializers.CharField(),
                        },
                    ),
                },
            ),
            400: OpenApiResponse(description="Código inválido o expirado"),
        },
    )
    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        tenant = request.tenant

        if not email or not code:
            return Response({"error": "Email y código son requeridos"}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar usuario inactivo
        try:
            user = User.objects.get(email__iexact=email, tenant=tenant, is_active=False)
        except User.DoesNotExist:
            return Response({"error": "Usuario no encontrado o ya está activo"}, status=status.HTTP_404_NOT_FOUND)

        # Buscar OTP válido
        try:
            otp = OTPToken.objects.get(user=user, purpose="account_reactivation", used_at__isnull=True)
        except OTPToken.DoesNotExist:
            return Response(
                {"error": "No hay un código de verificación activo. Solicita uno nuevo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar OTP
        success, error = otp.verify(code)
        if not success:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        # Reactivar cuenta
        user.is_active = True
        user.save()

        # Generar tokens para auto-login
        refresh = RefreshToken.for_user(user)
        refresh["tenant_id"] = str(user.tenant.id)
        refresh["tenant_slug"] = user.tenant.slug
        refresh["role"] = user.role

        return Response(
            {
                "message": "Cuenta reactivada exitosamente",
                "user": UserSessionSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            }
        )


# ===================================
# CONFIGURACIÓN DEL TENANT
# ===================================


@extend_schema(
    summary="Obtener configuración del tenant",
    description="Devuelve la configuración de módulos activos y personalización del tenant actual",
    responses={
        200: inline_serializer(
            name="TenantConfigResponse",
            fields={
                "tenant": drf_serializers.DictField(),
                "modules": drf_serializers.DictField(),
                "config": drf_serializers.DictField(),
            },
        )
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])  # Público para que el frontend pueda cargarlo sin autenticación
def get_tenant_config(request):
    """
    Devuelve la configuración de módulos activos del tenant.

    Respuesta:
    {
        "tenant": {
            "name": "GC Belleza",
            "slug": "gc-belleza",
            "logo": "/media/tenants/logos/logo.png"
        },
        "modules": {
            "shop": true,
            "bookings": true,
            "services": false,
            "marketing": false
        },
        "config": {
            "primary_color": "#3B82F6",
            "secondary_color": "#8B5CF6",
            "currency": "COP",
            "timezone": "America/Bogota"
        }
    }
    """
    # Obtener tenant desde el middleware o desde el slug en el header
    tenant = getattr(request, "tenant", None)

    if not tenant:
        # Fallback: intentar obtener tenant desde el header X-Tenant-Slug
        # No se acepta query param para evitar tenant spoofing (ver issue #17)
        tenant_slug = request.headers.get("X-Tenant-Slug")
        if tenant_slug:
            try:
                tenant = Tenant.objects.get(slug=tenant_slug)
            except Tenant.DoesNotExist:
                pass

    if not tenant:
        return Response({"error": "No se pudo determinar el tenant"}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            "tenant": {
                "name": tenant.name,
                "slug": tenant.slug,
                "logo": tenant.logo.url if tenant.logo else None,
            },
            "modules": {
                "shop": tenant.has_shop,
                "bookings": tenant.has_bookings,
                "services": tenant.has_services,
                "marketing": tenant.has_marketing,
            },
            "config": {
                "primary_color": tenant.primary_color,
                "secondary_color": tenant.secondary_color,
                "currency": tenant.currency,
                "timezone": tenant.timezone,
                "language": tenant.language,
            },
            "contact": {
                "email": tenant.email,
                "phone": tenant.phone,
                "address": tenant.address,
                "city": tenant.city,
                "state": tenant.state,
                "country": tenant.country,
            },
            "metrics": {
                "years_experience": tenant.years_experience,
                "clients_count": tenant.clients_count,
                "treatments_count": tenant.treatments_count,
                "average_rating": float(tenant.average_rating),
            },
            "images": {
                "hero_home": tenant.hero_image_home.url if tenant.hero_image_home else None,
                "hero_services": tenant.hero_image_services.url if tenant.hero_image_services else None,
            },
            "pages": _get_enabled_pages(tenant),
            "theme": _get_tenant_theme(tenant),
            "subscription": _get_tenant_subscription_features(tenant),
        }
    )


def _get_tenant_subscription_features(tenant):
    """Devuelve features de la suscripción relevantes para el frontend."""
    try:
        return {"is_subscribed": tenant.subscription.status != "trial"}
    except Exception:
        return {"is_subscribed": False}


def _get_tenant_theme(tenant):
    """Construye el objeto theme para el storefront.

    Prioridad: WebsiteConfig.theme_data > Tenant.primary/secondary > defaults.
    """
    theme = {
        "primary_color": tenant.primary_color,
        "secondary_color": tenant.secondary_color,
    }
    try:
        from websites.models import WebsiteConfig

        config = (
            WebsiteConfig.objects.filter(
                tenant=tenant,
                status__in=["review", "published"],
            )
            .select_related("template")
            .first()
        )
        if config and config.theme_data:
            full_theme = {**(config.template.default_theme or {}), **config.theme_data}
            theme.update(full_theme)
    except Exception:
        pass
    return theme


def _get_enabled_pages(tenant):
    """Retorna las páginas habilitadas del website del tenant."""
    try:
        from websites.models import WebsiteConfig

        config = WebsiteConfig.objects.filter(tenant=tenant).first()
        return {"enabled": config.enabled_pages if config else []}
    except Exception:
        return {"enabled": []}


@api_view(["GET"])
@permission_classes([AllowAny])
def get_tenant_website_content(request):
    """
    Endpoint público que retorna el contenido IA del sitio web del tenant.
    Usado por las páginas públicas para mostrar contenido generado.
    """
    tenant = getattr(request, "tenant", None)
    if not tenant:
        # Fallback: intentar obtener tenant desde el header X-Tenant-Slug
        # No se acepta query param para evitar tenant spoofing (ver issue #17)
        tenant_slug = request.headers.get("X-Tenant-Slug")
        if tenant_slug:
            try:
                tenant = Tenant.objects.get(slug=tenant_slug)
            except Tenant.DoesNotExist:
                pass

    if not tenant:
        return Response({"error": "No se pudo determinar el tenant"}, status=400)

    try:
        from websites.models import WebsiteConfig

        config = WebsiteConfig.objects.select_related("template").get(tenant=tenant)
    except Exception:
        return Response(
            {
                "has_website": False,
                "content": {},
                "enabled_pages": [],
            }
        )

    response_data = {
        "has_website": True,
        "status": config.status,
        "content": config.content_data or {},
        "enabled_pages": config.enabled_pages or [],
    }

    # Para sitios en review o publicados, incluir theme, seo, media
    if config.status in ("review", "published") and config.template:
        # Theme: merge default del template + customizaciones del tenant
        default_theme = config.template.default_theme or {}
        theme_data = config.theme_data or {}
        response_data["theme"] = {**default_theme, **theme_data}

        # SEO metadata
        response_data["seo"] = config.seo_data or {}

        # Media (logo, favicon, og_image)
        response_data["media"] = config.media_data or {}

        # Template slug para referencia
        response_data["template_slug"] = config.template.slug

    return Response(response_data)


# ===================================
# SOCIAL AUTH VIEWS
# ===================================


def _build_social_auth_response(user, tenant_obj):
    """Helper: genera la respuesta JWT estándar para social auth."""
    refresh = RefreshToken.for_user(user)
    refresh["tenant_id"] = str(user.tenant.id)
    refresh["tenant_slug"] = user.tenant.slug
    refresh["role"] = user.role

    return {
        "user": UserSessionSerializer(user).data,
        "tenant": TenantSerializer(tenant_obj).data,
        "tokens": {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        },
    }


class SocialLoginView(APIView):
    """
    POST /api/auth/social/<provider>/ — Social login dentro de un tenant.

    Verifica el token del proveedor, crea o vincula usuario, retorna JWT.
    Requiere tenant context (header X-Tenant-Slug).
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [SocialLoginThrottle]

    @extend_schema(
        request=SocialLoginSerializer,
        responses={
            200: OpenApiResponse(description="Login exitoso con JWT"),
            401: OpenApiResponse(description="Token inválido"),
            409: OpenApiResponse(description="Email ya registrado con contraseña — requiere vinculación"),
        },
        parameters=[
            OpenApiParameter(name="provider", location="path", type=str, enum=["google", "apple", "facebook"]),
        ],
    )
    def post(self, request, provider):
        serializer = SocialLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        first_name = serializer.validated_data.get("first_name", "")
        last_name = serializer.validated_data.get("last_name", "")

        tenant = request.tenant

        # Verificar token con el proveedor
        try:
            social_info = verify_social_token(provider, token, first_name=first_name, last_name=last_name)
        except SocialAuthError as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        # Login o crear usuario
        try:
            user = social_login_or_create(social_info, tenant)
        except LinkingRequired as e:
            return Response(
                {
                    "error": "Ya existe una cuenta con este email",
                    "code": "LINKING_REQUIRED",
                    "email": e.email,
                    "provider": e.provider,
                    "message": "Ya tienes una cuenta con contraseña. Ingresa tu contraseña para vincular tu cuenta social.",
                },
                status=status.HTTP_409_CONFLICT,
            )

        if not user.is_active:
            return Response(
                {"error": "Tu cuenta está desactivada", "code": "ACCOUNT_INACTIVE"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(_build_social_auth_response(user, tenant))


class SocialLinkView(APIView):
    """
    POST /api/auth/social/link/ — Vincular cuenta social a usuario existente.

    Cuando el social login retorna LINKING_REQUIRED (409), el frontend
    envía la contraseña del usuario para confirmar la vinculación.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [SocialLoginThrottle]

    @extend_schema(
        request=SocialLinkSerializer,
        responses={
            200: OpenApiResponse(description="Vinculación exitosa con JWT"),
            401: OpenApiResponse(description="Credenciales inválidas"),
        },
    )
    def post(self, request):
        serializer = SocialLinkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        provider = serializer.validated_data["provider"]
        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]
        first_name = serializer.validated_data.get("first_name", "")
        last_name = serializer.validated_data.get("last_name", "")

        tenant = request.tenant

        # Verificar token
        try:
            social_info = verify_social_token(provider, token, first_name=first_name, last_name=last_name)
        except SocialAuthError as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        # Buscar usuario por email
        try:
            user = User.objects.get(email__iexact=social_info.email, tenant=tenant)
        except User.DoesNotExist:
            return Response({"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        # Verificar contraseña
        if not user.check_password(password):
            return Response({"error": "Contraseña incorrecta"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response(
                {"error": "Tu cuenta está desactivada", "code": "ACCOUNT_INACTIVE"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Crear SocialAccount (o actualizar si ya existe para otro provider_uid)
        SocialAccount.objects.update_or_create(
            tenant=tenant,
            provider=social_info.provider,
            provider_uid=social_info.provider_uid,
            defaults={
                "user": user,
                "email": social_info.email,
                "extra_data": social_info.extra_data,
            },
        )

        return Response(_build_social_auth_response(user, tenant))


class PlatformSocialLoginView(APIView):
    """
    POST /api/public/platform-social-login/ — Social login cross-tenant.

    Mismo flujo que SocialLoginView pero busca en TODOS los tenants.
    Si el usuario existe en múltiples tenants, usa el más reciente.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [SocialLoginThrottle]

    @extend_schema(
        request=inline_serializer(
            name="PlatformSocialLoginRequest",
            fields={
                "provider": drf_serializers.ChoiceField(choices=["google", "apple", "facebook"]),
                "token": drf_serializers.CharField(),
                "first_name": drf_serializers.CharField(required=False),
                "last_name": drf_serializers.CharField(required=False),
            },
        ),
        responses={
            200: OpenApiResponse(description="Login exitoso"),
            401: OpenApiResponse(description="Token inválido"),
        },
    )
    def post(self, request):
        provider = request.data.get("provider")
        token = request.data.get("token")
        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")

        if not provider or not token:
            return Response({"error": "provider y token son requeridos"}, status=status.HTTP_400_BAD_REQUEST)

        if provider not in ("google", "apple", "facebook"):
            return Response({"error": "Proveedor no soportado"}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar token
        try:
            social_info = verify_social_token(provider, token, first_name=first_name, last_name=last_name)
        except SocialAuthError as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        # Buscar SocialAccount existente en cualquier tenant
        social_account = (
            SocialAccount.objects.select_related("user", "user__tenant")
            .filter(provider=social_info.provider, provider_uid=social_info.provider_uid)
            .first()
        )

        if social_account:
            user = social_account.user
            if not user.is_active:
                return Response(
                    {"error": "Tu cuenta está desactivada", "code": "ACCOUNT_INACTIVE"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if not user.tenant.is_active:
                return Response(
                    {"error": "El negocio asociado a esta cuenta no está activo."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return Response(_build_social_auth_response(user, user.tenant))

        # Buscar por email en cualquier tenant
        try:
            user = User.objects.select_related("tenant").get(email__iexact=social_info.email)
        except User.DoesNotExist:
            return Response(
                {
                    "error": "No se encontró una cuenta con este email. Regístrate primero.",
                    "code": "USER_NOT_FOUND",
                    "suggested_user": {
                        "email": social_info.email,
                        "first_name": social_info.first_name,
                        "last_name": social_info.last_name,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except User.MultipleObjectsReturned:
            user = (
                User.objects.select_related("tenant")
                .filter(email__iexact=social_info.email)
                .order_by("-date_joined")
                .first()
            )

        if not user.is_active:
            return Response(
                {"error": "Tu cuenta está desactivada", "code": "ACCOUNT_INACTIVE"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.tenant.is_active:
            return Response(
                {"error": "El negocio asociado a esta cuenta no está activo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Vincular automáticamente (get_or_create para manejar concurrencia)
        with transaction.atomic():
            SocialAccount.objects.get_or_create(
                tenant=user.tenant,
                provider=social_info.provider,
                provider_uid=social_info.provider_uid,
                defaults={
                    "user": user,
                    "email": social_info.email,
                    "extra_data": social_info.extra_data,
                },
            )

        return Response(_build_social_auth_response(user, user.tenant))
