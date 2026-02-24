# backend/core/dashboard.py
"""
Dashboard callbacks para Unfold Admin.
Proporciona estadísticas y métricas del negocio.
"""

from django.db import models
from django.db.models import Sum, Count, Avg, Q, F
from django.db.models.functions import TruncDate, TruncMonth
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


# Mapeo de códigos de moneda a símbolos y configuración de locale
CURRENCY_CONFIG = {
    'COP': {'symbol': '$', 'locale': 'es-CO', 'name': 'Peso Colombiano'},
    'USD': {'symbol': '$', 'locale': 'en-US', 'name': 'Dólar Estadounidense'},
    'EUR': {'symbol': '€', 'locale': 'es-ES', 'name': 'Euro'},
    'MXN': {'symbol': '$', 'locale': 'es-MX', 'name': 'Peso Mexicano'},
    'PEN': {'symbol': 'S/', 'locale': 'es-PE', 'name': 'Sol Peruano'},
    'CLP': {'symbol': '$', 'locale': 'es-CL', 'name': 'Peso Chileno'},
    'ARS': {'symbol': '$', 'locale': 'es-AR', 'name': 'Peso Argentino'},
    'VES': {'symbol': 'Bs.', 'locale': 'es-VE', 'name': 'Bolívar Venezolano'},
    'BRL': {'symbol': 'R$', 'locale': 'pt-BR', 'name': 'Real Brasileño'},
    'GBP': {'symbol': '£', 'locale': 'en-GB', 'name': 'Libra Esterlina'},
}


def get_tenant_currency(request):
    """
    Obtener la configuración de moneda del tenant.
    Retorna un diccionario con: code, symbol, locale, name
    """
    from .models import Tenant

    # Default a COP
    default_currency = {
        'code': 'COP',
        'symbol': '$',
        'locale': 'es-CO',
        'name': 'Peso Colombiano',
    }

    if not request.user.is_authenticated:
        return default_currency

    # Obtener el tenant del usuario - leer fresco de la BD para evitar cache
    tenant_id = getattr(request.user, 'tenant_id', None)
    if not tenant_id:
        return default_currency

    try:
        tenant = Tenant.objects.only('currency').get(pk=tenant_id)
    except Tenant.DoesNotExist:
        return default_currency

    # Obtener la moneda del tenant
    currency_code = tenant.currency or 'COP'
    config = CURRENCY_CONFIG.get(currency_code, CURRENCY_CONFIG['COP'])

    return {
        'code': currency_code,
        'symbol': config['symbol'],
        'locale': config['locale'],
        'name': config['name'],
    }


def get_tenant_filter(request):
    """Obtener filtro de tenant según el usuario."""
    if request.user.is_superuser:
        return {}
    if hasattr(request.user, 'tenant') and request.user.tenant:
        return {'tenant': request.user.tenant}
    return {'pk': None}  # No mostrar nada


def get_activity_log(request, limit=15, days=None):
    """
    Obtener historial de actividad filtrado por tenant.

    - Superadmin: Ve todas las acciones de todos los tenants
    - Admin de tenant: Ve solo las acciones de usuarios de su tenant

    Args:
        request: HTTP request
        limit: Número máximo de registros a retornar
        days: Filtrar por últimos N días (None = sin filtro de fecha)

    Retorna una lista de diccionarios con información de cada acción.
    """
    from core.models import User

    # Construir queryset base
    logs_qs = LogEntry.objects.select_related('user', 'content_type')

    # Filtrar por tenant si no es superadmin
    if not request.user.is_superuser:
        if hasattr(request.user, 'tenant') and request.user.tenant:
            # Obtener todos los usuarios del tenant
            tenant_users = User.objects.filter(
                tenant=request.user.tenant
            ).values_list('id', flat=True)
            logs_qs = logs_qs.filter(user_id__in=tenant_users)
        else:
            # Usuario sin tenant no ve nada
            return [], 0

    # Filtrar por período de tiempo si se especifica
    if days:
        date_from = timezone.now() - timedelta(days=days)
        logs_qs = logs_qs.filter(action_time__gte=date_from)

    # Contar total antes de limitar
    total_count = logs_qs.count()

    # Obtener los logs más recientes
    logs = logs_qs.order_by('-action_time')[:limit]

    # Mapeo de acciones a íconos y colores
    action_map = {
        ADDITION: {'icon': 'add_circle', 'color': 'success', 'label': 'Creó'},
        CHANGE: {'icon': 'edit', 'color': 'info', 'label': 'Modificó'},
        DELETION: {'icon': 'delete', 'color': 'danger', 'label': 'Eliminó'},
    }

    activity_list = []
    for log in logs:
        action_info = action_map.get(log.action_flag, {
            'icon': 'info', 'color': 'secondary', 'label': 'Acción'
        })

        # Obtener nombre del tenant si el usuario tiene uno
        tenant_name = None
        if hasattr(log.user, 'tenant') and log.user.tenant:
            tenant_name = log.user.tenant.name

        activity_list.append({
            'id': log.id,
            'user': log.user,
            'user_name': log.user.get_full_name() or log.user.email,
            'tenant_name': tenant_name,
            'action_flag': log.action_flag,
            'action_icon': action_info['icon'],
            'action_color': action_info['color'],
            'action_label': action_info['label'],
            'content_type': log.content_type,
            'model_name': log.content_type.model if log.content_type else 'objeto',
            'object_repr': log.object_repr,
            'object_id': log.object_id,
            'action_time': log.action_time,
            'change_message': log.get_change_message(),
        })

    return activity_list


