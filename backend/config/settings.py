import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar variables de ambiente
load_dotenv(os.path.join(BASE_DIR, ".env"))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-default-key-solo-desarrollo")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "False") == "True"

if not DEBUG and SECRET_KEY == "django-insecure-default-key-solo-desarrollo":
    raise ValueError("SECRET_KEY no está configurada. Configura la variable de entorno SECRET_KEY en producción.")

# Desarrollo: localhost
# Producción: agrega tus dominios via variable de entorno
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# CSRF Configuration
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Producción: agrega via variable de entorno
# Ejemplo: CSRF_TRUSTED_ORIGINS=https://api.nerbis.com,https://app.nerbis.com
_csrf_env = os.getenv("CSRF_TRUSTED_ORIGINS", "")
if _csrf_env:
    CSRF_TRUSTED_ORIGINS += [o.strip() for o in _csrf_env.split(",") if o.strip()]

# Google Maps API Key (for website builder map embeds)
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Session Configuration
SESSION_ENGINE = "django.contrib.sessions.backends.db"  # Guardar sesiones en DB
SESSION_COOKIE_AGE = 86400 * 7  # 7 días
SESSION_COOKIE_HTTPONLY = True
SESSION_SAVE_EVERY_REQUEST = True  # Refrescar sesión en cada request


# Application definition

INSTALLED_APPS = [
    # Unfold admin (debe ir antes de django.contrib.admin)
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    # Django core
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party apps
    "rest_framework",
    "corsheaders",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "drf_spectacular",
    "django_celery_beat",
    # Local apps
    "core",
    "billing",
    "ecommerce",
    "services",
    "bookings",
    "subscriptions",
    "cart",
    "orders",
    "notifications",
    "promotions",
    "coupons",
    "reviews",
    "websites",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # ===================================
    # MIDDLEWARES PERSONALIZADOS
    # ===================================
    # Timezone: superusers ven hora Colombia, tenants ven su hora configurada
    "core.middleware.TimezoneMiddleware",
    "middleware.tenant.TenantExclusionMiddleware",
    "middleware.tenant.TenantMiddleware",
    # Verificacion de suscripcion del tenant (debe ir despues de auth)
    "core.middleware.SubscriptionMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            BASE_DIR / "core" / "templates",  # Templates personalizados (admin login multi-tenant)
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    "default": dj_database_url.config(
        default="sqlite:///db.sqlite3",
        conn_max_age=600,
    )
}

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",  # noqa: E501
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",  # noqa: E501
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",  # noqa: E501
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",  # noqa: E501
    },
]

# ===================================
# USER MODEL PERSONALIZADO
# ===================================
AUTH_USER_MODEL = "core.User"

# ===================================
# AUTHENTICATION BACKENDS
# ===================================
# Usar nuestro backend personalizado para autenticación multi-tenant
# Permite que el mismo email exista en múltiples tenants
AUTHENTICATION_BACKENDS = [
    "core.backends.TenantEmailBackend",
    "django.contrib.auth.backends.ModelBackend",  # Fallback para admin
]

# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "es-co"

TIME_ZONE = "America/Bogota"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [
    BASE_DIR / "static",  # Archivos estáticos globales
]

# Media files (user uploads)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# CORS settings
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Solo en desarrollo
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Producción: agrega via variable de entorno
# Ejemplo: CORS_ALLOWED_ORIGINS=https://app.nerbis.com,https://nerbis.com
_cors_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
if _cors_env:
    CORS_ALLOWED_ORIGINS += [o.strip() for o in _cors_env.split(",") if o.strip()]
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-tenant-slug",
]


# backend/config/settings.py (al final)

# ===================================
# LOGGING
# ===================================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{levelname}] {asctime} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        # Desarrollo: INFO, Producción: WARNING
        "level": os.getenv("LOG_LEVEL", "WARNING" if not DEBUG else "INFO"),
    },
    "loggers": {
        "core.middleware": {
            "handlers": ["console"],
            "level": "WARNING",  # Solo errores/warnings
            "propagate": False,
        },
        "core.admin_site": {
            "handlers": ["console"],
            "level": "WARNING",  # Solo errores/warnings
            "propagate": False,
        },
        "middleware.tenant": {
            "handlers": ["console"],
            "level": "WARNING",  # Solo errores/warnings
            "propagate": False,
        },
        "django.contrib.auth": {
            "handlers": ["console"],
            "level": "DEBUG",
        },
        "cart": {
            "handlers": ["console"],
            "level": "DEBUG",
        },
        "cart.views": {
            "handlers": ["console"],
            "level": "DEBUG",
        },
    },
}


