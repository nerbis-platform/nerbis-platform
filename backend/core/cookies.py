"""Centralized helpers for setting and clearing httpOnly JWT cookies.

All cookie flags are read from Django settings (JWT_COOKIE_*) and token
lifetimes from SIMPLE_JWT so there is a single source of truth.
"""

from django.conf import settings
from rest_framework.response import Response


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    cookie_prefix: str = "nerbis",
) -> Response:
    """Set httpOnly JWT cookies on a DRF Response.

    Cookie names follow the pattern ``{cookie_prefix}_access`` and
    ``{cookie_prefix}_refresh``.  For tenant auth use the default prefix
    ``"nerbis"``; for superadmin auth pass ``"nerbis_admin"``.

    Returns the same *response* object (mutated) so callers can chain::

        return set_auth_cookies(Response(data), access, refresh)
    """
    access_max_age = int(
        settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds(),
    )
    refresh_max_age = int(
        settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds(),
    )

    common_kwargs: dict[str, object] = {
        "httponly": settings.JWT_COOKIE_HTTPONLY,
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": settings.JWT_COOKIE_SAMESITE,
        "path": settings.JWT_COOKIE_PATH,
        "domain": settings.JWT_COOKIE_DOMAIN,
    }

    response.set_cookie(
        key=f"{cookie_prefix}_access",
        value=access_token,
        max_age=access_max_age,
        **common_kwargs,
    )
    response.set_cookie(
        key=f"{cookie_prefix}_refresh",
        value=refresh_token,
        max_age=refresh_max_age,
        **common_kwargs,
    )

    return response


def clear_auth_cookies(
    response: Response,
    cookie_prefix: str = "nerbis",
) -> Response:
    """Delete JWT cookies by expiring them (``max_age=0``).

    Uses the same ``path`` and ``domain`` as :func:`set_auth_cookies` so
    browsers match and remove the correct cookies.

    Returns the same *response* object (mutated).
    """
    delete_kwargs: dict[str, object] = {
        "path": settings.JWT_COOKIE_PATH,
        "domain": settings.JWT_COOKIE_DOMAIN,
        "samesite": settings.JWT_COOKIE_SAMESITE,
    }

    response.delete_cookie(
        key=f"{cookie_prefix}_access",
        **delete_kwargs,
    )
    response.delete_cookie(
        key=f"{cookie_prefix}_refresh",
        **delete_kwargs,
    )

    return response