def get_low_stock_products(request, limit=10):
    """
    Obtener productos con stock bajo o agotado.

    Retorna productos donde:
    - Stock es 0 (agotados)
    - Stock <= low_stock_threshold (stock bajo)

    Solo productos con track_inventory=True
    """
    from ecommerce.models import Product, Inventory

    tenant_filter = get_tenant_filter(request)

    # Obtener inventarios con problemas de stock
    low_stock_inventories = Inventory.objects.filter(
        **tenant_filter,
        track_inventory=True,
        product__is_active=True
    ).filter(
        Q(stock=0) | Q(stock__lte=models.F('low_stock_threshold'))
    ).select_related('product', 'product__category').order_by('stock')[:limit]

    products_list = []
    for inventory in low_stock_inventories:
        product = inventory.product
        # Determinar nivel de alerta
        if inventory.stock == 0:
            alert_level = 'critical'
            alert_text = 'Agotado'
            alert_color = '#ef4444'  # Rojo
        else:
            alert_level = 'warning'
            alert_text = 'Stock Bajo'
            alert_color = '#f59e0b'  # Naranja

        products_list.append({
            'id': product.id,
            'name': product.name,
            'sku': product.sku,
            'category': product.category.name if product.category else '-',
            'stock': inventory.stock,
            'threshold': inventory.low_stock_threshold,
            'alert_level': alert_level,
            'alert_text': alert_text,
            'alert_color': alert_color,
            'main_image': product.main_image.image.url if product.main_image else None,
        })

    # Contar totales para el badge
    total_out_of_stock = Inventory.objects.filter(
        **tenant_filter,
        track_inventory=True,
        product__is_active=True,
        stock=0
    ).count()

    total_low_stock = Inventory.objects.filter(
        **tenant_filter,
        track_inventory=True,
        product__is_active=True,
        stock__gt=0,
        stock__lte=models.F('low_stock_threshold')
    ).count()

    return {
        'products': products_list,
        'total_out_of_stock': total_out_of_stock,
        'total_low_stock': total_low_stock,
        'total_alerts': total_out_of_stock + total_low_stock,
    }


