"""
Settings de test — hereda de settings.py y overridea lo necesario.

Uso: DJANGO_SETTINGS_MODULE=config.settings_test pytest
"""

from .settings import *  # noqa: F401, F403

# ===================================
# DATABASE: usa la misma DB que settings.py
# Si DATABASE_URL está configurado → PostgreSQL
# Si no → SQLite (fallback)
# ===================================

# ===================================
# PASSWORD HASHERS — más rápidos para tests
# ===================================
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# ===================================
# THROTTLING — deshabilitado en tests
# ===================================
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "login": None,
    "register": None,
    "otp_request": None,
    "otp_verify": None,
    "password_reset": None,
    "social_login": None,
}

# ===================================
# EMAIL — no enviar emails reales
# ===================================
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# ===================================
# LOGGING — reducir ruido en tests
# ===================================
LOGGING["root"]["level"] = "WARNING"  # noqa: F405
LOGGING["loggers"] = {}  # noqa: F405

# ===================================
# CELERY — modo síncrono para tests
# ===================================
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
