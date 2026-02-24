# backend/bookings/tasks.py

from celery import shared_task
from django.utils import timezone


@shared_task
def expire_pending_appointments():
    """
    Tarea programada para expirar citas pendientes que superaron su TTL.

    Se ejecuta cada 5 minutos para limpiar reservas temporales que no fueron pagadas.
    """
    from bookings.models import Appointment

    now = timezone.now()

    # Buscar citas pendientes con expires_at vencido
    expired_qs = Appointment.objects.filter(
        status="pending",
        expires_at__isnull=False,
        expires_at__lte=now,
    )

    count = expired_qs.count()

    if count > 0:
        # Actualizar estado a "expired"
        expired_qs.update(
            status="expired",
            cancelled_at=now,
            cancellation_reason="Reserva expirada - tiempo de pago agotado",
        )
        print(f"✅ {count} citas expiradas automáticamente")

    return f"Citas expiradas: {count}"


@shared_task
def expire_single_appointment(appointment_id):
    """
    Tarea para expirar una cita específica después de su TTL.

    Se puede llamar con countdown para ejecutarse después de X minutos.
    Ejemplo: expire_single_appointment.apply_async(args=[appointment.id], countdown=900)
    """
    from bookings.models import Appointment

    try:
        appointment = Appointment.objects.get(id=appointment_id)

        # Solo expirar si sigue en estado pendiente
        if appointment.status == "pending":
            appointment.status = "expired"
            appointment.cancelled_at = timezone.now()
            appointment.cancellation_reason = "Reserva expirada - tiempo de pago agotado"
            appointment.save()
            print(f"✅ Cita {appointment_id} expirada")
            return f"Cita {appointment_id} expirada"
        else:
            print(f"ℹ️ Cita {appointment_id} ya no está pendiente (status: {appointment.status})")
            return f"Cita {appointment_id} ya procesada (status: {appointment.status})"

    except Appointment.DoesNotExist:
        print(f"⚠️ Cita {appointment_id} no encontrada")
        return f"Cita {appointment_id} no encontrada"
