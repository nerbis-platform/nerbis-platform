# backend/config/urls.py

from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenRefreshView

# Importar el admin site personalizado de NERBIS
from core.admin_site import nerbis_admin_site
from core.admin_tenant_views import (
    AdminDeletePasskeyView,
    AdminDisable2FAView,
    AdminResetPasswordView,
    AdminTenantDetailView,
    AdminTenantListView,
    AdminTenantUsersListView,
    AdminUnlinkSocialView,
    AdminUserDetailView,
)
from core.admin_views import (
    AdminLoginView,
    AdminLogoutView,
    AdminMeView,
    AdminRegisterView,
    AdminSuperadminDetailView,
    AdminSuperadminListView,
)
from core.views import (
    CheckBusinessNameView,
    CheckTenantEmailView,
    PlatformForgotPasswordView,
    PlatformLoginView,
    PlatformSocialLoginView,
    PlatformVerifyResetOTPView,
    TenantRegisterView,
    subscription_expired_view,
)
from orders.webhooks import stripe_webhook

urlpatterns = [
    # Redirigir la raíz a la documentación de la API
    path("", RedirectView.as_view(url="/api/docs/", permanent=False)),
    # Suscripcion expirada
    path("subscription-expired/", subscription_expired_view, name="subscription_expired"),
    # Admin (usando nuestro admin site personalizado con login multi-tenant)
    path("admin/", nerbis_admin_site.urls),
    # API
    path(
        "api/",
        include(
            [
                path("", include("core.urls")),
                path("", include("ecommerce.urls")),
                path("services/", include("services.urls")),
                path("bookings/", include("bookings.urls")),
                path("subscriptions/", include("subscriptions.urls")),
                path("cart/", include("cart.urls")),
                path("", include("orders.urls")),
                path("coupons/", include("coupons.urls")),
                path("reviews/", include("reviews.urls")),
                path("websites/", include("websites.urls")),
            ]
        ),
    ),
    # Endpoints públicos (sin middleware de tenant)
    path("api/public/register-tenant/", TenantRegisterView.as_view(), name="register-tenant"),
    path("api/public/check-business-name/", CheckBusinessNameView.as_view(), name="check-business-name"),
    path("api/public/check-tenant-email/", CheckTenantEmailView.as_view(), name="check-tenant-email"),
    path("api/public/platform-login/", PlatformLoginView.as_view(), name="platform-login"),
    path("api/public/platform-forgot-password/", PlatformForgotPasswordView.as_view(), name="platform-forgot-password"),
    path(
        "api/public/platform-verify-reset-otp/", PlatformVerifyResetOTPView.as_view(), name="platform-verify-reset-otp"
    ),
    path("api/public/platform-social-login/", PlatformSocialLoginView.as_view(), name="platform-social-login"),
    # NERBIS Admin (superadmin de plataforma — sin middleware de tenant)
    path("api/admin/auth/login/", AdminLoginView.as_view(), name="admin-login"),
    path("api/admin/auth/register/", AdminRegisterView.as_view(), name="admin-register"),
    path("api/admin/auth/me/", AdminMeView.as_view(), name="admin-me"),
    path("api/admin/auth/logout/", AdminLogoutView.as_view(), name="admin-logout"),
    path("api/admin/auth/refresh/", TokenRefreshView.as_view(), name="admin-token-refresh"),
    path("api/admin/superadmins/", AdminSuperadminListView.as_view(), name="admin-superadmins-list"),
    path(
        "api/admin/superadmins/<int:pk>/",
        AdminSuperadminDetailView.as_view(),
        name="admin-superadmins-detail",
    ),
    path("api/admin/tenants/", AdminTenantListView.as_view(), name="admin-tenants-list"),
    path(
        "api/admin/tenants/<uuid:pk>/",
        AdminTenantDetailView.as_view(),
        name="admin-tenants-detail",
    ),
    path(
        "api/admin/tenants/<uuid:pk>/users/",
        AdminTenantUsersListView.as_view(),
        name="admin-tenant-users-list",
    ),
    path(
        "api/admin/users/<int:pk>/",
        AdminUserDetailView.as_view(),
        name="admin-users-detail",
    ),
    path(
        "api/admin/users/<int:pk>/reset-password/",
        AdminResetPasswordView.as_view(),
        name="admin-users-reset-password",
    ),
    path(
        "api/admin/users/<int:pk>/passkeys/<int:passkey_pk>/",
        AdminDeletePasskeyView.as_view(),
        name="admin-users-delete-passkey",
    ),
    path(
        "api/admin/users/<int:pk>/disable-2fa/",
        AdminDisable2FAView.as_view(),
        name="admin-users-disable-2fa",
    ),
    path(
        "api/admin/users/<int:pk>/social/<str:provider>/",
        AdminUnlinkSocialView.as_view(),
        name="admin-users-unlink-social",
    ),
    # Webhooks (sin middleware de tenant)
    path("api/webhooks/stripe/", stripe_webhook, name="stripe-webhook"),
    # Documentación
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

# Media files
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
