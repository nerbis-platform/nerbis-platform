from datetime import datetime, time, timedelta
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.utils import timezone

from bookings.models import Appointment, BusinessHours, TimeOff
from core.test_base import TenantAwareTestCase
from services.models import Service, ServiceCategory, StaffMember


def _next_weekday(days_ahead: int = 3, hour: int = 10, minute: int = 0):
    """Retorna un datetime futuro timezone-aware en día de semana (lun-vie).

    La hora se interpreta como hora local del servidor (TIME_ZONE de settings).
    """
    dt = timezone.now() + timedelta(days=days_ahead)
    while dt.weekday() >= 5:
        dt += timedelta(days=1)
    naive = datetime.combine(dt.date(), time(hour, minute))
    return timezone.make_aware(naive)


def _next_saturday():
    """Retorna el próximo sábado a las 10:00 (hora local)."""
    dt = timezone.now() + timedelta(days=3)
    while dt.weekday() != 5:
        dt += timedelta(days=1)
    naive = datetime.combine(dt.date(), time(10, 0))
    return timezone.make_aware(naive)


class BookingsTestMixin:
    """Datos compartidos para todos los tests de bookings."""

    def setUp(self):
        super().setUp()
        # Desconectar signal de billing que requiere suscripción activa
        from django.db.models.signals import post_save

        from billing.signals import track_appointment_usage

        post_save.disconnect(track_appointment_usage, sender=Appointment)
        self.addCleanup(post_save.connect, track_appointment_usage, sender=Appointment)

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        from core.models import User

        cls.staff_user = User.objects.create_user(
            email="staff@test.com",
            password="Staff123!",
            username="staff_test",
            first_name="Staff",
            last_name="Member",
            tenant=cls.tenant,
            role="staff",
        )
        cls.staff_member = StaffMember.objects.create(
            tenant=cls.tenant,
            user=cls.staff_user,
            position="Esteticista",
            is_available=True,
        )

        cls.category = ServiceCategory.objects.create(
            tenant=cls.tenant,
            name="Tratamientos Faciales",
            slug="tratamientos-faciales",
            is_active=True,
        )
        cls.service = Service.objects.create(
            tenant=cls.tenant,
            name="Limpieza Facial",
            slug="limpieza-facial",
            category=cls.category,
            duration_minutes=60,
            price=50,
            is_active=True,
            min_advance_booking_hours=2,
            max_advance_booking_days=90,
        )
        cls.service.assigned_staff.add(cls.staff_member)

        # Horario de negocio lunes-viernes 09:00-18:00
        for day in range(5):
            BusinessHours.objects.create(
                tenant=cls.tenant,
                day_of_week=day,
                open_time=time(9, 0),
                close_time=time(18, 0),
                is_open=True,
            )
        # Sabado y domingo cerrados
        for day in (5, 6):
            BusinessHours.objects.create(
                tenant=cls.tenant,
                day_of_week=day,
                is_open=False,
            )


# ============================================================
# 1. No se puede reservar un horario ocupado (anti-doble reserva)
# ============================================================


