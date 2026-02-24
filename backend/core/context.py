# backend/core/context.py

import threading

# Thread-local storage para guardar el tenant actual
_thread_locals = threading.local()


def set_current_tenant(tenant):
    """
    Guardar el tenant actual en el contexto del thread.

    Llamado por el middleware en cada request.
    """
    _thread_locals.tenant = tenant


def get_current_tenant():
    """
    Obtener el tenant actual del contexto.

    Returns:
        Tenant instance o None si no hay tenant en el contexto.
    """
    return getattr(_thread_locals, "tenant", None)


def clear_current_tenant():
    """
    Limpiar el tenant del contexto.
    """
    if hasattr(_thread_locals, "tenant"):
        del _thread_locals.tenant
