# backend/billing/tests.py
"""
Tests de la API de ciclo de vida de suscripciones (B1 / Issue #291).

Cubre: catalogo de modulos, estado de suscripcion, subscribe (con honor-trial),
add/remove de modulos, cambio de periodo de facturacion, cancel (inmediata,
diferida e idempotente), aislamiento multi-tenant, limites de permisos y
exencion del SubscriptionMiddleware para rutas de reactivacion.

La suscripcion y el modulo base 'web' se crean por signals al crear el Tenant.
Los modulos del catalogo (web/shop/bookings/services/marketing) se siembran por
las migraciones 0007/0010.
"""

from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from billing.models import Module, Subscription

pytestmark = pytest.mark.django_db


# ===================================
# HELPERS
# ===================================


def _sub(tenant) -> Subscription:
    """Refresca y devuelve la suscripcion (singleton) del tenant."""
    return Subscription.objects.get(tenant=tenant)


def _make_active(subscription, billing_period="monthly", days=30):
    """Pone la suscripcion en estado active con un periodo vigente."""
    now = timezone.now()
    subscription.status = "active"
    subscription.billing_period = billing_period
    subscription.current_period_start = now
    subscription.current_period_end = now + timedelta(days=days)
    subscription.canceled_at = None
    subscription.save()
    return subscription


def _client_for(tenant, user):
    """Construye un APIClient JWT-autenticado para un (tenant, user) dado."""
    from rest_framework.test import APIClient
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    refresh["tenant_id"] = str(tenant.id)
    refresh["tenant_slug"] = tenant.slug
    refresh["role"] = user.role
    client = APIClient()
    client.defaults["HTTP_X_TENANT_SLUG"] = tenant.slug
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


def _catalog(response) -> list[dict]:
    """Devuelve la lista de modulos del catalogo (DRF pagina con PageNumberPagination)."""
    body = response.json()
    return body["results"] if isinstance(body, dict) and "results" in body else body


# ===================================
# CATALOGO DE MODULOS
# ===================================


class TestModuleCatalog:
    def test_lists_active_visible_modules_ordered(self, auth_admin_client):
        url = reverse("billing:module-list")
        response = auth_admin_client.get(url)
        assert response.status_code == 200
        data = _catalog(response)
        slugs = [m["slug"] for m in data]
        assert "web" in slugs
        # Ordenado por sort_order (web=0 primero).
        sort_orders = [m["sort_order"] for m in data]
        assert sort_orders == sorted(sort_orders)
        # Cada entrada trae los campos clave (sin datos de tenant).
        first = data[0]
        for key in ("slug", "name", "monthly_price", "yearly_price", "is_base"):
            assert key in first

    def test_excludes_inactive_and_hidden(self, auth_admin_client):
        Module.objects.filter(slug="shop").update(is_active=False)
        Module.objects.filter(slug="marketing").update(is_visible=False)
        response = auth_admin_client.get(reverse("billing:module-list"))
        assert response.status_code == 200
        slugs = [m["slug"] for m in _catalog(response)]
        assert "shop" not in slugs
        assert "marketing" not in slugs

    def test_catalog_identical_across_tenants(self, auth_admin_client, second_tenant, second_tenant_admin):
        client_b = _client_for(second_tenant, second_tenant_admin)
        a = _catalog(auth_admin_client.get(reverse("billing:module-list")))
        b = _catalog(client_b.get(reverse("billing:module-list")))
        assert [m["slug"] for m in a] == [m["slug"] for m in b]

    def test_unauthenticated_rejected(self, api_client):
        response = api_client.get(reverse("billing:module-list"))
        assert response.status_code == 401


# ===================================
# ESTADO DE SUSCRIPCION (GET)
# ===================================


