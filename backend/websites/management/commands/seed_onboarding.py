from django.core.management.base import BaseCommand

from core.models import PlatformModule
from websites.models import WebsitePage


class Command(BaseCommand):
    help = "Seed onboarding configuration data (modules and pages)"

    def handle(self, *args, **options):
        self._seed_modules()
        self._seed_pages()
        self._link_pages_to_modules()
        self.stdout.write(self.style.SUCCESS("Onboarding seed data complete!"))

    def _seed_modules(self):
        modules_data = [
            {
                "key": "has_website",
                "label": "Sitio Web",
                "description": "Tu presencia online",
                "icon": "globe",
                "accent_color": "#1C3B57",
                "sort_order": 0,
            },
            {
                "key": "has_services",
                "label": "Servicios",
                "description": "Muestra y vende tus servicios",
                "icon": "briefcase",
                "accent_color": "#8b5cf6",
                "sort_order": 1,
            },
            {
                "key": "has_bookings",
                "label": "Reservas",
                "description": "Agenda de citas online",
                "icon": "calendar-check",
                "accent_color": "#6366f1",
                "sort_order": 2,
            },
            {
                "key": "has_shop",
                "label": "Tienda Online",
                "description": "Vende productos 24/7",
                "icon": "shopping-cart",
                "accent_color": "#10b981",
                "sort_order": 3,
            },
        ]

        created_modules = {}
        for data in modules_data:
            obj, created = PlatformModule.objects.update_or_create(
                key=data["key"],
                defaults=data,
            )
            created_modules[data["key"]] = obj
            status = "Created" if created else "Updated"
            self.stdout.write(f"  {status} module: {obj.label}")

        # All non-website modules depend on website
        website = created_modules["has_website"]
        for key, mod in created_modules.items():
            if key != "has_website":
                mod.dependencies.add(website)

    def _seed_pages(self):
        pages_data = [
            {
                "key": "home",
                "label": "Inicio",
                "description": "Pagina principal",
                "icon": "home",
                "is_mandatory": True,
                "is_default": True,
                "sort_order": 0,
            },
            {
                "key": "contact",
                "label": "Contacto",
                "description": "Formulario de contacto",
                "icon": "mail",
                "is_mandatory": True,
                "is_default": True,
                "sort_order": 1,
            },
            {
                "key": "about",
                "label": "Sobre nosotros",
                "description": "Tu historia",
                "icon": "users",
                "is_mandatory": False,
                "is_default": True,
                "sort_order": 2,
            },
            {
                "key": "services",
                "label": "Servicios",
                "description": "Listado de servicios",
                "icon": "briefcase",
                "is_mandatory": False,
                "is_default": False,
                "sort_order": 3,
            },
            {
                "key": "products",
                "label": "Catalogo",
                "description": "Tus productos",
                "icon": "shopping-bag",
                "is_mandatory": False,
                "is_default": False,
                "sort_order": 4,
            },
            {
                "key": "bookings",
                "label": "Reservas",
                "description": "Agendar citas",
                "icon": "calendar",
                "is_mandatory": False,
                "is_default": False,
                "sort_order": 5,
            },
            {
                "key": "blog",
                "label": "Blog",
                "description": "Articulos y noticias",
                "icon": "file-text",
                "is_mandatory": False,
                "is_default": False,
                "sort_order": 6,
            },
        ]

        for data in pages_data:
            obj, created = WebsitePage.objects.update_or_create(
                key=data["key"],
                defaults=data,
            )
            status = "Created" if created else "Updated"
            self.stdout.write(f"  {status} page: {obj.label}")

    def _link_pages_to_modules(self):
        modules = {m.key: m for m in PlatformModule.objects.all()}
        pages = {p.key: p for p in WebsitePage.objects.all()}

        links = {
            "services": "has_services",
            "products": "has_shop",
            "bookings": "has_bookings",
        }

        for page_key, module_key in links.items():
            if page_key in pages and module_key in modules:
                pages[page_key].auto_include_modules.add(modules[module_key])
                self.stdout.write(f"  Linked page '{page_key}' -> module '{module_key}'")
