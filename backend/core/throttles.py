# backend/core/throttles.py
# Rate limiting para endpoints de autenticación.
# Previene brute force, spam de OTP y enumeración de cuentas.

from django.core.cache import caches
from rest_framework.throttling import SimpleRateThrottle

throttle_cache = caches["throttle"]


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
        email = request.data.get("email", "").strip().lower()
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
