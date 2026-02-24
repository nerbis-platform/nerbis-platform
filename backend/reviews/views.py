from django.shortcuts import render
# backend/reviews/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from .models import Review, ReviewHelpful
from .serializers import ReviewSerializer, CreateReviewSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet para reviews.
    
    GET /api/reviews/                     - Listar todas las reviews aprobadas
    GET /api/reviews/?product_id=1        - Reviews de un producto
    GET /api/reviews/?service_id=1        - Reviews de un servicio
    GET /api/reviews/?rating=5            - Filtrar por rating
    POST /api/reviews/                    - Crear review
    POST /api/reviews/{id}/helpful/       - Marcar como útil
    GET /api/reviews/my-reviews/          - Mis reviews
    """
    
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = Review.objects.filter(
            tenant=self.request.tenant
        ).select_related('user').prefetch_related('images')
        
        # Solo mostrar aprobadas a usuarios normales
        if not self.request.user.is_staff:
            queryset = queryset.filter(status='approved')
        
        # Filtro por producto
        product_id = self.request.query_params.get('product_id')
        if product_id:
            from ecommerce.models import Product
            content_type = ContentType.objects.get_for_model(Product)
            queryset = queryset.filter(
                content_type=content_type,
                object_id=product_id
            )
        
        # Filtro por servicio
        service_id = self.request.query_params.get('service_id')
        if service_id:
            from services.models import Service
            content_type = ContentType.objects.get_for_model(Service)
            queryset = queryset.filter(
                content_type=content_type,
                object_id=service_id
            )
        
        # Filtro por rating
        rating = self.request.query_params.get('rating')
        if rating:
            queryset = queryset.filter(rating=rating)
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateReviewSerializer
        return ReviewSerializer
    
    def perform_create(self, serializer):
        """Crear review"""
        serializer.save()
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def helpful(self, request, pk=None):
        """
        POST /api/reviews/{id}/helpful/
        
        Marcar review como útil (o quitar el voto).
        """
        review = self.get_object()
        
        # Verificar si ya votó
        vote, created = ReviewHelpful.objects.get_or_create(
            tenant=request.tenant,
            review=review,
            user=request.user
        )
        
        if not created:
            # Ya había votado, remover voto
            vote.delete()
            review.helpful_count -= 1
            review.save()
            return Response({
                'message': 'Voto removido',
                'helpful_count': review.helpful_count,
                'has_voted': False
            })
        else:
            # Nuevo voto
            review.helpful_count += 1
            review.save()
            return Response({
                'message': 'Marcado como útil',
                'helpful_count': review.helpful_count,
                'has_voted': True
            })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='my-reviews')
    def my_reviews(self, request):
        """
        GET /api/reviews/my-reviews/

        Obtener las reviews del usuario actual.
        """
        reviews = Review.objects.filter(
            tenant=request.tenant,
            user=request.user
        ).select_related('user').prefetch_related('images').order_by('-created_at')
        
        serializer = self.get_serializer(reviews, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='can-review')
    def can_review(self, request):
        """
        GET /api/reviews/can-review/?product_id=1
        GET /api/reviews/can-review/?service_id=1
        
        Verificar si el usuario puede hacer review de un item.
        """
        if not request.user.is_authenticated:
            return Response({
                'can_review': False,
                'reason': 'Debes iniciar sesión'
            })
        
        product_id = request.query_params.get('product_id')
        service_id = request.query_params.get('service_id')
        
        if not product_id and not service_id:
            return Response({
                'error': 'Debes especificar product_id o service_id'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Determinar el item
        if product_id:
            from ecommerce.models import Product
            try:
                item = Product.objects.get(id=product_id, tenant=request.tenant)
                content_type = ContentType.objects.get_for_model(Product)
            except Product.DoesNotExist:
                return Response({
                    'error': 'Producto no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            from services.models import Service
            try:
                item = Service.objects.get(id=service_id, tenant=request.tenant)
                content_type = ContentType.objects.get_for_model(Service)
            except Service.DoesNotExist:
                return Response({
                    'error': 'Servicio no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Verificar si ya hizo review
        existing_review = Review.objects.filter(
            tenant=request.tenant,
            user=request.user,
            content_type=content_type,
            object_id=item.id
        ).first()
        
        if existing_review:
            return Response({
                'can_review': False,
                'reason': 'Ya has hecho un review para este item',
                'existing_review': ReviewSerializer(existing_review, context={'request': request}).data
            })
        
        # Verificar si compró el item
        from orders.models import Order, OrderItem, OrderServiceItem
        
        if content_type.model == 'product':
            has_purchased = OrderItem.objects.filter(
                order__tenant=request.tenant,
                order__customer=request.user,
                order__status__in=['paid', 'completed'],
                product=item
            ).exists()
        else:
            has_purchased = OrderServiceItem.objects.filter(
                order__tenant=request.tenant,
                order__customer=request.user,
                order__status__in=['paid', 'completed'],
                service=item
            ).exists()
        
        return Response({
            'can_review': True,
            'has_purchased': has_purchased,
            'message': 'Puedes hacer un review' if has_purchased else 'Puedes hacer un review (no verificado)'
        })


class ProductReviewsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet específico para reviews de productos.
    
    GET /api/products/{product_id}/reviews/  - Reviews del producto
    """
    
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        from ecommerce.models import Product
        # El router nested usa 'product_pk' como lookup
        product_id = self.kwargs.get('product_pk') or self.kwargs.get('product_id')
        content_type = ContentType.objects.get_for_model(Product)
        
        queryset = Review.objects.filter(
            tenant=self.request.tenant,
            content_type=content_type,
            object_id=product_id,
            status='approved'
        ).select_related('user').prefetch_related('images')
        
        # Filtro por rating
        rating = self.request.query_params.get('rating')
        if rating:
            queryset = queryset.filter(rating=rating)
        
        return queryset.order_by('-created_at')


class ServiceReviewsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet específico para reviews de servicios.
    
    GET /api/services/{service_id}/reviews/  - Reviews del servicio
    """
    
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        from services.models import Service
        # El router nested usa 'service_pk' como lookup
        service_id = self.kwargs.get('service_pk') or self.kwargs.get('service_id')
        content_type = ContentType.objects.get_for_model(Service)
        
        queryset = Review.objects.filter(
            tenant=self.request.tenant,
            content_type=content_type,
            object_id=service_id,
            status='approved'
        ).select_related('user').prefetch_related('images')
        
        # Filtro por rating
        rating = self.request.query_params.get('rating')
        if rating:
            queryset = queryset.filter(rating=rating)
        
        return queryset.order_by('-created_at')
