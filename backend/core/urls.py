# backend/core/urls.py

from django.urls import path

from . import views, views_2fa, webauthn_auth

app_name = "core"

urlpatterns = [
    # Autenticación
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("auth/refresh/", views.CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", views.CurrentUserView.as_view(), name="current_user"),
    path("auth/profile/", views.ProfileView.as_view(), name="profile"),
    path("auth/change-password/", views.ChangePasswordView.as_view(), name="change_password"),
    path("auth/delete-account/", views.DeleteAccountView.as_view(), name="delete_account"),
    path("auth/reactivate-account/", views.ReactivateAccountView.as_view(), name="reactivate_account"),
    path("auth/set-password/", views.SetPasswordView.as_view(), name="set_password"),
    # 2FA (TOTP)
    path("auth/2fa/status/", views_2fa.TwoFactorStatusView.as_view(), name="two_factor_status"),
    path("auth/2fa/setup/", views_2fa.TwoFactorSetupView.as_view(), name="two_factor_setup"),
    path("auth/2fa/verify/", views_2fa.TwoFactorVerifyView.as_view(), name="two_factor_verify"),
    path("auth/2fa/disable/", views_2fa.TwoFactorDisableView.as_view(), name="two_factor_disable"),
    path(
        "auth/2fa/backup-codes/regenerate/",
        views_2fa.TwoFactorBackupCodesRegenerateView.as_view(),
        name="two_factor_backup_codes_regenerate",
    ),
    path(
        "auth/2fa/challenge/passkey/options/",
        views_2fa.TwoFactorPasskeyOptionsView.as_view(),
        name="two_factor_passkey_options",
    ),
    path(
        "auth/2fa/challenge/passkey/verify/",
        views_2fa.TwoFactorPasskeyVerifyView.as_view(),
        name="two_factor_passkey_verify",
    ),
    path("auth/2fa/challenge/", views_2fa.TwoFactorChallengeView.as_view(), name="two_factor_challenge"),
    # OTP - Recuperación de contraseña
    path("auth/forgot-password/", views.RequestPasswordResetOTPView.as_view(), name="forgot_password"),
    path("auth/verify-reset-otp/", views.VerifyPasswordResetOTPView.as_view(), name="verify_reset_otp"),
    # OTP - Reactivación de cuenta
    path("auth/request-reactivation/", views.RequestReactivationOTPView.as_view(), name="request_reactivation"),
    path("auth/verify-reactivation/", views.VerifyReactivationOTPView.as_view(), name="verify_reactivation"),
    # Social Auth (link/ and disconnect/ must come before <str:provider>/ to avoid matching as provider)
    path("auth/social/link/", views.SocialLinkView.as_view(), name="social_link"),
    path(
        "auth/social/disconnect/<str:provider>/", views.SocialAccountDisconnectView.as_view(), name="social_disconnect"
    ),
    path("auth/social/<str:provider>/", views.SocialLoginView.as_view(), name="social_login"),
    # WebAuthn / Passkeys
    path(
        "auth/passkey/register/options/",
        webauthn_auth.PasskeyRegisterOptionsView.as_view(),
        name="passkey_register_options",
    ),
    path(
        "auth/passkey/register/verify/",
        webauthn_auth.PasskeyRegisterVerifyView.as_view(),
        name="passkey_register_verify",
    ),
    path(
        "auth/passkey/authenticate/options/",
        webauthn_auth.PasskeyAuthenticateOptionsView.as_view(),
        name="passkey_authenticate_options",
    ),
    path(
        "auth/passkey/authenticate/verify/",
        webauthn_auth.PasskeyAuthenticateVerifyView.as_view(),
        name="passkey_authenticate_verify",
    ),
    path("auth/passkey/", webauthn_auth.PasskeyListView.as_view(), name="passkey_list"),
    path("auth/passkey/<int:pk>/", webauthn_auth.PasskeyDetailView.as_view(), name="passkey_detail"),
    # Gestión de equipo (solo admins del tenant)
    path("team/", views.TeamListView.as_view(), name="team_list"),
    path(
        "team/<int:user_id>/social/<str:provider>/",
        views.TeamDisconnectSocialView.as_view(),
        name="team_disconnect_social",
    ),
    path(
        "team/<int:user_id>/2fa/reset/",
        views.TeamReset2FAView.as_view(),
        name="team_reset_2fa",
    ),
    # Banners
    path("banners/", views.ActiveBannersView.as_view(), name="active_banners"),
    # Configuración del tenant
    path("tenant/config/", views.get_tenant_config, name="tenant_config"),
    path("tenant/website-content/", views.get_tenant_website_content, name="tenant_website_content"),
    path("configure-modules/", views.configure_modules, name="configure_modules"),
    # Testing
    path("tenant-info/", views.tenant_info, name="tenant-info"),
]
