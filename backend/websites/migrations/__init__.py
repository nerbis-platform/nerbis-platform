"""websites.migrations — paquete de migraciones.

Expone ``_load_0028`` como helper de test: devuelve dos callables
``(add_pages, remove_pages)`` que aceptan directamente el modelo
``WebsitePage`` y delegan en las funciones reales de la migración
``0028_add_elective_pages``. Esto permite a los tests ejercitar el código de
migración real (idempotencia forward + reverse acotado) sin construir un
``MigrationExecutor`` completo.
"""

import importlib


def _load_0028():
    """Devuelve (add_pages, remove_pages) ligados a un modelo WebsitePage.

    Las funciones reales de la migración toman ``(apps, schema_editor)`` y
    resuelven el modelo vía ``apps.get_model``. Aquí las envolvemos con un
    ``apps`` falso que devuelve el modelo recibido, de modo que el test pueda
    llamarlas como ``add_pages(WebsitePage)`` / ``remove_pages(WebsitePage)``.
    """
    module = importlib.import_module(
        "websites.migrations.0028_add_elective_pages"
    )

    class _FakeApps:
        def __init__(self, model):
            self._model = model

        def get_model(self, app_label, model_name):  # noqa: ARG002
            return self._model

    def add_pages(website_page_model):
        module.add_elective_pages(_FakeApps(website_page_model), None)

    def remove_pages(website_page_model):
        module.remove_elective_pages(_FakeApps(website_page_model), None)

    return add_pages, remove_pages
