# backend/billing/urls.py
"""
URLs de la API de ciclo de vida de suscripciones (B1).

Montadas en ``config/urls.py`` bajo ``/api/billing/``.
"""

from django.urls import path

from .views import (
    BillingPeriodView,
    CancelView,
    ModuleListView,
    ModulesView,
    SubscribeView,
    SubscriptionDetailView,
)

app_name = "billing"

urlpatterns = [
    path("modules/", ModuleListView.as_view(), name="module-list"),
    path("subscription/", SubscriptionDetailView.as_view(), name="subscription-detail"),
    path("subscription/subscribe/", SubscribeView.as_view(), name="subscription-subscribe"),
    path("subscription/modules/", ModulesView.as_view(), name="subscription-modules"),
    path("subscription/billing-period/", BillingPeriodView.as_view(), name="subscription-billing-period"),
    path("subscription/cancel/", CancelView.as_view(), name="subscription-cancel"),
]
