"""
Management Command: seed_industry_gallery
==========================================

Crea (o resetea) las cards de la galeria de industrias del landing de NERBIS.

Uso:
    python manage.py seed_industry_gallery          # solo crea si no existe
    python manage.py seed_industry_gallery --force   # sobreescribe todo

Es idempotente: si ya existen cards y no se usa --force, no hace nada.
Con --force, elimina todas las cards existentes y recrea desde cero.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import IndustryGalleryCard

INDUSTRY_GALLERY_DEFAULTS: list[dict] = [
    # Row 1
    {
        "name": "Tiendas online",
        "gradient": "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        "row": 1,
        "sort_order": 0,
    },
    {
        "name": "Restaurantes",
        "gradient": "linear-gradient(135deg, #4a1942 0%, #6b2d5b 50%, #d63031 100%)",
        "row": 1,
        "sort_order": 1,
    },
    {
        "name": "Salones de belleza",
        "gradient": "linear-gradient(135deg, #c6a0a0 0%, #e8c4c4 50%, #f5e6cc 100%)",
        "row": 1,
        "sort_order": 2,
    },
    {
        "name": "Gimnasios",
        "gradient": "linear-gradient(135deg, #0d2137 0%, #1b4332 50%, #2d6a4f 100%)",
        "row": 1,
        "sort_order": 3,
    },
    {
        "name": "Coaches",
        "gradient": "linear-gradient(135deg, #2c3e50 0%, #3498db 50%, #2980b9 100%)",
        "row": 1,
        "sort_order": 4,
    },
    {
        "name": "Cafeterias",
        "gradient": "linear-gradient(135deg, #3e2723 0%, #5d4037 50%, #8d6e63 100%)",
        "row": 1,
        "sort_order": 5,
    },
    # Row 2
    {
        "name": "Portafolios",
        "gradient": "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2d2d2d 100%)",
        "row": 2,
        "sort_order": 0,
    },
    {
        "name": "Blogs",
        "gradient": "linear-gradient(135deg, #1d3557 0%, #457b9d 50%, #a8dadc 100%)",
        "row": 2,
        "sort_order": 1,
    },
    {
        "name": "Consultorios",
        "gradient": "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)",
        "row": 2,
        "sort_order": 2,
    },
    {
        "name": "Estudios creativos",
        "gradient": "linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)",
        "row": 2,
        "sort_order": 3,
    },
    {
        "name": "Agencias",
        "gradient": "linear-gradient(135deg, #141e30 0%, #243b55 50%, #141e30 100%)",
        "row": 2,
        "sort_order": 4,
    },
    {
        "name": "Fotografos",
        "gradient": "linear-gradient(135deg, #2c2c2c 0%, #3d3d3d 50%, #1a1a1a 100%)",
        "row": 2,
        "sort_order": 5,
    },
]


class Command(BaseCommand):
    help = "Crea las cards de la galeria de industrias con datos por defecto"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Elimina las cards existentes y recrea desde cero",
        )

    def handle(self, *args, **options):
        force: bool = options["force"]
        existing_count = IndustryGalleryCard.objects.count()

        if existing_count > 0 and not force:
            self.stdout.write(
                self.style.WARNING(f"Ya existen {existing_count} cards de industria. Usa --force para sobreescribir.")
            )
            return

        cards = [IndustryGalleryCard(**data) for data in INDUSTRY_GALLERY_DEFAULTS]

        with transaction.atomic():
            if force and existing_count > 0:
                IndustryGalleryCard.objects.all().delete()
                self.stdout.write(self.style.WARNING(f"  ~ {existing_count} cards eliminadas (--force)"))
            IndustryGalleryCard.objects.bulk_create(cards)

        self.stdout.write("")
        for card in cards:
            self.stdout.write(self.style.SUCCESS(f"  + {card.name} (fila {card.row}, orden {card.sort_order})"))

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Listo: {len(cards)} cards de industria creadas."))
