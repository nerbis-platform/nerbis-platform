# backend/core/admin_settings_views.py
"""
Vistas del panel de superadmin para configuracion global de la plataforma.

Gestiona catálogos globales (PlatformModule, WebsitePage, OnboardingQuestion).
Estos modelos NO pertenecen a ningún tenant — son configuración de plataforma.

No usa paginación: son catálogos pequeños (~4 módulos, ~7 páginas, ~10 preguntas).

Contrato de sub-agente SDD ``sdd/admin-onboarding-config`` (Phases 1 + 2).
"""

from __future__ import annotations

from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from core.admin_settings_serializers import (
    AdminOnboardingQuestionSerializer,
    AdminPlatformModuleSerializer,
    AdminWebsitePageSerializer,
)
from core.models import PlatformModule
from core.permissions import IsSuperAdmin
from websites.models import OnboardingQuestion, WebsitePage

# ---------------------------------------------------------------------------
# PlatformModule views
# ---------------------------------------------------------------------------


class AdminPlatformModuleListCreateView(generics.ListCreateAPIView):
    """GET/POST ``/api/admin/settings/modules/``.

    Lista todos los módulos de plataforma o crea uno nuevo.
    Sin paginación — catálogo pequeño.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminPlatformModuleSerializer
    pagination_class = None
    queryset = PlatformModule.objects.prefetch_related("dependencies").order_by("sort_order")


class AdminPlatformModuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE ``/api/admin/settings/modules/<int:pk>/``.

    Eliminar un módulo está protegido: falla si otros módulos dependen de él.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminPlatformModuleSerializer
    queryset = PlatformModule.objects.prefetch_related("dependencies").order_by("sort_order")

    def perform_destroy(self, instance: PlatformModule) -> None:
        # Check if other modules depend on this one
        dependents = PlatformModule.objects.filter(dependencies=instance)
        if dependents.exists():
            dependent_keys = list(dependents.values_list("key", flat=True))
            raise ValidationError(
                {
                    "detail": (
                        f"Cannot delete module '{instance.key}': "
                        f"other modules depend on it ({', '.join(dependent_keys)})."
                    )
                }
            )

        # Check if any pages auto-include this module
        pages_using = WebsitePage.objects.filter(auto_include_modules=instance)
        if pages_using.exists():
            page_keys = list(pages_using.values_list("key", flat=True))
            raise ValidationError(
                {"detail": (f"Cannot delete module '{instance.key}': pages reference it ({', '.join(page_keys)}).")}
            )

        instance.delete()


# ---------------------------------------------------------------------------
# WebsitePage views
# ---------------------------------------------------------------------------


class AdminWebsitePageListCreateView(generics.ListCreateAPIView):
    """GET/POST ``/api/admin/settings/pages/``."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminWebsitePageSerializer
    pagination_class = None
    queryset = WebsitePage.objects.prefetch_related("auto_include_modules").order_by("sort_order")


class AdminWebsitePageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE ``/api/admin/settings/pages/<int:pk>/``."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminWebsitePageSerializer
    queryset = WebsitePage.objects.prefetch_related("auto_include_modules").order_by("sort_order")


# ---------------------------------------------------------------------------
# OnboardingQuestion views
# ---------------------------------------------------------------------------


class AdminOnboardingQuestionListCreateView(generics.ListCreateAPIView):
    """GET/POST ``/api/admin/settings/questions/``."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminOnboardingQuestionSerializer
    pagination_class = None
    queryset = (
        OnboardingQuestion.objects.prefetch_related("required_modules")
        .select_related("template")
        .order_by("sort_order")
    )


class AdminOnboardingQuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE ``/api/admin/settings/questions/<int:pk>/``."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminOnboardingQuestionSerializer
    queryset = (
        OnboardingQuestion.objects.prefetch_related("required_modules")
        .select_related("template")
        .order_by("sort_order")
    )
