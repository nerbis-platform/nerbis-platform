# backend/management/urls.py

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = "management"

router = DefaultRouter()
router.register(r"suppliers", views.SupplierViewSet, basename="supplier")
router.register(
    r"purchase-orders", views.PurchaseOrderViewSet, basename="purchase-order"
)
router.register(r"sales", views.SaleViewSet, basename="sale")
router.register(r"expenses", views.ExpenseViewSet, basename="expense")
router.register(
    r"expense-categories",
    views.ExpenseCategoryViewSet,
    basename="expense-category",
)
router.register(
    r"inventory-movements",
    views.InventoryMovementViewSet,
    basename="inventory-movement",
)

urlpatterns = [
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path("", include(router.urls)),
]