class DoubleBookingPreventionTest(BookingsTestMixin, TenantAwareTestCase):
    """Test: no se puede reservar un horario ya ocupado."""

    def test_model_clean_rejects_overlapping_confirmed_appointment(self):
        """Appointment.clean() debe rechazar cita que solapa con una confirmada."""
        start = _next_weekday()
        end = start + timedelta(minutes=60)

        Appointment.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="confirmed",
        )

        conflicting = Appointment(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start + timedelta(minutes=30),
            end_datetime=start + timedelta(minutes=90),
            status="pending",
        )

        with self.assertRaises(ValidationError) as ctx:
            conflicting.clean()
        self.assertIn("start_datetime", ctx.exception.message_dict)

    def test_model_clean_rejects_overlapping_pending_not_expired(self):
        """Appointment.clean() rechaza solapamiento con cita pending sin expirar."""
        start = _next_weekday()
        end = start + timedelta(minutes=60)

        Appointment.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="pending",
            expires_at=timezone.now() + timedelta(hours=1),
        )

        conflicting = Appointment(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="pending",
        )

        with self.assertRaises(ValidationError):
            conflicting.clean()

    def test_model_clean_allows_booking_over_expired_pending(self):
        """Se puede reservar sobre una cita pending que ya expiró."""
        start = _next_weekday()
        end = start + timedelta(minutes=60)

        Appointment.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="pending",
            expires_at=timezone.now() - timedelta(minutes=5),
        )

        new_appointment = Appointment(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="pending",
        )

        # No debe lanzar excepción
        new_appointment.clean()

    def test_model_clean_allows_booking_over_cancelled(self):
        """Se puede reservar sobre una cita cancelada."""
        start = _next_weekday()
        end = start + timedelta(minutes=60)

        Appointment.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="cancelled",
        )

        new_appointment = Appointment(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="pending",
        )

        new_appointment.clean()

    def test_model_clean_rejects_overlapping_in_progress(self):
        """No se puede solapar con una cita en progreso."""
        start = _next_weekday()
        end = start + timedelta(minutes=60)

        Appointment.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="in_progress",
        )

        conflicting = Appointment(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start + timedelta(minutes=30),
            end_datetime=start + timedelta(minutes=90),
            status="pending",
        )

        with self.assertRaises(ValidationError):
            conflicting.clean()

    @patch("bookings.views.send_appointment_confirmation_email")
    def test_serializer_rejects_staff_double_booking(self, _mock_email):
        """El serializer rechaza doble reserva del staff via API."""
        start = _next_weekday()
        end = start + timedelta(minutes=60)

        Appointment.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="confirmed",
        )

        self.authenticate_as_customer()
        response = self.client.post(
            "/api/bookings/appointments/",
            {
                "service": self.service.id,
                "staff_member": self.staff_member.id,
                "start_datetime": start.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        errors = response.json()
        self.assertIn("start_datetime", errors)


# ============================================================
# 2. No se puede reservar fuera del horario de negocio
# ============================================================


class OutsideBusinessHoursTest(BookingsTestMixin, TenantAwareTestCase):
    """Test: no se puede reservar fuera del horario de negocio."""

    def test_availability_closed_day_returns_empty(self):
        """El endpoint de disponibilidad retorna vacío para días cerrados."""
        saturday = _next_saturday()

        response = self.client.get(
            "/api/bookings/appointments/availability/",
            {
                "service_id": self.service.id,
                "date": saturday.strftime("%Y-%m-%d"),
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("slots", []), [])

    def test_availability_all_slots_within_business_hours(self):
        """Todos los slots generados caen dentro del horario de negocio."""
        weekday = _next_weekday(days_ahead=5)

        response = self.client.get(
            "/api/bookings/appointments/availability/",
            {
                "service_id": self.service.id,
                "date": weekday.strftime("%Y-%m-%d"),
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()

        for slot in data.get("slots", []):
            slot_start = datetime.fromisoformat(slot["start_time"])
            slot_end = datetime.fromisoformat(slot["end_time"])
            local_start = timezone.localtime(slot_start)
            local_end = timezone.localtime(slot_end)

            # Ningún slot empieza antes de las 09:00 local
            self.assertGreaterEqual(local_start.hour, 9)
            # Ningún slot termina después de las 18:00 local
            local_end_minutes = local_end.hour * 60 + local_end.minute
            self.assertLessEqual(local_end_minutes, 18 * 60)

    def test_availability_time_off_blocks_slots(self):
        """Un TimeOff de todo el negocio bloquea los slots correspondientes."""
        weekday = _next_weekday(days_ahead=5, hour=10)

        time_off_start = _next_weekday(days_ahead=5, hour=10)
        naive_end = datetime.combine(time_off_start.date(), time(14, 0))
        time_off_end = timezone.make_aware(naive_end)

        TimeOff.objects.create(
            tenant=self.tenant,
            staff_member=None,
            start_datetime=time_off_start,
            end_datetime=time_off_end,
            reason="Feriado",
        )

        response = self.client.get(
            "/api/bookings/appointments/availability/",
            {
                "service_id": self.service.id,
                "date": weekday.strftime("%Y-%m-%d"),
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()

        for slot in data.get("slots", []):
            slot_start = datetime.fromisoformat(slot["start_time"])
            local_hour = timezone.localtime(slot_start).hour
            if 10 <= local_hour < 14:
                self.assertFalse(
                    slot["is_available"],
                    f"Slot a las {local_hour}:00 debería estar bloqueado por time-off",
                )

    def test_availability_staff_time_off_blocks_slots(self):
        """Un TimeOff de staff bloquea slots solo para ese staff."""
        weekday = _next_weekday(days_ahead=5, hour=10)

        time_off_start = _next_weekday(days_ahead=5, hour=10)
        # Construir end en hora local 12:00 del mismo día
        naive_end = datetime.combine(time_off_start.date(), time(12, 0))
        time_off_end = timezone.make_aware(naive_end)

        TimeOff.objects.create(
            tenant=self.tenant,
            staff_member=self.staff_member,
            start_datetime=time_off_start,
            end_datetime=time_off_end,
            reason="Médico",
        )

        response = self.client.get(
            "/api/bookings/appointments/availability/",
            {
                "service_id": self.service.id,
                "date": weekday.strftime("%Y-%m-%d"),
                "staff_member_id": self.staff_member.id,
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()

        for slot in data.get("slots", []):
            slot_start = datetime.fromisoformat(slot["start_time"])
            local_hour = timezone.localtime(slot_start).hour
            if 10 <= local_hour < 12:
                self.assertFalse(
                    slot["is_available"],
                    f"Slot a las {local_hour}:00 debería estar bloqueado por time-off del staff",
                )


# ============================================================
# 3. Cita creada correctamente con datos válidos
# ============================================================


class ValidAppointmentCreationTest(BookingsTestMixin, TenantAwareTestCase):
    """Test: cita se crea correctamente con datos válidos."""

    @patch("bookings.views.send_appointment_confirmation_email")
    def test_create_appointment_with_valid_data(self, _mock_email):
        """POST con datos válidos crea la cita en status pending."""
        start = _next_weekday()

        self.authenticate_as_customer()
        response = self.client.post(
            "/api/bookings/appointments/",
            {
                "service": self.service.id,
                "staff_member": self.staff_member.id,
                "start_datetime": start.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["service"]["id"], self.service.id)
        self.assertEqual(data["staff_member"]["id"], self.staff_member.id)

    @patch("bookings.views.send_appointment_confirmation_email")
    def test_end_datetime_auto_calculated(self, _mock_email):
        """end_datetime se calcula automáticamente desde la duración del servicio."""
        start = _next_weekday()

        self.authenticate_as_customer()
        response = self.client.post(
            "/api/bookings/appointments/",
            {
                "service": self.service.id,
                "staff_member": self.staff_member.id,
                "start_datetime": start.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["duration_minutes"], self.service.duration_minutes)
        expected_end = start + timedelta(minutes=self.service.duration_minutes)
        actual_end = datetime.fromisoformat(data["end_datetime"])
        self.assertEqual(actual_end, expected_end)

    @patch("bookings.views.send_appointment_confirmation_email")
    def test_appointment_has_expires_at(self, _mock_email):
        """La cita pending tiene un expires_at definido."""
        start = _next_weekday()

        self.authenticate_as_customer()
        response = self.client.post(
            "/api/bookings/appointments/",
            {
                "service": self.service.id,
                "staff_member": self.staff_member.id,
                "start_datetime": start.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIsNotNone(data.get("expires_at"))

    def test_model_save_calculates_end_datetime(self):
        """Appointment.save() calcula end_datetime si no está definido."""
        start = _next_weekday()

        appointment = Appointment(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            status="pending",
        )
        appointment.save()

        expected_end = start + timedelta(minutes=self.service.duration_minutes)
        self.assertEqual(appointment.end_datetime, expected_end)

    def test_confirm_appointment(self):
        """Staff puede confirmar una cita pending."""
        start = _next_weekday()

        appointment = Appointment.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=start + timedelta(minutes=60),
            status="pending",
        )

        appointment.confirm()
        appointment.refresh_from_db()

        self.assertEqual(appointment.status, "confirmed")
        self.assertIsNone(appointment.expires_at)


# ============================================================
# 4. Cancelar cita libera el horario
# ============================================================


class CancelAppointmentFreesSlotTest(BookingsTestMixin, TenantAwareTestCase):
    """Test: cancelar una cita libera el horario para nuevas reservas."""

    def test_cancel_changes_status(self):
        """Appointment.cancel() cambia el status a cancelled."""
        start = _next_weekday()

        appointment = Appointment.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=start + timedelta(minutes=60),
            status="confirmed",
        )

        appointment.cancel(reason="Ya no puedo asistir")
        appointment.refresh_from_db()

        self.assertEqual(appointment.status, "cancelled")
        self.assertIsNotNone(appointment.cancelled_at)
        self.assertEqual(appointment.cancellation_reason, "Ya no puedo asistir")

    def test_cancelled_appointment_frees_slot_for_new_booking(self):
        """Después de cancelar, el slot queda libre para otra reserva."""
        start = _next_weekday()
        end = start + timedelta(minutes=60)

        appointment = Appointment.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="confirmed",
        )

        appointment.cancel()

        new_appointment = Appointment(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="pending",
        )

        # No debe lanzar ValidationError
        new_appointment.clean()
        new_appointment.save()

        self.assertEqual(new_appointment.status, "pending")

    @patch("bookings.views.send_appointment_confirmation_email")
    def test_cancelled_slot_available_via_api(self, _mock_email):
        """Después de cancelar, se puede reservar el mismo slot via API."""
        start = _next_weekday()
        end = start + timedelta(minutes=60)

        appointment = Appointment.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="confirmed",
        )

        appointment.cancel()

        self.authenticate_as_customer()
        response = self.client.post(
            "/api/bookings/appointments/",
            {
                "service": self.service.id,
                "staff_member": self.staff_member.id,
                "start_datetime": start.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

    def test_availability_shows_slot_as_available_after_cancel(self):
        """El endpoint de disponibilidad muestra el slot libre tras cancelación."""
        start = _next_weekday(days_ahead=5)
        end = start + timedelta(minutes=60)

        appointment = Appointment.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=self.staff_member,
            service=self.service,
            start_datetime=start,
            end_datetime=end,
            status="confirmed",
        )

        # Antes de cancelar: slot ocupado
        response = self.client.get(
            "/api/bookings/appointments/availability/",
            {
                "service_id": self.service.id,
                "date": start.strftime("%Y-%m-%d"),
                "staff_member_id": self.staff_member.id,
            },
        )

        self.assertEqual(response.status_code, 200)
        before_slots = response.json().get("slots", [])

        occupied = [
            s
            for s in before_slots
            if datetime.fromisoformat(s["start_time"]) >= start and datetime.fromisoformat(s["start_time"]) < end
        ]
        self.assertGreater(len(occupied), 0, "Debe haber al menos un slot en el rango ocupado")
        for slot in occupied:
            self.assertFalse(slot["is_available"])

        # Cancelar
        appointment.cancel()

        # Después de cancelar: slot disponible
        response = self.client.get(
            "/api/bookings/appointments/availability/",
            {
                "service_id": self.service.id,
                "date": start.strftime("%Y-%m-%d"),
                "staff_member_id": self.staff_member.id,
            },
        )

        self.assertEqual(response.status_code, 200)
        after_slots = response.json().get("slots", [])
        freed = [
            s
            for s in after_slots
            if datetime.fromisoformat(s["start_time"]) >= start and datetime.fromisoformat(s["start_time"]) < end
        ]
        available_count = sum(1 for s in freed if s["is_available"])
        self.assertGreater(available_count, 0, "El slot debería estar disponible tras la cancelación")