class TestSubscriptionStatus:
    def test_returns_status_without_ids(self, auth_admin_client, tenant):
        response = auth_admin_client.get(reverse("billing:subscription-detail"))
        assert response.status_code == 200
        data = response.json()
        for key in (
            "status",
            "billing_period",
            "current_period_start",
            "current_period_end",
            "days_remaining",
            "modules",
            "pricing",
            "usage",
            "cancels_at_period_end",
        ):
            assert key in data
        # Nunca exponer ids sensibles.
        assert "id" not in data
        assert "tenant" not in data
        assert "tenant_id" not in data

    def test_trial_subscription_reports_trial(self, auth_admin_client, tenant):
        response = auth_admin_client.get(reverse("billing:subscription-detail"))
        data = response.json()
        assert data["status"] == "trial"
        assert data["is_trial"] is True
        assert data["is_active"] is True

    def test_deferred_cancel_surfaced(self, auth_admin_client, tenant):
        sub = _make_active(_sub(tenant))
        sub.canceled_at = sub.current_period_end
        sub.save()
        data = auth_admin_client.get(reverse("billing:subscription-detail")).json()
        assert data["status"] == "active"
        assert data["cancels_at_period_end"] is True

    def test_no_pending_cancel_reports_false(self, auth_admin_client, tenant):
        _make_active(_sub(tenant))
        data = auth_admin_client.get(reverse("billing:subscription-detail")).json()
        assert data["cancels_at_period_end"] is False


# ===================================
# SUBSCRIBE (POST)
# ===================================


class TestSubscribe:
    def test_subscribe_during_trial_honors_trial(self, auth_admin_client, tenant):
        sub = _sub(tenant)
        assert sub.status == "trial"
        trial_end = sub.trial_ends_at
        url = reverse("billing:subscription-subscribe")
        response = auth_admin_client.post(url, {"module_slugs": ["shop"], "billing_period": "monthly"}, format="json")
        assert response.status_code == 200
        sub.refresh_from_db()
        assert sub.status == "active"
        assert sub.current_period_start == trial_end
        assert sub.current_period_end == trial_end + timedelta(days=30)
        assert sub.has_module("shop")

    def test_subscribe_yearly_during_trial(self, auth_admin_client, tenant):
        sub = _sub(tenant)
        trial_end = sub.trial_ends_at
        response = auth_admin_client.post(
            reverse("billing:subscription-subscribe"),
            {"module_slugs": ["shop"], "billing_period": "yearly"},
            format="json",
        )
        assert response.status_code == 200
        sub.refresh_from_db()
        assert sub.current_period_end == trial_end + timedelta(days=365)

    def test_subscribe_after_trial_starts_now(self, auth_admin_client, tenant):
        sub = _sub(tenant)
        sub.trial_ends_at = timezone.now() - timedelta(days=1)
        sub.status = "expired"
        sub.save()
        before = timezone.now()
        response = auth_admin_client.post(
            reverse("billing:subscription-subscribe"),
            {"module_slugs": ["shop"], "billing_period": "monthly"},
            format="json",
        )
        assert response.status_code == 200
        sub.refresh_from_db()
        assert sub.status == "active"
        assert sub.current_period_start >= before
        assert sub.current_period_end <= timezone.now() + timedelta(days=31)

    def test_subscribe_clears_pending_cancel(self, auth_admin_client, tenant):
        sub = _make_active(_sub(tenant))
        sub.canceled_at = sub.current_period_end
        sub.save()
        auth_admin_client.post(
            reverse("billing:subscription-subscribe"),
            {"module_slugs": ["shop"]},
            format="json",
        )
        sub.refresh_from_db()
        assert sub.canceled_at is None
        data = auth_admin_client.get(reverse("billing:subscription-detail")).json()
        assert data["cancels_at_period_end"] is False

    def test_non_admin_cannot_subscribe(self, auth_customer_client):
        response = auth_customer_client.post(
            reverse("billing:subscription-subscribe"),
            {"module_slugs": ["shop"]},
            format="json",
        )
        assert response.status_code == 403

    def test_unknown_slug_rejected(self, auth_admin_client, tenant):
        sub = _sub(tenant)
        status_before = sub.status
        response = auth_admin_client.post(
            reverse("billing:subscription-subscribe"),
            {"module_slugs": ["nonexistent"]},
            format="json",
        )
        assert response.status_code == 400
        sub.refresh_from_db()
        assert sub.status == status_before


