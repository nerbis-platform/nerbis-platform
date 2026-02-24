# backend/coupons/views.py

from decimal import Decimal
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Coupon
from .serializers import (
    CouponSerializer,
    CouponValidateSerializer,
    CouponApplySerializer,
    AppliedCouponSerializer,
)
from cart.models import Cart


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_coupon(request):
    """
    Valida un cupón sin aplicarlo.
    Útil para verificar si un cupón es válido antes de aplicarlo.
    """
    serializer = CouponValidateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    code = serializer.validated_data['code']
    tenant = request.tenant

    try:
        coupon = Coupon.objects.get(
            tenant=tenant,
            code__iexact=code
        )
    except Coupon.DoesNotExist:
        return Response(
            {'error': 'Cupón no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Validar para el usuario
    is_valid, error_message = coupon.validate_for_user(request.user)
    if not is_valid:
        return Response(
            {'error': error_message},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Obtener el carrito para validar monto mínimo
    try:
        cart = Cart.objects.get(user=request.user, tenant=tenant)
        subtotal = cart.subtotal
    except Cart.DoesNotExist:
        subtotal = 0

    # Validar monto mínimo
    is_valid, error_message = coupon.validate_for_amount(subtotal)
    if not is_valid:
        return Response(
            {'error': error_message, 'minimum_purchase': float(coupon.minimum_purchase)},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Calcular descuento potencial
    discount_amount = coupon.calculate_discount(subtotal)

    return Response({
        'valid': True,
        'coupon': CouponSerializer(coupon).data,
        'discount_amount': float(discount_amount),
        'message': f'Cupón válido: {coupon.get_discount_display()} de descuento'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_coupon(request):
    """
    Aplica un cupón al carrito del usuario.
    """
    serializer = CouponApplySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    code = serializer.validated_data['code']
    tenant = request.tenant

    try:
        coupon = Coupon.objects.get(
            tenant=tenant,
            code__iexact=code
        )
    except Coupon.DoesNotExist:
        return Response(
            {'error': 'Cupón no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Validar para el usuario
    is_valid, error_message = coupon.validate_for_user(request.user)
    if not is_valid:
        return Response(
            {'error': error_message},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Obtener o crear carrito
    cart, created = Cart.objects.get_or_create(
        user=request.user,
        tenant=tenant
    )

    # Validar monto mínimo
    is_valid, error_message = coupon.validate_for_amount(cart.subtotal)
    if not is_valid:
        return Response(
            {'error': error_message, 'minimum_purchase': float(coupon.minimum_purchase)},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Aplicar cupón al carrito
    cart.coupon = coupon
    cart.save()

    # Calcular descuento
    discount_amount = coupon.calculate_discount(cart.subtotal)

    return Response({
        'success': True,
        'message': f'Cupón {coupon.code} aplicado correctamente',
        'coupon': AppliedCouponSerializer({
            'code': coupon.code,
            'discount_type': coupon.discount_type,
            'discount_value': coupon.discount_value,
            'discount_display': coupon.get_discount_display(),
            'discount_amount': discount_amount,
        }).data,
        'cart_subtotal': float(cart.subtotal),
        'discount_amount': float(discount_amount),
        'cart_total': float(cart.subtotal - discount_amount),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_coupon(request):
    """
    Elimina el cupón aplicado del carrito.
    """
    tenant = request.tenant

    try:
        cart = Cart.objects.get(user=request.user, tenant=tenant)
    except Cart.DoesNotExist:
        return Response(
            {'error': 'No tienes un carrito activo'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not cart.coupon:
        return Response(
            {'error': 'No hay ningún cupón aplicado'},
            status=status.HTTP_400_BAD_REQUEST
        )

    cart.coupon = None
    cart.save()

    return Response({
        'success': True,
        'message': 'Cupón eliminado correctamente',
        'cart_subtotal': float(cart.subtotal),
        'cart_total': float(cart.subtotal),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cart_coupon(request):
    """
    Obtiene el cupón actualmente aplicado al carrito.
    """
    tenant = request.tenant

    try:
        cart = Cart.objects.get(user=request.user, tenant=tenant)
    except Cart.DoesNotExist:
        return Response({'coupon': None})

    if not cart.coupon:
        return Response({'coupon': None})

    coupon = cart.coupon

    # Verificar si sigue siendo válido
    is_valid, error_message = coupon.validate_for_user(request.user)
    if not is_valid:
        # Remover cupón inválido
        cart.coupon = None
        cart.save()
        return Response({
            'coupon': None,
            'removed': True,
            'reason': error_message
        })

    discount_amount = coupon.calculate_discount(cart.subtotal)

    return Response({
        'coupon': AppliedCouponSerializer({
            'code': coupon.code,
            'discount_type': coupon.discount_type,
            'discount_value': coupon.discount_value,
            'discount_display': coupon.get_discount_display(),
            'discount_amount': discount_amount,
        }).data
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def preview_coupon(request):
    """
    Preview de cupón para usuarios anónimos.
    Valida el cupón sin requerir autenticación.
    Solo valida: existencia, estado activo, fechas de vigencia, usos globales.
    NO valida: límites por usuario, primera compra (eso se hace al aplicar realmente).
    """
    serializer = CouponValidateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    code = serializer.validated_data['code']
    subtotal = Decimal(str(request.data.get('subtotal', 0)))
    tenant = request.tenant

    try:
        coupon = Coupon.objects.get(
            tenant=tenant,
            code__iexact=code
        )
    except Coupon.DoesNotExist:
        return Response(
            {'error': 'Cupón no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Validar estado básico del cupón (sin validaciones de usuario)
    if not coupon.is_valid:
        if not coupon.is_active:
            return Response(
                {'error': 'Este cupón no está activo'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone
        now = timezone.now()
        if now < coupon.valid_from:
            return Response(
                {'error': 'Este cupón aún no está vigente'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if now > coupon.valid_until:
            return Response(
                {'error': 'Este cupón ha expirado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if coupon.max_uses and coupon.times_used >= coupon.max_uses:
            return Response(
                {'error': 'Este cupón ha alcanzado el límite de usos'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Validar monto mínimo
    is_valid, error_message = coupon.validate_for_amount(subtotal)
    if not is_valid:
        return Response(
            {'error': error_message, 'minimum_purchase': float(coupon.minimum_purchase)},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Calcular descuento
    discount_amount = coupon.calculate_discount(subtotal)

    # Advertencia si tiene restricciones de usuario
    warnings = []
    if coupon.first_purchase_only:
        warnings.append('Este cupón es solo para primera compra. Se validará al completar el pedido.')
    if coupon.max_uses_per_user and coupon.max_uses_per_user < 999:
        warnings.append(f'Límite de {coupon.max_uses_per_user} uso(s) por cliente.')

    return Response({
        'valid': True,
        'preview': True,  # Indica que es solo preview
        'coupon': {
            'code': coupon.code,
            'discount_type': coupon.discount_type,
            'discount_value': float(coupon.discount_value),
            'discount_display': coupon.get_discount_display(),
        },
        'discount_amount': float(discount_amount),
        'message': f'Cupón válido: {coupon.get_discount_display()} de descuento',
        'warnings': warnings,
    })
