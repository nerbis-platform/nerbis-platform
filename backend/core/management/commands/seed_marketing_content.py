"""
Management Command: seed_marketing_content
===========================================

Crea (o resetea) las secciones del sitio de marketing de NERBIS.

Uso:
    python manage.py seed_marketing_content          # solo crea si no existe
    python manage.py seed_marketing_content --force   # sobreescribe todo

Es idempotente: si una seccion ya existe y no se usa --force, se preserva
el contenido editado por el superadmin (solo se crea la fila faltante).
"""

from django.core.management.base import BaseCommand

from core.marketing_defaults import MARKETING_SECTION_DEFAULTS
from core.models import MarketingSection


class Command(BaseCommand):
    help = "Crea las secciones de marketing con contenido por defecto"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Sobreescribe el contenido existente con los defaults",
        )

    def handle(self, *args, **options):
        force: bool = options["force"]
        created_count = 0
        updated_count = 0
        skipped_count = 0

        for default in MARKETING_SECTION_DEFAULTS:
            section_key = default["section_key"]

            existing = MarketingSection.objects.filter(
                section_key=section_key,
            ).first()

            if existing is None:
                # La seccion no existe — crear con defaults
                MarketingSection.objects.create(
                    section_key=section_key,
                    content=default["content"],
                    sort_order=default["sort_order"],
                    is_visible=True,
                )
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  + {section_key} (creada)"))
            elif force:
                # Existe pero --force sobreescribe
                existing.content = default["content"]
                existing.sort_order = default["sort_order"]
                existing.is_visible = True
                existing.save(update_fields=["content", "sort_order", "is_visible", "updated_at"])
                updated_count += 1
                self.stdout.write(self.style.WARNING(f"  ~ {section_key} (actualizada --force)"))
            else:
                # Existe y no forzamos — respetar edits del admin
                skipped_count += 1
                self.stdout.write(f"  - {section_key} (ya existe, sin cambios)")

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Listo: {created_count} creadas, {updated_count} actualizadas, {skipped_count} sin cambios."
            )
        )