# ===================================
# ADD / REMOVE MODULOS (POST)
# ===================================


class TestModules:
    def test_add_module_syncs_flag(self, auth_admin_client, tenant):
        _make_active(_sub(tenant))
        response = auth_admin_client.post(
            reverse("billing:subscription-modules"),
            {"add": ["bookings"]},
            format="json",
        )
        assert response.status_code == 200
        assert _sub(tenant).has_module("bookings")
        tenant.refresh_from_db()
        assert tenant.has_bookings is True

    def test_remove_non_base_module(self, auth_admin_client, tenant):
        sub = _make_active(_sub(tenant))
        sub.add_module("shop")
        response = auth_admin_client.post(
            reverse("billing:subscription-modules"),
            {"remove": ["shop"]},
            format="json",
        )
        assert response.status_code == 200
        assert not _sub(tenant).has_module("shop")
        # Historial preservado (soft-deactivation).
        assert sub.subscription_modules.filter(module__slug="shop").exists()

    def test_cannot_remove_base_web(self, auth_admin_client, tenant):
        _make_active(_sub(tenant))
        response = auth_admin_client.post(
            reverse("billing:subscription-modules"),
            {"remove": ["web"]},
            format="json",
        )
        assert response.status_code == 409
        assert _sub(tenant).has_module("web")

    def test_remove_slug_not_on_subscription(self, auth_admin_client, tenant):
        _make_active(_sub(tenant))
        response = auth_admin_client.post(
            reverse("billing:subscription-modules"),
            {"remove": ["bookings"]},
            format="json",
        )
        assert response.status_code == 404

    def test_unknown_add_slug_rejected(self, auth_admin_client, tenant):
        _make_active(_sub(tenant))
        response = auth_admin_client.post(
            reverse("billing:subscription-modules"),
            {"add": ["nonexistent"]},
            format="json",
        )
        assert response.status_code == 400

    def test_non_admin_cannot_mutate_modules(self, auth_customer_client):
        response = auth_customer_client.post(
            reverse("billing:subscription-modules"),
            {"add": ["shop"]},
            format="json",
        )
        assert response.status_code == 403


# ===================================
# CAMBIO DE PERIODO (POST)
# ===================================


class TestBillingPeriod:
    def test_switch_monthly_to_yearly_keeps_dates(self, auth_admin_client, tenant):
        sub = _make_active(_sub(tenant), billing_period="monthly")
        end_before = sub.current_period_end
        response = auth_admin_client.post(
            reverse("billing:subscription-billing-period"),
            {"billing_period": "yearly"},
            format="json",
        )
        assert response.status_code == 200
        sub.refresh_from_db()
        assert sub.billing_period == "yearly"
        assert sub.current_period_end == end_before

    def test_same_value_is_noop_200(self, auth_admin_client, tenant):
        sub = _make_active(_sub(tenant), billing_period="monthly")
        end_before = sub.current_period_end
        response = auth_admin_client.post(
            reverse("billing:subscription-billing-period"),
            {"billing_period": "monthly"},
            format="json",
        )
        assert response.status_code == 200
        sub.refresh_from_db()
        assert sub.billing_period == "monthly"
        assert sub.current_period_end == end_before

    def test_invalid_period_rejected(self, auth_admin_client, tenant):
        _make_active(_sub(tenant))
        response = auth_admin_client.post(
            reverse("billing:subscription-billing-period"),
            {"billing_period": "weekly"},
            format="json",
        )
        assert response.status_code == 400

    def test_non_admin_cannot_switch(self, auth_customer_client):
        response = auth_customer_client.post(
            reverse("billing:subscription-billing-period"),
            {"billing_period": "yearly"},
            format="json",
        )
        assert response.status_code == 403


# ===================================
# CANCEL (POST)
# ===================================


