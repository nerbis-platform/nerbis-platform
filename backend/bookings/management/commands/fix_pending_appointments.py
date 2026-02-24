# backend/bookings/management/commands/fix_pending_appointments.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from bookings.models import Appointment


class Command(BaseCommand):
    help = "Establece expires_at en citas pendientes antiguas que no lo tienen"

    def add_arguments(self, parser):
        parser.add_argument(
            "--expire-now",
            action="store_true",
            help="Establecer expires_at en el pasado para que expiren inmediatamente",
        )
        parser.add_argument(
            "--minutes",
            type=int,
            default=15,
            help="Minutos de gracia antes de expirar (default: 15)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Solo mostrar qué se haría, sin hacer cambios",
        )

    def handle(self, *args, **options):
        expire_now = options["expire_now"]
        minutes = options["minutes"]
        dry_run = options["dry_run"]

        # Buscar citas pendientes sin expires_at
        pending_without_expiry = Appointment.objects.filter(
            status="pending",
            expires_at__isnull=True,
        )

        count = pending_without_expiry.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("No hay citas pendientes sin expires_at"))
            return

        self.stdout.write(f"Encontradas {count} citas pendientes sin expires_at:")

        for appointment in pending_without_expiry:
            self.stdout.write(
                f"  - ID: {appointment.id} | Cliente: {appointment.customer.email} | "
                f"Servicio: {appointment.service.name} | Fecha: {appointment.start_datetime}"
            )

        if dry_run:
            self.stdout.write(self.style.WARNING("\n[DRY RUN] No se realizaron cambios"))
            return

        # Calcular nuevo expires_at
        if expire_now:
            new_expires_at = timezone.now() - timedelta(minutes=1)  # Ya expirado
            self.stdout.write(f"\nEstableciendo expires_at en el pasado (expirarán inmediatamente)...")
        else:
            new_expires_at = timezone.now() + timedelta(minutes=minutes)
            self.stdout.write(f"\nEstableciendo expires_at en {minutes} minutos desde ahora...")

        # Actualizar
        updated = pending_without_expiry.update(expires_at=new_expires_at)

        self.stdout.write(self.style.SUCCESS(f"\n✅ {updated} citas actualizadas con expires_at"))

        if expire_now:
            self.stdout.write(
                self.style.WARNING(
                    "Las citas serán marcadas como 'expiradas' en la próxima ejecución de Celery Beat "
                    "(cada 5 minutos) o puedes ejecutar: python manage.py expire_appointments"
                )
            )
