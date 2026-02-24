# backend/config/celery.py

import os
from celery import Celery
from celery.schedules import crontab

# Set default Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("gravprod")

# Load settings from Django
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# Configuración de Celery Beat (tareas programadas)
app.conf.beat_schedule = {
    # Enviar recordatorios de citas cada hora
    "send-appointment-reminders": {
        "task": "notifications.tasks.send_appointment_reminders",
        "schedule": crontab(minute=0),  # Cada hora en punto
    },
    # Expirar citas pendientes no pagadas cada 5 minutos
    "expire-pending-appointments": {
        "task": "bookings.tasks.expire_pending_appointments",
        "schedule": crontab(minute="*/5"),  # Cada 5 minutos
    },
}


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