def dashboard_callback(request, context):
    """
    Callback principal del dashboard.
    Agrega estadísticas y datos para gráficos.

    - Admin/Superuser: Ve todas las estadísticas del tenant
    - Staff: Solo ve sus propias estadísticas (citas asignadas a él)
    """
    from orders.models import Order
    from bookings.models import Appointment
    from core.models import User
    from services.models import StaffMember

    tenant_filter = get_tenant_filter(request)
    today = timezone.now().date()
    start_of_month = today.replace(day=1)
    start_of_week = today - timedelta(days=today.weekday())
    last_30_days = today - timedelta(days=30)

    # Obtener configuración de moneda del tenant
    currency = get_tenant_currency(request)
    context['currency'] = currency

    # Determinar si es staff (empleado)
    is_staff_role = hasattr(request.user, 'role') and request.user.role == 'staff'

    # Si es staff, obtener su StaffMember asociado
    staff_member = None
    if is_staff_role:
        try:
            staff_member = StaffMember.objects.get(user=request.user)
        except StaffMember.DoesNotExist:
            staff_member = None

    # =====================
    # DASHBOARD PARA STAFF (EMPLEADO)
    # =====================
    if is_staff_role:
        context.update(_get_staff_dashboard(request, staff_member, today, start_of_month))
        context['is_staff_dashboard'] = True
        return context

    # =====================
    # DASHBOARD PARA ADMIN (completo)
    # =====================
    context['is_staff_dashboard'] = False

    # =====================
    # ESTADÍSTICAS DE VENTAS
    # =====================
    orders_qs = Order.objects.filter(**tenant_filter)

    # Ventas del mes
    monthly_orders = orders_qs.filter(
        created_at__date__gte=start_of_month,
        status__in=['completed', 'paid']
    )
    monthly_revenue = monthly_orders.aggregate(
        total=Sum('total')
    )['total'] or Decimal('0.00')
    monthly_orders_count = monthly_orders.count()

    # Ventas de hoy
    today_orders = orders_qs.filter(
        created_at__date=today,
        status__in=['completed', 'paid']
    )
    today_revenue = today_orders.aggregate(
        total=Sum('total')
    )['total'] or Decimal('0.00')

    # Ventas de la semana
    weekly_orders = orders_qs.filter(
        created_at__date__gte=start_of_week,
        status__in=['completed', 'paid']
    )
    weekly_revenue = weekly_orders.aggregate(
        total=Sum('total')
    )['total'] or Decimal('0.00')

    # =====================
    # ESTADÍSTICAS DE CITAS
    # =====================
    appointments_qs = Appointment.objects.filter(**tenant_filter)

    # Citas de hoy
    today_appointments = appointments_qs.filter(
        start_datetime__date=today
    ).count()

    # Citas pendientes (futuras pendientes o confirmadas)
    pending_appointments = appointments_qs.filter(
        start_datetime__gte=timezone.now(),
        status__in=['pending', 'confirmed']
    ).count()

    # Citas completadas este mes
    completed_appointments_month = appointments_qs.filter(
        start_datetime__date__gte=start_of_month,
        status='completed'
    ).count()

    # =====================
    # ESTADÍSTICAS DE USUARIOS
    # =====================
    users_qs = User.objects.filter(**tenant_filter)

    # Nuevos usuarios este mes
    new_users_month = users_qs.filter(
        created_at__date__gte=start_of_month,
        role='customer'
    ).count()

    # Total clientes activos
    total_customers = users_qs.filter(
        role='customer',
        is_active=True
    ).count()

    # =====================
    # DATOS PARA GRÁFICOS
    # =====================

    # Ventas últimos 30 días (para gráfico de línea)
    sales_by_day = list(
        orders_qs.filter(
            created_at__date__gte=last_30_days,
            status__in=['completed', 'paid']
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            total=Sum('total'),
            count=Count('id')
        ).order_by('date')
    )

    # Ventas por mes (últimos 6 meses)
    six_months_ago = today - timedelta(days=180)
    sales_by_month = list(
        orders_qs.filter(
            created_at__date__gte=six_months_ago,
            status__in=['completed', 'paid']
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            total=Sum('total'),
            count=Count('id')
        ).order_by('month')
    )

    # Top 5 productos más vendidos
    from orders.models import OrderItem, OrderServiceItem
    top_products = list(
        OrderItem.objects.filter(
            order__in=orders_qs.filter(status__in=['completed', 'paid'])
        ).values('product_name').annotate(
            total_sold=Sum('quantity'),
            total_revenue=Sum('total_price')
        ).order_by('-total_sold')[:5]
    )

    # Top 5 servicios más reservados
    top_services = list(
        OrderServiceItem.objects.filter(
            order__in=orders_qs.filter(status__in=['completed', 'paid'])
        ).values('service_name').annotate(
            total_booked=Count('id'),
            total_revenue=Sum('price')
        ).order_by('-total_booked')[:5]
    )

    # Órdenes recientes
    recent_orders = orders_qs.order_by('-created_at')[:5]

    # Próximas citas
    upcoming_appointments = appointments_qs.filter(
        start_datetime__gte=timezone.now(),
        status__in=['confirmed', 'pending']
    ).order_by('start_datetime')[:5]

    # =====================
    # HISTORIAL DE ACTIVIDAD (AUDIT LOG)
    # =====================
    activity_log = get_activity_log(request, limit=15)

    # =====================
    # ALERTAS DE INVENTARIO (Stock bajo/agotado)
    # =====================
    low_stock_data = get_low_stock_products(request, limit=10)

    # =====================
    # AGREGAR AL CONTEXTO
    # =====================
    context.update({
        # Métricas principales (cards)
        'monthly_revenue': monthly_revenue,
        'monthly_orders_count': monthly_orders_count,
        'today_revenue': today_revenue,
        'weekly_revenue': weekly_revenue,
        'today_appointments': today_appointments,
        'pending_appointments': pending_appointments,
        'completed_appointments_month': completed_appointments_month,
        'new_users_month': new_users_month,
        'total_customers': total_customers,

        # Datos para gráficos
        'sales_by_day': sales_by_day,
        'sales_by_month': sales_by_month,
        'top_products': top_products,
        'top_services': top_services,

        # Listas recientes
        'recent_orders': recent_orders,
        'upcoming_appointments': upcoming_appointments,

        # Historial de actividad
        'activity_log': activity_log,

        # Alertas de inventario
        'low_stock_products': low_stock_data['products'],
        'total_out_of_stock': low_stock_data['total_out_of_stock'],
        'total_low_stock': low_stock_data['total_low_stock'],
        'total_stock_alerts': low_stock_data['total_alerts'],
    })

    return context