# ===================================
# REST FRAMEWORK CONFIGURATION
# ===================================
REST_FRAMEWORK = {
    # Autenticación
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    # Permisos por defecto
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    # Paginación
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    # Filtros
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    # Formato de respuestas
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    # Documentación
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # Rate Limiting (throttling)
    "DEFAULT_THROTTLE_HANDLERS": {
        "THROTTLED_CACHE": "throttle",
    },
    "DEFAULT_THROTTLE_RATES": {
        "login": "5/min",  # Login: 5 intentos por minuto por IP
        "register": "3/min",  # Registro: 3 por minuto por IP
        "otp_request": "3/min",  # Solicitar OTP: 3 por minuto por IP
        "otp_verify": "5/min",  # Verificar OTP: 5 por minuto por IP
        "password_reset": "3/min",  # Reset password: 3 por minuto por IP
        "social_login": "5/min",  # Social login: 5 por minuto por IP
    },
}

# ===================================
# SIMPLE JWT CONFIGURATION
# ===================================
from datetime import timedelta

SIMPLE_JWT = {
    # Tiempo de vida de los tokens
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # Rotación de tokens
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    # Configuración
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# ===================================
# DRF SPECTACULAR (Documentación)
# ===================================
SPECTACULAR_SETTINGS = {
    "TITLE": "Ecosistema Digital Multi-Tenant API",
    "DESCRIPTION": "API REST para plataforma SaaS de centros de estética",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ===================================
# EMAIL CONFIGURATION
# ===================================
# En desarrollo, usamos console backend (imprime emails en consola)
# En producción, configurar SMTP real
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@nerbis.com")
DEFAULT_FROM_NAME = os.getenv("DEFAULT_FROM_NAME", "Nerbis")

# URL base del frontend (para links en emails)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

if not DEBUG and FRONTEND_URL == "http://localhost:3000":
    raise RuntimeError(
        "FRONTEND_URL no está configurado en producción. "
        "Define la variable de entorno FRONTEND_URL con la URL pública del frontend."
    )

# Dominio base de la plataforma (para subdominios de tenants/websites)
PLATFORM_BASE_DOMAIN = os.getenv("PLATFORM_BASE_DOMAIN", "nerbis.com")


# ===================================
# STRIPE CONFIGURATION
# ===================================

# Claves de Stripe desde .env
STRIPE_PUBLIC_KEY = os.getenv("STRIPE_PUBLIC_KEY", "")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

if not STRIPE_SECRET_KEY:
    print("⚠️  WARNING: STRIPE_SECRET_KEY no está configurada")

# Configuración de moneda y país
STRIPE_CURRENCY = "eur"  # Euro (España)
STRIPE_COUNTRY = "ES"

# IVA España
TAX_RATE = 0.21  # 21% IVA

# ===================================
# BOOKINGS
# ===================================
BOOKING_HOLD_MINUTES = int(os.getenv("BOOKING_HOLD_MINUTES", "15"))


# ===================================
# CACHE CONFIGURATION (Redis — compartido con Celery)
# ===================================
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    },
    "throttle": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "throttle-cache",
    },
}

# En producción usar Redis (descomentar si redis-cache está disponible):
# CACHES = {
#     "default": {
#         "BACKEND": "django.core.cache.backends.redis.RedisCache",
#         "LOCATION": os.getenv("REDIS_URL", "redis://redis:6379/1"),
#     },
# }

