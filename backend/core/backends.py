# backend/core/backends.py

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from .context import get_current_tenant

User = get_user_model()


class TenantEmailBackend(ModelBackend):
    """
    Backend de autenticación personalizado para multi-tenant.

    Autentica usuarios por email + tenant en lugar de username global.
    Esto permite que el mismo email exista en múltiples tenants.

    Flujo de autenticación:
    1. El middleware TenantMiddleware establece el tenant actual
    2. Este backend busca el usuario por email dentro de ese tenant
    3. Verifica la contraseña y devuelve el usuario si es válido
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Autenticar usuario por email + tenant.

        Args:
            request: HttpRequest (contiene información del tenant via middleware)
            username: En realidad es el email (por compatibilidad con forms)
            password: Contraseña del usuario

        Returns:
            User si las credenciales son válidas, None en caso contrario
        """
        email = kwargs.get('email') or username

        if email is None or password is None:
            return None

        # Obtener tenant del contexto (establecido por TenantMiddleware)
        tenant = get_current_tenant()

        try:
            if tenant:
                # Buscar usuario por email dentro del tenant
                user = User.objects.get(tenant=tenant, email=email)
            else:
                # Para superusuarios de plataforma (sin tenant)
                user = User.objects.get(tenant__isnull=True, email=email)

        except User.DoesNotExist:
            # Ejecutar el hasher de contraseña para prevenir timing attacks
            User().set_password(password)
            return None
        except User.MultipleObjectsReturned:
            # No debería pasar con los constraints, pero por seguridad
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None

    def get_user(self, user_id):
        """
        Obtener usuario por ID.

        Usado para recuperar el usuario de la sesión.
        """
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

        return user if self.user_can_authenticate(user) else None