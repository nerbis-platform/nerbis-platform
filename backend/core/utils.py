"""
Helpers reutilizables para la app `core`.

Mantener este módulo libre de dependencias a vistas / serializers para evitar ciclos.
"""

from __future__ import annotations


def get_client_ip(request) -> str | None:
    """
    Extrae la dirección IP del cliente desde un request HTTP.

    Prioriza el primer valor de `X-Forwarded-For` (útil cuando corremos detrás
    de un reverse proxy / load balancer). Si no está presente, cae a
    `REMOTE_ADDR`. Devuelve `None` si ninguno de los dos está disponible.

    Se usa principalmente desde los endpoints `/api/admin/*` para enriquecer
    los registros de `AdminAuditLog`.

    Args:
        request: Objeto HttpRequest de Django / DRF.

    Returns:
        Cadena con la IP del cliente o `None` si no se puede determinar.
    """
    if request is None:
        return None

    meta = getattr(request, "META", None) or {}

    forwarded_for = meta.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        # Puede venir como "client, proxy1, proxy2" — tomamos el primer hop.
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip

    remote_addr = meta.get("REMOTE_ADDR")
    if remote_addr:
        return remote_addr.strip() or None

    return None
