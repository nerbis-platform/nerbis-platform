# backend/bookings/views.py

from datetime import datetime, timedelta

from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from core.permissions import IsOwnerOrStaff, IsTenantStaffOrAdmin
from notifications.tasks import send_appointment_cancelled_email, send_appointment_confirmation_email
from services.models import Service

from .models import Appointment, BusinessHours, TimeOff
from .serializers import (
    AppointmentCreateSerializer,
    AppointmentDetailSerializer,
    AppointmentListSerializer,
    AvailabilitySlotSerializer,
    BusinessHoursSerializer,
    GuestBookingSerializer,
    TimeOffSerializer,
)


class BusinessHoursViewSet(viewsets.ModelViewSet):
    """
    ViewSet para horarios de negocio.

    GET    /api/bookings/business-hours/
    POST   /api/bookings/business-hours/ (staff/admin)
    PUT    /api/bookings/business-hours/{id}/ (staff/admin)
    """

    serializer_class = BusinessHoursSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["day_of_week", "is_open"]

    def get_queryset(self):
        # Para generación de schema de Swagger
        if getattr(self, "swagger_fake_view", False):
            return BusinessHours.objects.none()
        return BusinessHours.objects.filter(tenant=self.request.tenant).order_by("day_of_week")

    def get_permissions(self):
        if self.action == "list":
            permission_classes = [IsAuthenticatedOrReadOnly]
        else:
            permission_classes = [IsTenantStaffOrAdmin]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class TimeOffViewSet(viewsets.ModelViewSet):
    """
    ViewSet para tiempos libres.

    GET    /api/bookings/time-off/
    POST   /api/bookings/time-off/ (staff/admin)
    DELETE /api/bookings/time-off/{id}/ (staff/admin)
    """

    serializer_class = TimeOffSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["staff_member", "is_recurring"]
    ordering = ["-start_datetime"]

    def get_queryset(self):
        # Para generación de schema de Swagger
        if getattr(self, "swagger_fake_view", False):
            return TimeOff.objects.none()

        queryset = TimeOff.objects.filter(tenant=self.request.tenant)

        # Filtrar por rango de fechas
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(end_datetime__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_datetime__lte=end_date)

        return queryset

    def get_permissions(self):
        if self.action == "list":
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsTenantStaffOrAdmin]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para citas.

    GET    /api/bookings/appointments/
    GET    /api/bookings/appointments/{id}/
    POST   /api/bookings/appointments/
    PATCH  /api/bookings/appointments/{id}/ (solo owner o staff)
    DELETE /api/bookings/appointments/{id}/cancel/
    GET    /api/bookings/appointments/my-appointments/
    GET    /api/bookings/appointments/upcoming/
    POST   /api/bookings/appointments/book-as-guest/ (público)
    """

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "staff_member", "service"]
    ordering = ["-start_datetime"]

    def initialize_request(self, request, *args, **kwargs):
        """
        Override para permitir requests anónimos en endpoints públicos.
        """
        # Verificar si es un endpoint público ANTES de inicializar
        path = request.path
        if "book-as-guest" in path or "availability" in path:
            # Para endpoints públicos, no usar autenticadores
            self._authenticators = []
        return super().initialize_request(request, *args, **kwargs)

    def get_authenticators(self):
        """
        Retorna los autenticadores para este request.
        """
        if hasattr(self, "_authenticators"):
            return self._authenticators
        return super().get_authenticators()

    def get_queryset(self):
        # Para generación de schema de Swagger
        if getattr(self, "swagger_fake_view", False):
            return Appointment.objects.none()

        user = self.request.user
        queryset = Appointment.objects.filter(tenant=self.request.tenant).select_related(
            "customer", "staff_member", "service", "service__category"
        )

        # Staff y admin ven todas las citas
        # Customers solo ven sus propias citas
        if user.is_authenticated and hasattr(user, "role") and user.role == "customer":
            queryset = queryset.filter(customer=user)

        # Filtrar por rango de fechas
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(start_datetime__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_datetime__lte=end_date)

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return AppointmentCreateSerializer
        elif self.action in ["list", "my_appointments", "upcoming", "staff_appointments"]:
            return AppointmentListSerializer
        return AppointmentDetailSerializer

    def get_permissions(self):
        if self.action in ["availability", "book_as_guest"]:
            # Disponibilidad y reserva como invitado son públicas
            permission_classes = [AllowAny]
        elif self.action == "create":
            permission_classes = [IsAuthenticated]
        elif self.action in ["update", "partial_update", "destroy", "cancel"]:
            permission_classes = [IsOwnerOrStaff]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=["get"], url_path="my-appointments")
    def my_appointments(self, request):
        """
        GET /api/bookings/appointments/my-appointments/

        Obtener mis citas (del usuario actual).
        """
        appointments = self.get_queryset().filter(customer=request.user).order_by("-start_datetime")

        page = self.paginate_queryset(appointments)
        if page is not None:
            serializer = AppointmentListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = AppointmentListSerializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """
        GET /api/bookings/appointments/upcoming/

        Obtener próximas citas (futuras y no canceladas).
        """
        now = timezone.now()
        appointments = (
            self.get_queryset()
            .filter(start_datetime__gte=now)
            .filter(
                Q(status="confirmed")
                | Q(status="pending", expires_at__gt=now)
                | Q(status="pending", expires_at__isnull=True)
            )
            .order_by("start_datetime")[:10]
        )

        serializer = AppointmentListSerializer(appointments, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Crear cita (usuarios autenticados)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()

        # Enviar email de confirmación si no requiere pago
        if not appointment.requires_payment:
            send_appointment_confirmation_email.delay(appointment.id)

        return Response(AppointmentDetailSerializer(appointment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """
        POST /api/bookings/appointments/{id}/cancel/

        Cancelar una cita.
        """
        appointment = self.get_object()

        # Verificar que se puede cancelar
        if not appointment.can_cancel:
            return Response(
                {"error": "No se puede cancelar esta cita (muy cercana o ya pasó)"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Cancelar
        reason = request.data.get("reason", "Cancelado por el usuario")
        appointment.cancel(reason=reason)

        # Enviar email de cancelación
        send_appointment_cancelled_email.delay(appointment.id)

        serializer = AppointmentDetailSerializer(appointment)
        return Response({"message": "Cita cancelada exitosamente", "appointment": serializer.data})

    @action(detail=True, methods=["post"], permission_classes=[IsTenantStaffOrAdmin])
    def confirm(self, request, pk=None):
        """
        POST /api/bookings/appointments/{id}/confirm/

        Confirmar una cita (solo staff/admin).
        Un staff no puede confirmar su propia cita como cliente.
        """
        appointment = self.get_object()

        if appointment.customer == request.user:
            return Response(
                {"error": "No puedes gestionar tu propia cita desde el panel de staff"},
                status=status.HTTP_403_FORBIDDEN,
            )

        appointment.confirm()

        serializer = AppointmentDetailSerializer(appointment)
        return Response({"message": "Cita confirmada", "appointment": serializer.data})

    @action(detail=True, methods=["post"], permission_classes=[IsTenantStaffOrAdmin])
    def complete(self, request, pk=None):
        """
        POST /api/bookings/appointments/{id}/complete/

        Marcar cita como completada (solo staff/admin).
        Transición: in_progress → completed
        Un staff no puede completar su propia cita como cliente.
        """
        appointment = self.get_object()

        if appointment.customer == request.user:
            return Response(
                {"error": "No puedes gestionar tu propia cita desde el panel de staff"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "in_progress":
            return Response(
                {"error": "Solo se pueden finalizar servicios que están en progreso"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.complete()

        serializer = AppointmentDetailSerializer(appointment)
        return Response({"message": "Servicio finalizado", "appointment": serializer.data})

    @action(detail=True, methods=["post"], permission_classes=[IsTenantStaffOrAdmin])
    def start(self, request, pk=None):
        """
        POST /api/bookings/appointments/{id}/start/

        Iniciar servicio - el cliente llegó (solo staff/admin).
        Transición: confirmed → in_progress
        """
        appointment = self.get_object()

        if appointment.customer == request.user:
            return Response(
                {"error": "No puedes gestionar tu propia cita desde el panel de staff"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "confirmed":
            return Response(
                {"error": "Solo se pueden iniciar citas confirmadas"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.start()

        serializer = AppointmentDetailSerializer(appointment)
        return Response({"message": "Servicio iniciado", "appointment": serializer.data})

    @action(detail=True, methods=["post"], url_path="no-show", permission_classes=[IsTenantStaffOrAdmin])
    def no_show(self, request, pk=None):
        """
        POST /api/bookings/appointments/{id}/no-show/

        Marcar que el cliente no se presentó (solo staff/admin).
        Transición: confirmed → no_show
        """
        appointment = self.get_object()

        if appointment.customer == request.user:
            return Response(
                {"error": "No puedes gestionar tu propia cita desde el panel de staff"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "confirmed":
            return Response(
                {"error": "Solo se pueden marcar como 'No Asistió' citas confirmadas"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.mark_no_show()

        serializer = AppointmentDetailSerializer(appointment)
        return Response({"message": "Cita marcada como No Asistió", "appointment": serializer.data})

    # ========================================
    # 📊 ENDPOINTS PARA STAFF
    # ========================================

    @action(detail=False, methods=["get"], url_path="staff-appointments", permission_classes=[IsTenantStaffOrAdmin])
    def staff_appointments(self, request):
        """
        GET /api/bookings/appointments/staff-appointments/

        Obtener citas asignadas al staff actual.
        Query params opcionales: status, start_date, end_date
        """
        # Obtener el perfil de staff del usuario autenticado
        if not hasattr(request.user, "staff_profile"):
            return Response(
                {"error": "No tienes un perfil de staff asociado"},
                status=status.HTTP_403_FORBIDDEN,
            )

        staff_profile = request.user.staff_profile

        appointments = Appointment.objects.filter(
            tenant=request.tenant,
            staff_member=staff_profile,
        ).select_related("customer", "staff_member", "service", "service__category")

        # Filtro por status
        appointment_status = request.query_params.get("status")
        if appointment_status:
            appointments = appointments.filter(status=appointment_status)

        # Filtro por rango de fechas
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if start_date:
            appointments = appointments.filter(start_datetime__gte=start_date)
        if end_date:
            appointments = appointments.filter(start_datetime__lte=end_date)

        appointments = appointments.order_by("-start_datetime")

        page = self.paginate_queryset(appointments)
        if page is not None:
            serializer = AppointmentListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = AppointmentListSerializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="staff-stats", permission_classes=[IsTenantStaffOrAdmin])
    def staff_stats(self, request):
        """
        GET /api/bookings/appointments/staff-stats/

        Métricas del staff actual.
        """
        if not hasattr(request.user, "staff_profile"):
            return Response(
                {"error": "No tienes un perfil de staff asociado"},
                status=status.HTTP_403_FORBIDDEN,
            )

        staff_profile = request.user.staff_profile
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        base_qs = Appointment.objects.filter(
            tenant=request.tenant,
            staff_member=staff_profile,
        )

        today_count = (
            base_qs.filter(
                start_datetime__gte=today_start,
                start_datetime__lt=today_end,
            )
            .exclude(status="cancelled")
            .count()
        )

        pending_count = base_qs.filter(status="pending").count()

        confirmed_count = base_qs.filter(status="confirmed").count()

        completed_today = base_qs.filter(
            status="completed",
            start_datetime__gte=today_start,
            start_datetime__lt=today_end,
        ).count()

        upcoming_count = base_qs.filter(
            start_datetime__gte=now,
            status__in=["confirmed", "pending"],
        ).count()

        return Response(
            {
                "today_count": today_count,
                "pending_count": pending_count,
                "confirmed_count": confirmed_count,
                "completed_today": completed_today,
                "upcoming_count": upcoming_count,
            }
        )

    # ========================================
    # 🔥 ALGORITMO DE DISPONIBILIDAD
    # ========================================

    @action(detail=False, methods=["get"])
    def availability(self, request):
        """
        GET /api/bookings/appointments/availability/

        ALGORITMO DE DISPONIBILIDAD EN TIEMPO REAL

        Calcula los horarios disponibles para un servicio específico en una fecha.

        Query params:
        - service_id (required): ID del servicio
        - date (required): Fecha en formato YYYY-MM-DD
        - staff_member_id (optional): ID del staff member específico

        Returns:
        [
            {
                "start_time": "2024-12-27T10:00:00Z",
                "end_time": "2024-12-27T11:00:00Z",
                "staff_member": {...},
                "is_available": true
            },
            ...
        ]
        """

        # Validar parámetros
        service_id = request.query_params.get("service_id")
        date_str = request.query_params.get("date")
        staff_member_id = request.query_params.get("staff_member_id")

        if not service_id:
            return Response({"error": "service_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        if not date_str:
            return Response({"error": "date es requerido (formato: YYYY-MM-DD)"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            requested_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Formato de fecha inválido. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        # Obtener servicio
        try:
            service = Service.objects.get(id=service_id, tenant=request.tenant, is_active=True)
        except Service.DoesNotExist:
            return Response({"error": "Servicio no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        # Obtener staff members que pueden dar este servicio
        if staff_member_id:
            staff_members = service.assigned_staff.filter(id=staff_member_id, is_available=True)
            if not staff_members.exists():
                return Response(
                    {"error": "Staff member no encontrado o no disponible"}, status=status.HTTP_404_NOT_FOUND
                )
        else:
            staff_members = service.assigned_staff.filter(is_available=True)

        if not staff_members.exists():
            return Response({"error": "No hay staff disponible para este servicio"}, status=status.HTTP_400_BAD_REQUEST)

        # Obtener horarios del negocio para ese día
        day_of_week = requested_date.weekday()  # 0=Lunes, 6=Domingo

        try:
            business_hours = BusinessHours.objects.get(tenant=request.tenant, day_of_week=day_of_week)
        except BusinessHours.DoesNotExist:
            return Response({"error": "No hay horarios configurados para este día"}, status=status.HTTP_400_BAD_REQUEST)

        if not business_hours.is_open:
            return Response({"message": "El negocio está cerrado este día", "slots": []})

        # Generar slots disponibles
        available_slots = self._generate_availability_slots(
            service=service,
            staff_members=staff_members,
            requested_date=requested_date,
            business_hours=business_hours,
            tenant=request.tenant,
        )

        serializer = AvailabilitySlotSerializer(available_slots, many=True)
        return Response(
            {"date": date_str, "service": service.name, "total_slots": len(available_slots), "slots": serializer.data}
        )

    def _generate_availability_slots(self, service, staff_members, requested_date, business_hours, tenant):
        """
        🧠 ALGORITMO CORE DE DISPONIBILIDAD

        Genera todos los slots disponibles para un servicio en una fecha.
        """

        slots = []
        slot_duration = timedelta(minutes=service.duration_minutes)
        interval = timedelta(minutes=30)  # Slots cada 30 minutos

        # Crear datetime de inicio y fin del día
        start_of_day = datetime.combine(requested_date, business_hours.open_time)
        end_of_day = datetime.combine(requested_date, business_hours.close_time)

        # Hacer timezone-aware
        start_of_day = timezone.make_aware(start_of_day)
        end_of_day = timezone.make_aware(end_of_day)

        # Obtener tiempos libres del día (para todo el negocio)
        business_time_offs = TimeOff.objects.filter(
            tenant=tenant,
            staff_member__isnull=True,  # Para todo el negocio
            start_datetime__lte=end_of_day,
            end_datetime__gte=start_of_day,
        )

        # Iterar sobre cada staff member
        for staff_member in staff_members:
            # Obtener tiempos libres de este staff member
            staff_time_offs = TimeOff.objects.filter(
                tenant=tenant, staff_member=staff_member, start_datetime__lte=end_of_day, end_datetime__gte=start_of_day
            )

            # Obtener citas existentes del staff member
            now = timezone.now()
            existing_appointments = Appointment.objects.filter(
                tenant=tenant,
                staff_member=staff_member,
                start_datetime__date=requested_date,
            ).filter(
                Q(status__in=["confirmed", "in_progress"])
                | Q(status="pending", expires_at__gt=now)
                | Q(status="pending", expires_at__isnull=True)
            )

            # Generar slots
            current_time = start_of_day

            while current_time + slot_duration <= end_of_day:
                slot_end = current_time + slot_duration

                # Verificar si el slot está disponible
                is_available = True

                # 1. Verificar time-offs del negocio
                for time_off in business_time_offs:
                    if current_time < time_off.end_datetime and slot_end > time_off.start_datetime:
                        is_available = False
                        break

                # 2. Verificar time-offs del staff member
                if is_available:
                    for time_off in staff_time_offs:
                        if current_time < time_off.end_datetime and slot_end > time_off.start_datetime:
                            is_available = False
                            break

                # 3. Verificar citas existentes
                if is_available:
                    for appointment in existing_appointments:
                        if current_time < appointment.end_datetime and slot_end > appointment.start_datetime:
                            is_available = False
                            break

                # 4. Verificar que no sea en el pasado
                if is_available and current_time < timezone.now():
                    is_available = False

                # 5. Verificar anticipación mínima
                if is_available:
                    hours_until_slot = (current_time - timezone.now()).total_seconds() / 3600
                    if hours_until_slot < service.min_advance_booking_hours:
                        is_available = False

                # Agregar slot
                slots.append(
                    {
                        "start_time": current_time,
                        "end_time": slot_end,
                        "staff_member": staff_member,
                        "is_available": is_available,
                    }
                )

                # Avanzar al siguiente slot
                current_time += interval

        # Ordenar por hora y filtrar solo disponibles (opcional)
        # slots = [s for s in slots if s['is_available']]
        slots.sort(key=lambda x: x["start_time"])

        return slots

    # ========================================
    # 🔥 RESERVA COMO INVITADO (GUEST BOOKING)
    # ========================================

    @action(detail=False, methods=["post"], permission_classes=[AllowAny], url_path="book-as-guest")
    def book_as_guest(self, request):
        """
        POST /api/bookings/appointments/book-as-guest/

        RESERVA COMO INVITADO (sin autenticación previa)

        Flujo:
        1. Cliente selecciona servicio, staff y horario
        2. Cliente ingresa datos personales (email, nombre, teléfono)
        3. Si el email ya existe → Error, pedir login
        4. Si es nuevo → Crear usuario + cita automáticamente
        5. Retornar cita + tokens JWT para auto-login

        Body:
        {
            "service_id": 1,
            "staff_member_id": 1,
            "start_datetime": "2024-12-28T10:00:00Z",
            "notes": "Primera visita",
            "email": "cliente@example.com",
            "first_name": "María",
            "last_name": "García",
            "phone": "+34612345678"
        }

        Returns:
        {
            "message": "Cita creada exitosamente",
            "appointment": {...},
            "user": {...},
            "tokens": {
                "access": "...",
                "refresh": "..."
            }
        }
        """
        import secrets

        from rest_framework_simplejwt.tokens import RefreshToken

        from core.models import User

        serializer = GuestBookingSerializer(data=request.data, context={"tenant": request.tenant})
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data

        # Crear usuario
        user = User.objects.create_user(
            username=validated_data["email"],  # Usar email como username
            email=validated_data["email"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone=validated_data["phone"],
            tenant=request.tenant,
            role="customer",
            password=secrets.token_urlsafe(16),  # Contraseña temporal
            is_guest=True,  # Marcar como cuenta creada por guest booking
        )

        # Crear cita
        appointment = Appointment.objects.create(
            tenant=request.tenant,
            customer=user,
            service=validated_data["service"],
            staff_member=validated_data["staff_member"],
            start_datetime=validated_data["start_datetime"],
            end_datetime=validated_data["end_datetime"],
            notes=validated_data.get("notes", ""),
            status="pending",
            requires_payment=validated_data["service"].requires_deposit,
            expires_at=timezone.now() + timedelta(minutes=settings.BOOKING_HOLD_MINUTES),
        )

        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)

        # Agregar claims del tenant (convertir UUID a string)
        refresh["tenant_id"] = str(request.tenant.id)
        refresh["tenant_slug"] = request.tenant.slug

        # Serializar respuesta
        appointment_serializer = AppointmentDetailSerializer(appointment)
        from core.cookies import set_auth_cookies
        from core.serializers import UserSerializer

        user_serializer = UserSerializer(user)

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {
                "message": "¡Cita creada exitosamente! Se ha creado una cuenta para ti.",
                "appointment": appointment_serializer.data,
                "user": user_serializer.data,
                "tokens": {
                    "access": access_token,
                    "refresh": refresh_token,
                },
                "next_steps": [
                    "Revisa tu email para confirmar tu cuenta",
                    "Usa los tokens proporcionados para acceder a tu cuenta",
                    "Puedes establecer una contraseña desde tu perfil",
                ],
            },
            status=status.HTTP_201_CREATED,
        )
        set_auth_cookies(response, access_token, refresh_token)
        return response
