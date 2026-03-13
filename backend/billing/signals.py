# backend/billing/signals.py
"""
Signals para billing modular:
1. Auto-creación de suscripción al crear tenant
2. Sincronización de módulos cuando cambia la suscripción
3. Tracking automático de uso facturable
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


# ===================================
# AUTO-CREACIÓN DE SUSCRIPCIÓN
# ===================================

@receiver(post_save, sender='core.Tenant')
def create_subscription_on_tenant_create(sender, instance, created, **kwargs):
    """
    Crea automáticamente una suscripción cuando se crea un nuevo tenant.
    La suscripción inicia en estado 'trial' con NERBIS Web incluido.
    """
    if created:
        from .models import Subscription, PricingConfig

        # Verificar si ya tiene suscripción (por si acaso)
        if hasattr(instance, 'subscription'):
            return

        try:
            from .models import Module
            web_module = Module.objects.filter(slug='web', is_active=True).first()
            if web_module:
                trial_days = web_module.trial_days
            else:
                config = PricingConfig.get_current()
                trial_days = config.trial_days if config else 14

            now = timezone.now()
            trial_end = now + timezone.timedelta(days=trial_days)

            Subscription.objects.create(
                tenant=instance,
                status='trial',
                billing_period='monthly',
                started_at=now,
                current_period_start=now,
                current_period_end=trial_end,
                trial_ends_at=trial_end,
            )
            logger.info(f"Suscripción creada automáticamente para {instance.name}")
        except Exception as e:
            logger.error(f"Error creando suscripción para {instance.name}: {e}")


# ===================================
# SINCRONIZACIÓN DE MÓDULOS
# ===================================

@receiver(post_save, sender='billing.Subscription')
def add_base_module_on_subscription_create(sender, instance, created, **kwargs):
    """
    Agrega automáticamente el módulo base (NERBIS Web) al crear una suscripción.
    Esto asegura que todo cliente nuevo tenga el servicio base incluido.
    """
    if created:
        from .models import Module, SubscriptionModule
        try:
            base_module = Module.objects.filter(is_base=True, is_active=True).first()
            if base_module:
                SubscriptionModule.objects.get_or_create(
                    subscription=instance,
                    module=base_module,
                    defaults={
                        'is_active': True,
                        'price_locked': base_module.monthly_price,
                    }
                )
                logger.info(f"Módulo base '{base_module.name}' agregado a {instance.tenant.name}")
        except Exception as e:
            logger.error(f"Error agregando módulo base: {e}")


@receiver(post_save, sender='billing.Subscription')
def sync_modules_on_subscription_save(sender, instance, created, **kwargs):
    """
    Sincroniza los módulos del tenant cuando:
    - Se crea una nueva suscripción
    - Cambia el estado de la suscripción

    Solo sincroniza si la suscripción está activa (trial o active).
    """
    try:
        instance.sync_modules_to_tenant()
        logger.info(f"Módulos sincronizados para {instance.tenant.name}")
    except Exception as e:
        logger.error(f"Error sincronizando módulos para {instance.tenant.name}: {e}")


@receiver(post_save, sender='billing.SubscriptionModule')
def sync_modules_on_module_change(sender, instance, created, **kwargs):
    """
    Sincroniza los módulos del tenant cuando:
    - Se agrega un nuevo módulo a la suscripción
    - Se activa/desactiva un módulo
    """
    subscription = instance.subscription
    if not subscription:
        return

    try:
        subscription.sync_modules_to_tenant()
        action = "agregado" if created else "actualizado"
        logger.info(
            f"Módulo {instance.module.name} {action} para {subscription.tenant.name}"
        )
    except Exception as e:
        logger.error(
            f"Error sincronizando módulo {instance.module.name} "
            f"para {subscription.tenant.name}: {e}"
        )


@receiver(post_delete, sender='billing.SubscriptionModule')
def sync_modules_on_module_delete(sender, instance, **kwargs):
    """
    Sincroniza los módulos del tenant cuando se elimina un módulo.
    """
    subscription = instance.subscription
    if not subscription:
        return

    try:
        subscription.sync_modules_to_tenant()
        logger.info(
            f"Módulo {instance.module.name} eliminado de {subscription.tenant.name}"
        )
    except Exception as e:
        logger.error(
            f"Error sincronizando tras eliminar módulo {instance.module.name}: {e}"
        )


# ===================================
# TRACKING DE USO
# ===================================

@receiver(post_save, sender='bookings.Appointment')
def track_appointment_usage(sender, instance, created, **kwargs):
    """
    Registra el uso de una cita cuando se crea o confirma.

    Solo cuenta citas en estado 'confirmed' o 'completed'.
    """
    from .services import UsageTracker

    # Solo registrar uso para citas confirmadas o completadas
    if instance.status not in ('confirmed', 'completed'):
        return

    # Verificar si ya existe un registro de uso para esta cita
    from .models import UsageRecord
    from django.contrib.contenttypes.models import ContentType

    content_type = ContentType.objects.get_for_model(instance)
    existing = UsageRecord.objects.filter(
        content_type=content_type,
        object_id=str(instance.pk),
        resource='appointment',
    ).exists()

    if existing:
        return  # Ya registrado

    # Obtener tenant de la cita
    tenant = instance.tenant
    if not tenant:
        return

    # Registrar uso
    description = f"Cita #{instance.pk}"
    if hasattr(instance, 'service') and instance.service:
        customer_name = 'Cliente'
        if instance.customer:
            customer_name = instance.customer.get_full_name()
        description = f"{instance.service.name} - {customer_name}"

    UsageTracker.record_usage(
        tenant=tenant,
        resource='appointment',
        quantity=1,
        reference_object=instance,
        description=description,
    )


# ===================================
# LEGACY SIGNAL (para compatibilidad con Plan)
# ===================================

@receiver(post_save, sender='billing.Subscription')
def legacy_sync_plan_modules(sender, instance, created, **kwargs):
    """
    [DEPRECATED] Mantiene compatibilidad con el modelo Plan antiguo.
    Este signal será removido cuando se complete la migración.
    """
    # Solo ejecutar si la suscripción tiene un plan (legacy)
    if hasattr(instance, 'plan') and instance.plan:
        try:
            instance.plan.sync_modules_to_tenant(instance.tenant)
            logger.debug(
                f"[LEGACY] Módulos sincronizados desde Plan para {instance.tenant.name}"
            )
        except Exception as e:
            logger.debug(f"[LEGACY] Error sincronizando Plan: {e}")