# ===================================
# CELERY CONFIGURATION
# ===================================
CELERY_BROKER_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = os.getenv("REDIS_URL", "redis://redis:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Europe/Madrid"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutos


# ===================================
# TWILIO CONFIGURATION (WhatsApp/SMS)
# ===================================
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")  # Sandbox por defecto
TWILIO_SMS_FROM = os.getenv("TWILIO_SMS_FROM", "")

# Activar/desactivar Twilio
TWILIO_ENABLED = os.getenv("TWILIO_ENABLED", "False") == "True"

# ===================================
# ANTHROPIC (IA para Website Builder)
# ===================================
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307")
ANTHROPIC_PRICE_INPUT = os.getenv("ANTHROPIC_PRICE_INPUT", "0.25")  # USD por 1M tokens
ANTHROPIC_PRICE_OUTPUT = os.getenv("ANTHROPIC_PRICE_OUTPUT", "1.25")  # USD por 1M tokens

# ===================================
# UNSPLASH (Stock images para Website Builder)
# ===================================
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "")

# ===================================
# OAUTH / SOCIAL AUTH
# ===================================
GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")
APPLE_CLIENT_ID = os.getenv("APPLE_CLIENT_ID", "")
APPLE_TEAM_ID = os.getenv("APPLE_TEAM_ID", "")
FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")

# ===================================
# UNFOLD ADMIN CONFIGURATION
# ===================================
from django.templatetags.static import static
from django.urls import reverse_lazy


def can_view_tenants(request):
    """Mostrar el item de Tenants solo a superusuarios."""
    return request.user.is_superuser


def can_view_shop(request):
    """Mostrar Shop solo si el tenant tiene has_shop=True."""
    user = request.user
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    tenant = getattr(user, "tenant", None)
    return tenant and tenant.has_shop


def can_view_bookings(request):
    """Mostrar Bookings solo si el tenant tiene has_bookings=True."""
    user = request.user
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    tenant = getattr(user, "tenant", None)
    return tenant and tenant.has_bookings


def can_view_services(request):
    """Mostrar Services solo si el tenant tiene has_services=True."""
    user = request.user
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    tenant = getattr(user, "tenant", None)
    return tenant and tenant.has_services


def can_view_marketing(request):
    """Mostrar Marketing solo si el tenant tiene has_marketing=True."""
    user = request.user
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    tenant = getattr(user, "tenant", None)
    return tenant and tenant.has_marketing


