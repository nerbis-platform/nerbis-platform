# backend/core/admin_settings_serializers.py
"""
Serializers para el panel de superadmin — configuracion global de la plataforma.

Gestiona los catálogos globales que no pertenecen a ningún tenant:
- PlatformModule: módulos de la plataforma (has_services, has_shop, etc.)
- WebsitePage: páginas disponibles en el onboarding
- OnboardingQuestion: preguntas del cuestionario de onboarding

Contrato de sub-agente SDD ``sdd/admin-onboarding-config`` (Phases 1 + 2).
"""

from __future__ import annotations

from rest_framework import serializers

from core.models import MarketingSection, PlatformModule
from websites.models import OnboardingQuestion, WebsitePage

# ---------------------------------------------------------------------------
# PlatformModule serializers
# ---------------------------------------------------------------------------


class AdminPlatformModuleMinimalSerializer(serializers.ModelSerializer):
    """Representacion minimal de un modulo para uso nested en M2M."""

    class Meta:
        model = PlatformModule
        fields = ["id", "key", "label"]
        read_only_fields = fields


class AdminPlatformModuleSerializer(serializers.ModelSerializer):
    """CRUD completo de PlatformModule.

    Patrón dual-field para M2M:
    - ``dependencies`` (write_only): lista de PKs para escritura.
    - ``dependencies_detail`` (read_only): representación nested para lectura.
    """

    dependencies = serializers.PrimaryKeyRelatedField(
        queryset=PlatformModule.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    dependencies_detail = AdminPlatformModuleMinimalSerializer(
        source="dependencies",
        many=True,
        read_only=True,
    )

    class Meta:
        model = PlatformModule
        fields = [
            "id",
            "key",
            "label",
            "description",
            "icon",
            "accent_color",
            "is_active",
            "sort_order",
            "dependencies",
            "dependencies_detail",
        ]


# ---------------------------------------------------------------------------
# WebsitePage serializer
# ---------------------------------------------------------------------------


class AdminWebsitePageSerializer(serializers.ModelSerializer):
    """CRUD completo de WebsitePage.

    Patrón dual-field para M2M ``auto_include_modules``.
    """

    auto_include_modules = serializers.PrimaryKeyRelatedField(
        queryset=PlatformModule.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    auto_include_modules_detail = AdminPlatformModuleMinimalSerializer(
        source="auto_include_modules",
        many=True,
        read_only=True,
    )

    class Meta:
        model = WebsitePage
        fields = [
            "id",
            "key",
            "label",
            "description",
            "icon",
            "is_mandatory",
            "is_default",
            "sort_order",
            "is_active",
            "auto_include_modules",
            "auto_include_modules_detail",
        ]


# ---------------------------------------------------------------------------
# OnboardingQuestion serializer
# ---------------------------------------------------------------------------


class AdminOnboardingQuestionSerializer(serializers.ModelSerializer):
    """CRUD completo de OnboardingQuestion.

    Patrón dual-field para M2M ``required_modules``.
    ``template`` es FK nullable (null = pregunta genérica para todos los templates).
    """

    required_modules = serializers.PrimaryKeyRelatedField(
        queryset=PlatformModule.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    required_modules_detail = AdminPlatformModuleMinimalSerializer(
        source="required_modules",
        many=True,
        read_only=True,
    )

    class Meta:
        model = OnboardingQuestion
        fields = [
            "id",
            "question_key",
            "question_text",
            "question_type",
            "message",
            "input_type",
            "hint",
            "placeholder",
            "help_text",
            "options",
            "ai_context",
            "section",
            "sort_order",
            "is_active",
            "is_required",
            "min_length",
            "max_length",
            "template",
            "required_modules",
            "required_modules_detail",
        ]


# ---------------------------------------------------------------------------
# MarketingSection serializer
# ---------------------------------------------------------------------------


class AdminMarketingSectionSerializer(serializers.ModelSerializer):
    """CRUD de MarketingSection para el panel de superadmin.

    ``updated_by`` se setea automaticamente en la vista (perform_update),
    por eso es read_only aqui. ``updated_at`` es auto_now en el modelo.
    """

    updated_by_email = serializers.EmailField(source="updated_by.email", read_only=True, default=None)

    class Meta:
        model = MarketingSection
        fields = [
            "id",
            "section_key",
            "content",
            "is_visible",
            "sort_order",
            "updated_at",
            "updated_by",
            "updated_by_email",
        ]
        read_only_fields = ["id", "section_key", "sort_order", "updated_at", "updated_by"]
