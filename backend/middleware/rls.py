import logging

from django.db import connection

logger = logging.getLogger(__name__)


class RLSTenantMiddleware:
    """
    Establece app.current_tenant_id en PostgreSQL para activar
    Row-Level Security (RLS) policies por tenant.

    Debe ir DESPUES de TenantMiddleware en settings.MIDDLEWARE.
    Patron: SET al inicio + RESET en finally (belt-and-suspenders).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant = getattr(request, "tenant", None)
        tenant_excluded = getattr(request, "tenant_excluded", False)

        if not tenant or tenant_excluded:
            return self.get_response(request)

        tenant_id = str(tenant.id)

        self._set_tenant(tenant_id)
        try:
            response = self.get_response(request)
        finally:
            self._reset_tenant()

        return response

    def _set_tenant(self, tenant_id: str) -> None:
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT set_config('app.current_tenant_id', %s, false)",
                    [tenant_id],
                )
            logger.debug("RLS: SET app.current_tenant_id = %s", tenant_id)
        except Exception:
            logger.error("RLS: SET failed", exc_info=True)

    def _reset_tenant(self) -> None:
        try:
            if connection.connection is not None:
                with connection.cursor() as cursor:
                    cursor.execute("RESET app.current_tenant_id")
                logger.debug("RLS: RESET app.current_tenant_id")
        except Exception:
            logger.error("RLS: RESET failed", exc_info=True)
