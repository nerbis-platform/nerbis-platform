# backend/bookings/serializers.py

from rest_framework import serializers
from django.db import models
from django.utils import timezone
from datetime import datetime, timedelta
from core.serializers import UserSerializer
from services.serializers import ServiceListSerializer, ServiceDetailSerializer, StaffMemberListSerializer
from .models import BusinessHours, TimeOff, Appointment


class BusinessHoursSerializer(serializers.ModelSerializer):
    """Serializer para horarios de negocio"""

    day_name = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = BusinessHours
        fields = [
            "id",
            "day_of_week",
            "day_name",
            "open_time",
            "close_time",
            "is_open",
        ]


class TimeOffSerializer(serializers.ModelSerializer):
    """Serializer para tiempos libres"""

    staff_member_name = serializers.CharField(source="staff_member.full_name", read_only=True, allow_null=True)

    class Meta:
        model = TimeOff
        fields = [
            "id",
            "staff_member",
            "staff_member_name",
            "start_datetime",
            "end_datetime",
            "reason",
            "is_recurring",
        ]


class AppointmentListSerializer(serializers.ModelSerializer):
    """Serializer para listar citas (vista resumida)"""

    customer = UserSerializer(read_only=True)
    staff_member = StaffMemberListSerializer(read_only=True)
    service = ServiceListSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "customer",
            "staff_member",
            "service",
            "start_datetime",
            "end_datetime",
            "status",
            "status_display",
            "expires_at",
            "is_expired",
            "is_paid",
            "can_cancel",
            "created_at",
        ]


class AppointmentDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle de cita"""

    customer = UserSerializer(read_only=True)
    staff_member = StaffMemberListSerializer(read_only=True)
    service = ServiceDetailSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "customer",
            "staff_member",
            "service",
            "start_datetime",
            "end_datetime",
            "duration_minutes",
            "status",
            "status_display",
            "expires_at",
            "is_expired",
            "notes",
            "internal_notes",
            "requires_payment",
            "is_paid",
            "paid_amount",
            "can_cancel",
            "is_upcoming",
            "is_past",
            "cancelled_at",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]


class AppointmentCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear citas"""

    class Meta:
        model = Appointment
        fields = [
            "id",
            "service",
            "staff_member",
            "start_datetime",
            "end_datetime",
            "status",
            "notes",
            "expires_at",
        ]
        read_only_fields = ["id", "end_datetime", "status", "expires_at"]

    def validate(self, attrs):
        """Validaciones personalizadas"""

        service = attrs.get("service")
        staff_member = attrs.get("staff_member")
        start_datetime = attrs.get("start_datetime")

        # Verificar que no se reserve una cita consigo mismo
        request = self.context.get("request")
        if staff_member and request and hasattr(staff_member, "user") and staff_member.user == request.user:
            raise serializers.ValidationError(
                {"staff_member": "No puedes reservar una cita contigo mismo"}
            )

        # Verificar que el staff member puede dar ese servicio
        if staff_member and service:
            if not service.assigned_staff.filter(id=staff_member.id).exists():
                raise serializers.ValidationError({"staff_member": "Este staff member no puede realizar este servicio"})

        # Verificar anticipación mínima
        if start_datetime:
            now = timezone.now()
            hours_until = (start_datetime - now).total_seconds() / 3600

            # Si la fecha ya pasó, dar un mensaje más claro
            if start_datetime < now:
                raise serializers.ValidationError(
                    {"start_datetime": "La fecha seleccionada ya pasó. Por favor seleccione una fecha futura."}
                )

            if hours_until < service.min_advance_booking_hours:
                raise serializers.ValidationError(
                    {
                        "start_datetime": f"Debe reservar con al menos {service.min_advance_booking_hours} horas de anticipación"
                    }
                )

            # Verificar anticipación máxima
            days_until = (start_datetime - timezone.now()).days
            if days_until > service.max_advance_booking_days:
                raise serializers.ValidationError(
                    {
                        "start_datetime": f"No puede reservar con más de {service.max_advance_booking_days} días de anticipación"
                    }
                )

            # Calcular end_datetime para validar conflictos
            end_datetime = start_datetime + timedelta(minutes=service.duration_minutes)

            # Verificar que el staff member no tenga otra cita en ese horario
            now = timezone.now()
            staff_conflict = Appointment.objects.filter(
                tenant=request.tenant,
                staff_member=staff_member,
                start_datetime__lt=end_datetime,
                end_datetime__gt=start_datetime,
            ).filter(
                models.Q(status__in=["confirmed", "in_progress"])
                | models.Q(status="pending", expires_at__gt=now)
                | models.Q(status="pending", expires_at__isnull=True)
            ).exists()

            if staff_conflict:
                raise serializers.ValidationError(
                    {"start_datetime": "Este horario ya no está disponible para este profesional. Por favor seleccione otro."}
                )

            # Verificar que el cliente no tenga otra cita a la misma hora
            customer_conflict = Appointment.objects.filter(
                tenant=request.tenant,
                customer=request.user,
                start_datetime__lt=end_datetime,
                end_datetime__gt=start_datetime,
            ).filter(
                models.Q(status__in=["confirmed", "in_progress"])
                | models.Q(status="pending", expires_at__gt=now)
                | models.Q(status="pending", expires_at__isnull=True)
            ).exists()

            if customer_conflict:
                raise serializers.ValidationError(
                    {"start_datetime": "Ya tienes una cita programada en este horario."}
                )

        return attrs

    def create(self, validated_data):
        """Crear cita"""
        request = self.context.get("request")

        # Asignar tenant y customer
        validated_data["tenant"] = request.tenant
        validated_data["customer"] = request.user

        # Calcular end_datetime
        service = validated_data["service"]
        start_datetime = validated_data["start_datetime"]
        validated_data["end_datetime"] = start_datetime + timedelta(minutes=service.duration_minutes)

        # Configurar pago si es necesario
        if service.requires_deposit:
            validated_data["requires_payment"] = True

        # Estado inicial
        validated_data["status"] = "pending"
        from django.conf import settings
        validated_data["expires_at"] = timezone.now() + timedelta(minutes=settings.BOOKING_HOLD_MINUTES)

        appointment = super().create(validated_data)
        return appointment


class AvailabilitySlotSerializer(serializers.Serializer):
    """Serializer para slots de disponibilidad"""

    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()
    staff_member = StaffMemberListSerializer()
    is_available = serializers.BooleanField()


class GuestBookingSerializer(serializers.Serializer):
    """
    Serializer para reservas como invitado (sin cuenta previa).

    Flujo:
    1. Si el email ya existe en el tenant → Error, pedir login
    2. Si es nuevo → Crear usuario + cita automáticamente
    """

    # Datos de la cita
    service_id = serializers.IntegerField()
    staff_member_id = serializers.IntegerField()
    start_datetime = serializers.DateTimeField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    # Datos del cliente (para crear cuenta si es nuevo)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)

    def validate_email(self, value):
        """Verificar si el email ya existe en este tenant"""
        from core.models import User

        tenant = self.context.get("tenant")
        if User.objects.filter(email=value, tenant=tenant).exists():
            raise serializers.ValidationError(
                "Ya existe una cuenta con este email. Por favor inicia sesión para continuar."
            )
        return value.lower()

    def validate(self, attrs):
        """Validaciones de la cita"""
        from services.models import Service, StaffMember

        tenant = self.context.get("tenant")
        service_id = attrs.get("service_id")
        staff_member_id = attrs.get("staff_member_id")
        start_datetime = attrs.get("start_datetime")

        # Validar servicio
        try:
            service = Service.objects.get(id=service_id, tenant=tenant, is_active=True)
            attrs["service"] = service
        except Service.DoesNotExist:
            raise serializers.ValidationError({"service_id": "Servicio no encontrado"})

        # Validar staff member
        try:
            staff_member = StaffMember.objects.get(id=staff_member_id, tenant=tenant, is_available=True)
            attrs["staff_member"] = staff_member
        except StaffMember.DoesNotExist:
            raise serializers.ValidationError({"staff_member_id": "Staff member no encontrado o no disponible"})

        # Verificar que el staff puede dar el servicio
        if not service.assigned_staff.filter(id=staff_member.id).exists():
            raise serializers.ValidationError(
                {"staff_member_id": "Este profesional no puede realizar este servicio"}
            )

        # Verificar anticipación mínima
        now = timezone.now()
        hours_until = (start_datetime - now).total_seconds() / 3600

        # Si la fecha ya pasó, dar un mensaje más claro
        if start_datetime < now:
            raise serializers.ValidationError(
                {"start_datetime": "La fecha seleccionada ya pasó. Por favor seleccione una fecha futura."}
            )

        if hours_until < service.min_advance_booking_hours:
            raise serializers.ValidationError(
                {"start_datetime": f"Debe reservar con al menos {service.min_advance_booking_hours} horas de anticipación"}
            )

        # Verificar anticipación máxima
        days_until = (start_datetime - timezone.now()).days
        if days_until > service.max_advance_booking_days:
            raise serializers.ValidationError(
                {"start_datetime": f"No puede reservar con más de {service.max_advance_booking_days} días de anticipación"}
            )

        # Verificar que el slot esté disponible (no haya otra cita)
        end_datetime = start_datetime + timedelta(minutes=service.duration_minutes)
        now = timezone.now()
        conflicting = Appointment.objects.filter(
            tenant=tenant,
            staff_member=staff_member,
            start_datetime__lt=end_datetime,
            end_datetime__gt=start_datetime,
        ).filter(
            models.Q(status__in=["confirmed", "in_progress"])
            | models.Q(status="pending", expires_at__gt=now)
            | models.Q(status="pending", expires_at__isnull=True)
        ).exists()

        if conflicting:
            raise serializers.ValidationError(
                {"start_datetime": "Este horario ya no está disponible. Por favor seleccione otro."}
            )

        attrs["end_datetime"] = end_datetime
        return attrs
