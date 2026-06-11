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
from django.db.models import Count, Q, Sum
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from core.admin_settings_serializers import (
    AdminAIGenerationLogSerializer,
    AdminAIModelConfigSerializer,
    AdminIndustryGalleryCardSerializer,
    AdminIndustrySerializer,
    AdminMarketingSectionSerializer,
    AdminOnboardingQuestionSerializer,
    AdminPlatformModuleSerializer,
    AdminPromptBlockSerializer,
    AdminPromptPreviewSerializer,
    AdminSectionVariantSerializer,
    AdminWebsitePageSerializer,
    AdminWebsiteSectionSerializer,
    IndustryGalleryReorderSerializer,
)
from core.marketing_defaults import MARKETING_SECTION_DEFAULTS
from core.models import IndustryGalleryCard, MarketingSection, PlatformModule
from core.permissions import IsSuperAdmin
from websites.models import (
    AIGenerationLog,
    AIModelConfig,
    Industry,
    OnboardingQuestion,
    PromptBlock,
    SectionVariant,
    WebsitePage,
    WebsiteSection,
    WebsiteTemplate,
)
from websites.services.ai_prompts import build_system_prompt

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
# WebsiteSection views
# ---------------------------------------------------------------------------


class AdminWebsiteSectionListCreateView(generics.ListCreateAPIView):
    """GET/POST ``/api/admin/settings/sections/``."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminWebsiteSectionSerializer
    pagination_class = None
    queryset = WebsiteSection.objects.select_related("page").order_by("sort_order")


class AdminWebsiteSectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE ``/api/admin/settings/sections/<int:pk>/``."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminWebsiteSectionSerializer
    queryset = WebsiteSection.objects.select_related("page").order_by("sort_order")


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


# ---------------------------------------------------------------------------
# SectionVariant views
# ---------------------------------------------------------------------------


class AdminSectionVariantListCreateView(generics.ListCreateAPIView):
    """GET/POST ``/api/admin/settings/variants/``."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminSectionVariantSerializer
    pagination_class = None
    queryset = SectionVariant.objects.select_related("section").prefetch_related("industries").order_by("sort_order")


class AdminSectionVariantDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE ``/api/admin/settings/variants/<int:pk>/``."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminSectionVariantSerializer
    queryset = SectionVariant.objects.select_related("section").prefetch_related("industries").order_by("sort_order")


# ---------------------------------------------------------------------------
# PromptBlock views
# ---------------------------------------------------------------------------


