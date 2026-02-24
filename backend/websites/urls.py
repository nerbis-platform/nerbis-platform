# backend/websites/urls.py
"""
URLs para el sistema de Website Builder.

Endpoints para la construcción de sitios web con IA.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WebsiteTemplateViewSet,
    WebsiteConfigViewSet,
    StartOnboardingView,
    SaveOnboardingResponsesView,
    OnboardingStatusView,
    GenerateContentView,
    ChatView,
    PublishWebsiteView,
    PreviewWebsiteView,
    PreviewRenderView,
    ReorderSectionsView,
    AddSectionView,
    RemoveSectionView,
    UpdateSectionVariantView,
)

router = DefaultRouter()
router.register(r'templates', WebsiteTemplateViewSet, basename='website-template')
router.register(r'configs', WebsiteConfigViewSet, basename='website-config')

urlpatterns = [
    # ViewSets
    path('', include(router.urls)),

    # Onboarding Flow
    path('onboarding/start/', StartOnboardingView.as_view(), name='onboarding-start'),
    path('onboarding/responses/', SaveOnboardingResponsesView.as_view(), name='onboarding-responses'),
    path('onboarding/status/', OnboardingStatusView.as_view(), name='onboarding-status'),

    # AI Generation
    path('generate/', GenerateContentView.as_view(), name='generate-content'),

    # Chat
    path('chat/', ChatView.as_view(), name='chat'),

    # Publish & Preview
    path('publish/', PublishWebsiteView.as_view(), name='publish-website'),
    path('preview/', PreviewWebsiteView.as_view(), name='preview-website'),
    path('preview/render/', PreviewRenderView.as_view(), name='preview-render'),

    # Section Management
    path('sections/reorder/', ReorderSectionsView.as_view(), name='sections-reorder'),
    path('sections/add/', AddSectionView.as_view(), name='sections-add'),
    path('sections/remove/', RemoveSectionView.as_view(), name='sections-remove'),
    path('sections/variant/', UpdateSectionVariantView.as_view(), name='sections-variant'),
]
