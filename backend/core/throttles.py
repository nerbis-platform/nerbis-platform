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


class SocialLoginThrottle(SimpleRateThrottle):
    """5 intentos de social login por minuto por IP."""

    scope = "social_login"
    cache = throttle_cache

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }
