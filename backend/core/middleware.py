# backend/core/middleware.py
"""
Middlewares personalizados para el sistema multi-tenant.
"""

from django.shortcuts import redirect
from django.urls import reverse
from django.http import HttpResponseForbidden
from django.utils import timezone as django_timezone
import zoneinfo
import re


class TimezoneMiddleware:
    """
    Middleware que activa el timezone correcto según el usuario.

    Lógica (Opción A):
    - Superusuarios: siempre ven la hora del servidor (America/Bogota)
    - Usuarios de tenant: ven la hora según el timezone configurado en su tenant

    Esto asegura que:
    - El equipo GRAVITIFY (superusers) siempre trabaja en horario Colombia
    - Cada tenant ve su propia hora local según su configuración
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Solo procesar si el usuario está autenticado
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Superusuarios: usar timezone del servidor (no activar nada especial)
            if request.user.is_superuser:
                # Dejar el timezone del servidor (settings.TIME_ZONE = America/Bogota)
                django_timezone.deactivate()
            else:
                # Usuarios normales: usar timezone del tenant
                tenant = getattr(request.user, 'tenant', None)
                if tenant and tenant.timezone:
                    try:
                        tz = zoneinfo.ZoneInfo(tenant.timezone)
                        django_timezone.activate(tz)
                    except zoneinfo.ZoneInfoNotFoundError:
                        # Si el timezone es inválido, usar el del servidor
                        django_timezone.deactivate()
                else:
                    # Sin tenant, usar timezone del servidor
                    django_timezone.deactivate()
        else:
            # Usuario no autenticado, usar timezone del servidor
            django_timezone.deactivate()

        response = self.get_response(request)

        # Limpiar el timezone activado después de la respuesta
        django_timezone.deactivate()

        return response


class SubscriptionMiddleware:
    """
    Middleware que verifica si la suscripción del tenant está activa.

    Si la suscripción ha expirado:
    - Redirige a una página de "suscripción expirada"
    - Bloquea el acceso al panel de administración
    - Permite acceso a ciertas URLs excluidas (login, logout, etc.)

    Excepciones:
    - Superusuarios siempre tienen acceso
    - URLs públicas (login, logout, API de autenticación)
    - URLs estáticas y de media
    """

    # URLs que siempre están permitidas (regex patterns)
    ALLOWED_URLS = [
        r'^/admin/login/$',
        r'^/admin/logout/$',
        r'^/admin/password_change/',
        r'^/api/auth/',
        r'^/api/v1/auth/',
        r'^/static/',
        r'^/media/',
        r'^/__reload__/',  # Django browser reload
        r'^/subscription-expired/$',
        r'^/favicon\.ico$',
    ]

    def __init__(self, get_response):
        self.get_response = get_response
        # Compilar patrones de URL permitidas
        self.allowed_patterns = [re.compile(pattern) for pattern in self.ALLOWED_URLS]

    def __call__(self, request):
        # Verificar si la URL está permitida siempre
        if self._is_allowed_url(request.path):
            return self.get_response(request)

        # Si el usuario no está autenticado, dejar pasar (el auth middleware se encarga)
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return self.get_response(request)

        # Superusuarios siempre tienen acceso
        if request.user.is_superuser:
            return self.get_response(request)

        # Verificar si el usuario tiene tenant
        tenant = getattr(request.user, 'tenant', None)
        if not tenant:
            # Usuario sin tenant, dejar pasar (podría ser un superuser sin tenant asignado)
            return self.get_response(request)

        # Verificar si la suscripción está activa
        if not tenant.is_subscription_active:
            # Determinar si es una petición al admin o al frontend
            if request.path.startswith('/admin/'):
                # En el admin, redirigir a página de suscripción expirada
                return redirect('subscription_expired')
            elif request.path.startswith('/api/'):
                # En la API, retornar 403 con mensaje
                from django.http import JsonResponse
                return JsonResponse({
                    'error': 'subscription_expired',
                    'message': 'Tu suscripción ha expirado. Por favor, renueva tu plan para continuar.',
                    'status': tenant.subscription_status,
                    'plan': tenant.plan,
                }, status=403)
            else:
                # En otras URLs (frontend), redirigir
                return redirect('subscription_expired')

        return self.get_response(request)

    def _is_allowed_url(self, path):
        """Verifica si la URL está en la lista de permitidas"""
        for pattern in self.allowed_patterns:
            if pattern.match(path):
                return True
        return False
