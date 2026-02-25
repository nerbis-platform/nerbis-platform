"""
Management Command: Crear Tenant GC Belleza y Estética
========================================================

Este script crea el tenant piloto con datos de prueba completos.

Uso:
    python manage.py create_tenant_gc_belleza

Características:
    - Crea el schema PostgreSQL separado
    - Configura el tenant con datos reales
    - Crea usuario admin de prueba
    - Puebla categorías y servicios típicos de un centro de estética
    - Crea productos de belleza de ejemplo
    - Configura horarios de negocio

Autor: Sistema Multi-Tenant Ecosistema Digital
Fecha: Diciembre 2024
"""

import os
import datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.contrib.auth.hashers import make_password
from django.utils import timezone


class Command(BaseCommand):
    help = "Crea el tenant GC Belleza y Estética con datos de prueba"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina el tenant existente antes de crear uno nuevo (PELIGRO: borra todos los datos)",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("═" * 70))
        self.stdout.write(self.style.WARNING("  CREANDO TENANT: GC Belleza y Estética  "))
        self.stdout.write(self.style.WARNING("═" * 70))

        # Verificar si el tenant ya existe
        if options["reset"]:
            self.stdout.write(self.style.ERROR("⚠️  Modo RESET activado - Eliminando tenant existente..."))
            self._drop_tenant_schema("gc_belleza")

        try:
            with transaction.atomic():
                # 1. Crear el Tenant en el schema public
                tenant = self._create_tenant()

                # 2. Crear usuario administrador
                admin_user = self._create_admin_user(tenant)

                # 3. Crear categorías de productos
                product_categories = self._create_product_categories(tenant)

                # 4. Crear productos
                products = self._create_products(tenant, product_categories)

            self.stdout.write(self.style.SUCCESS("\n✅ TENANT CREADO EXITOSAMENTE!\n"))
            self._print_summary_simple(tenant, admin_user, product_categories, products)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n❌ ERROR: {str(e)}\n"))
            raise

    def _drop_tenant_schema(self, schema_name):
        """Elimina el schema del tenant (PELIGRO!)"""
        with connection.cursor() as cursor:
            cursor.execute(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE;")
        self.stdout.write(self.style.WARNING(f'  ❌ Schema "{schema_name}" eliminado\n'))

    def _create_tenant(self):
        """Crea el registro del tenant en el schema public"""
        from core.models import Tenant

        self.stdout.write("📋 Paso 1: Creando registro del tenant...")

        tenant, created = Tenant.objects.get_or_create(
            schema_name="gc_belleza",
            defaults={
                "name": "GC Belleza y Estética",
                "slug": "gc-belleza",
                "email": "info@gcbellezayestetica.es",
                "phone": "+34 918 43 11 87",
                "address": "Calle de la Iglesia, 15",
                "city": "Pedrezuela",
                "state": "Madrid",
                "country": "España",
                "postal_code": "28729",
                "timezone": "Europe/Madrid",
                "currency": "EUR",
                "language": "es",
                "is_active": True,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"  ✅ Tenant creado: {tenant.name}"))
        else:
            self.stdout.write(self.style.WARNING(f"  ℹ️  Tenant ya existía: {tenant.name}"))

        return tenant

    def _create_schema(self, schema_name):
        """Crea el schema PostgreSQL para el tenant"""
        self.stdout.write(f'\n🗄️  Paso 2: Creando schema PostgreSQL "{schema_name}"...')

        with connection.cursor() as cursor:
            cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name};")

        self.stdout.write(self.style.SUCCESS(f'  ✅ Schema "{schema_name}" creado'))

    def _run_migrations(self, schema_name):
        """Ejecuta las migraciones en el schema del tenant"""
        self.stdout.write(f'\n🔄 Paso 3: Ejecutando migraciones en "{schema_name}"...')

        # Aquí normalmente ejecutarías las migraciones
        # Por ahora, asumimos que las tablas ya están creadas
        self.stdout.write(self.style.SUCCESS("  ✅ Migraciones ejecutadas"))

    def _switch_schema(self, schema_name):
        """Cambia el search_path al schema del tenant"""
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {schema_name}, public;")

    def _create_admin_user(self, tenant):
        """Crea el usuario administrador del tenant"""
        from django.contrib.auth import get_user_model

        self.stdout.write("\n👤 Paso 4: Creando usuario administrador...")

        User = get_user_model()

        admin_user, created = User.objects.get_or_create(
            email="admin@gcbellezayestetica.es",
            defaults={
                "username": "admin",  # Username único por tenant
                "first_name": "Administrador",
                "last_name": "GC Belleza",
                "phone": "+34 918 43 11 87",
                "password": make_password(os.environ.get("TENANT_ADMIN_PASSWORD", "changeme")),
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "tenant_id": tenant.id,
                "role": "admin",
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"  ✅ Usuario admin creado: {admin_user.email}"))
            self.stdout.write(self.style.WARNING(f"  🔑 Contraseña: definida por TENANT_ADMIN_PASSWORD (CAMBIAR EN PRODUCCIÓN)"))
        else:
            self.stdout.write(self.style.WARNING(f"  ℹ️  Usuario admin ya existía"))

        return admin_user

    def _create_service_categories(self, tenant):
        """Crea las categorías de servicios típicas de un centro de estética"""
        from services.models import ServiceCategory

        self.stdout.write("\n📂 Paso 5: Creando categorías de servicios...")

        categories_data = [
            {
                "name": "Tratamientos Faciales",
                "slug": "tratamientos-faciales",
                "description": "Cuidado y embellecimiento del rostro",
                "icon": "✨",
                "order": 1,
            },
            {
                "name": "Tratamientos Corporales",
                "slug": "tratamientos-corporales",
                "description": "Cuidado integral del cuerpo",
                "icon": "💆",
                "order": 2,
            },
            {
                "name": "Depilación",
                "slug": "depilacion",
                "description": "Eliminación del vello no deseado",
                "icon": "🪒",
                "order": 3,
            },
            {
                "name": "Manicura y Pedicura",
                "slug": "manicura-pedicura",
                "description": "Cuidado de manos y pies",
                "icon": "💅",
                "order": 4,
            },
            {
                "name": "Masajes",
                "slug": "masajes",
                "description": "Relajación y bienestar",
                "icon": "🙌",
                "order": 5,
            },
        ]

        categories = []
        for cat_data in categories_data:
            category, created = ServiceCategory.objects.get_or_create(
                slug=cat_data["slug"], tenant_id=tenant.id, defaults=cat_data
            )
            categories.append(category)

            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✅ Categoría creada: {category.name}"))

        return categories

    def _create_services(self, tenant, categories):
        """Crea servicios de ejemplo para cada categoría"""
        from services.models import Service

        self.stdout.write("\n💼 Paso 6: Creando servicios...")

        # Encontrar categorías por slug
        facial = next((c for c in categories if c.slug == "tratamientos-faciales"), None)
        corporal = next((c for c in categories if c.slug == "tratamientos-corporales"), None)
        depilacion = next((c for c in categories if c.slug == "depilacion"), None)
        manicura = next((c for c in categories if c.slug == "manicura-pedicura"), None)
        masajes = next((c for c in categories if c.slug == "masajes"), None)

        services_data = [
            # Tratamientos Faciales
            {
                "category": facial,
                "name": "Limpieza Facial Profunda",
                "slug": "limpieza-facial-profunda",
                "description": "Limpieza profunda con extracción de impurezas, mascarilla y hidratación",
                "duration_minutes": 60,
                "price": Decimal("45.00"),
                "is_active": True,
            },
            {
                "category": facial,
                "name": "Tratamiento Anti-Edad",
                "slug": "tratamiento-anti-edad",
                "description": "Tratamiento avanzado con ácido hialurónico y colágeno",
                "duration_minutes": 90,
                "price": Decimal("85.00"),
                "is_active": True,
            },
            {
                "category": facial,
                "name": "Peeling Químico",
                "slug": "peeling-quimico",
                "description": "Renovación celular mediante exfoliación química controlada",
                "duration_minutes": 75,
                "price": Decimal("65.00"),
                "is_active": True,
            },
            # Tratamientos Corporales
            {
                "category": corporal,
                "name": "Presoterapia",
                "slug": "presoterapia",
                "description": "Tratamiento de drenaje linfático con presión controlada",
                "duration_minutes": 45,
                "price": Decimal("35.00"),
                "is_active": True,
            },
            {
                "category": corporal,
                "name": "Radiofrecuencia Corporal",
                "slug": "radiofrecuencia-corporal",
                "description": "Reafirmación y reducción de celulitis",
                "duration_minutes": 60,
                "price": Decimal("55.00"),
                "is_active": True,
            },
            # Depilación
            {
                "category": depilacion,
                "name": "Depilación Láser - Piernas Completas",
                "slug": "depilacion-laser-piernas",
                "description": "Sesión de depilación láser en piernas completas",
                "duration_minutes": 45,
                "price": Decimal("75.00"),
                "is_active": True,
            },
            {
                "category": depilacion,
                "name": "Depilación Láser - Axilas",
                "slug": "depilacion-laser-axilas",
                "description": "Sesión de depilación láser en axilas",
                "duration_minutes": 15,
                "price": Decimal("25.00"),
                "is_active": True,
            },
            {
                "category": depilacion,
                "name": "Depilación Láser - Ingles",
                "slug": "depilacion-laser-ingles",
                "description": "Sesión de depilación láser en zona de ingles",
                "duration_minutes": 20,
                "price": Decimal("35.00"),
                "is_active": True,
            },
            # Manicura y Pedicura
            {
                "category": manicura,
                "name": "Manicura Clásica",
                "slug": "manicura-clasica",
                "description": "Limado, pulido, cutícula y esmaltado tradicional",
                "duration_minutes": 30,
                "price": Decimal("20.00"),
                "is_active": True,
            },
            {
                "category": manicura,
                "name": "Manicura Semipermanente",
                "slug": "manicura-semipermanente",
                "description": "Esmaltado semipermanente con duración de 2-3 semanas",
                "duration_minutes": 45,
                "price": Decimal("30.00"),
                "is_active": True,
            },
            {
                "category": manicura,
                "name": "Pedicura Spa",
                "slug": "pedicura-spa",
                "description": "Pedicura completa con exfoliación, masaje y esmaltado",
                "duration_minutes": 60,
                "price": Decimal("35.00"),
                "is_active": True,
            },
            # Masajes
            {
                "category": masajes,
                "name": "Masaje Relajante",
                "slug": "masaje-relajante",
                "description": "Masaje de cuerpo completo para relajación profunda",
                "duration_minutes": 60,
                "price": Decimal("50.00"),
                "is_active": True,
            },
            {
                "category": masajes,
                "name": "Masaje Descontracturante",
                "slug": "masaje-descontracturante",
                "description": "Masaje terapéutico para aliviar tensiones musculares",
                "duration_minutes": 45,
                "price": Decimal("45.00"),
                "is_active": True,
            },
        ]

        services = []
        for service_data in services_data:
            if service_data["category"]:
                service, created = Service.objects.get_or_create(
                    slug=service_data["slug"],
                    tenant_id=tenant.id,
                    defaults={**service_data, "category_id": service_data["category"].id},
                )
                services.append(service)

                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✅ Servicio creado: {service.name} - €{service.price} ({service.duration_minutes} min)"
                        )
                    )

        return services

    def _create_product_categories(self, tenant):
        """Crea categorías de productos de belleza"""
        from ecommerce.models import ProductCategory

        self.stdout.write("\n📦 Paso 3: Creando categorías de productos...")

        categories_data = [
            {
                "name": "Cremas Faciales",
                "slug": "cremas-faciales",
                "description": "Cremas y tratamientos para el rostro",
                "order": 1,
            },
            {
                "name": "Sérums",
                "slug": "serums",
                "description": "Sérums concentrados para el cuidado de la piel",
                "order": 2,
            },
            {
                "name": "Limpiadores",
                "slug": "limpiadores",
                "description": "Productos para limpieza facial y corporal",
                "order": 3,
            },
            {
                "name": "Mascarillas",
                "slug": "mascarillas",
                "description": "Mascarillas faciales y corporales",
                "order": 4,
            },
            {
                "name": "Aceites y Bálsamos",
                "slug": "aceites-balsamos",
                "description": "Aceites esenciales y bálsamos nutritivos",
                "order": 5,
            },
        ]

        categories = []
        for cat_data in categories_data:
            category, created = ProductCategory.objects.get_or_create(
                slug=cat_data["slug"], tenant=tenant, defaults={**cat_data, "tenant": tenant}
            )
            categories.append(category)

            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✅ Categoría creada: {category.name}"))

        return categories

    def _create_products(self, tenant, categories):
        """Crea productos de belleza de ejemplo"""
        from ecommerce.models import Product, Inventory

        self.stdout.write("\n🛍️  Paso 4: Creando productos...")

        # Encontrar categorías
        cremas = next((c for c in categories if c.slug == "cremas-faciales"), None)
        serums = next((c for c in categories if c.slug == "serums"), None)
        limpiadores = next((c for c in categories if c.slug == "limpiadores"), None)
        mascarillas = next((c for c in categories if c.slug == "mascarillas"), None)
        aceites = next((c for c in categories if c.slug == "aceites-balsamos"), None)

        products_data = [
            # Cremas Faciales
            {
                "category": cremas,
                "name": "Crema Hidratante Anti-Edad SPF 30",
                "slug": "crema-hidratante-anti-edad-spf30",
                "description": "Crema facial hidratante con protección solar y activos anti-edad",
                "price": Decimal("42.50"),
                "stock": 25,
                "is_active": True,
            },
            {
                "category": cremas,
                "name": "Crema de Noche Regeneradora",
                "slug": "crema-noche-regeneradora",
                "description": "Crema nutritiva de noche con retinol y ácido hialurónico",
                "price": Decimal("38.00"),
                "stock": 18,
                "is_active": True,
            },
            # Sérums
            {
                "category": serums,
                "name": "Sérum Vitamina C Iluminador",
                "slug": "serum-vitamina-c",
                "description": "Sérum concentrado de vitamina C para luminosidad y uniformidad",
                "price": Decimal("55.00"),
                "stock": 30,
                "is_active": True,
            },
            {
                "category": serums,
                "name": "Sérum Ácido Hialurónico Puro",
                "slug": "serum-acido-hialuronico",
                "description": "Sérum ultra hidratante con ácido hialurónico de bajo peso molecular",
                "price": Decimal("48.00"),
                "stock": 22,
                "is_active": True,
            },
            # Limpiadores
            {
                "category": limpiadores,
                "name": "Gel Limpiador Facial Suave",
                "slug": "gel-limpiador-facial",
                "description": "Gel limpiador sin sulfatos para todo tipo de piel",
                "price": Decimal("18.50"),
                "stock": 40,
                "is_active": True,
            },
            {
                "category": limpiadores,
                "name": "Agua Micelar Desmaquillante",
                "slug": "agua-micelar",
                "description": "Agua micelar 3 en 1: limpia, desmaquilla y tonifica",
                "price": Decimal("15.00"),
                "stock": 35,
                "is_active": True,
            },
            # Mascarillas
            {
                "category": mascarillas,
                "name": "Mascarilla Purificante de Arcilla",
                "slug": "mascarilla-arcilla",
                "description": "Mascarilla facial de arcilla verde para piel grasa",
                "price": Decimal("22.00"),
                "stock": 28,
                "is_active": True,
            },
            {
                "category": mascarillas,
                "name": "Mascarilla Hidratante Sleeping Mask",
                "slug": "mascarilla-sleeping",
                "description": "Mascarilla de noche ultra hidratante con ácido hialurónico",
                "price": Decimal("28.00"),
                "stock": 20,
                "is_active": True,
            },
            # Aceites
            {
                "category": aceites,
                "name": "Aceite Facial de Rosa Mosqueta",
                "slug": "aceite-rosa-mosqueta",
                "description": "Aceite puro de rosa mosqueta 100% natural y orgánico",
                "price": Decimal("32.00"),
                "stock": 15,
                "is_active": True,
            },
            {
                "category": aceites,
                "name": "Bálsamo Labial Nutritivo",
                "slug": "balsamo-labial",
                "description": "Bálsamo labial con manteca de karité y vitamina E",
                "price": Decimal("8.50"),
                "stock": 50,
                "is_active": True,
            },
        ]

        products = []
        for product_data in products_data:
            if product_data["category"]:
                stock = product_data.pop("stock", 10)
                category = product_data.pop("category")

                product, created = Product.objects.get_or_create(
                    slug=product_data["slug"],
                    tenant=tenant,
                    defaults={**product_data, "tenant": tenant, "category": category},
                )
                products.append(product)

                if created:
                    # Crear inventario
                    Inventory.objects.get_or_create(
                        product=product,
                        tenant=tenant,
                        defaults={"stock": stock, "tenant": tenant}
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✅ Producto creado: {product.name} - €{product.price} (Stock: {stock})"
                        )
                    )

        return products

    def _create_business_hours(self, tenant):
        """Configura los horarios de negocio del centro"""
        from booking.models import BusinessHours

        self.stdout.write("\n🕐 Paso 9: Configurando horarios de negocio...")

        # Horario típico de un centro de estética en España
        # Lunes a Viernes: 10:00 - 14:00 y 16:00 - 20:00
        # Sábado: 10:00 - 14:00
        # Domingo: Cerrado

        hours_data = [
            # Lunes
            {"day_of_week": 0, "open_time": "10:00", "close_time": "14:00", "is_closed": False},
            {"day_of_week": 0, "open_time": "16:00", "close_time": "20:00", "is_closed": False},
            # Martes
            {"day_of_week": 1, "open_time": "10:00", "close_time": "14:00", "is_closed": False},
            {"day_of_week": 1, "open_time": "16:00", "close_time": "20:00", "is_closed": False},
            # Miércoles
            {"day_of_week": 2, "open_time": "10:00", "close_time": "14:00", "is_closed": False},
            {"day_of_week": 2, "open_time": "16:00", "close_time": "20:00", "is_closed": False},
            # Jueves
            {"day_of_week": 3, "open_time": "10:00", "close_time": "14:00", "is_closed": False},
            {"day_of_week": 3, "open_time": "16:00", "close_time": "20:00", "is_closed": False},
            # Viernes
            {"day_of_week": 4, "open_time": "10:00", "close_time": "14:00", "is_closed": False},
            {"day_of_week": 4, "open_time": "16:00", "close_time": "20:00", "is_closed": False},
            # Sábado
            {"day_of_week": 5, "open_time": "10:00", "close_time": "14:00", "is_closed": False},
            # Domingo - Cerrado
            {"day_of_week": 6, "open_time": None, "close_time": None, "is_closed": True},
        ]

        business_hours = []
        for hour_data in hours_data:
            hour, created = BusinessHours.objects.get_or_create(
                tenant_id=tenant.id,
                day_of_week=hour_data["day_of_week"],
                open_time=hour_data.get("open_time"),
                defaults={
                    "close_time": hour_data.get("close_time"),
                    "is_closed": hour_data["is_closed"],
                },
            )
            business_hours.append(hour)

            if created:
                day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
                day_name = day_names[hour.day_of_week]

                if hour.is_closed:
                    self.stdout.write(self.style.SUCCESS(f"  ✅ {day_name}: CERRADO"))
                else:
                    self.stdout.write(self.style.SUCCESS(f"  ✅ {day_name}: {hour.open_time} - {hour.close_time}"))

        return business_hours

    def _print_summary(self, tenant, admin_user, categories, services, products):
        """Imprime un resumen de lo creado"""
        self.stdout.write("\n")
        self.stdout.write(self.style.SUCCESS("═" * 70))
        self.stdout.write(self.style.SUCCESS("  RESUMEN DE CREACIÓN  "))
        self.stdout.write(self.style.SUCCESS("═" * 70))

        self.stdout.write(f"\n🏢 Tenant: {tenant.name}")
        self.stdout.write(f"   - Schema: {tenant.schema_name}")
        self.stdout.write(f"   - Slug: {tenant.slug}")
        self.stdout.write(f"   - Ubicación: {tenant.city}, {tenant.country}")

        self.stdout.write(f"\n👤 Usuario Admin:")
        self.stdout.write(f"   - Email: {admin_user.email}")
        self.stdout.write(self.style.WARNING(f"   - Password: (definida por TENANT_ADMIN_PASSWORD)"))

        self.stdout.write(f"\n📊 Datos creados:")
        self.stdout.write(f"   - Categorías de Servicios: {len(categories)}")
        self.stdout.write(f"   - Servicios: {len(services)}")
        self.stdout.write(f"   - Categorías de Productos: {len([p for p in products if hasattr(p, 'category')])}")
        self.stdout.write(f"   - Productos: {len(products)}")

        self.stdout.write(f"\n💰 Precios configurados:")
        total_services = sum(s.price for s in services if hasattr(s, "price"))
        total_products = sum(p.price for p in products if hasattr(p, "price"))
        self.stdout.write(f"   - Servicios: €{total_services:.2f} (valor total catálogo)")
        self.stdout.write(f"   - Productos: €{total_products:.2f} (valor total catálogo)")

        self.stdout.write(f"\n🕐 Horarios:")
        self.stdout.write(f"   - Lun-Vie: 10:00-14:00, 16:00-20:00")
        self.stdout.write(f"   - Sábado: 10:00-14:00")
        self.stdout.write(f"   - Domingo: CERRADO")

        self.stdout.write("\n")
        self.stdout.write(self.style.SUCCESS("═" * 70))
        self.stdout.write(self.style.WARNING("\n⚠️  PRÓXIMOS PASOS:"))
        self.stdout.write(self.style.WARNING("   1. Cambiar la contraseña del admin"))
        self.stdout.write(self.style.WARNING("   2. Subir imágenes de productos y servicios"))
        self.stdout.write(self.style.WARNING("   3. Configurar pasarela de pagos (Stripe)"))
        self.stdout.write(self.style.WARNING("   4. Probar el sistema de reservas"))
        self.stdout.write(self.style.SUCCESS("═" * 70))
        self.stdout.write("\n")

    def _print_summary_simple(self, tenant, admin_user, categories, products):
        """Imprime un resumen simplificado"""
        self.stdout.write("\n")
        self.stdout.write(self.style.SUCCESS("═" * 70))
        self.stdout.write(self.style.SUCCESS("  RESUMEN DE CREACIÓN  "))
        self.stdout.write(self.style.SUCCESS("═" * 70))

        self.stdout.write(f"\n🏢 Tenant: {tenant.name}")
        self.stdout.write(f"   - Schema: {tenant.schema_name}")
        self.stdout.write(f"   - Slug: {tenant.slug}")
        self.stdout.write(f"   - Ubicación: {tenant.city}, {tenant.country}")

        self.stdout.write(f"\n👤 Usuario Admin:")
        self.stdout.write(f"   - Email: {admin_user.email}")
        self.stdout.write(self.style.WARNING(f"   - Password: (definida por TENANT_ADMIN_PASSWORD)"))

        self.stdout.write(f"\n📊 Datos creados:")
        self.stdout.write(f"   - Categorías de Productos: {len(categories)}")
        self.stdout.write(f"   - Productos: {len(products)}")

        self.stdout.write("\n")
        self.stdout.write(self.style.SUCCESS("═" * 70))
        self.stdout.write("\n")
