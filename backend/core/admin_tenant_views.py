# backend/core/admin_tenant_views.py
"""
Vistas del panel de superadmin para gestión cross-tenant de NERBIS.

Este módulo está aislado por diseño (complementa a ``admin_views.py``):
- NO referencia ``request.tenant``.
- NO exige el header ``X-Tenant-Slug`` (queda fuera por ``TenantExclusionMiddleware``).
- Usa filtros ORM explícitos (``Tenant.objects.all()`` / ``User.objects.filter(...)``)
  en vez de depender del auto-filtrado por tenant (que ya queda inactivo porque
  la ruta ``/api/admin/*`` está excluida del contexto de tenant).
- Toda acción destructiva registra una entrada en ``AdminAuditLog``.

Contrato de sub-agente SDD ``sdd/tenant-user-management`` (Issue #110, Phase 2).
"""

from __future__ import annotations

import logging

from django.db.models import Count, Q, QuerySet
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.admin_tenant_serializers import (
    AdminTenantDetailSerializer,
    AdminTenantListSerializer,
    AdminTenantUpdateSerializer,
)
from core.models import AdminAuditLog, Tenant
from core.permissions import IsSuperAdmin
from core.utils import get_client_ip

logger = logging.getLogger(__name__)


class AdminPagination(PageNumberPagination):
    """Paginación estándar para endpoints del panel de superadmin.

    Mismo contrato que ``AdminSuperadminPagination`` en ``admin_views.py``.
    No reutilizamos directamente el import para mantener el módulo aislado
    y evitar acoplamiento accidental.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_bool(value: str | None) -> bool | None:
    """Interpreta los valores típicos de query params como booleanos.

    Retorna ``None`` cuando el valor no es reconocible — el caller decide
    si ignorarlo o devolver 400.
    """
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized in {"true", "1", "yes"}:
        return True
    if normalized in {"false", "0", "no"}:
        return False
    return None


# ---------------------------------------------------------------------------
# Tenant list view
# ---------------------------------------------------------------------------


class AdminTenantListView(generics.ListAPIView):
    """GET ``/api/admin/tenants/`` — Listado paginado cross-tenant.

    Filtros soportados vía query params:
      - ``is_active`` (true/false)
      - ``plan`` (trial/basic/professional/enterprise)
      - ``search`` (coincidencia parcial case-insensitive sobre name/slug/email)
      - ``ordering`` (name, -name, created_at, -created_at, plan, -plan) —
        default ``-created_at``.

    Anota ``user_count`` en cada tenant para que el serializer no dispare
    consultas N+1.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = AdminPagination
    serializer_class = AdminTenantListSerializer

    ALLOWED_ORDERING = {
        "name",
        "-name",
        "created_at",
        "-created_at",
        "plan",
        "-plan",
    }

    def get_queryset(self) -> QuerySet[Tenant]:
        # ``Tenant.objects.all()`` es seguro aquí: ``/api/admin/*`` queda
        # excluido del contexto de tenant y no es ``TenantAwareModel``.
        qs = Tenant.objects.all().annotate(user_count=Count("users"))

        params = self.request.query_params

        is_active = _parse_bool(params.get("is_active"))
        if is_active is not None:
            qs = qs.filter(is_active=is_active)

        plan = params.get("plan")
        if plan:
            qs = qs.filter(plan=plan)

        search = params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search) | Q(email__icontains=search))

        ordering = params.get("ordering")
        if ordering in self.ALLOWED_ORDERING:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by("-created_at")

        return qs


# ---------------------------------------------------------------------------
# Tenant detail view
# ---------------------------------------------------------------------------


class AdminTenantDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH ``/api/admin/tenants/<uuid:pk>/``.

    - GET devuelve el detalle completo (con ``user_count`` y ``admin_count``
      anotados).
    - PATCH acepta únicamente campos del allowlist
      (``AdminTenantUpdateSerializer``). Cambios en ``is_active`` generan
      una entrada en ``AdminAuditLog``. Otros cambios (plan, feature flags,
      fecha de suscripción) se persisten pero no son destructivos, por lo que
      no se registran en el audit log (ver contrato del design doc).
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    lookup_field = "pk"
    serializer_class = AdminTenantDetailSerializer

    def get_queryset(self) -> QuerySet[Tenant]:
        return Tenant.objects.all().annotate(
            user_count=Count("users"),
            admin_count=Count("users", filter=Q(users__role="admin")),
        )

    # GET usa el serializer_class por defecto.
    # PATCH necesita: validar con AdminTenantUpdateSerializer (allowlist),
    # aplicar los cambios, registrar audit log y responder con el detalle
    # completo vía AdminTenantDetailSerializer.
    def partial_update(self, request, *args, **kwargs):
        tenant = self.get_object()
        serializer = AdminTenantUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        validated = serializer.validated_data
        if not validated:
            # Nada que actualizar — retornamos el detalle tal cual.
            return Response(
                AdminTenantDetailSerializer(tenant).data,
                status=status.HTTP_200_OK,
            )

        previous_is_active = tenant.is_active
        update_fields: list[str] = []

        for field, value in validated.items():
            setattr(tenant, field, value)
            update_fields.append(field)

        tenant.save(update_fields=update_fields)

        # Audit trail sólo para transiciones de is_active.
        if "is_active" in validated and previous_is_active != validated["is_active"]:
            action = (
                AdminAuditLog.ACTION_ACTIVATE_TENANT
                if validated["is_active"]
                else AdminAuditLog.ACTION_DEACTIVATE_TENANT
            )
            try:
                AdminAuditLog.objects.create(
                    actor=request.user,
                    action=action,
                    target_type="Tenant",
                    target_id=str(tenant.id),
                    target_repr=f"tenant: {tenant.slug}",
                    details={
                        "previous_is_active": previous_is_active,
                        "new_is_active": validated["is_active"],
                    },
                    ip_address=get_client_ip(request),
                )
            except Exception:  # pragma: no cover — defensivo, no bloquea la acción
                logger.exception(
                    "Failed to write AdminAuditLog for tenant %s action=%s",
                    tenant.id,
                    action,
                )

        # Re-anotar para incluir user_count/admin_count en la respuesta.
        refreshed = self.get_queryset().get(pk=tenant.pk)
        return Response(
            AdminTenantDetailSerializer(refreshed).data,
            status=status.HTTP_200_OK,
        )

    # DRF llama a ``put`` en RetrieveUpdateAPIView; desactivamos PUT
    # explícitamente para reforzar el contrato "sólo PATCH con allowlist".
    def put(self, request, *args, **kwargs):
        return Response(
            {"detail": 'Method "PUT" not allowed.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
