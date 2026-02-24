# backend/orders/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "orders"

router = DefaultRouter()
router.register(r"orders", views.OrderViewSet, basename="order")

urlpatterns = [
    path("", include(router.urls)),
    path("checkout/create-order/", views.CheckoutViewSet.as_view({"post": "create_order"}), name="create-order"),
    path(
        "checkout/create-payment-intent/",
        views.CheckoutViewSet.as_view({"post": "create_payment_intent"}),
        name="create-payment-intent",
    ),
    path(
        "checkout/confirm-payment/",
        views.CheckoutViewSet.as_view({"post": "confirm_payment"}),
        name="confirm-payment",
    ),
]
