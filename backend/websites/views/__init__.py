# backend/websites/views/__init__.py
"""
Views package para el Website Builder.

Re-exporta todas las views para mantener compatibilidad con urls.py.
"""

from .ai_generation import GenerateContentView, GenerationStatusView
from .chat import ChatView
from .config import WebsiteConfigViewSet
from .media import UploadWebsiteMediaView
from .onboarding import (
    OnboardingQuestionListView,
    OnboardingStatusView,
    OnboardingView,
    QuickStartView,
    SaveOnboardingResponsesView,
    StartOnboardingView,
    WebsitePageListView,
)
from .preview import PreviewRenderView, PreviewWebsiteView
from .publishing import PublishWebsiteView
from .sections import (
    AddSectionView,
    DuplicateSectionView,
    RemoveSectionView,
    ReorderSectionsView,
    UpdateSectionVariantView,
)
from .seo import SuggestSeoView
from .templates import WebsiteTemplateViewSet

__all__ = [
    "AddSectionView",
    "ChatView",
    "DuplicateSectionView",
    "GenerateContentView",
    "GenerationStatusView",
    "OnboardingStatusView",
    "OnboardingView",
    "QuickStartView",
    "PreviewRenderView",
    "PreviewWebsiteView",
    "PublishWebsiteView",
    "RemoveSectionView",
    "ReorderSectionsView",
    "SaveOnboardingResponsesView",
    "StartOnboardingView",
    "SuggestSeoView",
    "UpdateSectionVariantView",
    "UploadWebsiteMediaView",
    "OnboardingQuestionListView",
    "WebsiteConfigViewSet",
    "WebsitePageListView",
    "WebsiteTemplateViewSet",
]
