# backend/billing/services.py
"""
Servicios de billing para NERBIS.

Este módulo contiene la lógica de negocio para:
- Tracking de uso (citas, SMS, etc.)
- Generación de facturas
- Verificación de límites
"""

from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from datetime import timedelta
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class UsageTracker:
    """
    Servicio para registrar y consultar uso de recursos.
    """

    @staticmethod
    def record_usage(
        tenant,
        resource,
        quantity=1,
        reference_object=None,
        description=""
    ):
        """
        Registra el uso de un recurso facturable.

        Args:
            tenant: Tenant que usa el recurso
            resource: Tipo de recurso ('appointment', 'sms', 'whatsapp')
            quantity: Cantidad usada (default: 1)
            reference_object: Objeto relacionado (ej: Appointment instance)
            description: Descripción del uso

        Returns:
            UsageRecord or None if tenant has no subscription
        """
        from .models import UsageRecord

        # Verificar que el tenant tiene suscripción
        if not hasattr(tenant, 'subscription'):
            logger.warning(f"Tenant {tenant.name} no tiene suscripción")
            return None

        subscription = tenant.subscription
        now = timezone.now()

        # Determinar el período de facturación actual
        period_start = subscription.current_period_start.date() if subscription.current_period_start else now.date()
        period_end = subscription.current_period_end.date() if subscription.current_period_end else (now + timedelta(days=30)).date()

        # Obtener precio del extra
        price_map = {
            'appointment': subscription.plan.extra_appointment_price,
            'sms': subscription.plan.extra_sms_price,
            'whatsapp': subscription.plan.extra_whatsapp_price,
        }
        unit_price = price_map.get(resource)

        # Preparar referencia al objeto
        content_type = None
        object_id = ""
        if reference_object:
            content_type = ContentType.objects.get_for_model(reference_object)
            object_id = str(reference_object.pk)

        # Crear registro de uso
        usage = UsageRecord.objects.create(
            subscription=subscription,
            resource=resource,
            quantity=quantity,
            period_start=period_start,
            period_end=period_end,
            content_type=content_type,
            object_id=object_id,
            unit_price=unit_price,
            description=description[:255] if description else "",
        )

        logger.info(f"Uso registrado: {resource} x{quantity} para {tenant.name}")
        return usage

    @staticmethod
    def get_current_usage(subscription, resource):
        """
        Obtiene el uso actual de un recurso en el período actual.

        Args:
            subscription: Subscription instance
            resource: Tipo de recurso

        Returns:
            int: Total de uso en el período actual
        """
        from .models import UsageRecord
        from django.db.models import Sum

        if not subscription.current_period_start:
            return 0

        period_start = subscription.current_period_start.date()

        result = UsageRecord.objects.filter(
            subscription=subscription,
            resource=resource,
            period_start=period_start,
        ).aggregate(total=Sum('quantity'))

        return result['total'] or 0

    @staticmethod
    def get_billable_usage(subscription, resource):
        """
        Calcula el uso que excede el límite incluido (facturable).

        Args:
            subscription: Subscription instance
            resource: Tipo de recurso

        Returns:
            dict: {'total': int, 'included': int, 'billable': int}
        """
        total = UsageTracker.get_current_usage(subscription, resource)
        included = getattr(subscription.plan, f'included_{resource}s', 0)

        # Si es ilimitado (0), no hay uso facturable
        if included == 0:
            return {
                'total': total,
                'included': None,  # Ilimitado
                'billable': 0,
            }

        billable = max(0, total - included)

        return {
            'total': total,
            'included': included,
            'billable': billable,
        }

    @staticmethod
    def check_limit(tenant, resource, additional=1):
        """
        Verifica si el tenant puede usar más de un recurso.

        Para recursos pay-as-you-go (citas, SMS) siempre retorna True.
        Para recursos fijos (empleados) verifica el límite.

        Args:
            tenant: Tenant instance
            resource: Tipo de recurso
            additional: Cantidad adicional a verificar

        Returns:
            dict: {'allowed': bool, 'current': int, 'limit': int or None, 'is_over': bool}
        """
        if not hasattr(tenant, 'subscription'):
            return {
                'allowed': False,
                'current': 0,
                'limit': 0,
                'is_over': True,
                'message': 'No tiene suscripción activa'
            }

        subscription = tenant.subscription

        # Recursos con límite fijo (no pay-as-you-go)
        if resource == 'employees':
            from services.models import StaffMember
            current = StaffMember.objects.filter(tenant=tenant, is_active=True).count()
            limit = subscription.get_limit('employees')

            if limit is None:
                return {
                    'allowed': True,
                    'current': current,
                    'limit': None,
                    'is_over': False,
                    'message': 'Sin límite'
                }

            allowed = current + additional <= limit
            return {
                'allowed': allowed,
                'current': current,
                'limit': limit,
                'is_over': current >= limit,
                'message': f'Límite: {current}/{limit} empleados' if allowed else f'Límite alcanzado ({limit} empleados)'
            }

        # Recursos pay-as-you-go (siempre permitidos, se cobran extras)
        current = UsageTracker.get_current_usage(subscription, resource)
        limit = subscription.get_limit(f'{resource}s')

        return {
            'allowed': True,
            'current': current,
            'limit': limit,
            'is_over': limit is not None and current >= limit,
            'message': 'Se cobrará como extra' if limit and current >= limit else 'Dentro del plan'
        }


