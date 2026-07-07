# backend/billing/views.py
"""
Vistas de la API de ciclo de vida de suscripciones (B1).

La suscripcion es un singleton por tenant (OneToOne a Tenant). Toda vista
resuelve el objetivo como ``request.tenant.subscription`` UNICAMENTE: el
cliente nunca envia ni recibe un id de tenant/suscripcion.

Las vistas NUNCA mutan ``tenant.has_*`` directamente: los signals post_save/
post_delete sobre Subscription/SubscriptionModule re-sincronizan los flags.
"""

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsTenantAdmin, IsTenantUser

from .models import Module
from .serializers import (
    BillingPeriodInputSerializer,
    CancelInputSerializer,
    ModuleSerializer,
    ModulesInputSerializer,
    SubscribeInputSerializer,
    SubscriptionSerializer,
)
from .services import SubscriptionManager


def _subscription_response(subscription, request) -> Response:
    """Serializa la suscripcion (refrescada) para devolverla en cada accion."""
    subscription.refresh_from_db()
    return Response(SubscriptionSerializer(subscription, context={"request": request}).data)


class ModuleCatalogPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100


class ModuleListView(ListAPIView):
    """GET /api/v1/billing/modules/ — catalogo global de modulos contratables."""

    permission_classes = [IsTenantUser]
    serializer_class = ModuleSerializer
    pagination_class = ModuleCatalogPagination

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Module.objects.none()
        return Module.objects.filter(is_active=True, is_visible=True).order_by("sort_order")


class SubscriptionDetailView(APIView):
    """GET /api/v1/billing/subscription/ — estado de la suscripcion del tenant."""

    permission_classes = [IsTenantUser]

    def get(self, request):
        subscription = request.tenant.subscription
        return Response(SubscriptionSerializer(subscription, context={"request": request}).data)


class SubscribeView(APIView):
    """POST /api/v1/billing/subscription/subscribe/ — activa una suscripcion modular."""

    permission_classes = [IsTenantAdmin]

    def post(self, request):
        serializer = SubscribeInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscription = request.tenant.subscription
        SubscriptionManager.activate_subscription(
            subscription,
            serializer.validated_data["module_slugs"],
            serializer.validated_data["billing_period"],
        )
        return _subscription_response(subscription, request)


class ModulesView(APIView):
    """POST /api/v1/billing/subscription/modules/ — agrega/quita modulos."""

    permission_classes = [IsTenantAdmin]

    def post(self, request):
        serializer = ModulesInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscription = request.tenant.subscription

        # Validar remociones ANTES de mutar (no quitar base 'web'; debe estar en la sub).
        for slug in serializer.validated_data["remove"]:
            module = Module.objects.filter(slug=slug).first()
            if module is not None and module.is_base:
                return Response(
                    {"detail": "No se puede remover el modulo base (web)"},
                    status=status.HTTP_409_CONFLICT,
                )
            if not subscription.subscription_modules.filter(module__slug=slug, is_active=True).exists():
                return Response(
                    {"detail": f"El modulo {slug} no esta en tu suscripcion"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        for slug in serializer.validated_data["add"]:
            subscription.add_module(slug)
        for slug in serializer.validated_data["remove"]:
            subscription.remove_module(slug)

        return _subscription_response(subscription, request)


class BillingPeriodView(APIView):
    """POST /api/v1/billing/subscription/billing-period/ — cambia el periodo de facturacion."""

    permission_classes = [IsTenantAdmin]

    def post(self, request):
        serializer = BillingPeriodInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscription = request.tenant.subscription
        new_period = serializer.validated_data["billing_period"]

        if new_period == subscription.billing_period:
            # No-op idempotente: el periodo ya es el solicitado (spec: 200).
            return _subscription_response(subscription, request)

        # Cambiar el periodo sin tocar fechas ni recalcular (efectivo en la
        # proxima renovacion; sin prorrateo en B1).
        subscription.billing_period = new_period
        subscription.save()
        return _subscription_response(subscription, request)


class CancelView(APIView):
    """POST /api/v1/billing/subscription/cancel/ — cancela (inmediata o diferida)."""

    permission_classes = [IsTenantAdmin]

    def post(self, request):
        serializer = CancelInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscription = request.tenant.subscription
        at_period_end = serializer.validated_data["at_period_end"]

        # Ya cancelada/expirada: nada que cancelar.
        if subscription.status in ("canceled", "expired"):
            return Response(
                {"detail": "La suscripcion ya esta cancelada"},
                status=status.HTTP_409_CONFLICT,
            )

        # Cancelacion diferida ya pendiente -> idempotente 200 (spec).
        if at_period_end and subscription.canceled_at is not None and subscription.status == "active":
            return _subscription_response(subscription, request)

        SubscriptionManager.cancel_subscription(subscription, at_period_end=at_period_end)
        return _subscription_response(subscription, request)