class TestCancel:
    def test_deferred_cancel_keeps_active(self, auth_admin_client, tenant):
        sub = _make_active(_sub(tenant))
        end = sub.current_period_end
        response = auth_admin_client.post(
            reverse("billing:subscription-cancel"),
            {"at_period_end": True},
            format="json",
        )
        assert response.status_code == 200
        sub.refresh_from_db()
        assert sub.status == "active"
        assert sub.canceled_at == end
        data = auth_admin_client.get(reverse("billing:subscription-detail")).json()
        assert data["cancels_at_period_end"] is True

    def test_immediate_cancel_deactivates(self, auth_admin_client, tenant):
        sub = _make_active(_sub(tenant))
        sub.add_module("shop")
        response = auth_admin_client.post(
            reverse("billing:subscription-cancel"),
            {"at_period_end": False},
            format="json",
        )
        assert response.status_code == 200
        sub.refresh_from_db()
        assert sub.status == "canceled"
        tenant.refresh_from_db()
        assert tenant.has_shop is False

    def test_double_deferred_cancel_idempotent_200(self, auth_admin_client, tenant):
        sub = _make_active(_sub(tenant))
        auth_admin_client.post(reverse("billing:subscription-cancel"), {"at_period_end": True}, format="json")
        sub.refresh_from_db()
        first_canceled_at = sub.canceled_at
        response = auth_admin_client.post(
            reverse("billing:subscription-cancel"), {"at_period_end": True}, format="json"
        )
        assert response.status_code == 200
        sub.refresh_from_db()
        assert sub.status == "active"
        assert sub.canceled_at == first_canceled_at

    def test_resubscribe_undoes_deferred_cancel(self, auth_admin_client, tenant):
        sub = _make_active(_sub(tenant))
        auth_admin_client.post(reverse("billing:subscription-cancel"), {"at_period_end": True}, format="json")
        auth_admin_client.post(
            reverse("billing:subscription-subscribe"),
            {"module_slugs": ["shop"]},
            format="json",
        )
        sub.refresh_from_db()
        assert sub.canceled_at is None
        assert sub.status == "active"

    def test_non_admin_cannot_cancel(self, auth_customer_client):
        response = auth_customer_client.post(
            reverse("billing:subscription-cancel"),
            {"at_period_end": True},
            format="json",
        )
        assert response.status_code == 403


# ===================================
# AISLAMIENTO MULTI-TENANT
# ===================================


class TestTenantIsolation:
    def test_a_reads_only_own_subscription(self, auth_admin_client, tenant, second_tenant):
        _make_active(_sub(tenant), billing_period="yearly")
        _make_active(_sub(second_tenant), billing_period="monthly")
        data = auth_admin_client.get(reverse("billing:subscription-detail")).json()
        assert data["billing_period"] == "yearly"
        assert "id" not in data and "tenant" not in data

    def test_a_mutation_does_not_touch_b(self, auth_admin_client, tenant, second_tenant):
        _make_active(_sub(tenant))
        b_before = _make_active(_sub(second_tenant))
        b_end_before = b_before.current_period_end
        auth_admin_client.post(
            reverse("billing:subscription-subscribe"),
            {"module_slugs": ["shop"], "billing_period": "yearly"},
            format="json",
        )
        b_after = _sub(second_tenant)
        assert b_after.current_period_end == b_end_before
        assert not b_after.has_module("shop")

    def test_subscription_id_in_body_ignored(self, auth_admin_client, tenant, second_tenant):
        _make_active(_sub(tenant))
        b_sub = _make_active(_sub(second_tenant))
        # Enviar un id ajeno en el body: debe operar SOLO sobre la sub propia.
        auth_admin_client.post(
            reverse("billing:subscription-cancel"),
            {"at_period_end": True, "subscription_id": str(b_sub.id), "tenant_id": str(second_tenant.id)},
            format="json",
        )
        b_sub.refresh_from_db()
        assert b_sub.canceled_at is None  # B intacto
        assert _sub(tenant).canceled_at is not None  # A afectado


