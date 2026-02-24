# backend/bookings/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "bookings"

router = DefaultRouter()
router.register(r"business-hours", views.BusinessHoursViewSet, basename="business-hours")
router.register(r"time-off", views.TimeOffViewSet, basename="time-off")
router.register(r"appointments", views.AppointmentViewSet, basename="appointment")

urlpatterns = [
    path("", include(router.urls)),
]
