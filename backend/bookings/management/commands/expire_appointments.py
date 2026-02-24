# backend/bookings/management/commands/expire_appointments.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from bookings.models import Appointment


class Command(BaseCommand):
    help = "Expira reservas pendientes que superaron su TTL"

    def handle(self, *args, **options):
        now = timezone.now()
        expired_qs = Appointment.objects.filter(
            status="pending",
            expires_at__isnull=False,
            expires_at__lte=now,
        )

        updated = expired_qs.update(
            status="expired",
            cancelled_at=now,
            cancellation_reason="Reserva expirada por TTL",
        )

        self.stdout.write(self.style.SUCCESS(f"Reservas expiradas: {updated}"))