# ===================================
# LIMITES DE PERMISOS
# ===================================


class TestPermissionBoundaries:
    def test_non_admin_can_read(self, auth_customer_client):
        assert auth_customer_client.get(reverse("billing:module-list")).status_code == 200
        assert auth_customer_client.get(reverse("billing:subscription-detail")).status_code == 200

    def test_non_admin_post_forbidden(self, auth_customer_client):
        for name, body in (
            ("billing:subscription-subscribe", {"module_slugs": ["shop"]}),
            ("billing:subscription-modules", {"add": ["shop"]}),
            ("billing:subscription-billing-period", {"billing_period": "yearly"}),
            ("billing:subscription-cancel", {"at_period_end": True}),
        ):
            response = auth_customer_client.post(reverse(name), body, format="json")
            assert response.status_code == 403, name

    def test_admin_can_read_and_mutate(self, auth_admin_client, tenant):
        _make_active(_sub(tenant))
        assert auth_admin_client.get(reverse("billing:subscription-detail")).status_code == 200
        assert (
            auth_admin_client.post(
                reverse("billing:subscription-billing-period"),
                {"billing_period": "yearly"},
                format="json",
            ).status_code
            == 200
        )


# ===================================
# EXENCION DE MIDDLEWARE (tenant inactivo)
# ===================================


class TestMiddlewareExemption:
    """
    Verifica el gate de SubscriptionMiddleware a nivel de unidad.

    NOTA (hallazgo): el gate depende de ``request.user.is_authenticated`` que es
    poblado por el AuthenticationMiddleware de Django (sesion). Con autenticacion
    JWT/DRF (``CookieJWTAuthentication``) la autenticacion ocurre DENTRO del
    dispatch de la vista, despues del middleware, por lo que ``request.user`` es
    ``AnonymousUser`` en el middleware y el gate NO dispara para requests con
    Bearer token. Por eso ejercemos el gate directamente con un usuario seteado a
    mano: asi probamos la logica de exencion (paths billing) vs gating (cancel y
    APIs no-billing) de forma determinista, sin depender del flujo JWT.
    """

    def _inactive_tenant(self, tenant):
        tenant.subscription_ends_at = timezone.now().date() - timedelta(days=1)
        tenant.save(update_fields=["subscription_ends_at"])
        assert tenant.is_subscription_active is False
        return tenant

    def _run(self, path, tenant, user):
        """Pasa un request (con user autenticado) por el middleware; True si lo deja pasar."""
        from django.test import RequestFactory

        from core.middleware import SubscriptionMiddleware

        sentinel = object()
        middleware = SubscriptionMiddleware(lambda request: sentinel)
        request = RequestFactory().get(path)
        request.user = user
        result = middleware(request)
        # Si el gate dispara devuelve un JsonResponse/redirect (no el sentinel).
        return result is sentinel

    def test_exempt_paths_pass_when_inactive(self, tenant, admin_user):
        self._inactive_tenant(tenant)
        for path in (
            "/api/billing/modules/",
            "/api/billing/subscription/",
            "/api/billing/subscription/subscribe/",
            "/api/billing/subscription/modules/",
            "/api/billing/subscription/billing-period/",
        ):
            assert self._run(path, tenant, admin_user) is True, path

    def test_cancel_path_gated_when_inactive(self, tenant, admin_user):
        self._inactive_tenant(tenant)
        # Cancel NO esta exento: el gate debe bloquear (no pasa).
        assert self._run("/api/billing/subscription/cancel/", tenant, admin_user) is False

    def test_non_billing_api_gated_when_inactive(self, tenant, admin_user):
        self._inactive_tenant(tenant)
        assert self._run("/api/products/", tenant, admin_user) is False

    def test_billing_paths_pass_when_active(self, tenant, admin_user):
        # Suscripcion activa: nada se bloquea (incluido cancel).
        assert tenant.is_subscription_active is True
        assert self._run("/api/billing/subscription/cancel/", tenant, admin_user) is True
        assert self._run("/api/products/", tenant, admin_user) is True
