# backend/core/views.py

import logging

from django.conf import settings
from django.db import IntegrityError, transaction
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

from .cookies import clear_auth_cookies, set_auth_cookies
from .models import Banner, OTPToken, PasswordSetToken, SocialAccount, TeamInvitation, Tenant, User
from .permissions import IsTenantAdmin
from .serializers import (
    AcceptInvitationSerializer,
    BannerSerializer,
    ChangePasswordSerializer,
    CreateTeamInvitationSerializer,
    InvitationDetailSerializer,
    LoginSerializer,
    RegisterSerializer,
    SetPasswordSerializer,
    SocialLinkSerializer,
    SocialLoginSerializer,
    TeamInvitationSerializer,
    TeamMemberSerializer,
    TenantRegisterSerializer,
    TenantSerializer,
    UpdateProfileSerializer,
    UserSerializer,
    UserSessionSerializer,
)
from .social_auth import LinkingRequired, SocialAuthError, social_login_or_create, verify_social_token
from .throttles import (
    LoginEmailThrottle,
    LoginThrottle,
    OTPRequestThrottle,
    OTPVerifyThrottle,
    PasswordResetThrottle,
    PublicCheckThrottle,
    RegisterThrottle,
    SocialLoginThrottle,
    TokenRefreshThrottle,
)

logger = logging.getLogger(__name__)
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX
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
            "frontend_url": getattr(settings, "FRONTEND_URL", "http://localhost:3000"),
        },
    )


