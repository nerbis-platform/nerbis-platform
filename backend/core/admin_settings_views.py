# backend/core/admin_settings_views.py
"""
Vistas del panel de superadmin para configuracion global de la plataforma.

Gestiona catálogos globales (PlatformModule, WebsitePage, OnboardingQuestion).
Estos modelos NO pertenecen a ningún tenant — son configuración de plataforma.

No usa paginación: son catálogos pequeños (~4 módulos, ~7 páginas, ~10 preguntas).

Contrato de sub-agente SDD ``sdd/admin-onboarding-config`` (Phases 1 + 2).
"""

from __future__ import annotations

from django.db import transaction
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from core.admin_settings_serializers import (
    AdminIndustryGalleryCardSerializer,
    AdminMarketingSectionSerializer,
    AdminOnboardingQuestionSerializer,
    AdminPlatformModuleSerializer,
    AdminWebsitePageSerializer,
    IndustryGalleryReorderSerializer,
)
from core.marketing_defaults import MARKETING_SECTION_DEFAULTS
from core.models import IndustryGalleryCard, MarketingSection, PlatformModule
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


# ---------------------------------------------------------------------------
# MarketingSection views
# ---------------------------------------------------------------------------


class AdminMarketingSectionListView(generics.ListAPIView):
    """GET ``/api/admin/settings/marketing/``.

    Lista todas las secciones de marketing (incluidas las no visibles).
    Sin paginacion — catalogo pequeno (~9 secciones).
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminMarketingSectionSerializer
    pagination_class = None
    queryset = MarketingSection.objects.select_related("updated_by").order_by("sort_order")


class AdminMarketingSectionDetailView(generics.RetrieveUpdateAPIView):
    """GET/PUT/PATCH ``/api/admin/settings/marketing/<section_key>/``.

    Actualiza ``content`` y/o ``is_visible`` de una seccion.
    ``updated_by`` se setea automaticamente desde ``request.user``.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminMarketingSectionSerializer
    queryset = MarketingSection.objects.select_related("updated_by")
    lookup_field = "section_key"

    def perform_update(self, serializer: AdminMarketingSectionSerializer) -> None:
        serializer.save(updated_by=self.request.user)


class AdminMarketingSectionResetView(APIView):
    """POST ``/api/admin/settings/marketing/<section_key>/reset/``.

    Restaura el contenido de una seccion a sus valores por defecto
    definidos en ``core.marketing_defaults.MARKETING_SECTION_DEFAULTS``.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, section_key: str) -> Response:
        try:
            section = MarketingSection.objects.get(section_key=section_key)
        except MarketingSection.DoesNotExist:
            return Response(
                {"detail": f"Section '{section_key}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Find defaults for this section_key
        defaults = next(
            (d for d in MARKETING_SECTION_DEFAULTS if d["section_key"] == section_key),
            None,
        )
        if defaults is None:
            return Response(
                {"detail": f"No defaults found for section '{section_key}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        section.content = defaults["content"]
        section.is_visible = True
        section.sort_order = defaults.get("sort_order", section.sort_order)
        section.updated_by = request.user
        section.save(update_fields=["content", "is_visible", "sort_order", "updated_by", "updated_at"])

        serializer = AdminMarketingSectionSerializer(section)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# IndustryGalleryCard views
# ---------------------------------------------------------------------------


class AdminIndustryGalleryViewSet(ModelViewSet):
    """CRUD + reorder para IndustryGalleryCard.

    Endpoints generados por el router:
    - GET/POST     ``/api/admin/settings/industry-gallery/``
    - GET/PUT/PATCH/DELETE ``/api/admin/settings/industry-gallery/<pk>/``
    - POST         ``/api/admin/settings/industry-gallery/reorder/``

    Sin paginacion — catalogo pequeno (~12 cards).
    Acepta multipart para upload de imagenes.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminIndustryGalleryCardSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None
    queryset = IndustryGalleryCard.objects.order_by("row", "sort_order")

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request) -> Response:
        """Reordena cards en batch: acepta ``{items: [{id, row, sort_order}, ...]}``."""
        serializer = IndustryGalleryReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = serializer.validated_data["items"]

        with transaction.atomic():
            for item in items:
                IndustryGalleryCard.objects.filter(id=item["id"]).update(
                    row=item["row"],
                    sort_order=item["sort_order"],
                )

        # Return updated list
        cards = self.get_queryset()
        return Response(
            AdminIndustryGalleryCardSerializer(cards, many=True).data,
            status=status.HTTP_200_OK,
        )