class InvoiceGenerator:
    """
    Servicio para generar facturas.
    """

    @staticmethod
    def generate_invoice(subscription, period_start=None, period_end=None):
        """
        Genera una factura para el período especificado.

        Args:
            subscription: Subscription instance
            period_start: Inicio del período (default: current_period_start)
            period_end: Fin del período (default: current_period_end)

        Returns:
            Invoice instance
        """
        from .models import Invoice, InvoiceLineItem, UsageRecord
        from django.db.models import Sum

        now = timezone.now()

        # Usar período actual si no se especifica
        if not period_start:
            period_start = subscription.current_period_start.date()
        if not period_end:
            period_end = subscription.current_period_end.date()

        # Generar número de factura
        year = now.year
        month = now.month
        count = Invoice.objects.filter(
            subscription__tenant=subscription.tenant,
            created_at__year=year,
            created_at__month=month,
        ).count() + 1
        invoice_number = f"INV-{year}{month:02d}-{subscription.tenant.slug[:10].upper()}-{count:04d}"

        # Calcular montos
        # 1. Plan base
        if subscription.billing_period == 'yearly':
            subtotal_plan = subscription.plan.yearly_price or (subscription.plan.monthly_price * 12)
        else:
            subtotal_plan = subscription.plan.monthly_price

        # 2. Extras fijos (empleados adicionales)
        subtotal_extras = Decimal('0')
        if subscription.extra_employees > 0:
            subtotal_extras = subscription.extra_employees * subscription.plan.extra_employee_price

        # 3. Uso adicional (pay-as-you-go)
        subtotal_usage = Decimal('0')
        usage_details = []

        for resource in ['appointment', 'sms', 'whatsapp']:
            usage = UsageTracker.get_billable_usage(subscription, resource)
            if usage['billable'] > 0:
                price_field = f'extra_{resource}_price'
                unit_price = getattr(subscription.plan, price_field)
                total_extra = usage['billable'] * unit_price
                subtotal_usage += total_extra
                usage_details.append({
                    'resource': resource,
                    'billable': usage['billable'],
                    'unit_price': unit_price,
                    'total': total_extra,
                })

        # Calcular IVA (19% en Colombia)
        subtotal = subtotal_plan + subtotal_extras + subtotal_usage
        tax = subtotal * Decimal('0.19')
        total = subtotal + tax

        # Crear factura
        invoice = Invoice.objects.create(
            subscription=subscription,
            number=invoice_number,
            period_start=period_start,
            period_end=period_end,
            subtotal_plan=subtotal_plan,
            subtotal_extras=subtotal_extras,
            subtotal_usage=subtotal_usage,
            tax=tax,
            total=total,
            status='pending',
            issued_at=now,
            due_at=now + timedelta(days=15),  # 15 días para pagar
        )

        # Crear líneas de factura
        # Línea del plan
        InvoiceLineItem.objects.create(
            invoice=invoice,
            line_type='plan',
            description=f"Plan {subscription.plan.name} ({subscription.get_billing_period_display()})",
            quantity=1,
            unit_price=subtotal_plan,
            total=subtotal_plan,
        )

        # Línea de empleados adicionales
        if subscription.extra_employees > 0:
            InvoiceLineItem.objects.create(
                invoice=invoice,
                line_type='extra_employee',
                description=f"Empleados adicionales ({subscription.extra_employees})",
                quantity=subscription.extra_employees,
                unit_price=subscription.plan.extra_employee_price,
                total=subtotal_extras,
            )

        # Líneas de uso adicional
        for detail in usage_details:
            resource_names = {
                'appointment': 'Citas adicionales',
                'sms': 'SMS adicionales',
                'whatsapp': 'WhatsApp adicionales',
            }
            line_type = f'usage_{detail["resource"]}'
            InvoiceLineItem.objects.create(
                invoice=invoice,
                line_type=line_type,
                description=resource_names[detail['resource']],
                quantity=detail['billable'],
                unit_price=detail['unit_price'],
                total=detail['total'],
            )

        # Línea de IVA
        if tax > 0:
            InvoiceLineItem.objects.create(
                invoice=invoice,
                line_type='tax',
                description='IVA (19%)',
                quantity=1,
                unit_price=tax,
                total=tax,
            )

        # Marcar registros de uso como facturados
        UsageRecord.objects.filter(
            subscription=subscription,
            period_start=period_start,
            invoice__isnull=True,
        ).update(invoice=invoice)

        logger.info(f"Factura generada: {invoice_number} - ${total:,.0f}")
        return invoice

    @staticmethod
    def get_usage_summary(subscription):
        """
        Obtiene un resumen del uso actual para mostrar al usuario.

        Returns:
            dict con el resumen de uso por recurso
        """
        summary = {}

        for resource in ['appointments', 'employees', 'sms', 'whatsapp']:
            if resource == 'employees':
                from services.models import StaffMember
                current = StaffMember.objects.filter(
                    tenant=subscription.tenant,
                    is_active=True
                ).count()
            else:
                current = UsageTracker.get_current_usage(subscription, resource.rstrip('s'))

            limit = subscription.get_limit(resource)
            included = getattr(subscription.plan, f'included_{resource}', 0)

            summary[resource] = {
                'current': current,
                'included': included if included > 0 else None,
                'limit': limit,
                'is_unlimited': included == 0,
                'percentage': (current / included * 100) if included > 0 else 0,
                'over_limit': current > included if included > 0 else False,
            }

        return summary