def _get_staff_dashboard(request, staff_member, today, start_of_month):
    """
    Dashboard específico para empleados (staff).
    Solo muestra estadísticas relacionadas con sus propias citas.
    """
    from bookings.models import Appointment
    from orders.models import OrderServiceItem

    context = {}

    # Si no tiene StaffMember asociado, mostrar dashboard vacío
    if not staff_member:
        context.update({
            'staff_no_profile': True,
            'staff_today_appointments': 0,
            'staff_completed_today': 0,
            'staff_total_customers_today': 0,
            'staff_pending_appointments': 0,
            'staff_completed_month': 0,
            'staff_upcoming_appointments': [],
            'staff_appointments_by_status': {},
            'staff_top_services': [],
        })
        return context

    # Citas asignadas a este staff member
    staff_appointments = Appointment.objects.filter(
        staff_member=staff_member
    )

    # =====================
    # MÉTRICAS DEL DÍA
    # =====================

    # Citas programadas para hoy
    today_appointments = staff_appointments.filter(
        start_datetime__date=today
    )
    staff_today_appointments = today_appointments.count()

    # Citas completadas hoy
    staff_completed_today = today_appointments.filter(
        status='completed'
    ).count()

    # Clientes atendidos hoy (únicos)
    staff_total_customers_today = today_appointments.filter(
        status='completed'
    ).values('customer').distinct().count()

    # =====================
    # MÉTRICAS GENERALES
    # =====================

    # Citas pendientes (futuras confirmadas)
    staff_pending_appointments = staff_appointments.filter(
        start_datetime__gte=timezone.now(),
        status__in=['confirmed', 'pending']
    ).count()

    # Citas completadas este mes
    staff_completed_month = staff_appointments.filter(
        start_datetime__date__gte=start_of_month,
        status='completed'
    ).count()

    # =====================
    # PRÓXIMAS CITAS
    # =====================
    staff_upcoming_appointments = staff_appointments.filter(
        start_datetime__gte=timezone.now(),
        status__in=['confirmed', 'pending']
    ).select_related('customer', 'service').order_by('start_datetime')[:10]

    # =====================
    # ESTADO DE CITAS (para gráfico)
    # =====================
    staff_appointments_by_status = {
        'completed': staff_appointments.filter(
            start_datetime__date__gte=start_of_month,
            status='completed'
        ).count(),
        'confirmed': staff_appointments.filter(
            start_datetime__date__gte=start_of_month,
            status='confirmed'
        ).count(),
        'pending': staff_appointments.filter(
            start_datetime__date__gte=start_of_month,
            status='pending'
        ).count(),
        'cancelled': staff_appointments.filter(
            start_datetime__date__gte=start_of_month,
            status='cancelled'
        ).count(),
        'no_show': staff_appointments.filter(
            start_datetime__date__gte=start_of_month,
            status='no_show'
        ).count(),
    }

    # =====================
    # TOP SERVICIOS DEL STAFF
    # =====================
    # Servicios más realizados por este staff
    staff_top_services = list(
        staff_appointments.filter(
            status='completed',
            start_datetime__date__gte=start_of_month
        ).values('service__name').annotate(
            total_count=Count('id')
        ).order_by('-total_count')[:5]
    )

    # =====================
    # SERVICIOS ASIGNADOS AL STAFF
    # =====================
    # Servicios que puede realizar este staff (agrupados por categoría)
    from services.models import Service
    staff_assigned_services = Service.objects.filter(
        assigned_staff=staff_member,
        is_active=True
    ).select_related('category').order_by('category__name', 'name')

    # Agrupar por categoría para el template
    staff_services_by_category = {}
    for service in staff_assigned_services:
        cat_name = service.category.name if service.category else "Sin categoría"
        if cat_name not in staff_services_by_category:
            staff_services_by_category[cat_name] = []
        staff_services_by_category[cat_name].append({
            'name': service.name,
            'duration': service.formatted_duration,
            'price': service.price,
        })

    context.update({
        'staff_no_profile': False,
        'staff_member_name': staff_member.full_name,

        # Métricas del día
        'staff_today_appointments': staff_today_appointments,
        'staff_completed_today': staff_completed_today,
        'staff_total_customers_today': staff_total_customers_today,

        # Métricas generales
        'staff_pending_appointments': staff_pending_appointments,
        'staff_completed_month': staff_completed_month,

        # Listas
        'staff_upcoming_appointments': staff_upcoming_appointments,

        # Datos para gráficos
        'staff_appointments_by_status': staff_appointments_by_status,
        'staff_top_services': staff_top_services,

        # Servicios asignados
        'staff_services_by_category': staff_services_by_category,
        'staff_total_assigned_services': staff_assigned_services.count(),
    })

    return context


