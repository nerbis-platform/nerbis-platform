# backend/coupons/urls.py

from django.urls import path
from . import views

app_name = 'coupons'

urlpatterns = [
    path('validate/', views.validate_coupon, name='validate'),
    path('apply/', views.apply_coupon, name='apply'),
    path('remove/', views.remove_coupon, name='remove'),
    path('cart/', views.get_cart_coupon, name='cart-coupon'),
    path('preview/', views.preview_coupon, name='preview'),
]