class AdminPromptBlockListCreateView(generics.ListCreateAPIView):
    """GET/POST ``/api/admin/settings/prompt-blocks/``."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminPromptBlockSerializer
    pagination_class = None
    queryset = PromptBlock.objects.select_related("template", "industry").order_by("sort_order")


class AdminPromptBlockDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE ``/api/admin/settings/prompt-blocks/<int:pk>/``."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminPromptBlockSerializer
    queryset = PromptBlock.objects.select_related("template", "industry").order_by("sort_order")


# ---------------------------------------------------------------------------
# Prompt preview view
# ---------------------------------------------------------------------------


class AdminPromptPreviewView(APIView):
    """POST ``/api/admin/settings/prompt-preview/``.

    Construye y devuelve el system prompt que usaria la IA, sin ejecutar
    generacion. Util para que el superadmin valide el resultado de los
    PromptBlocks configurados.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request) -> Response:
        serializer = AdminPromptPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        template_id = serializer.validated_data.get("template_id")
        onboarding_responses = serializer.validated_data.get("onboarding_responses", {})

        template = None
        if template_id:
            try:
                template = WebsiteTemplate.objects.get(pk=template_id)
            except WebsiteTemplate.DoesNotExist:
                return Response(
                    {"detail": f"Template con id {template_id} no encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        prompt = build_system_prompt(template, onboarding_responses)

        block_count = PromptBlock.objects.filter(is_active=True).count()

        return Response(
            {
                "prompt": prompt,
                "template_used": template.name if template else None,
                "block_count": block_count,
            },
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Industry views
# ---------------------------------------------------------------------------


class AdminIndustryListCreateView(generics.ListCreateAPIView):
    """GET/POST ``/api/admin/settings/industries/``.

    Lista todo el catalogo global de industrias (incluidas las propuestas por
    IA e inactivas) o crea una nueva. Sin paginacion — catalogo pequeno.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminIndustrySerializer
    pagination_class = None
    queryset = Industry.objects.select_related("default_template").order_by("sort_order", "label")


class AdminIndustryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE ``/api/admin/settings/industries/<int:pk>/``."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminIndustrySerializer
    queryset = Industry.objects.select_related("default_template").order_by("sort_order", "label")

    def destroy(self, request, *args, **kwargs):
        """Bloquea el borrado físico si la industria está en uso.

        En v1 ``Tenant.industry`` es un key libre (CharField, sin FK), así que
        eliminar la fila dejaría a esos tenants apuntando a un key inexistente.
        Mientras exista esa referencia se devuelve 409 y se sugiere desactivar
        (``is_active=false``) en lugar de borrar.
        """
        from core.models import Tenant

        instance = self.get_object()
        if Tenant.objects.filter(industry=instance.key).exists():
            return Response(
                {
                    "detail": (
                        "No se puede eliminar una industria en uso por uno o más "
                        "tenants. Desactívala (is_active=false) en lugar de borrarla."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)


class AdminIndustryPromoteView(APIView):
    """POST ``/api/admin/settings/industries/<int:pk>/promote/``.

    Promueve una industria de ``proposed_by_model`` a ``reviewed`` (one-way).
    Idempotente: si ya esta ``reviewed`` devuelve 200 sin cambios.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk: int) -> Response:
        try:
            industry = Industry.objects.get(pk=pk)
        except Industry.DoesNotExist:
            return Response(
                {"detail": f"Industria con id {pk} no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if industry.status != "reviewed":
            industry.status = "reviewed"
            industry.save(update_fields=["status", "updated_at"])

        return Response(AdminIndustrySerializer(industry).data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# AIModelConfig views
# ---------------------------------------------------------------------------


class AdminAIModelConfigListView(generics.ListAPIView):
    """GET ``/api/admin/settings/ai-models/``.

    Lista las 4 filas de configuracion de modelo IA por tarea
    (classify_industry, web_content, chat_edit, seo). Sin paginacion.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminAIModelConfigSerializer
    pagination_class = None
    queryset = AIModelConfig.objects.order_by("task")


class AdminAIModelConfigDetailView(generics.RetrieveUpdateAPIView):
    """GET/PUT/PATCH ``/api/admin/settings/ai-models/<int:pk>/``.

    Actualiza ``model``, ``max_tokens``, ``temperature`` e ``is_active`` de
    una fila. ``task`` es read-only (clave natural sembrada por migracion).
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminAIModelConfigSerializer
    queryset = AIModelConfig.objects.order_by("task")


# ---------------------------------------------------------------------------
# AI stats view
# ---------------------------------------------------------------------------


class AdminAIStatsView(APIView):
    """GET ``/api/admin/settings/ai-stats/``.

    Agrega ``AIGenerationLog`` por ``generation_type`` y ``model_used``,
    sumando tokens y costo estimado mas conteos. Read-only. Sobre un log
    vacio devuelve totales en cero y listas vacias (no crashea).
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request) -> Response:
        base = AIGenerationLog.objects.all()

        by_type = list(
            base.values("generation_type")
            .annotate(
                count=Count("id"),
                tokens_input=Sum("tokens_input"),
                tokens_output=Sum("tokens_output"),
                cost_estimated=Sum("cost_estimated"),
            )
            .order_by("generation_type")
        )

        by_model = list(
            base.values("model_used")
            .annotate(
                count=Count("id"),
                tokens_input=Sum("tokens_input"),
                tokens_output=Sum("tokens_output"),
                cost_estimated=Sum("cost_estimated"),
            )
            .order_by("model_used")
        )

        by_tenant = list(
            base.values("tenant_id", "tenant__name", "tenant__slug")
            .annotate(
                count=Count("id"),
                tokens_input=Sum("tokens_input"),
                tokens_output=Sum("tokens_output"),
                cost_estimated=Sum("cost_estimated"),
                successful=Count("id", filter=Q(is_successful=True)),
                failed=Count("id", filter=Q(is_successful=False)),
            )
            .order_by("-cost_estimated")
        )

        totals = base.aggregate(
            count=Count("id"),
            tokens_input=Sum("tokens_input"),
            tokens_output=Sum("tokens_output"),
            cost_estimated=Sum("cost_estimated"),
        )

        return Response(
            {
                "totals": self._normalize_row(totals),
                "by_generation_type": [self._normalize_row(row) for row in by_type],
                "by_model": [self._normalize_row(row) for row in by_model],
                "by_tenant": [self._normalize_tenant_row(row) for row in by_tenant],
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _normalize_row(row: dict) -> dict:
        """Reemplaza ``None`` (de Sum sobre conjunto vacio) por ceros y
        convierte ``cost_estimated`` (Decimal) a str para JSON exacto."""
        normalized = dict(row)
        normalized["count"] = normalized.get("count") or 0
        normalized["tokens_input"] = normalized.get("tokens_input") or 0
        normalized["tokens_output"] = normalized.get("tokens_output") or 0
        cost = normalized.get("cost_estimated") or 0
        normalized["cost_estimated"] = str(cost)
        return normalized

    @staticmethod
    def _normalize_tenant_row(row: dict) -> dict:
        """Aplana las claves de ``values(tenant_id, tenant__name, tenant__slug)``
        a ``tenant_id/tenant_name/tenant_slug`` y normaliza tokens/costo/conteos."""
        return {
            "tenant_id": row.get("tenant_id"),
            "tenant_name": row.get("tenant__name"),
            "tenant_slug": row.get("tenant__slug"),
            "count": row.get("count") or 0,
            "tokens_input": row.get("tokens_input") or 0,
            "tokens_output": row.get("tokens_output") or 0,
            "cost_estimated": str(row.get("cost_estimated") or 0),
            "successful": row.get("successful") or 0,
            "failed": row.get("failed") or 0,
        }


class AdminAIGenerationLogPagination(PageNumberPagination):
    """Paginación para el detalle de logs de IA. 50 por página, configurable
    vía ``?page_size=`` hasta un tope de 200 para evitar respuestas enormes."""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class AdminAIGenerationLogListView(generics.ListAPIView):
    """GET ``/api/admin/settings/ai-logs/``.

    Detalle paginado de ``AIGenerationLog`` con todos los campos para análisis
    de datos. Read-only, solo superadmin. Filtros opcionales por query param:
    ``tenant`` (id), ``generation_type``, ``model_used``, ``is_successful``
    (``true``/``false``). Ordenado por ``created_at`` descendente.
    """

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminAIGenerationLogSerializer
    pagination_class = AdminAIGenerationLogPagination

    def get_queryset(self):
        qs = AIGenerationLog.objects.select_related("tenant").order_by("-created_at")

        tenant_id = self.request.query_params.get("tenant")
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)

        generation_type = self.request.query_params.get("generation_type")
        if generation_type:
            qs = qs.filter(generation_type=generation_type)

        model_used = self.request.query_params.get("model_used")
        if model_used:
            qs = qs.filter(model_used=model_used)

        is_successful = self.request.query_params.get("is_successful")
        if is_successful is not None and is_successful != "":
            qs = qs.filter(is_successful=is_successful.lower() == "true")

        return qs
