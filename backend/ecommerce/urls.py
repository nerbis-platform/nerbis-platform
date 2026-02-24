# backend/ecommerce/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from . import views
from reviews.views import ProductReviewsViewSet

app_name = "ecommerce"

router = DefaultRouter()
router.register(r"categories", views.ProductCategoryViewSet, basename="category")
router.register(r"products", views.ProductViewSet, basename="product")

products_router = routers.NestedDefaultRouter(router, r"products", lookup="product")
products_router.register(r"reviews", ProductReviewsViewSet, basename="product-reviews")
products_router.register(r"images", views.ProductImageViewSet, basename="product-images")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(products_router.urls)),
]
