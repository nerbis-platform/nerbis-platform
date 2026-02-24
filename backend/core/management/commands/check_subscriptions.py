# backend/core/management/commands/check_subscriptions.py
"""
Comando de gestión para verificar y gestionar suscripciones de tenants.

Uso:
    python manage.py check_subscriptions              # Modo seco (solo reporta)
    python manage.py check_subscriptions --execute    # Desactiva tenants expirados
    python manage.py check_subscriptions --notify     # Envía notificaciones (futuro)

Se recomienda ejecutar diariamente vía cron:
    0 1 * * * cd /path/to/project && python manage.py check_subscriptions --execute
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Tenant


class Command(BaseCommand):
    help = "Verifica y gestiona suscripciones de tenants (trials expirados, renovaciones, etc.)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Ejecutar cambios (desactivar tenants expirados). Sin esto, solo reporta.",
        )
        parser.add_argument(
            "--notify",
            action="store_true",
            help="Enviar notificaciones por email (próximamente)",
        )
        parser.add_argument(
            "--days-warning",
            type=int,
            default=7,
            help="Días antes de expirar para mostrar advertencias (default: 7)",
        )

    def handle(self, *args, **options):
        execute = options["execute"]
        notify = options["notify"]
        days_warning = options["days_warning"]
        today = timezone.now().date()

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.HTTP_INFO("  VERIFICACIÓN DE SUSCRIPCIONES"))
        self.stdout.write(f"  Fecha: {today}")
        self.stdout.write(f"  Modo: {'EJECUTAR' if execute else 'SOLO REPORTE (dry-run)'}")
        self.stdout.write("=" * 60 + "\n")

        # Estadísticas
        stats = {
            "total": 0,
            "active": 0,
            "trial_active": 0,
            "trial_expiring_soon": 0,
            "trial_expired": 0,
            "subscription_active": 0,
            "subscription_expiring_soon": 0,
            "subscription_expired": 0,
            "inactive": 0,
            "deactivated": 0,
        }

        tenants = Tenant.objects.all()
        stats["total"] = tenants.count()

        # === TENANTS YA INACTIVOS ===
        inactive_tenants = tenants.filter(is_active=False)
        stats["inactive"] = inactive_tenants.count()

        if stats["inactive"] > 0:
            self.stdout.write(self.style.WARNING(f"\n📴 Tenants ya inactivos: {stats['inactive']}"))
            for tenant in inactive_tenants[:5]:  # Mostrar máximo 5
                self.stdout.write(f"   - {tenant.name} ({tenant.slug})")
            if stats["inactive"] > 5:
                self.stdout.write(f"   ... y {stats['inactive'] - 5} más")

        # === TENANTS EN TRIAL ===
        trial_tenants = tenants.filter(is_active=True, plan="trial")

        for tenant in trial_tenants:
            if tenant.is_expired:
                stats["trial_expired"] += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"\n❌ TRIAL EXPIRADO: {tenant.name} ({tenant.slug})"
                    )
                )
                self.stdout.write(f"   Trial terminó: {tenant.subscription_ends_at}")

                if execute:
                    tenant.is_active = False
                    tenant.save(update_fields=["is_active"])
                    stats["deactivated"] += 1
                    self.stdout.write(self.style.SUCCESS("   ✓ Tenant desactivado"))

            elif tenant.days_remaining is not None and tenant.days_remaining <= days_warning:
                stats["trial_expiring_soon"] += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"\n⚠️  TRIAL POR EXPIRAR: {tenant.name} ({tenant.slug})"
                    )
                )
                self.stdout.write(
                    f"   Expira: {tenant.subscription_ends_at} ({tenant.days_remaining} días restantes)"
                )

                if notify:
                    # TODO: Enviar email de recordatorio
                    self.stdout.write("   📧 Notificación pendiente de implementar")

            else:
                stats["trial_active"] += 1

        # === TENANTS CON SUSCRIPCIÓN PAGADA ===
        paid_tenants = tenants.filter(is_active=True).exclude(plan="trial")

        for tenant in paid_tenants:
            if tenant.is_expired:
                stats["subscription_expired"] += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"\n❌ SUSCRIPCIÓN EXPIRADA: {tenant.name} ({tenant.slug})"
                    )
                )
                self.stdout.write(
                    f"   Plan: {tenant.get_plan_display()}, Terminó: {tenant.subscription_ends_at}"
                )

                if execute:
                    tenant.is_active = False
                    tenant.save(update_fields=["is_active"])
                    stats["deactivated"] += 1
                    self.stdout.write(self.style.SUCCESS("   ✓ Tenant desactivado"))

            elif tenant.days_remaining is not None and tenant.days_remaining <= days_warning:
                stats["subscription_expiring_soon"] += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"\n⚠️  SUSCRIPCIÓN POR EXPIRAR: {tenant.name} ({tenant.slug})"
                    )
                )
                self.stdout.write(
                    f"   Plan: {tenant.get_plan_display()}, Expira: {tenant.subscription_ends_at} "
                    f"({tenant.days_remaining} días restantes)"
                )

                if notify:
                    # TODO: Enviar email de recordatorio
                    self.stdout.write("   📧 Notificación pendiente de implementar")

            else:
                stats["subscription_active"] += 1

        # === RESUMEN ===
        stats["active"] = stats["trial_active"] + stats["subscription_active"]

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.HTTP_INFO("  RESUMEN"))
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Total de tenants: {stats['total']}")
        self.stdout.write(f"  ├─ Activos: {stats['active']}")
        self.stdout.write(f"  │  ├─ En trial: {stats['trial_active']}")
        self.stdout.write(f"  │  └─ Con suscripción: {stats['subscription_active']}")
        self.stdout.write(f"  ├─ Por expirar (próximos {days_warning} días):")
        self.stdout.write(f"  │  ├─ Trials: {stats['trial_expiring_soon']}")
        self.stdout.write(f"  │  └─ Suscripciones: {stats['subscription_expiring_soon']}")
        self.stdout.write(f"  ├─ Expirados:")
        self.stdout.write(f"  │  ├─ Trials: {stats['trial_expired']}")
        self.stdout.write(f"  │  └─ Suscripciones: {stats['subscription_expired']}")
        self.stdout.write(f"  └─ Ya inactivos: {stats['inactive']}")

        if execute and stats["deactivated"] > 0:
            self.stdout.write(
                self.style.SUCCESS(f"\n✓ {stats['deactivated']} tenant(s) desactivado(s)")
            )
        elif not execute and (stats["trial_expired"] + stats["subscription_expired"]) > 0:
            total_expired = stats["trial_expired"] + stats["subscription_expired"]
            self.stdout.write(
                self.style.WARNING(
                    f"\n⚠️  {total_expired} tenant(s) expirado(s). "
                    f"Ejecutar con --execute para desactivarlos."
                )
            )

        self.stdout.write("")
