# backend/core/middleware/tenant.py

from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponse
from core.models import Tenant
from core.context import set_current_tenant, clear_current_tenant
import logging

logger = logging.getLogger(__name__)


class TenantMiddleware(MiddlewareMixin):
    """
    Middleware para detectar el tenant actual de cada request.

    Métodos de detección (en orden de prioridad):
    1. Header HTTP: X-Tenant-Slug
    2. Subdominio: mi-negocio.graviti.co
    3. URL parameter: ?tenant=gc-belleza (solo en desarrollo)

    Una vez detectado, el tenant se guarda en:
    - request.tenant (objeto Tenant)
    - request.tenant_slug (string)
    """

    def process_request(self, request):
        """
        Ejecutado ANTES de que Django procese el request.
        Aquí detectamos y asignamos el tenant.
        """
        # Si la ruta está excluida, no procesar tenant
        if getattr(request, "tenant_excluded", False):
            return None

        tenant = None
        tenant_slug = None

        # Método 1: Header HTTP (para APIs y apps móviles)
        tenant_slug = request.headers.get("X-Tenant-Slug")

        if tenant_slug:
            logger.info(f"Tenant detectado por header: {tenant_slug}")

        # Método 2: Subdominio (para web)
        if not tenant_slug:
            tenant_slug = self._get_tenant_from_subdomain(request)
            if tenant_slug:
                logger.info(f"Tenant detectado por subdominio: {tenant_slug}")

        # Método 3: URL parameter (SOLO en desarrollo)
        if not tenant_slug and self._is_development():
            tenant_slug = request.GET.get("tenant")
            if tenant_slug:
                logger.warning(f"Tenant detectado por URL param (solo dev): {tenant_slug}")

        # Si no se detectó tenant, error
        if not tenant_slug:
            logger.error("No se pudo detectar el tenant en el request")
            return self._tenant_not_found_response(request)

        # Buscar tenant en la base de datos
        try:
            tenant = Tenant.objects.get(slug=tenant_slug, is_active=True)
            logger.info(f"Tenant encontrado: {tenant.name} (ID: {tenant.id})")
        except Tenant.DoesNotExist:
            logger.error(f"Tenant no existe o está inactivo: {tenant_slug}")
            return self._tenant_not_found_response(request)

        # Guardar tenant en el request
        request.tenant = tenant
        request.tenant_slug = tenant_slug

        # Guardar tenant en el contexto global (para managers)
        set_current_tenant(tenant)

        # Continuar con el request
        return None

    def process_response(self, request, response):
        """
        Ejecutado DESPUÉS de que Django procese el request.
        Limpiar el tenant del contexto.
        """
        clear_current_tenant()
        return response

    def _get_tenant_from_subdomain(self, request):
        """
        Extraer tenant del subdominio.

        Ejemplos:
        - mi-negocio.graviti.co → "mi-negocio"
        - localhost:8000 → None
        - 127.0.0.1:8000 → None
        """
        from django.conf import settings as django_settings
        host = request.get_host().split(":")[0]  # Remover puerto

        # Lista de dominios base
        base_domains = [
            django_settings.PLATFORM_BASE_DOMAIN,
            "localhost",
            "127.0.0.1",
        ]

        # Si es un dominio base, no hay subdominio
        if host in base_domains:
            return None

        # Extraer subdominio
        parts = host.split(".")

        # Si tiene subdominio (ej: mi-negocio.graviti.co)
        if len(parts) > 2:
            return parts[0]

        return None

    def _is_development(self):
        """
        Verificar si estamos en modo desarrollo.
        """
        from django.conf import settings

        return settings.DEBUG

    def _tenant_not_found_response(self, request):
        """
        Respuesta cuando no se encuentra el tenant.
        """
        # Si es una petición API (JSON)
        if request.path.startswith("/api/"):
            from django.http import JsonResponse

            return JsonResponse(
                {
                    "error": "Tenant no encontrado",
                    "detail": "No se pudo identificar el tenant.",
                    "code": "TENANT_NOT_FOUND",
                },
                status=400,
            )

        # Si es web (HTML)
        return HttpResponse(
            "<h1>Tenant no encontrado</h1>"
            "<p>No se pudo identificar el cliente para esta solicitud.</p>"
            "<p>Verifica que la URL sea correcta.</p>",
            status=400,
        )


class TenantExclusionMiddleware(MiddlewareMixin):
    """
    Middleware opcional que EXCLUYE ciertas rutas del filtrado por tenant.

    Útil para:
    - Panel de administración de Django (/admin/)
    - Endpoints públicos (/api/public/)
    - Landing page principal
    """

    EXCLUDED_PATHS = [
        "/admin/",
        "/api/public/",
        "/api/docs/",
        "/api/schema/",
        "/health/",
        "/static/",
        "/media/",
        "/favicon.ico",
        "/api/webhooks/",
        "/subscription-expired/",
    ]

    EXCLUDED_EXACT = [
        "/",  # Raíz del sitio
    ]

    def process_request(self, request):
        """
        Si la ruta está excluida, marcar el request.
        """
        # Verificar rutas exactas
        if request.path in self.EXCLUDED_EXACT:
            request.tenant_excluded = True
            logger.debug(f"Ruta excluida de tenant: {request.path}")
            return None

        # Verificar rutas por prefijo
        for path in self.EXCLUDED_PATHS:
            if request.path.startswith(path):
                request.tenant_excluded = True
                logger.debug(f"Ruta excluida de tenant: {request.path}")
                return None

        request.tenant_excluded = False
        return None
