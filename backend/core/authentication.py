"""Custom DRF authentication backend that reads JWT from httpOnly cookies.

Falls back to the standard ``Authorization: Bearer <token>`` header so
non-browser clients (Postman, tests, mobile) keep working.
"""

import logging

from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import Token

from core.models import User

logger = logging.getLogger(__name__)

# Cookie names — must match the prefixes used by core.cookies helpers.
_TENANT_ACCESS_COOKIE = "nerbis_access"
_ADMIN_ACCESS_COOKIE = "nerbis_admin_access"


class CookieJWTAuthentication(JWTAuthentication):
    """JWT authentication that reads tokens from httpOnly cookies first.

    Resolution order:
    1. ``nerbis_access`` cookie  (tenant session)
    2. ``nerbis_admin_access`` cookie  (superadmin session)
    3. ``Authorization: Bearer <token>`` header  (fallback)

    This class is registered in ``settings.REST_FRAMEWORK`` as the
    default authentication backend.
    """

    def authenticate(self, request: Request) -> tuple[User, Token] | None:
        """Return ``(user, validated_token)`` or ``None``."""
        # 1. Try tenant access cookie
        raw_token = request.COOKIES.get(_TENANT_ACCESS_COOKIE)

        # 2. Try admin access cookie
        if not raw_token:
            raw_token = request.COOKIES.get(_ADMIN_ACCESS_COOKIE)

        # 3. If a cookie was found, validate it
        if raw_token:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return user, validated_token

        # 4. Fallback to standard Authorization header
        return super().authenticate(request)
