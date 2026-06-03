# backend/core/throttles.py
"""
Rate limiting para endpoints de autenticación y API general.
Previene brute force, spam de OTP, enumeración de cuentas,
y abuso del API por tenant.
"""

from django.core.cache import caches
from rest_framework.throttling import SimpleRateThrottle

throttle_cache = caches["throttle"]

# Límites de API por plan del tenant (requests/hora)
PLAN_RATE_LIMITS = {
    "trial": "500/hour",
    "basic": "1000/hour",
    "professional": "5000/hour",
    "enterprise": "20000/hour",
}


class TenantRateThrottle(SimpleRateThrottle):
    """
    Rate limit por tenant — evita que un tenant consuma todos los recursos.
    El límite varía según el plan contratado.
    """

    scope = "tenant"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        tenant = getattr(request, "tenant", None)
        if not tenant:
            return None
        return f"throttle_tenant_{tenant.id}"

    def get_rate(self):
        """Obtener rate según el plan del tenant."""
        if not hasattr(self, "_request"):
            return PLAN_RATE_LIMITS["trial"]
        tenant = getattr(self._request, "tenant", None)
        if not tenant:
            return PLAN_RATE_LIMITS["trial"]
        return PLAN_RATE_LIMITS.get(tenant.plan, PLAN_RATE_LIMITS["basic"])

    def allow_request(self, request, view):
        self._request = request
        return super().allow_request(request, view)


class UserRateThrottle(SimpleRateThrottle):
    """
    Rate limit por usuario autenticado — 120 requests/min.
    Previene que un solo usuario abuse del API.
    """

    scope = "user"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return f"throttle_user_{request.user.pk}"
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class LoginThrottle(SimpleRateThrottle):
    """5 intentos de login por minuto por IP."""

    scope = "login"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class LoginEmailThrottle(SimpleRateThrottle):
    """Throttle compuesto por email: 10 intentos por hora por email.

    Complementa LoginThrottle (IP-based). Previene ataques distribuidos
    contra una misma cuenta desde múltiples IPs (#139).
    """

    scope = "login_email"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        raw = request.data.get("email", "")
        email = str(raw).strip().lower() if raw else ""
        if not email:
            return None  # Sin email, solo aplica el throttle por IP
        return self.cache_format % {
            "scope": self.scope,
            "ident": email,
        }


class RegisterThrottle(SimpleRateThrottle):
    """3 registros por minuto por IP."""

    scope = "register"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class OTPRequestThrottle(SimpleRateThrottle):
    """3 solicitudes de OTP por minuto por IP."""

    scope = "otp_request"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class OTPVerifyThrottle(SimpleRateThrottle):
    """5 verificaciones de OTP por minuto por IP."""

    scope = "otp_verify"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class PasswordResetThrottle(SimpleRateThrottle):
    """3 resets de contraseña por minuto por IP."""

    scope = "password_reset"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class AdminLoginThrottle(SimpleRateThrottle):
    """5 intentos de login de superadmin por minuto por IP."""

    scope = "admin_login"
    cache = throttle_cache

    def get_cache_key(self, request, view) -> str | None:
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class SocialLoginThrottle(SimpleRateThrottle):
    """5 intentos de social login por minuto por IP."""

    scope = "social_login"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class TwoFactorChallengeThrottle(SimpleRateThrottle):
    """10 intentos de challenge 2FA por minuto por IP."""

    scope = "two_factor_challenge"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class TwoFactorVerifyThrottle(SimpleRateThrottle):
    """10 verificaciones de 2FA por minuto por IP."""

    scope = "two_factor_verify"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class TokenRefreshThrottle(SimpleRateThrottle):
    """30 refreshes por minuto por IP.

    Previene abuso del endpoint de refresh que no tenía throttle (#140).
    """

    scope = "token_refresh"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class PublicCheckThrottle(SimpleRateThrottle):
    """20 checks por minuto por IP.

    Throttle para endpoints públicos de verificación (check-business-name,
    check-tenant-email) que podrían usarse para enumeración (#144).
    """

    scope = "public_check"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }
