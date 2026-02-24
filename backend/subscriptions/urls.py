# backend/subscriptions/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "subscriptions"

router = DefaultRouter()
router.register(r'categories', views.MarketplaceCategoryViewSet, basename='category')
router.register(r'plans', views.MarketplacePlanViewSet, basename='plan')
router.register(r'contracts', views.MarketplaceContractViewSet, basename='contract')

urlpatterns = [
    # Endpoints personalizados
    path('purchase/', views.purchase_plan, name='purchase_plan'),
    path('featured/', views.featured_plans, name='featured_plans'),

    # Router URLs
    path('', include(router.urls)),
]
