# backend/core/admin_site.py
"""
AdminSite personalizado para NERBIS — restringido exclusivamente a superadmins.

Este módulo define un AdminSite personalizado que:
1. Solo permite acceso a superusuarios (is_superuser=True)
2. Usa un formulario de login simple (email + password, sin campo tenant)
3. Mantiene el branding de NERBIS
4. Usa Unfold para UI moderna
5. Proporciona endpoints de API para el dashboard (activity logs)

Los tenant admins gestionan su negocio desde el frontend Next.js (/dashboard/).
"""

import logging

from django.contrib.auth import login as auth_login
from django.http import JsonResponse
from django.urls import path
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from unfold.sites import UnfoldAdminSite

from .dashboard import get_activity_log, get_chart_data
from .forms import SuperadminAuthenticationForm

logger = logging.getLogger(__name__)


class NerbisAdminSite(UnfoldAdminSite):
    """
    AdminSite personalizado para NERBIS — solo superadmins.

    Características:
    - Solo superusuarios (is_superuser=True) pueden acceder
    - Login simple con email + password
    - Branding personalizado
    - Herramienta interna del equipo de plataforma
    """

    # Branding
    site_header = "NERBIS Administration"
    site_title = "NERBIS Admin"
    index_title = "Panel de Administración"

    # Formulario de login para superadmins (sin campo tenant)
    login_form = SuperadminAuthenticationForm

    # Template de login personalizado
    login_template = "admin/login.html"

    def each_context(self, request):
        """Agrega contexto adicional a todas las páginas del admin."""
        return super().each_context(request)

    @method_decorator(never_cache)
    def login(self, request, extra_context=None):
        """Login para superadmins con email + password."""
        from django.conf import settings
        from django.http import HttpResponseRedirect

        # Redirigir usuarios autenticados no-superuser al dashboard del frontend
        if request.user.is_authenticated and not request.user.is_superuser:
            dashboard_url = f"{settings.FRONTEND_URL}/dashboard/"
            logger.info(f"Tenant admin {request.user.email} redirigido a {dashboard_url}")
            return HttpResponseRedirect(dashboard_url)

        if request.method == "POST":
            form = self.login_form(request, data=request.POST)
            if form.is_valid():
                user = form.get_user()
                if user is not None:
                    logger.info(f"Login exitoso para superadmin: {user.email}")
                    auth_login(request, user, backend="django.contrib.auth.backends.ModelBackend")
                    next_url = request.POST.get("next") or request.GET.get("next")
                    if next_url:
                        return self._redirect_with_next(request, next_url)
                    return self._redirect_to_index(request)
            else:
                logger.warning(f"Login fallido: {form.errors}")
        else:
            form = self.login_form(request)

        context = {
            "title": "Iniciar sesión",
            "app_path": request.get_full_path(),
            "form": form,
            "next": request.GET.get("next", ""),
            **(extra_context or {}),
        }

        return self._render_login(request, context)

    def _redirect_with_next(self, request, next_url):
        """Redirigir a la URL especificada en 'next'."""
        from django.http import HttpResponseRedirect
        from django.utils.http import url_has_allowed_host_and_scheme

        if url_has_allowed_host_and_scheme(
            url=next_url,
            allowed_hosts={request.get_host()},
            require_https=request.is_secure(),
        ):
            return HttpResponseRedirect(next_url)
        return self._redirect_to_index(request)

    def _redirect_to_index(self, request):
        """Redirigir al índice del admin."""
        from django.http import HttpResponseRedirect
        from django.urls import reverse

        return HttpResponseRedirect(reverse("admin:index"))

    def _render_login(self, request, context):
        """Renderizar el template de login (standalone, sin Unfold)."""
        from django.template.response import TemplateResponse

        login_context = {
            "title": context.get("title", "Iniciar sesión"),
            "app_path": context.get("app_path", request.get_full_path()),
            "form": context.get("form"),
            "next": context.get("next", ""),
        }
        return TemplateResponse(
            request,
            self.login_template,
            login_context,
        )

    def has_permission(self, request):
        """
        Solo superusuarios (is_superuser=True) pueden acceder al Django admin.

        Los tenant admins gestionan su negocio desde /dashboard/ en el frontend.
        """
        user = request.user

        if not user.is_authenticated or not user.is_active:
            return False

        return user.is_superuser

    def get_urls(self):
        """Agregar URLs personalizadas al admin."""
        urls = super().get_urls()
        custom_urls = [
            path("logout/", self.logout_view, name="logout"),
            path("api/activity-logs/", self.admin_view(self.activity_logs_view), name="activity-logs-api"),
            path("api/chart-data/", self.admin_view(self.chart_data_view), name="chart-data-api"),
            path("delete-image/", self.admin_view(self.delete_image_view), name="delete-image"),
        ]
        return custom_urls + urls

    @method_decorator(never_cache)
    def logout_view(self, request):
        """
        Vista de logout que acepta GET y POST.

        Django 4.1+ requiere POST por seguridad, pero mantenemos GET
        para compatibilidad con links directos (ej: página de suscripción expirada).
        """
        from django.contrib.auth import logout as auth_logout
        from django.http import HttpResponseRedirect
        from django.urls import reverse

        auth_logout(request)
        return HttpResponseRedirect(reverse("admin:login"))

    def delete_image_view(self, request):
        """
        API endpoint para eliminar imágenes de modelos vía AJAX.

        Recibe JSON con:
        - model_name: 'app_name.model_name' (ej: 'services.service')
        - object_id: ID del objeto
        - field_name: nombre del campo de imagen (ej: 'image', 'photo')
        """
        import json
        import os

        from django.apps import apps

        if request.method != "POST":
            return JsonResponse({"success": False, "error": "Método no permitido"}, status=405)

        try:
            data = json.loads(request.body)
            model_name = data.get("model_name", "")
            object_id = data.get("object_id", "")
            field_name = data.get("field_name", "")

            if not all([model_name, object_id, field_name]):
                return JsonResponse({"success": False, "error": "Faltan parámetros requeridos"}, status=400)

            # Parsear app_name y model_name
            parts = model_name.split(".")
            if len(parts) != 2:
                return JsonResponse({"success": False, "error": "Formato de modelo inválido"}, status=400)

            app_name, model_class_name = parts

            # Obtener el modelo
            try:
                Model = apps.get_model(app_name, model_class_name)
            except LookupError:
                return JsonResponse({"success": False, "error": f"Modelo no encontrado: {model_name}"}, status=404)

            # Obtener el objeto
            try:
                obj = Model.objects.get(pk=object_id)
            except Model.DoesNotExist:
                return JsonResponse({"success": False, "error": "Objeto no encontrado"}, status=404)

            # Verificar que el campo existe y es un ImageField
            if not hasattr(obj, field_name):
                return JsonResponse({"success": False, "error": f"Campo no encontrado: {field_name}"}, status=400)

            image_field = getattr(obj, field_name)

            # Eliminar el archivo físico si existe
            if image_field and image_field.name:
                try:
                    if os.path.isfile(image_field.path):
                        os.remove(image_field.path)
                except Exception as e:
                    logger.warning(f"No se pudo eliminar el archivo físico: {e}")

            # Limpiar el campo en la base de datos
            setattr(obj, field_name, None)
            obj.save(update_fields=[field_name])

            logger.info(f"Imagen eliminada: {model_name} #{object_id} - campo: {field_name}")

            return JsonResponse({"success": True})

        except json.JSONDecodeError:
            return JsonResponse({"success": False, "error": "JSON inválido"}, status=400)
        except Exception as e:
            logger.error(f"Error al eliminar imagen: {e}")
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    def activity_logs_view(self, request):
        """
        API endpoint para obtener logs de actividad con filtros.

        Query params:
        - days: Filtrar por últimos N días (7, 15, 30, 90)
        - limit: Número de registros (default 15, max 100)
        """
        # Obtener parámetros
        try:
            days = int(request.GET.get("days", 0)) or None
            limit = min(int(request.GET.get("limit", 15)), 100)
        except (ValueError, TypeError):
            days = None
            limit = 15

        # Obtener logs
        activity_log = get_activity_log(request, limit=limit, days=days)

        # Serializar para JSON
        logs_data = []
        for log in activity_log:
            logs_data.append(
                {
                    "id": log["id"],
                    "user_name": log["user_name"],
                    "tenant_name": log["tenant_name"],
                    "action_icon": log["action_icon"],
                    "action_color": log["action_color"],
                    "action_label": log["action_label"],
                    "model_name": log["model_name"],
                    "object_repr": log["object_repr"],
                    "action_time": log["action_time"].isoformat(),
                    "action_time_display": self._format_timesince(log["action_time"]),
                    "action_time_exact": log["action_time"].strftime("%d/%m/%Y %H:%M"),
                    "change_message": log["change_message"],
                }
            )

        return JsonResponse(
            {
                "logs": logs_data,
                "count": len(logs_data),
                "filters": {
                    "days": days,
                    "limit": limit,
                },
            }
        )

    def _format_timesince(self, dt):
        """Formatear tiempo transcurrido en español."""
        from datetime import timedelta

        from django.utils import timezone

        now = timezone.now()
        diff = now - dt

        if diff < timedelta(minutes=1):
            return "hace un momento"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"hace {minutes} minuto{'s' if minutes != 1 else ''}"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"hace {hours} hora{'s' if hours != 1 else ''}"
        elif diff < timedelta(days=30):
            days = diff.days
            return f"hace {days} día{'s' if days != 1 else ''}"
        else:
            return dt.strftime("%d/%m/%Y %H:%M")

    def chart_data_view(self, request):
        """
        API endpoint para obtener datos de gráficos.

        Query params:
        - period: 'week', 'month', '3months', '6months' (default: 'month')
        - group_by: 'day', 'week', 'month' (default: auto según period)
        """
        period = request.GET.get("period", "month")
        if period not in ["week", "month", "3months", "6months"]:
            period = "month"

        # Auto-seleccionar agrupación según período
        group_by = request.GET.get("group_by")
        if not group_by:
            if period == "week":
                group_by = "day"
            elif period == "month":
                group_by = "day"
            elif period == "3months":
                group_by = "week"
            else:  # 6months
                group_by = "month"

        if group_by not in ["day", "week", "month"]:
            group_by = "day"

        data = get_chart_data(request, period=period, group_by=group_by)
        return JsonResponse(data)


# Instancia del admin site personalizado
nerbis_admin_site = NerbisAdminSite(name="admin")
