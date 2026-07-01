# backend/config/urls.py

from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter


def health_check(request):
    """Health check para ALB/ECS/Kubernetes. Verifica DB y cache."""
    from django.db import connection

    checks = {"status": "ok", "database": "ok", "cache": "ok"}
    http_status = 200

    # Verificar DB
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as e:
        checks["database"] = f"error: {e}"
        checks["status"] = "degraded"
        http_status = 503

    # Verificar Cache
    try:
        from django.core.cache import cache

        cache.set("_health", "ok", 10)
        if cache.get("_health") != "ok":
            raise Exception("cache read failed")
    except Exception as e:
        checks["cache"] = f"error: {e}"
        checks["status"] = "degraded"
        http_status = 503

    return JsonResponse(checks, status=http_status)


# Importar el admin site personalizado de NERBIS
from core.admin_settings_views import (
    AdminAIGenerationLogListView,
    AdminAIModelConfigDetailView,
    AdminAIModelConfigListView,
    AdminAIStatsView,
    AdminIndustryDetailView,
    AdminIndustryGalleryViewSet,
    AdminIndustryListCreateView,
    AdminIndustryPromoteView,
    AdminMarketingSectionDetailView,
    AdminMarketingSectionListView,
    AdminMarketingSectionResetView,
    AdminOnboardingQuestionDetailView,
    AdminOnboardingQuestionListCreateView,
    AdminPlatformModuleDetailView,
    AdminPlatformModuleListCreateView,
    AdminPromptBlockDetailView,
    AdminPromptBlockListCreateView,
    AdminPromptPreviewView,
    AdminSectionVariantDetailView,
    AdminSectionVariantListCreateView,
    AdminWebsitePageDetailView,
    AdminWebsitePageListCreateView,
    AdminWebsiteSectionDetailView,
    AdminWebsiteSectionListCreateView,
)
from core.admin_site import nerbis_admin_site
from core.admin_tenant_views import (
    AdminDeletePasskeyView,
    AdminDisable2FAView,
    AdminResetAIUsageView,
    AdminResetOnboardingView,
    AdminResetPasswordView,
    AdminRestoreTenantView,
    AdminSetPhaseView,
    AdminTenantDetailView,
    AdminTenantListView,
    AdminTenantPhaseLogView,
    AdminTenantUsersListView,
    AdminUnlinkSocialView,
    AdminUserDetailView,
)
from core.admin_views import (
    AdminAuditLogListView,
    AdminBlockSuperadminView,
    AdminChangeRoleView,
    AdminLoginView,
    AdminLogoutView,
    AdminMeView,
    AdminRegisterView,
    AdminSuperadminDetailView,
    AdminSuperadminListView,
    AdminTokenRefreshView,
    AdminUnblockSuperadminView,
)
from core.views import (
    AcceptInvitationView,
    CheckBusinessNameView,
    CheckTenantEmailView,
    InvitationDetailView,
    PlatformForgotPasswordView,
    PlatformLoginView,
    PlatformSocialLoginView,
    PlatformVerifyResetOTPView,
    PublicIndustryGalleryView,
    PublicMarketingSectionsView,
    TenantRegisterView,
    subscription_expired_view,
)
from orders.webhooks import stripe_webhook
from websites.views import PublicSiteView

# Router para ViewSets de admin settings
admin_settings_router = DefaultRouter(trailing_slash=True)
admin_settings_router.register(
    r"industry-gallery",
    AdminIndustryGalleryViewSet,
    basename="admin-settings-industry-gallery",
)