def environment_callback(request):
    """
    Callback para mostrar el entorno actual.
    Solo muestra badge en modo desarrollo para no distraer en producción.
    El rol del usuario se muestra en el perfil del sidebar.
    """
    from django.conf import settings

    # Solo mostrar badge en desarrollo
    if settings.DEBUG:
        return ["Desarrollo", "warning"]

    # En producción no mostrar nada
    return None


def badge_callback(request):
    """
    Callback para mostrar badges en el sidebar.
    Retorna el número de citas pendientes para hoy.
    """
    from bookings.models import Appointment

    tenant_filter = get_tenant_filter(request)
    today = timezone.now().date()

    pending_today = Appointment.objects.filter(
        **tenant_filter,
        start_datetime__date=today,
        status__in=['pending', 'confirmed']
    ).count()

    if pending_today > 0:
        return str(pending_today)
    return None


def get_chart_data(request, period='month', group_by='day'):
    """
    Obtener datos para gráficos del dashboard.

    Args:
        request: HTTP request
        period: 'week', 'month', '3months', '6months'
        group_by: 'day', 'week', 'month'

    Returns:
        dict con datos para los diferentes gráficos
    """
    from orders.models import Order, OrderItem, OrderServiceItem
    from bookings.models import Appointment
    from django.db.models.functions import TruncWeek

    tenant_filter = get_tenant_filter(request)
    today = timezone.now().date()

    # Calcular fecha de inicio según período
    period_days = {
        'week': 7,
        'month': 30,
        '3months': 90,
        '6months': 180,
    }
    days = period_days.get(period, 30)
    start_date = today - timedelta(days=days)

    # Función de truncado según agrupación
    if group_by == 'week':
        trunc_func = TruncWeek
    elif group_by == 'month':
        trunc_func = TruncMonth
    else:
        trunc_func = TruncDate

    # =====================
    # DATOS DE VENTAS
    # =====================
    orders_qs = Order.objects.filter(
        **tenant_filter,
        created_at__date__gte=start_date,
        status__in=['completed', 'paid']
    )

    # Ventas agrupadas por período
    sales_data = list(
        orders_qs.annotate(
            period=trunc_func('created_at')
        ).values('period').annotate(
            revenue=Sum('total'),
            orders_count=Count('id')
        ).order_by('period')
    )

    # Llenar fechas vacías para continuidad en el gráfico
    sales_by_period = _fill_missing_dates(sales_data, start_date, today, group_by)

    # =====================
    # DISTRIBUCIÓN PRODUCTOS VS SERVICIOS
    # =====================
    products_revenue = OrderItem.objects.filter(
        order__in=orders_qs
    ).aggregate(total=Sum('total_price'))['total'] or Decimal('0')

    services_revenue = OrderServiceItem.objects.filter(
        order__in=orders_qs
    ).aggregate(total=Sum('price'))['total'] or Decimal('0')

    # =====================
    # DATOS DE CITAS
    # =====================
    appointments_qs = Appointment.objects.filter(
        **tenant_filter,
        start_datetime__date__gte=start_date
    )

    # Citas por estado
    appointments_by_status = {
        'completed': appointments_qs.filter(status='completed').count(),
        'confirmed': appointments_qs.filter(status='confirmed').count(),
        'pending': appointments_qs.filter(status='pending').count(),
        'cancelled': appointments_qs.filter(status='cancelled').count(),
        'no_show': appointments_qs.filter(status='no_show').count(),
    }

    # Citas agrupadas por período
    appointments_data = list(
        appointments_qs.annotate(
            period=trunc_func('start_datetime')
        ).values('period').annotate(
            count=Count('id')
        ).order_by('period')
    )

    appointments_by_period = _fill_missing_dates(
        appointments_data, start_date, today, group_by, value_field='count'
    )

    # =====================
    # COMPARACIÓN CON PERÍODO ANTERIOR
    # =====================
    previous_start = start_date - timedelta(days=days)
    previous_end = start_date - timedelta(days=1)

    previous_orders = Order.objects.filter(
        **tenant_filter,
        created_at__date__gte=previous_start,
        created_at__date__lte=previous_end,
        status__in=['completed', 'paid']
    )

    current_revenue = orders_qs.aggregate(total=Sum('total'))['total'] or Decimal('0')
    previous_revenue = previous_orders.aggregate(total=Sum('total'))['total'] or Decimal('0')

    current_orders_count = orders_qs.count()
    previous_orders_count = previous_orders.count()

    # Calcular variación porcentual
    revenue_change = _calculate_percentage_change(previous_revenue, current_revenue)
    orders_change = _calculate_percentage_change(previous_orders_count, current_orders_count)

    return {
        # Series temporales
        'sales': {
            'labels': [item['label'] for item in sales_by_period],
            'revenue': [float(item['revenue']) for item in sales_by_period],
            'orders': [item['orders_count'] for item in sales_by_period],
        },
        'appointments': {
            'labels': [item['label'] for item in appointments_by_period],
            'counts': [item['count'] for item in appointments_by_period],
        },
        # Distribución
        'distribution': {
            'products': float(products_revenue),
            'services': float(services_revenue),
        },
        'appointments_status': appointments_by_status,
        # Comparación
        'comparison': {
            'current_revenue': float(current_revenue),
            'previous_revenue': float(previous_revenue),
            'revenue_change': revenue_change,
            'current_orders': current_orders_count,
            'previous_orders': previous_orders_count,
            'orders_change': orders_change,
        },
        # Metadata
        'period': period,
        'group_by': group_by,
        'start_date': start_date.isoformat(),
        'end_date': today.isoformat(),
    }


