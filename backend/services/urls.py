# backend/services/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from . import views
from reviews.views import ServiceReviewsViewSet


app_name = "services"

router = DefaultRouter()
router.register(r"categories", views.ServiceCategoryViewSet, basename="category")
router.register(r"staff", views.StaffMemberViewSet, basename="staff")
router.register(r"list", views.ServiceViewSet, basename="service")

services_router = routers.NestedDefaultRouter(router, r"list", lookup="service")
services_router.register(r"reviews", ServiceReviewsViewSet, basename="service-reviews")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(services_router.urls)),
]
