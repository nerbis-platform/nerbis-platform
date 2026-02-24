# backend/config/__init__.py

# Asegurar que Celery se carga cuando Django inicia
from .celery import app as celery_app

__all__ = ("celery_app",)