def _fill_missing_dates(data, start_date, end_date, group_by, value_field='revenue'):
    """Llenar fechas vacías en los datos para gráficos continuos."""
    from datetime import date

    # Crear diccionario con datos existentes
    data_dict = {}
    for item in data:
        if item['period']:
            key = item['period'].date() if hasattr(item['period'], 'date') else item['period']
            data_dict[key] = item

    result = []
    current = start_date

    # Generar todas las fechas del período
    while current <= end_date:
        if group_by == 'week':
            # Inicio de semana (lunes)
            week_start = current - timedelta(days=current.weekday())
            label = week_start.strftime('%d %b')
            key = week_start
            next_date = current + timedelta(days=7)
        elif group_by == 'month':
            # Inicio de mes
            month_start = current.replace(day=1)
            label = month_start.strftime('%b %Y')
            key = month_start
            # Siguiente mes
            if current.month == 12:
                next_date = current.replace(year=current.year + 1, month=1, day=1)
            else:
                next_date = current.replace(month=current.month + 1, day=1)
        else:
            # Por día
            label = current.strftime('%d %b')
            key = current
            next_date = current + timedelta(days=1)

        # Buscar datos para esta fecha
        if key in data_dict:
            item = data_dict[key]
            if value_field == 'revenue':
                result.append({
                    'label': label,
                    'revenue': item.get('revenue') or Decimal('0'),
                    'orders_count': item.get('orders_count', 0),
                })
            else:
                result.append({
                    'label': label,
                    'count': item.get('count', 0),
                })
        else:
            if value_field == 'revenue':
                result.append({
                    'label': label,
                    'revenue': Decimal('0'),
                    'orders_count': 0,
                })
            else:
                result.append({
                    'label': label,
                    'count': 0,
                })

        current = next_date

        # Evitar duplicados para semanas y meses
        if group_by in ['week', 'month'] and current > end_date:
            break

    return result


def _calculate_percentage_change(previous, current):
    """Calcular cambio porcentual entre dos valores."""
    if previous == 0:
        return 100 if current > 0 else 0
    return round(((current - previous) / previous) * 100, 1)