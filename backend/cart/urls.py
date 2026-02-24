# backend/cart/urls.py

from django.urls import path
from . import views

app_name = "cart"

urlpatterns = [
    path("", views.CartViewSet.as_view({"get": "list"}), name="cart"),
    path("add-product/", views.CartViewSet.as_view({"post": "add_product"}), name="add-product"),
    path("add-service/", views.CartViewSet.as_view({"post": "add_service"}), name="add-service"),
    path(
        "items/<int:item_id>/",
        views.CartViewSet.as_view({"patch": "update_item", "delete": "remove_item"}),
        name="cart-item",
    ),
    path("clear/", views.CartViewSet.as_view({"post": "clear"}), name="clear"),
]
