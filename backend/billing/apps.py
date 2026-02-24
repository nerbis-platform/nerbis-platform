from django.apps import AppConfig


class BillingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'billing'
    verbose_name = 'Facturación'

    def ready(self):
        """Cargar signals cuando la app esté lista."""
        import billing.signals  # noqa: F401
