# backend/config/urls.py

from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from core.views import (
    CheckBusinessNameView,
    CheckTenantEmailView,
    PlatformForgotPasswordView,
    PlatformLoginView,
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
    # Webhooks (sin middleware de tenant)
    path("api/webhooks/stripe/", stripe_webhook, name="stripe-webhook"),
    # Documentación
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

# Media files
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