UNFOLD = {
    "SITE_TITLE": "Panel de Administración",
    "SITE_HEADER": "Mi Negocio",  # Se puede personalizar por tenant
    "SITE_SYMBOL": "storefront",  # Material icon para negocios
    "SEARCH_PLACEHOLDER": "Buscar...",  # Placeholder en español sin el "/"
    "SITE_LOGO": {
        "light": lambda request: static("branding/logo_tenant_light.png"),  # Logo claro
        "dark": lambda request: static("branding/logo_tenant_dark.png"),  # Logo oscuro
    },
    "SITE_FAVICONS": [
        {
            "rel": "icon",
            "sizes": "32x32",
            "type": "image/png",
            "href": lambda request: static("branding/favicon.png"),
        },
    ],
    # CSS personalizado para ocultar el icono del ojo (view) en ForeignKeys
    "STYLES": [
        lambda request: static("admin/css/custom_admin.css"),
    ],
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": False,  # Ocultar "Ver en sitio" para no exponer URLs
    "ENVIRONMENT": "core.dashboard.environment_callback",
    "DASHBOARD_CALLBACK": "core.dashboard.dashboard_callback",
    "COLORS": {
        "primary": {
            "50": "240 253 250",
            "100": "204 251 241",
            "200": "153 246 228",
            "300": "94 234 212",
            "400": "45 212 191",
            "500": "149 208 201",
            "600": "13 148 136",
            "700": "15 118 110",
            "800": "17 94 89",
            "900": "20 78 74",
            "950": "4 47 46",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": False,  # Usamos navegación personalizada
        "navigation": [
            # ═══════════════════════════════════════
            # INICIO (link directo al Dashboard)
            # ═══════════════════════════════════════
            {
                "title": "Inicio",
                "items": [
                    {
                        "title": "Dashboard",
                        "icon": "dashboard",
                        "link": reverse_lazy("admin:index"),
                    },
                ],
            },
            # ═══════════════════════════════════════
            # ADMINISTRACIÓN (solo superusers)
            # ═══════════════════════════════════════
            {
                "title": "Administración",
                "icon": "admin_panel_settings",
                "separator": True,
                "collapsible": True,
                "permission": can_view_tenants,
                "items": [
                    {
                        "title": "Clientes",
                        "icon": "business",
                        "link": reverse_lazy("admin:core_tenant_changelist"),
                        "permission": can_view_tenants,
                    },
                    {
                        "title": "Usuarios",
                        "icon": "people",
                        "link": reverse_lazy("admin:core_user_changelist"),
                        "permission": can_view_tenants,
                    },
                    {
                        "title": "Suscripciones",
                        "icon": "card_membership",
                        "link": reverse_lazy("admin:billing_subscription_changelist"),
                        "permission": can_view_tenants,
                    },
                    {
                        "title": "Facturas",
                        "icon": "receipt_long",
                        "link": reverse_lazy("admin:billing_invoice_changelist"),
                        "permission": can_view_tenants,
                    },
                    {
                        "title": "Servicios",
                        "icon": "widgets",
                        "link": reverse_lazy("admin:billing_module_changelist"),
                        "permission": can_view_tenants,
                    },
                ],
            },
            # ═══════════════════════════════════════
            # WEBSITE BUILDER (solo superusers)
            # ═══════════════════════════════════════
            {
                "title": "Website Builder",
                "icon": "web",
                "collapsible": True,
                "permission": can_view_tenants,
                "items": [
                    {
                        "title": "Templates",
                        "icon": "dashboard_customize",
                        "link": reverse_lazy("admin:websites_websitetemplate_changelist"),
                        "permission": can_view_tenants,
                    },
                    {
                        "title": "Preguntas Onboarding",
                        "icon": "quiz",
                        "link": reverse_lazy("admin:websites_onboardingquestion_changelist"),
                        "permission": can_view_tenants,
                    },
                    {
                        "title": "Sitios de Clientes",
                        "icon": "language",
                        "link": reverse_lazy("admin:websites_websiteconfig_changelist"),
                        "permission": can_view_tenants,
                    },
                    {
                        "title": "Logs de IA",
                        "icon": "smart_toy",
                        "link": reverse_lazy("admin:websites_aigenerationlog_changelist"),
                        "permission": can_view_tenants,
                    },
                    {
                        "title": "Respuestas Onboarding",
                        "icon": "fact_check",
                        "link": reverse_lazy("admin:websites_onboardingresponse_changelist"),
                        "permission": can_view_tenants,
                    },
                    {
                        "title": "Chat IA",
                        "icon": "chat",
                        "link": reverse_lazy("admin:websites_chatmessage_changelist"),
                        "permission": can_view_tenants,
                    },
                ],
            },
            # ═══════════════════════════════════════
            # MI NEGOCIO
            # ═══════════════════════════════════════
            {
                "title": "Mi Negocio",
                "icon": "settings",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "Configuración",
                        "icon": "tune",
                        "link": reverse_lazy("admin:core_tenantconfig_changelist"),
                    },
                ],
            },
            # ═══════════════════════════════════════
            # MI WEB
            # ═══════════════════════════════════════
            {
                "title": "Mi Web",
                "icon": "language",
                "collapsible": True,
                "items": [
                    {
                        "title": "Contenido",
                        "icon": "article",
                        "link": reverse_lazy("admin:core_tenantwebsite_changelist"),
                    },
                ],
            },
            # ═══════════════════════════════════════
            # SHOP (si has_shop)
            # ═══════════════════════════════════════
            {
                "title": "Shop",
                "icon": "storefront",
                "collapsible": True,
                "permission": can_view_shop,
                "items": [
                    {
                        "title": "Productos",
                        "icon": "inventory_2",
                        "link": reverse_lazy("admin:ecommerce_product_changelist"),
                        "permission": can_view_shop,
                    },
                    {
                        "title": "Categorías",
                        "icon": "category",
                        "link": reverse_lazy("admin:ecommerce_productcategory_changelist"),
                        "permission": can_view_shop,
                    },
                    {
                        "title": "Inventario",
                        "icon": "warehouse",
                        "link": reverse_lazy("admin:ecommerce_inventory_changelist"),
                        "permission": can_view_shop,
                    },
                ],
            },
            # ═══════════════════════════════════════
            # FACTURACIÓN (si has_shop)
            # ═══════════════════════════════════════
            {
                "title": "Facturación",
                "icon": "receipt",
                "collapsible": True,
                "permission": can_view_shop,
                "items": [
                    {
                        "title": "Órdenes",
                        "icon": "shopping_cart",
                        "link": reverse_lazy("admin:orders_order_changelist"),
                        "permission": can_view_shop,
                    },
                    {
                        "title": "Carritos",
                        "icon": "shopping_basket",
                        "link": reverse_lazy("admin:cart_cart_changelist"),
                        "permission": can_view_shop,
                    },
                ],
            },
            # ═══════════════════════════════════════
            # RESERVAS (si has_bookings)
            # ═══════════════════════════════════════
            {
                "title": "Reservas",
                "icon": "calendar_month",
                "collapsible": True,
                "permission": can_view_bookings,
                "items": [
                    {
                        "title": "Citas",
                        "icon": "event",
                        "link": reverse_lazy("admin:bookings_appointment_changelist"),
                        "permission": can_view_bookings,
                    },
                    {
                        "title": "Servicios",
                        "icon": "spa",
                        "link": reverse_lazy("admin:services_service_changelist"),
                        "permission": can_view_bookings,
                    },
                    {
                        "title": "Categorías",
                        "icon": "folder",
                        "link": reverse_lazy("admin:services_servicecategory_changelist"),
                        "permission": can_view_bookings,
                    },
                    {
                        "title": "Personal",
                        "icon": "badge",
                        "link": reverse_lazy("admin:services_staffmember_changelist"),
                        "permission": can_view_bookings,
                    },
                    {
                        "title": "Horarios",
                        "icon": "schedule",
                        "link": reverse_lazy("admin:bookings_businesshours_changelist"),
                        "permission": can_view_bookings,
                    },
                    {
                        "title": "Días Libres",
                        "icon": "event_busy",
                        "link": reverse_lazy("admin:bookings_timeoff_changelist"),
                        "permission": can_view_bookings,
                    },
                ],
            },
            # ═══════════════════════════════════════
            # PLANES (si has_services)
            # ═══════════════════════════════════════
            {
                "title": "Planes",
                "icon": "layers",
                "collapsible": True,
                "permission": can_view_services,
                "items": [
                    {
                        "title": "Mis Planes",
                        "icon": "layers",
                        "link": reverse_lazy("admin:subscriptions_marketplaceplan_changelist"),
                        "permission": can_view_services,
                    },
                    {
                        "title": "Categorías",
                        "icon": "folder_special",
                        "link": reverse_lazy("admin:subscriptions_marketplacecategory_changelist"),
                        "permission": can_view_services,
                    },
                    {
                        "title": "Contratos",
                        "icon": "description",
                        "link": reverse_lazy("admin:subscriptions_marketplacecontract_changelist"),
                        "permission": can_view_services,
                    },
                ],
            },
            # ═══════════════════════════════════════
            # MARKETING
            # ═══════════════════════════════════════
            {
                "title": "Marketing",
                "icon": "campaign",
                "separator": True,
                "collapsible": True,
                "permission": can_view_marketing,
                "items": [
                    {
                        "title": "Banners",
                        "icon": "image",
                        "link": reverse_lazy("admin:core_banner_changelist"),
                        "permission": can_view_marketing,
                    },
                    {
                        "title": "Promociones",
                        "icon": "local_offer",
                        "link": reverse_lazy("admin:promotions_promotion_changelist"),
                        "permission": can_view_marketing,
                    },
                    {
                        "title": "Cupones",
                        "icon": "confirmation_number",
                        "link": reverse_lazy("admin:coupons_coupon_changelist"),
                        "permission": can_view_marketing,
                    },
                    {
                        "title": "Reseñas",
                        "icon": "star",
                        "link": reverse_lazy("admin:reviews_review_changelist"),
                        "permission": can_view_marketing,
                    },
                ],
            },
        ],
    },
}
