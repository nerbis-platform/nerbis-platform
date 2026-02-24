# backend/services/views.py

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from core.permissions import IsTenantStaffOrAdmin
from .models import ServiceCategory, Service, StaffMember
from .serializers import (
    ServiceCategorySerializer,
    ServiceListSerializer,
    ServiceDetailSerializer,
    ServiceCreateUpdateSerializer,
    StaffMemberListSerializer,
    StaffMemberDetailSerializer,
)


class ServiceCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet para categorías de servicios.

    GET    /api/services/categories/
    GET    /api/services/categories/{id}/
    POST   /api/services/categories/ (staff/admin)
    PUT    /api/services/categories/{id}/ (staff/admin)
    DELETE /api/services/categories/{id}/ (staff/admin)
    """

    serializer_class = ServiceCategorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["order", "name"]
    ordering = ["order", "name"]

    def get_queryset(self):
        # Para generación de schema de Swagger
        if getattr(self, "swagger_fake_view", False):
            return ServiceCategory.objects.none()
        return ServiceCategory.objects.filter(tenant=self.request.tenant, is_active=True)

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            permission_classes = [IsAuthenticatedOrReadOnly]
        else:
            permission_classes = [IsTenantStaffOrAdmin]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class ServiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet para servicios.

    GET    /api/services/
    GET    /api/services/{id}/
    POST   /api/services/ (staff/admin)
    PUT    /api/services/{id}/ (staff/admin)
    DELETE /api/services/{id}/ (staff/admin)
    GET    /api/services/featured/ (servicios destacados)
    GET    /api/services/{id}/staff/ (staff que puede dar este servicio)
    """

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "is_featured", "requires_deposit"]
    search_fields = ["name", "description", "short_description"]
    ordering_fields = ["price", "duration_minutes", "name"]
    ordering = ["-is_featured", "name"]

    def get_queryset(self):
        # Para generación de schema de Swagger
        if getattr(self, "swagger_fake_view", False):
            return Service.objects.none()

        queryset = (
            Service.objects.filter(tenant=self.request.tenant, is_active=True)
            .select_related("category")
            .prefetch_related("assigned_staff")
        )

        # Filtro: duración mínima/máxima
        min_duration = self.request.query_params.get("min_duration")
        max_duration = self.request.query_params.get("max_duration")

        if min_duration:
            queryset = queryset.filter(duration_minutes__gte=min_duration)
        if max_duration:
            queryset = queryset.filter(duration_minutes__lte=max_duration)

        # Filtro: rango de precios
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")

        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return ServiceListSerializer
        elif self.action == "retrieve":
            return ServiceDetailSerializer
        return ServiceCreateUpdateSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve", "featured", "staff"]:
            permission_classes = [IsAuthenticatedOrReadOnly]
        else:
            permission_classes = [IsTenantStaffOrAdmin]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=False, methods=["get"])
    def featured(self, request):
        """
        GET /api/services/featured/

        Obtener servicios destacados.
        """
        featured_services = self.get_queryset().filter(is_featured=True)[:6]
        serializer = ServiceListSerializer(featured_services, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def staff(self, request, pk=None):
        """
        GET /api/services/{id}/staff/

        Obtener staff que puede realizar este servicio.
        """
        service = self.get_object()
        staff_members = service.assigned_staff.filter(is_available=True).order_by("-is_featured", "order")

        serializer = StaffMemberListSerializer(staff_members, many=True, context={"request": request})
        return Response(serializer.data)


class StaffMemberViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para miembros del staff (solo lectura).

    GET /api/staff/
    GET /api/staff/{id}/
    GET /api/staff/{id}/services/ (servicios que puede realizar)
    """

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_available", "accepts_new_clients", "is_featured"]
    search_fields = ["user__first_name", "user__last_name", "position"]
    ordering_fields = ["order", "user__first_name"]
    ordering = ["-is_featured", "order"]

    def get_queryset(self):
        # Para generación de schema de Swagger
        if getattr(self, "swagger_fake_view", False):
            return StaffMember.objects.none()
        return (
            StaffMember.objects.filter(tenant=self.request.tenant, is_available=True)
            .select_related("user", "tenant")
            .prefetch_related("specialties")
        )

    def get_serializer_class(self):
        if self.action == "list":
            return StaffMemberListSerializer
        return StaffMemberDetailSerializer

    @action(detail=True, methods=["get"])
    def services(self, request, pk=None):
        """
        GET /api/staff/{id}/services/

        Obtener servicios que puede realizar este staff member.
        """
        staff_member = self.get_object()
        services = staff_member.get_services()

        serializer = ServiceListSerializer(services, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="my-profile", permission_classes=[IsAuthenticated])
    def my_profile(self, request):
        """
        GET /api/services/staff/my-profile/

        Obtener el perfil de staff del usuario autenticado con sus servicios.
        """
        if not hasattr(request.user, "staff_profile"):
            return Response(
                {"error": "No tienes un perfil de staff asociado"},
                status=status.HTTP_404_NOT_FOUND,
            )

        staff_member = request.user.staff_profile
        serializer = StaffMemberDetailSerializer(staff_member, context={"request": request})
        data = serializer.data

        # Agregar servicios asignados
        services = staff_member.get_services()
        data["services"] = ServiceListSerializer(services, many=True, context={"request": request}).data

        return Response(data)
