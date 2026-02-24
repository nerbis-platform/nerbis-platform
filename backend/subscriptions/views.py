# backend/subscriptions/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from datetime import date, timedelta

from .models import MarketplaceCategory, MarketplacePlan, MarketplaceContract
from .serializers import (
    MarketplaceCategorySerializer,
    MarketplacePlanListSerializer,
    MarketplacePlanDetailSerializer,
    MarketplaceContractSerializer,
    CreateContractSerializer,
)


class MarketplaceCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para categorías de servicios.
    Solo lectura para clientes.
    """
    serializer_class = MarketplaceCategorySerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    pagination_class = None  # Deshabilitar paginación

    def get_queryset(self):
        """Solo categorías activas con planes activos"""
        return MarketplaceCategory.objects.filter(
            is_active=True
        ).prefetch_related('plans')

    @action(detail=True, methods=['get'])
    def plans(self, request, slug=None):
        """Obtener todos los planes de una categoría"""
        category = self.get_object()
        plans = MarketplacePlan.objects.filter(
            category=category,
            is_active=True
        ).order_by('order', 'name')

        serializer = MarketplacePlanListSerializer(plans, many=True)
        return Response(serializer.data)


class MarketplacePlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para planes de servicios.
    Solo lectura para clientes.
    """
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    pagination_class = None  # Deshabilitar paginación

    def get_queryset(self):
        """Solo planes activos"""
        queryset = MarketplacePlan.objects.filter(
            is_active=True
        ).select_related('category')

        # Filtrar por categoría si se especifica
        category_slug = self.request.query_params.get('category', None)
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        # Filtrar solo destacados
        featured = self.request.query_params.get('featured', None)
        if featured == 'true':
            queryset = queryset.filter(is_featured=True)

        return queryset.order_by('order', 'name')

    def get_serializer_class(self):
        """Usar serializer diferente para detalle"""
        if self.action == 'retrieve':
            return MarketplacePlanDetailSerializer
        return MarketplacePlanListSerializer


class MarketplaceContractViewSet(viewsets.ModelViewSet):
    """
    ViewSet para contratos de servicios.
    Los clientes solo pueden ver sus propios contratos.
    """
    serializer_class = MarketplaceContractSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Contratos del usuario actual"""
        return MarketplaceContract.objects.filter(
            customer=self.request.user
        ).select_related(
            'service_plan',
            'service_plan__category',
            'order'
        ).order_by('-created_at')

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Obtener solo contratos activos"""
        contracts = self.get_queryset().filter(status='active')
        serializer = self.get_serializer(contracts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancelar un contrato"""
        contract = self.get_object()

        if contract.status == 'cancelled':
            return Response(
                {'error': 'Este contrato ya está cancelado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        contract.status = 'cancelled'
        contract.save()

        serializer = self.get_serializer(contract)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def purchase_plan(request):
    """
    Endpoint para comprar un plan (crear un contrato).
    Este endpoint agrega el plan al carrito o crea una orden directa.
    """
    serializer = CreateContractSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    plan = MarketplacePlan.objects.get(id=serializer.validated_data['service_plan_id'])

    # Verificar si el usuario ya tiene un contrato activo de este plan
    existing_contract = MarketplaceContract.objects.filter(
        customer=request.user,
        service_plan=plan,
        status__in=['pending', 'active']
    ).first()

    if existing_contract:
        return Response(
            {'error': 'Ya tienes un contrato activo o pendiente de este plan'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Por ahora, retornamos info del plan para agregarlo al carrito
    # En una implementación completa, esto se integraría con el sistema de órdenes
    return Response({
        'plan': MarketplacePlanDetailSerializer(plan).data,
        'message': 'Plan listo para agregar al carrito'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def featured_plans(request):
    """Obtener planes destacados para la página principal"""
    plans = MarketplacePlan.objects.filter(
        is_active=True,
        is_featured=True
    ).select_related('category').order_by('order', 'name')[:6]

    serializer = MarketplacePlanListSerializer(plans, many=True)
    return Response(serializer.data)