urlpatterns = [
    # Health check (para ALB/ECS)
    path("health/", health_check, name="health-check"),
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
                path("v1/billing/", include("billing.urls")),
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
    # Marketing sections (público, sin tenant)
    path(
        "api/public/marketing-sections/",
        PublicMarketingSectionsView.as_view(),
        name="public-marketing-sections",
    ),
    # Industry gallery (público, sin tenant)
    path(
        "api/public/industry-gallery/",
        PublicIndustryGalleryView.as_view(),
        name="public-industry-gallery",
    ),
    # Public site serving
    path("api/public/sites/<str:slug>/", PublicSiteView.as_view(), name="public-site"),
    # Invitaciones de equipo (públicas)
    path("api/public/invitation/<str:token>/", InvitationDetailView.as_view(), name="invitation-detail"),
    path("api/public/accept-invitation/<str:token>/", AcceptInvitationView.as_view(), name="accept-invitation"),
    # NERBIS Admin (superadmin de plataforma — sin middleware de tenant)
    path("api/admin/auth/login/", AdminLoginView.as_view(), name="admin-login"),
    path("api/admin/auth/register/", AdminRegisterView.as_view(), name="admin-register"),
    path("api/admin/auth/me/", AdminMeView.as_view(), name="admin-me"),
    path("api/admin/auth/logout/", AdminLogoutView.as_view(), name="admin-logout"),
    path("api/admin/auth/refresh/", AdminTokenRefreshView.as_view(), name="admin-token-refresh"),
    path("api/admin/superadmins/", AdminSuperadminListView.as_view(), name="admin-superadmins-list"),
    path(
        "api/admin/superadmins/<int:pk>/",
        AdminSuperadminDetailView.as_view(),
        name="admin-superadmins-detail",
    ),
    path(
        "api/admin/superadmins/<int:pk>/block/",
        AdminBlockSuperadminView.as_view(),
        name="admin-superadmins-block",
    ),
    path(
        "api/admin/superadmins/<int:pk>/unblock/",
        AdminUnblockSuperadminView.as_view(),
        name="admin-superadmins-unblock",
    ),
    path(
        "api/admin/superadmins/<int:pk>/role/",
        AdminChangeRoleView.as_view(),
        name="admin-superadmins-role",
    ),
    path("api/admin/audit-log/", AdminAuditLogListView.as_view(), name="admin-audit-log"),
    path("api/admin/tenants/", AdminTenantListView.as_view(), name="admin-tenants-list"),
    path(
        "api/admin/tenants/<uuid:pk>/",
        AdminTenantDetailView.as_view(),
        name="admin-tenants-detail",
    ),
    path(
        "api/admin/tenants/<uuid:pk>/restore/",
        AdminRestoreTenantView.as_view(),
        name="admin-tenant-restore",
    ),
    path(
        "api/admin/tenants/<uuid:pk>/users/",
        AdminTenantUsersListView.as_view(),
        name="admin-tenant-users-list",
    ),
    path(
        "api/admin/tenants/<uuid:pk>/reset-onboarding/",
        AdminResetOnboardingView.as_view(),
        name="admin-tenant-reset-onboarding",
    ),
    path(
        "api/admin/tenants/<uuid:pk>/reset-ai-usage/",
        AdminResetAIUsageView.as_view(),
        name="admin-tenant-reset-ai-usage",
    ),
    path(
        "api/admin/tenants/<uuid:pk>/set-phase/",
        AdminSetPhaseView.as_view(),
        name="admin-tenant-set-phase",
    ),
    path(
        "api/admin/tenants/<uuid:pk>/phase-log/",
        AdminTenantPhaseLogView.as_view(),
        name="admin-tenant-phase-log",
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
    # Admin settings — catálogos globales de plataforma
    path(
        "api/admin/settings/modules/", AdminPlatformModuleListCreateView.as_view(), name="admin-settings-modules-list"
    ),
    path(
        "api/admin/settings/modules/<int:pk>/",
        AdminPlatformModuleDetailView.as_view(),
        name="admin-settings-modules-detail",
    ),
    path("api/admin/settings/pages/", AdminWebsitePageListCreateView.as_view(), name="admin-settings-pages-list"),
    path(
        "api/admin/settings/pages/<int:pk>/",
        AdminWebsitePageDetailView.as_view(),
        name="admin-settings-pages-detail",
    ),
    path(
        "api/admin/settings/questions/",
        AdminOnboardingQuestionListCreateView.as_view(),
        name="admin-settings-questions-list",
    ),
    path(
        "api/admin/settings/questions/<int:pk>/",
        AdminOnboardingQuestionDetailView.as_view(),
        name="admin-settings-questions-detail",
    ),
    path(
        "api/admin/settings/sections/",
        AdminWebsiteSectionListCreateView.as_view(),
        name="admin-settings-sections-list",
    ),
    path(
        "api/admin/settings/sections/<int:pk>/",
        AdminWebsiteSectionDetailView.as_view(),
        name="admin-settings-sections-detail",
    ),
    path(
        "api/admin/settings/marketing/",
        AdminMarketingSectionListView.as_view(),
        name="admin-settings-marketing-list",
    ),
    path(
        "api/admin/settings/marketing/<str:section_key>/",
        AdminMarketingSectionDetailView.as_view(),
        name="admin-settings-marketing-detail",
    ),
    path(
        "api/admin/settings/marketing/<str:section_key>/reset/",
        AdminMarketingSectionResetView.as_view(),
        name="admin-settings-marketing-reset",
    ),
    # Admin settings — section variants
    path(
        "api/admin/settings/variants/",
        AdminSectionVariantListCreateView.as_view(),
        name="admin-settings-variants-list",
    ),
    path(
        "api/admin/settings/variants/<int:pk>/",
        AdminSectionVariantDetailView.as_view(),
        name="admin-settings-variants-detail",
    ),
    # Admin settings — prompt blocks
    path(
        "api/admin/settings/prompt-blocks/",
        AdminPromptBlockListCreateView.as_view(),
        name="admin-settings-prompt-blocks-list",
    ),
    path(
        "api/admin/settings/prompt-blocks/<int:pk>/",
        AdminPromptBlockDetailView.as_view(),
        name="admin-settings-prompt-blocks-detail",
    ),
    # Admin settings — prompt preview
    path(
        "api/admin/settings/prompt-preview/",
        AdminPromptPreviewView.as_view(),
        name="admin-settings-prompt-preview",
    ),
    # Admin settings — industries (catálogo global)
    path(
        "api/admin/settings/industries/",
        AdminIndustryListCreateView.as_view(),
        name="admin-settings-industries-list",
    ),
    path(
        "api/admin/settings/industries/<int:pk>/",
        AdminIndustryDetailView.as_view(),
        name="admin-settings-industries-detail",
    ),
    path(
        "api/admin/settings/industries/<int:pk>/promote/",
        AdminIndustryPromoteView.as_view(),
        name="admin-settings-industries-promote",
    ),
    # Admin settings — AI model config por tarea
    path(
        "api/admin/settings/ai-models/",
        AdminAIModelConfigListView.as_view(),
        name="admin-settings-ai-models-list",
    ),
    path(
        "api/admin/settings/ai-models/<int:pk>/",
        AdminAIModelConfigDetailView.as_view(),
        name="admin-settings-ai-models-detail",
    ),
    # Admin settings — AI stats (agregación read-only de AIGenerationLog)
    path(
        "api/admin/settings/ai-stats/",
        AdminAIStatsView.as_view(),
        name="admin-settings-ai-stats",
    ),
    # Admin settings — AI logs (detalle paginado de AIGenerationLog)
    path(
        "api/admin/settings/ai-logs/",
        AdminAIGenerationLogListView.as_view(),
        name="admin-settings-ai-logs",
    ),
    # Admin settings — industry gallery (ViewSet via router)
    path("api/admin/settings/", include(admin_settings_router.urls)),
    # Webhooks (sin middleware de tenant)
    path("api/webhooks/stripe/", stripe_webhook, name="stripe-webhook"),
    # Documentación
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

# Media files
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
