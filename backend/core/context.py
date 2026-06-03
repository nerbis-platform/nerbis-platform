# backend/core/context.py

from contextvars import ContextVar

# ContextVar es async-safe (funciona con asyncio, Gunicorn threads, y ASGI).
# threading.local() NO es seguro en contextos async porque múltiples
# coroutines comparten el mismo thread.
_current_tenant: ContextVar = ContextVar("current_tenant", default=None)


def set_current_tenant(tenant):
    """
    Guardar el tenant actual en el contexto.

    Llamado por el middleware en cada request.
    """
    _current_tenant.set(tenant)


def get_current_tenant():
    """
    Obtener el tenant actual del contexto.

    Returns:
        Tenant instance o None si no hay tenant en el contexto.
    """
    return _current_tenant.get()


def clear_current_tenant():
    """
    Limpiar el tenant del contexto.
    """
    _current_tenant.set(None)