class RegisterView(generics.CreateAPIView):
    """POST /api/core/auth/register/ - Registro de usuarios

    Security: no auto-reactivation of inactive accounts — prevents account
    takeover via register endpoint (#135). Inactive users are checked in the
    serializer and receive a generic "email already exists" error.
    """

    queryset = User.objects.all()
    authentication_classes = []  # No requiere autenticación (evita CSRF)
    permission_classes = [AllowAny]
    throttle_classes = [RegisterThrottle]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Enviar email de bienvenida
        self._send_welcome_email(user)

        # Generar tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {
                "user": UserSessionSerializer(user).data,
                "tokens": {
                    "refresh": refresh_token,
                    "access": access_token,
                },
                "message": "Usuario creado exitosamente",
            },
            status=status.HTTP_201_CREATED,
        )
        return set_auth_cookies(response, access_token, refresh_token)

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
    throttle_classes = [PublicCheckThrottle]

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
    throttle_classes = [PublicCheckThrottle]

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
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {
                "user": UserSessionSerializer(user).data,
                "tenant": TenantSerializer(user.tenant).data,
                "tokens": {
                    "refresh": refresh_token,
                    "access": access_token,
                },
                "message": "Negocio creado exitosamente. Bienvenido a NERBIS!",
            },
            status=status.HTTP_201_CREATED,
        )
        return set_auth_cookies(response, access_token, refresh_token)

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
    throttle_classes = [LoginThrottle, LoginEmailThrottle]

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
        # Security: no incluir email en respuesta — previene enumeración (#138)
        if not user.is_active:
            return Response(
                {
                    "error": "Tu cuenta fue desactivada",
                    "code": "ACCOUNT_INACTIVE",
                    "message": "Tu cuenta fue desactivada previamente. ¿Deseas reactivarla?",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # 5. Si el usuario tiene 2FA activo, emitir challenge y NO tokens
        from .views_2fa import get_2fa_methods, issue_2fa_challenge_token, user_has_confirmed_2fa

        if user_has_confirmed_2fa(user):
            return Response(
                {
                    "status": "2fa_required",
                    "challenge_token": issue_2fa_challenge_token(user),
                    "methods": get_2fa_methods(user),
                }
            )

        # 6. Generar tokens JWT con claims del tenant
        refresh = RefreshToken.for_user(user)
        refresh["tenant_id"] = str(user.tenant.id)
        refresh["tenant_slug"] = user.tenant.slug
        refresh["role"] = user.role

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {
                "user": UserSessionSerializer(user).data,
                "tenant": TenantSerializer(tenant).data,
                "tokens": {
                    "refresh": refresh_token,
                    "access": access_token,
                },
            }
        )
        return set_auth_cookies(response, access_token, refresh_token)


class PlatformLoginView(APIView):
    """
    POST /api/public/platform-login/ - Login desde la plataforma NERBIS

    A diferencia del LoginView normal (que requiere tenant context del middleware),
    este endpoint busca al usuario por email en TODOS los tenants.

    Security: cuando el email existe en múltiples tenants, verifica la contraseña
    contra TODOS los candidatos y requiere `tenant_slug` para desambiguar (#136).
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle, LoginEmailThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        tenant_slug = request.data.get("tenant_slug")

        # Si se proporciona tenant_slug, buscar directamente en ese tenant
        if tenant_slug:
            try:
                user = User.objects.select_related("tenant").get(email__iexact=email, tenant__slug=tenant_slug)
            except User.DoesNotExist:
                return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)
            if not user.check_password(password):
                return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            # Buscar en todos los tenants (cap to avoid unbounded bcrypt cost)
            _MAX_CANDIDATES = 10
            candidates = list(User.objects.select_related("tenant").filter(email__iexact=email)[:_MAX_CANDIDATES])
            if not candidates:
                # Timing-safe: run a dummy bcrypt so response time is indistinguishable
                User().set_password(password)
                return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

            # Verificar password contra candidatos (short-circuit: stop after 2 matches)
            matching = []
            for c in candidates:
                if c.check_password(password):
                    matching.append(c)
                    if len(matching) > 1:
                        break  # Already ambiguous — no need to check more
            if not matching:
                return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

            if len(matching) > 1:
                # Mismo email+password en múltiples tenants — exigir selección
                return Response(
                    {
                        "code": "MULTIPLE_TENANTS",
                        "message": "Tu email está registrado en varios negocios. Selecciona uno.",
                        "tenants": [{"slug": u.tenant.slug, "name": u.tenant.name} for u in matching],
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            user = matching[0]

        # Si el usuario está inactivo
        if not user.is_active:
            return Response(
                {
                    "error": "Tu cuenta fue desactivada",
                    "code": "ACCOUNT_INACTIVE",
                    "message": "Tu cuenta fue desactivada previamente. ¿Deseas reactivarla?",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Verificar que el tenant esté activo
        if not user.tenant.is_active:
            return Response(
                {"error": "El negocio asociado a esta cuenta no está activo."}, status=status.HTTP_403_FORBIDDEN
            )

        # Si el usuario tiene 2FA activo, emitir challenge
        from .views_2fa import get_2fa_methods, issue_2fa_challenge_token, user_has_confirmed_2fa

        if user_has_confirmed_2fa(user):
            return Response(
                {
                    "status": "2fa_required",
                    "challenge_token": issue_2fa_challenge_token(user),
                    "methods": get_2fa_methods(user),
                }
            )

        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        refresh["tenant_id"] = str(user.tenant.id)
        refresh["tenant_slug"] = user.tenant.slug
        refresh["role"] = user.role

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {
                "user": UserSessionSerializer(user).data,
                "tenant": TenantSerializer(user.tenant).data,
                "tokens": {
                    "refresh": refresh_token,
                    "access": access_token,
                },
            }
        )
        return set_auth_cookies(response, access_token, refresh_token)


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

        generic_response = Response(
            {
                "message": "Si el email existe, recibirás un código de verificación",
                "email": email,
            }
        )

        # Buscar TODOS los usuarios con este email (puede haber en múltiples tenants)
        users = User.objects.select_related("tenant").filter(email__iexact=email)

        if users.exists():
            from notifications.tasks import send_otp_email

            for user in users:
                try:
                    otp = OTPToken.create_for_user(user, purpose="password_reset")
                    try:
                        send_otp_email.delay(user.id, otp.code, "password_reset")
                    except Exception:
                        send_otp_email(user.id, otp.code, "password_reset")
                except Exception as e:
                    logger.warning(f"Fallo enviando OTP password_reset a user={user.id}: {e}")
        else:
            # Timing-safe: simulate OTP creation work so response time
            # doesn't reveal whether the email exists in any tenant
            User().set_password("dummy")

        # Siempre devolver la misma respuesta genérica
        return generic_response


class PlatformVerifyResetOTPView(APIView):
    """
    POST /api/public/platform-verify-reset-otp/ - Verificar OTP desde la plataforma

    Security: resuelve el usuario via ownership del OTP (no por email lookup),
    lo que evita cross-tenant mismatch (#136). Usa validate_password de Django
    en vez de validación ad-hoc (#141).
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

        # Buscar OTPs activos para usuarios con este email
        active_otps = OTPToken.objects.filter(
            user__email__iexact=email,
            purpose="password_reset",
            used_at__isnull=True,
        ).select_related("user", "user__tenant")

        # Encontrar el OTP correcto sin incrementar intentos en los demás
        import secrets as secrets_mod

        matched_otp = None
        code_str = str(code) if code is not None else ""
        for otp in active_otps:
            if otp.is_valid and secrets_mod.compare_digest(otp.code, code_str):
                matched_otp = otp
                break

        if not matched_otp:
            # Si hay OTPs, verificar contra el primero para incrementar intentos
            first_otp = active_otps.first()
            if first_otp and first_otp.is_valid:
                success, error, error_code = first_otp.verify(str(code) if code else "")
                if success:
                    # Race condition: el OTP coincidió durante verify — usarlo
                    matched_otp = first_otp
                else:
                    return Response(
                        {"error": error or "Código incorrecto", "error_code": error_code},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                return Response(
                    {"error": "Solicitud inválida. Solicita un nuevo código."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Marcar OTP como usado
        matched_otp.mark_as_used()
        user = matched_otp.user

        # Validar contraseña con los validadores de Django
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError

        try:
            validate_password(new_password, user=user)
        except ValidationError as e:
            return Response(
                {"error": "; ".join(e.messages)},
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
    """POST /api/core/auth/logout/ - Logout

    Reads the refresh token from the httpOnly cookie (``nerbis_refresh``)
    with fallback to the request body for backward compatibility during
    the migration period.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=inline_serializer(
            name="LogoutRequest",
            fields={"refresh": drf_serializers.CharField(required=False)},
        ),
        responses={
            200: inline_serializer(name="LogoutResponse", fields={"message": drf_serializers.CharField()}),
            400: OpenApiResponse(description="Token inválido"),
        },
    )
    def post(self, request):
        # Read refresh token from cookie first, fall back to body
        refresh_token = request.COOKIES.get("nerbis_refresh") or request.data.get("refresh")

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                # Security: verify token ownership before blacklisting (#143)
                # str() normalization: payload may store int or str depending on serializer
                if str(token.payload.get("user_id")) == str(request.user.id):
                    token.blacklist()
            except Exception:
                pass  # Token may already be expired/blacklisted — still clear cookies

        response = Response({"message": "Logout exitoso"})
        return clear_auth_cookies(response)


class CookieTokenRefreshView(APIView):
    """POST /api/core/auth/refresh/ - Refresh JWT tokens via httpOnly cookie.

    Reads the refresh token from the ``nerbis_refresh`` cookie. Falls back
    to the request body (``{"refresh": "..."}`` ) during the transition
    period so that existing clients keep working.

    On success, new access (and optionally rotated refresh) tokens are set
    as httpOnly cookies on the response.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [TokenRefreshThrottle]

    @extend_schema(
        request=inline_serializer(
            name="CookieTokenRefreshRequest",
            fields={"refresh": drf_serializers.CharField(required=False)},
        ),
        responses={
            200: inline_serializer(
                name="CookieTokenRefreshResponse",
                fields={
                    "access": drf_serializers.CharField(),
                    "refresh": drf_serializers.CharField(required=False),
                },
            ),
            401: OpenApiResponse(description="Token inválido o expirado"),
        },
    )
    def post(self, request):
        from rest_framework_simplejwt.exceptions import TokenError

        # Determine namespace from request path
        is_admin = "/admin/" in request.path
        cookie_name = "nerbis_admin_refresh" if is_admin else "nerbis_refresh"
        prefix = "nerbis_admin" if is_admin else "nerbis"

        # Read refresh token: cookie first, body fallback
        raw_refresh = request.COOKIES.get(cookie_name) or request.data.get("refresh")

        if not raw_refresh:
            return Response(
                {"detail": "No refresh token provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(raw_refresh)
            access_token = str(refresh.access_token)

            # Handle rotation if configured
            rotate = settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False)
            if rotate:
                blacklist_after = settings.SIMPLE_JWT.get("BLACKLIST_AFTER_ROTATION", False)
                if blacklist_after:
                    try:
                        refresh.blacklist()
                    except AttributeError:
                        pass  # blacklist app not installed

                refresh.set_jti()
                refresh.set_exp()
                refresh.set_iat()

            new_refresh_token = str(refresh)

            # Build response with tokens in body (transition period)
            data = {"access": access_token}
            if rotate:
                data["refresh"] = new_refresh_token

            response = Response(data)
            return set_auth_cookies(response, access_token, new_refresh_token, cookie_prefix=prefix)

        except TokenError:
            response = Response(
                {"detail": "Token is invalid or expired."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            return clear_auth_cookies(response, cookie_prefix=prefix)


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

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {
                "message": "Contraseña establecida exitosamente",
                "user": UserSessionSerializer(user).data,
                "tokens": {
                    "refresh": refresh_token,
                    "access": access_token,
                },
            }
        )
        return set_auth_cookies(response, access_token, refresh_token)


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
    module_fields = {"has_website", "has_shop", "has_bookings", "has_services", "has_marketing", "has_management"}
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
    """POST /api/auth/reactivate-account/ - Reactivar cuenta inactiva

    Security: generic error messages prevent account enumeration (#138).
    Timing-safe dummy password check when user not found.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle, LoginEmailThrottle]

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
            # Timing-safe: run a dummy password check to prevent timing oracle
            User().set_password(password)
            return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

        # Verificar contraseña
        if not user.check_password(password):
            return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

        # Reactivar cuenta
        user.is_active = True
        user.save()

        # Generar tokens
        refresh = RefreshToken.for_user(user)
        refresh["tenant_id"] = str(user.tenant.id)
        refresh["tenant_slug"] = user.tenant.slug
        refresh["role"] = user.role

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {
                "user": UserSessionSerializer(user).data,
                "tokens": {
                    "refresh": refresh_token,
                    "access": access_token,
                },
                "message": "Cuenta reactivada exitosamente",
            },
            status=status.HTTP_200_OK,
        )
        return set_auth_cookies(response, access_token, refresh_token)


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
        try:
            otp = OTPToken.create_for_user(user, purpose="password_reset")
        except ValueError:
            # Return generic response to avoid revealing that the email exists
            return Response(
                {
                    "message": "Si el email existe, recibirás un código de verificación",
                    "email": email,
                }
            )

        # Enviar email con OTP (async con Celery)
        from notifications.tasks import send_otp_email

        try:
            send_otp_email.delay(user.id, otp.code, "password_reset")
        except Exception:
            send_otp_email(user.id, otp.code, "password_reset")

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
            400: inline_serializer(
                name="PasswordResetOtpError",
                fields={
                    "error": drf_serializers.CharField(),
                    "error_code": drf_serializers.CharField(required=False),
                },
            ),
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

        # Resolve user via OTP ownership — avoids leaking email existence (#138)
        otp = (
            OTPToken.objects.filter(
                user__email__iexact=email,
                user__tenant=tenant,
                purpose="password_reset",
                used_at__isnull=True,
            )
            .select_related("user")
            .first()
        )

        if not otp or not otp.is_valid:
            return Response(
                {"error": "Solicitud inválida. Solicita un nuevo código."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar OTP
        success, error, error_code = otp.verify(code)
        if not success:
            return Response({"error": error, "error_code": error_code}, status=status.HTTP_400_BAD_REQUEST)

        user = otp.user

        # Validar contraseña con los validadores de Django (#141)
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError

        try:
            validate_password(new_password, user=user)
        except ValidationError as e:
            return Response({"error": "; ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

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

    Security: generic error messages prevent account enumeration (#138).
    Handles OTP resend rate limit via ValueError from create_for_user.
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
        },
    )
    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        tenant = request.tenant

        if not email or not password:
            return Response({"error": "Email y contraseña son requeridos"}, status=status.HTTP_400_BAD_REQUEST)

        generic_ok = Response(
            {
                "message": "Si las credenciales son válidas, recibirás un código de verificación",
                "email": email,
            }
        )

        # Buscar usuario inactivo
        try:
            user = User.objects.get(email__iexact=email, tenant=tenant, is_active=False)
        except User.DoesNotExist:
            User().set_password(password)  # Timing-safe dummy
            return generic_ok

        # Verificar contraseña
        if not user.check_password(password):
            return generic_ok

        # Crear OTP
        try:
            otp = OTPToken.create_for_user(user, purpose="account_reactivation")
        except ValueError:
            # Return generic response to avoid revealing that credentials were valid
            return generic_ok

        # Enviar email con OTP (async con Celery)
        from notifications.tasks import send_otp_email

        try:
            send_otp_email.delay(user.id, otp.code, "account_reactivation")
        except Exception:
            send_otp_email(user.id, otp.code, "account_reactivation")

        return generic_ok


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
            400: inline_serializer(
                name="ReactivationOtpError",
                fields={
                    "error": drf_serializers.CharField(),
                    "error_code": drf_serializers.CharField(required=False),
                },
            ),
        },
    )
    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        tenant = request.tenant

        if not email or not code:
            return Response({"error": "Email y código son requeridos"}, status=status.HTTP_400_BAD_REQUEST)

        # Security: generic error messages prevent enumeration (#138)
        generic_error = Response({"error": "Solicitud inválida"}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar usuario inactivo
        try:
            user = User.objects.get(email__iexact=email, tenant=tenant, is_active=False)
        except User.DoesNotExist:
            return generic_error

        # Buscar OTP válido (filter+first to avoid MultipleObjectsReturned race condition;
        # create_for_user soft-invalidates previous OTPs but a race is still possible)
        otp = OTPToken.objects.filter(user=user, purpose="account_reactivation", used_at__isnull=True).first()
        if not otp:
            return generic_error

        # Verificar OTP
        success, error, error_code = otp.verify(code)
        if not success:
            return Response({"error": error, "error_code": error_code}, status=status.HTTP_400_BAD_REQUEST)

        # Reactivar cuenta
        user.is_active = True
        user.save()

        # Generar tokens para auto-login
        refresh = RefreshToken.for_user(user)
        refresh["tenant_id"] = str(user.tenant.id)
        refresh["tenant_slug"] = user.tenant.slug
        refresh["role"] = user.role

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {
                "message": "Cuenta reactivada exitosamente",
                "user": UserSessionSerializer(user).data,
                "tokens": {
                    "refresh": refresh_token,
                    "access": access_token,
                },
            }
        )
        return set_auth_cookies(response, access_token, refresh_token)


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
                "management": tenant.has_management,
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
    """Helper: genera la respuesta JWT estándar para social auth.

    Returns a DRF ``Response`` with httpOnly auth cookies already set.
    """
    refresh = RefreshToken.for_user(user)
    refresh["tenant_id"] = str(user.tenant.id)
    refresh["tenant_slug"] = user.tenant.slug
    refresh["role"] = user.role

    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    response = Response(
        {
            "user": UserSessionSerializer(user).data,
            "tenant": TenantSerializer(tenant_obj).data,
            "tokens": {
                "refresh": refresh_token,
                "access": access_token,
            },
        }
    )
    return set_auth_cookies(response, access_token, refresh_token)


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

        # Social login ya pasó por la autenticación del proveedor (Google/Apple/FB),
        # que maneja su propia seguridad/2FA. No requerimos 2FA adicional.
        return _build_social_auth_response(user, tenant)


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

        # Crear SocialAccount (o actualizar si ya existe para este user+provider)
        try:
            SocialAccount.objects.update_or_create(
                user=user,
                provider=social_info.provider,
                defaults={
                    "tenant": tenant,
                    "provider_uid": social_info.provider_uid,
                    "email": social_info.email,
                    "extra_data": social_info.extra_data,
                },
            )
        except IntegrityError:
            return Response(
                {"error": "Esta cuenta social ya está vinculada"},
                status=status.HTTP_409_CONFLICT,
            )

        return _build_social_auth_response(user, tenant)


class SocialAccountDisconnectView(APIView):
    """
    DELETE /api/auth/social/<provider>/ — Desvincular cuenta social.

    Solo permite desvincular si el usuario tiene contraseña u otra cuenta social,
    para evitar que quede sin forma de acceder.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Cuenta social desvinculada"),
            400: OpenApiResponse(description="No se puede desvincular (único método de acceso)"),
            404: OpenApiResponse(description="No hay cuenta vinculada para este proveedor"),
        },
        parameters=[
            OpenApiParameter(name="provider", location="path", type=str, enum=["google", "apple", "facebook"]),
        ],
    )
    def delete(self, request, provider):
        if provider not in ("google", "apple", "facebook"):
            return Response({"error": "Proveedor no válido"}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        social_account = SocialAccount.objects.filter(user=user, tenant=user.tenant, provider=provider).first()

        if not social_account:
            return Response(
                {"error": f"No tienes una cuenta de {provider} vinculada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Verificar que el usuario no quede sin forma de acceder
        has_password = user.has_usable_password()
        other_social_count = (
            SocialAccount.objects.filter(user=user, tenant=user.tenant).exclude(id=social_account.id).count()
        )

        if not has_password and other_social_count == 0:
            return Response(
                {"error": "No puedes desvincular tu único método de acceso. Establece una contraseña primero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Registrar desvinculación en audit log
        from django.contrib.admin.models import DELETION, LogEntry
        from django.contrib.contenttypes.models import ContentType

        ct = ContentType.objects.get_for_model(SocialAccount)
        LogEntry.objects.log_action(
            user_id=user.pk,
            content_type_id=ct.pk,
            object_id=str(social_account.pk),
            object_repr=f"{social_account.get_provider_display()} - {social_account.email}",
            action_flag=DELETION,
            change_message=f"Desvinculación vía API de cuenta {social_account.get_provider_display()}",
        )
        logger.info(
            f"Social account desvinculada vía API: {provider} (usuario_id: {user.pk}, tenant: {user.tenant.slug})"
        )

        social_account.delete()
        return Response({"message": f"Cuenta de {provider} desvinculada correctamente"})


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

            # Social login no requiere 2FA adicional — el proveedor ya autenticó
            return _build_social_auth_response(user, user.tenant)

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
                        "avatar_url": social_info.avatar_url,
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

        # Vincular automáticamente (update_or_create para manejar concurrencia)
        try:
            with transaction.atomic():
                SocialAccount.objects.update_or_create(
                    user=user,
                    provider=social_info.provider,
                    defaults={
                        "tenant": user.tenant,
                        "provider_uid": social_info.provider_uid,
                        "email": social_info.email,
                        "extra_data": social_info.extra_data,
                    },
                )
        except IntegrityError:
            return Response(
                {"error": "Esta cuenta social ya está vinculada"},
                status=status.HTTP_409_CONFLICT,
            )

        # Social login no requiere 2FA adicional
        return _build_social_auth_response(user, user.tenant)


# ===================================
# GESTIÓN DE EQUIPO (TEAM)
# ===================================


class TeamListView(generics.ListAPIView):
    """
    GET /api/team/ — Listar miembros del equipo del tenant.

    Solo accesible para admins del tenant. Retorna todos los usuarios
    del tenant con sus cuentas sociales y método de autenticación.

    Query params:
    - role: filtrar por rol (admin, staff, customer)
    - auth_method: filtrar por método (email_only, social_only, both)
    - search: buscar por nombre o email
    - ordering: ordenar por campo (default: -date_joined)
    """

    serializer_class = TeamMemberSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    @extend_schema(
        parameters=[
            OpenApiParameter(name="role", type=str, enum=["admin", "staff", "customer"]),
            OpenApiParameter(name="auth_method", type=str, enum=["email_only", "social_only", "both"]),
            OpenApiParameter(name="search", type=str),
            OpenApiParameter(name="ordering", type=str),
        ],
        responses={200: TeamMemberSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.filter(tenant=user.tenant).prefetch_related("social_accounts").order_by("-date_joined")

        # Filtro por rol
        role = self.request.query_params.get("role")
        if role in ("admin", "staff", "customer"):
            qs = qs.filter(role=role)

        # Filtro por método de auth (a nivel BD usando UNUSABLE_PASSWORD_PREFIX)
        auth_method = self.request.query_params.get("auth_method")
        if auth_method == "email_only":
            qs = (
                qs.filter(social_accounts__isnull=True)
                .exclude(password__startswith=UNUSABLE_PASSWORD_PREFIX)
                .exclude(password="")
            )
        elif auth_method == "social_only":
            qs = (
                qs.filter(social_accounts__isnull=False)
                .filter(Q(password__startswith=UNUSABLE_PASSWORD_PREFIX) | Q(password=""))
                .distinct()
            )
        elif auth_method == "both":
            qs = (
                qs.filter(social_accounts__isnull=False)
                .exclude(password__startswith=UNUSABLE_PASSWORD_PREFIX)
                .exclude(password="")
                .distinct()
            )

        # Búsqueda
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )

        # Ordenamiento
        ordering = self.request.query_params.get("ordering", "-date_joined")
        allowed = ["date_joined", "-date_joined", "email", "-email", "role", "-role", "first_name", "-first_name"]
        if ordering in allowed:
            qs = qs.order_by(ordering)

        return qs


class TeamDisconnectSocialView(APIView):
    """
    DELETE /api/team/{user_id}/social/{provider}/ — Desvincular social account de un miembro.

    Solo accesible para admins del tenant. Verifica que el usuario no pierda acceso.
    Registra la acción en el audit log.
    """

    permission_classes = [IsAuthenticated, IsTenantAdmin]

    @extend_schema(
        responses={
            200: OpenApiResponse(description="Cuenta social desvinculada"),
            400: OpenApiResponse(description="No se puede desvincular (único método de acceso)"),
            403: OpenApiResponse(description="No tienes permisos"),
            404: OpenApiResponse(description="Usuario o social account no encontrada"),
        },
    )
    def delete(self, request, user_id, provider):
        if provider not in ("google", "apple", "facebook"):
            return Response({"error": "Proveedor no válido"}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar usuario en el mismo tenant
        try:
            target_user = User.objects.get(id=user_id, tenant=request.user.tenant)
        except User.DoesNotExist:
            return Response({"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        # Buscar social account
        social_account = SocialAccount.objects.filter(
            user=target_user, tenant=target_user.tenant, provider=provider
        ).first()
        if not social_account:
            return Response(
                {"error": f"El usuario no tiene una cuenta de {provider} vinculada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Verificar que no quede sin acceso
        has_password = target_user.has_usable_password()
        other_social_count = (
            SocialAccount.objects.filter(user=target_user, tenant=target_user.tenant)
            .exclude(id=social_account.id)
            .count()
        )

        if not has_password and other_social_count == 0:
            return Response(
                {"error": "No se puede desvincular porque es el único método de acceso del usuario."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Audit log
        from django.contrib.admin.models import DELETION, LogEntry
        from django.contrib.contenttypes.models import ContentType

        ct = ContentType.objects.get_for_model(SocialAccount)
        LogEntry.objects.log_action(
            user_id=request.user.pk,
            content_type_id=ct.pk,
            object_id=str(social_account.pk),
            object_repr=f"{social_account.get_provider_display()} (id={social_account.pk})",
            action_flag=DELETION,
            change_message=f"Admin id={request.user.pk} desvinculó cuenta {social_account.get_provider_display()} del usuario id={target_user.pk}",
        )
        logger.info(
            f"Team disconnect: {provider} desvinculado de usuario_id={target_user.pk} "
            f"por admin_id={request.user.pk} (tenant: {request.user.tenant.slug})"
        )

        social_account.delete()
        return Response(
            {"message": f"Cuenta de {provider} desvinculada de {target_user.get_full_name() or target_user.email}"}
        )


class TeamReset2FAView(APIView):
    """
    POST /api/team/{user_id}/2fa/reset/ — Resetear 2FA de un miembro del equipo.

    Solo accesible para admins del tenant. Elimina TOTPDevice y todas las
    credenciales WebAuthn del usuario. Registra la acción en el audit log.
    """

    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def post(self, request, user_id):
        # Buscar usuario en el mismo tenant
        try:
            target_user = User.objects.get(id=user_id, tenant=request.user.tenant)
        except User.DoesNotExist:
            return Response({"error": "Usuario no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        # No permitir resetearse a sí mismo (debe usar la UI normal)
        if target_user.id == request.user.id:
            return Response(
                {"error": "No puedes resetear tu propio 2FA desde aquí. Usa la configuración de tu cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .views_2fa import user_has_confirmed_2fa

        if not user_has_confirmed_2fa(target_user):
            return Response(
                {"error": "Este usuario no tiene 2FA activo"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.db import transaction

        with transaction.atomic():
            # Eliminar TOTPDevice
            totp_device = getattr(target_user, "totp_device", None)
            totp_deleted = False
            if totp_device:
                totp_device.delete()
                totp_deleted = True

            # Eliminar credenciales WebAuthn
            passkeys_deleted = target_user.webauthn_credentials.count()
            if passkeys_deleted:
                target_user.webauthn_credentials.all().delete()

            # Audit log
            from django.contrib.admin.models import CHANGE, LogEntry
            from django.contrib.contenttypes.models import ContentType

            ct = ContentType.objects.get_for_model(User)
            details = []
            if totp_deleted:
                details.append("TOTP")
            if passkeys_deleted:
                details.append(f"{passkeys_deleted} passkey(s)")
            LogEntry.objects.log_action(
                user_id=request.user.pk,
                content_type_id=ct.pk,
                object_id=str(target_user.pk),
                object_repr=f"{target_user.get_full_name() or target_user.email}",
                action_flag=CHANGE,
                change_message=f"Admin id={request.user.pk} reseteó 2FA ({', '.join(details)}) del usuario id={target_user.pk}",
            )

        logger.info(
            f"Team 2FA reset: {', '.join(details)} eliminado(s) de usuario_id={target_user.pk} "
            f"por admin_id={request.user.pk} (tenant: {request.user.tenant.slug})"
        )

        target_name = target_user.get_full_name() or target_user.email
        return Response({"message": f"2FA reseteado para {target_name}"})


# ===================================
# EQUIPO — Invitaciones
# ===================================


def _tenant_can_invite(tenant) -> bool:
    """Verifica si el estado del sitio web del tenant permite invitaciones al equipo."""
    try:
        website_config = tenant.website_config
        return website_config.status in ("published", "review")
    except Exception:
        return False


class TeamInvitationsView(APIView):
    """
    GET  /api/core/team/invitations/ — listar invitaciones
    POST /api/core/team/invitations/ — crear invitación
    """

    permission_classes = [IsAuthenticated, IsTenantAdmin]

    @extend_schema(responses=TeamInvitationSerializer(many=True))
    def get(self, request):
        from rest_framework.pagination import PageNumberPagination

        invitations = (
            TeamInvitation.objects.filter(
                tenant=request.tenant,
            )
            .select_related("invited_by")
            .order_by("-created_at")
        )

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(invitations, request)
        if page is not None:
            serializer = TeamInvitationSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = TeamInvitationSerializer(invitations, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=CreateTeamInvitationSerializer,
        responses=TeamInvitationSerializer,
    )
    def post(self, request):
        if not _tenant_can_invite(request.tenant):
            return Response(
                {
                    "detail": "Las invitaciones al equipo están disponibles una vez que tu sitio web esté publicado o en revisión."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CreateTeamInvitationSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        role = serializer.validated_data["role"]

        invitation = TeamInvitation.create_invitation(
            tenant=request.tenant,
            email=email,
            role=role,
            invited_by=request.user,
        )

        # Enviar email de invitación
        try:
            from notifications.tasks import send_team_invitation_email

            if settings.DEBUG:
                # En desarrollo: ejecutar sincrónicamente (evita desync entre DBs local/Docker)
                send_team_invitation_email(invitation.id)
            else:
                send_team_invitation_email.delay(invitation.id)
        except Exception:
            logger.warning("No se pudo enviar email de invitación %s", invitation.id, exc_info=True)

        return Response(
            TeamInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )


class CancelInvitationView(APIView):
    """DELETE /api/core/team/invitations/{id}/ — cancelar invitación"""

    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def delete(self, request, pk):
        try:
            invitation = TeamInvitation.objects.get(pk=pk, tenant=request.tenant, status="pending")
        except TeamInvitation.DoesNotExist:
            return Response(
                {"error": "Invitación no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        invitation.cancel()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResendInvitationView(APIView):
    """POST /api/core/team/invitations/{id}/resend/ — reenviar invitación"""

    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def post(self, request, pk):
        if not _tenant_can_invite(request.tenant):
            return Response(
                {
                    "detail": "Las invitaciones al equipo están disponibles una vez que tu sitio web esté publicado o en revisión."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            invitation = TeamInvitation.objects.get(pk=pk, tenant=request.tenant, status="pending")
        except TeamInvitation.DoesNotExist:
            return Response(
                {"error": "Invitación no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not invitation.is_valid:
            return Response(
                {"error": "La invitación ha expirado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from notifications.tasks import send_team_invitation_email

            if settings.DEBUG:
                send_team_invitation_email(invitation.id)
            else:
                send_team_invitation_email.delay(invitation.id)
        except Exception:
            logger.warning("No se pudo enviar reenvío de invitación %s", invitation.id, exc_info=True)

        return Response({"message": "Invitación reenviada"})


class InvitationDetailView(APIView):
    """GET /api/public/invitation/{token}/ — ver detalle de invitación (público)"""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def get(self, request, token):
        try:
            invitation = TeamInvitation.objects.select_related("tenant", "invited_by").get(token=token)
        except TeamInvitation.DoesNotExist:
            return Response(
                {"error": "Invitación no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(InvitationDetailSerializer(invitation).data)


class AcceptInvitationView(APIView):
    """POST /api/public/accept-invitation/{token}/ — aceptar invitación (público)"""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [RegisterThrottle]

    @extend_schema(request=AcceptInvitationSerializer)
    def post(self, request, token):
        from django.db import transaction

        try:
            invitation = TeamInvitation.objects.select_related("tenant").get(token=token)
        except TeamInvitation.DoesNotExist:
            return Response(
                {"error": "Invitación no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not invitation.is_valid:
            if invitation.status == "pending":
                error_msg = "La invitación ha expirado"
            else:
                error_msg = "Esta invitación ya no es válida"
            return Response(
                {"error": error_msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AcceptInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        tenant = invitation.tenant

        # Verificar que el email no esté en uso en este tenant
        if User.objects.filter(tenant=tenant, email__iexact=invitation.email, is_active=True).exists():
            return Response(
                {"error": "Ya existe un usuario con este email en este equipo"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Re-fetch with lock to prevent race conditions
            invitation = TeamInvitation.objects.select_for_update().get(pk=invitation.pk)
            if invitation.status != "pending":
                return Response(
                    {"error": "Esta invitación ya no es válida"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Generar username
            base_username = invitation.email.split("@")[0].lower()
            username = base_username
            counter = 1
            while User.objects.filter(tenant=tenant, username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                tenant=tenant,
                username=username,
                email=invitation.email,
                password=data["password"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                role=invitation.role,
            )

            invitation.accept(user)

        # Generar tokens JWT con claims de tenant
        refresh = RefreshToken.for_user(user)
        refresh["tenant_id"] = tenant.id
        refresh["tenant_slug"] = tenant.slug
        refresh["role"] = user.role

        return Response(
            {
                "message": "Invitación aceptada. Bienvenido al equipo.",
                "user": UserSerializer(user).data,
                "tenant": TenantSerializer(tenant).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )
