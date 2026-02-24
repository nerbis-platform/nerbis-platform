# backend/core/management/commands/manage_tenant_admin.py
"""
Management Command: Gestionar Administradores de Tenant
========================================================

Este comando permite crear o promover usuarios a administradores de un tenant específico.

Uso:
    # Promover un usuario existente a admin
    python manage.py manage_tenant_admin --email admin@example.com --tenant gc-belleza --promote

    # Crear un nuevo admin para un tenant
    python manage.py manage_tenant_admin --email nuevo@example.com --tenant gc-belleza --create --password "contraseña123"

    # Listar admins de un tenant
    python manage.py manage_tenant_admin --tenant gc-belleza --list

    # Ver info de un usuario
    python manage.py manage_tenant_admin --email admin@example.com --tenant gc-belleza --info
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password


class Command(BaseCommand):
    help = "Gestiona administradores de tenant (crear, promover, listar)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            type=str,
            help="Email del usuario",
        )
        parser.add_argument(
            "--tenant",
            type=str,
            required=True,
            help="Slug del tenant (ej: gc-belleza)",
        )
        parser.add_argument(
            "--promote",
            action="store_true",
            help="Promover usuario existente a admin del tenant",
        )
        parser.add_argument(
            "--create",
            action="store_true",
            help="Crear nuevo usuario admin",
        )
        parser.add_argument(
            "--password",
            type=str,
            help="Contraseña para nuevo usuario (solo con --create)",
        )
        parser.add_argument(
            "--first-name",
            type=str,
            default="Admin",
            help="Nombre del nuevo usuario",
        )
        parser.add_argument(
            "--last-name",
            type=str,
            default="",
            help="Apellido del nuevo usuario",
        )
        parser.add_argument(
            "--list",
            action="store_true",
            help="Listar todos los admins del tenant",
        )
        parser.add_argument(
            "--info",
            action="store_true",
            help="Mostrar información de un usuario",
        )
        parser.add_argument(
            "--demote",
            action="store_true",
            help="Degradar admin a customer",
        )

    def handle(self, *args, **options):
        from core.models import Tenant

        tenant_slug = options["tenant"]

        # Obtener tenant
        try:
            tenant = Tenant.objects.get(slug=tenant_slug)
        except Tenant.DoesNotExist:
            raise CommandError(f"Tenant '{tenant_slug}' no encontrado")

        self.stdout.write(f"\n🏢 Tenant: {tenant.name} ({tenant.slug})\n")

        if options["list"]:
            self._list_admins(tenant)
        elif options["info"]:
            if not options["email"]:
                raise CommandError("Se requiere --email para --info")
            self._show_user_info(tenant, options["email"])
        elif options["promote"]:
            if not options["email"]:
                raise CommandError("Se requiere --email para --promote")
            self._promote_user(tenant, options["email"])
        elif options["demote"]:
            if not options["email"]:
                raise CommandError("Se requiere --email para --demote")
            self._demote_user(tenant, options["email"])
        elif options["create"]:
            if not options["email"]:
                raise CommandError("Se requiere --email para --create")
            if not options["password"]:
                raise CommandError("Se requiere --password para --create")
            self._create_admin(
                tenant,
                options["email"],
                options["password"],
                options["first_name"],
                options["last_name"],
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "Especifica una acción: --list, --info, --promote, --demote, o --create"
                )
            )

    def _list_admins(self, tenant):
        """Lista todos los administradores del tenant"""
        User = get_user_model()
        admins = User.objects.filter(tenant=tenant, role="admin")

        self.stdout.write(self.style.SUCCESS(f"📋 Administradores del tenant:\n"))

        if not admins.exists():
            self.stdout.write(self.style.WARNING("   No hay administradores configurados"))
            return

        for admin in admins:
            active = "✅" if admin.is_active else "❌"
            if admin.is_superuser:
                acceso = "⚠️  SUPERUSER (ve todos los tenants)"
            elif admin.is_staff:
                acceso = "✅ Admin de tenant (solo este tenant)"
            else:
                acceso = "❌ Sin acceso a Django Admin"

            self.stdout.write(
                f"   - {admin.email}\n"
                f"     Nombre: {admin.get_full_name() or 'N/A'}\n"
                f"     Activo: {active}\n"
                f"     Acceso: {acceso}\n"
            )

    def _show_user_info(self, tenant, email):
        """Muestra información detallada de un usuario"""
        User = get_user_model()

        try:
            user = User.objects.get(tenant=tenant, email__iexact=email)
        except User.DoesNotExist:
            raise CommandError(f"Usuario '{email}' no encontrado en tenant '{tenant.slug}'")

        self.stdout.write(self.style.SUCCESS(f"👤 Información del usuario:\n"))
        self.stdout.write(f"   Email: {user.email}")
        self.stdout.write(f"   Username: {user.username}")
        self.stdout.write(f"   Nombre: {user.get_full_name() or 'N/A'}")
        self.stdout.write(f"   Rol: {user.get_role_display()} ({user.role})")
        self.stdout.write(f"   Activo: {'✅ Sí' if user.is_active else '❌ No'}")
        self.stdout.write(f"   is_staff: {'✅ Sí' if user.is_staff else '❌ No'}")
        self.stdout.write(f"   is_superuser: {'✅ Sí' if user.is_superuser else '❌ No'}")
        self.stdout.write(f"   Fecha registro: {user.date_joined.strftime('%Y-%m-%d %H:%M')}")

        # Verificar tipo de acceso
        if user.is_superuser:
            self.stdout.write(self.style.WARNING(
                "\n   ⚠️  SUPERUSUARIO: Ve TODOS los tenants en Django Admin"
            ))
        elif user.role == "admin" and user.is_staff:
            self.stdout.write(self.style.SUCCESS(
                f"\n   ✅ Admin de tenant: Accede a /admin/ y ve solo '{tenant.name}'"
            ))
        elif user.role == "admin" and not user.is_staff:
            self.stdout.write(self.style.WARNING(
                "\n   ⚠️  Tiene rol 'admin' pero NO puede acceder al Django Admin\n"
                f"      Ejecuta: python manage.py manage_tenant_admin --email {email} --tenant {tenant.slug} --promote"
            ))
        else:
            self.stdout.write(f"\n   ℹ️  Rol actual: {user.role} (sin acceso a Django Admin)")

    def _promote_user(self, tenant, email):
        """Promueve un usuario a admin del tenant (sin is_superuser)"""
        User = get_user_model()

        try:
            user = User.objects.get(tenant=tenant, email__iexact=email)
        except User.DoesNotExist:
            raise CommandError(f"Usuario '{email}' no encontrado en tenant '{tenant.slug}'")

        # Actualizar permisos (SIN is_superuser para aislamiento por tenant)
        user.role = "admin"
        user.is_staff = True
        user.is_superuser = False  # NO dar superuser, solo admin de su tenant
        user.is_active = True
        user.save()

        self.stdout.write(self.style.SUCCESS(f"✅ Usuario '{email}' promovido a administrador del tenant\n"))
        self.stdout.write(f"   - role: admin")
        self.stdout.write(f"   - is_staff: True (acceso a Django Admin)")
        self.stdout.write(f"   - is_superuser: False (solo ve su tenant)")
        self.stdout.write(f"   - is_active: True")
        self.stdout.write(self.style.SUCCESS(f"\n   🔐 Puede acceder a /admin/ y ver solo datos de '{tenant.name}'"))

    def _demote_user(self, tenant, email):
        """Degrada un admin a customer"""
        User = get_user_model()

        try:
            user = User.objects.get(tenant=tenant, email__iexact=email)
        except User.DoesNotExist:
            raise CommandError(f"Usuario '{email}' no encontrado en tenant '{tenant.slug}'")

        user.role = "customer"
        user.is_staff = False
        user.is_superuser = False
        user.save()

        self.stdout.write(self.style.WARNING(f"⬇️  Usuario '{email}' degradado a customer\n"))
        self.stdout.write(f"   - role: customer")
        self.stdout.write(f"   - is_staff: False")
        self.stdout.write(f"   - is_superuser: False")

    def _create_admin(self, tenant, email, password, first_name, last_name):
        """Crea un nuevo usuario administrador del tenant (sin is_superuser)"""
        User = get_user_model()

        # Verificar si ya existe
        if User.objects.filter(tenant=tenant, email__iexact=email).exists():
            raise CommandError(
                f"El usuario '{email}' ya existe en el tenant.\n"
                f"Usa --promote para convertirlo en admin."
            )

        # Generar username desde email
        base_username = email.split("@")[0].lower()
        username = base_username
        counter = 1
        while User.objects.filter(tenant=tenant, username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create(
            tenant=tenant,
            email=email.lower(),
            username=username,
            first_name=first_name,
            last_name=last_name,
            password=make_password(password),
            role="admin",
            is_staff=True,
            is_superuser=False,  # NO dar superuser, solo admin de su tenant
            is_active=True,
        )

        self.stdout.write(self.style.SUCCESS(f"✅ Administrador del tenant creado exitosamente\n"))
        self.stdout.write(f"   Email: {user.email}")
        self.stdout.write(f"   Username: {user.username}")
        self.stdout.write(f"   Nombre: {user.get_full_name()}")
        self.stdout.write(self.style.WARNING(f"   Contraseña: {password}"))
        self.stdout.write(f"   is_staff: True (acceso a Django Admin)")
        self.stdout.write(f"   is_superuser: False (solo ve su tenant)")
        self.stdout.write(self.style.SUCCESS(f"\n   🔐 Puede acceder a /admin/ y ver solo datos de '{tenant.name}'"))
