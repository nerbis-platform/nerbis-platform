# backend/core/urls.py

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = "core"

urlpatterns = [
    # Autenticación
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", views.CurrentUserView.as_view(), name="current_user"),
    path("auth/profile/", views.ProfileView.as_view(), name="profile"),
    path("auth/change-password/", views.ChangePasswordView.as_view(), name="change_password"),
    path("auth/delete-account/", views.DeleteAccountView.as_view(), name="delete_account"),
    path("auth/reactivate-account/", views.ReactivateAccountView.as_view(), name="reactivate_account"),
    path("auth/set-password/", views.SetPasswordView.as_view(), name="set_password"),
    # OTP - Recuperación de contraseña
    path("auth/forgot-password/", views.RequestPasswordResetOTPView.as_view(), name="forgot_password"),
    path("auth/verify-reset-otp/", views.VerifyPasswordResetOTPView.as_view(), name="verify_reset_otp"),
    # OTP - Reactivación de cuenta
    path("auth/request-reactivation/", views.RequestReactivationOTPView.as_view(), name="request_reactivation"),
    path("auth/verify-reactivation/", views.VerifyReactivationOTPView.as_view(), name="verify_reactivation"),
    # Banners
    path("banners/", views.ActiveBannersView.as_view(), name="active_banners"),
    # Configuración del tenant
    path("tenant/config/", views.get_tenant_config, name="tenant_config"),
    path("tenant/website-content/", views.get_tenant_website_content, name="tenant_website_content"),
    path("configure-modules/", views.configure_modules, name="configure_modules"),
    # Testing
    path("tenant-info/", views.tenant_info, name="tenant-info"),
]