class SubscriptionManager:
    """
    Servicio para gestionar suscripciones.
    """

    @staticmethod
    def create_trial_subscription(tenant, plan_slug='starter', trial_days=14):
        """
        Crea una suscripción de prueba para un nuevo tenant.

        Args:
            tenant: Tenant instance
            plan_slug: Slug del plan inicial (default: starter)
            trial_days: Días de prueba (default: 14)

        Returns:
            Subscription instance
        """
        from .models import Plan, Subscription

        plan = Plan.objects.get(slug=plan_slug)
        now = timezone.now()

        subscription = Subscription.objects.create(
            tenant=tenant,
            plan=plan,
            status='trial',
            started_at=now,
            current_period_start=now,
            current_period_end=now + timedelta(days=trial_days),
            trial_ends_at=now + timedelta(days=trial_days),
        )

        logger.info(f"Suscripción de prueba creada para {tenant.name}: {trial_days} días")
        return subscription

    @staticmethod
    def upgrade_plan(subscription, new_plan_slug, billing_period='monthly'):
        """
        Actualiza el plan de una suscripción.

        Args:
            subscription: Subscription instance
            new_plan_slug: Slug del nuevo plan
            billing_period: 'monthly' o 'yearly'

        Returns:
            Subscription instance actualizada
        """
        from .models import Plan

        new_plan = Plan.objects.get(slug=new_plan_slug)
        now = timezone.now()

        subscription.plan = new_plan
        subscription.billing_period = billing_period
        subscription.status = 'active'
        subscription.current_period_start = now
        subscription.trial_ends_at = None

        # Calcular fin del período según billing_period
        if billing_period == 'yearly':
            subscription.current_period_end = now + timedelta(days=365)
        else:
            subscription.current_period_end = now + timedelta(days=30)

        subscription.save()

        logger.info(f"Plan actualizado para {subscription.tenant.name}: {new_plan.name}")
        return subscription

    @staticmethod
    def cancel_subscription(subscription, at_period_end=True):
        """
        Cancela una suscripción.

        Args:
            subscription: Subscription instance
            at_period_end: Si True, cancela al final del período actual

        Returns:
            Subscription instance
        """
        now = timezone.now()

        if at_period_end:
            subscription.canceled_at = subscription.current_period_end
            logger.info(f"Suscripción de {subscription.tenant.name} será cancelada el {subscription.current_period_end}")
        else:
            subscription.status = 'canceled'
            subscription.canceled_at = now
            logger.info(f"Suscripción de {subscription.tenant.name} cancelada inmediatamente")

        subscription.save()
        return subscription

    @staticmethod
    def check_expired_subscriptions():
        """
        Verifica y marca suscripciones expiradas.

        Ejecutar como tarea programada (Celery beat).
        """
        from .models import Subscription

        now = timezone.now()

        # Marcar trials expirados
        expired_trials = Subscription.objects.filter(
            status='trial',
            trial_ends_at__lt=now,
        )
        count_trials = expired_trials.update(status='expired')

        # Marcar suscripciones con período vencido
        expired_subscriptions = Subscription.objects.filter(
            status='active',
            current_period_end__lt=now,
        )
        count_subs = expired_subscriptions.update(status='past_due')

        logger.info(f"Suscripciones actualizadas: {count_trials} trials expirados, {count_subs} con pago pendiente")

        return {
            'expired_trials': count_trials,
            'past_due': count_subs,
        }
