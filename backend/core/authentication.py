from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    Autenticación JWT que busca el token en:
    1. Cookie httpOnly (access_token)
    2. Header Authorization (Bearer) — fallback para compatibilidad
    """

    def authenticate(self, request):
        # Intentar primero con la cookie
        cookie_name = getattr(settings, "JWT_AUTH_COOKIE", "access_token")
        raw_token = request.COOKIES.get(cookie_name)

        if raw_token is not None:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token

        # Fallback al header Authorization (comportamiento original)
        return super().authenticate(request)
