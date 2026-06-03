# backend/websites/views/config.py
"""ViewSet para gestionar la configuración del sitio web del tenant."""

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import OnboardingResponse, WebsiteConfig
from ..serializers import WebsiteConfigSerializer


class WebsiteConfigViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar la configuración del sitio web del tenant.

    El tenant solo puede tener UN sitio web (OneToOne con Tenant).
    """

    permission_classes = [IsAuthenticated]
    serializer_class = WebsiteConfigSerializer

    def get_queryset(self):
        """Filtra por el tenant del usuario."""
        user = self.request.user
        if user.is_superuser:
            return WebsiteConfig.objects.all()
        if hasattr(user, "tenant") and user.tenant:
            return WebsiteConfig.objects.filter(tenant=user.tenant)
        return WebsiteConfig.objects.none()

    def get_object(self):
        """Obtiene el sitio del tenant actual (o por ID si es superuser)."""
        user = self.request.user

        # Si se pasa un ID y es superuser, usar ese ID
        if "pk" in self.kwargs and user.is_superuser:
            return get_object_or_404(WebsiteConfig, pk=self.kwargs["pk"])

        # Para usuarios normales, obtener su sitio
        if hasattr(user, "tenant") and user.tenant:
            return get_object_or_404(WebsiteConfig, tenant=user.tenant)

        return Response({"error": "No tienes un sitio web configurado"}, status=status.HTTP_404_NOT_FOUND)

    def perform_update(self, serializer):
        """Keep onboarding logo_upload in sync when logo changes from editor."""
        old_logo = (serializer.instance.media_data or {}).get("logo_url", "")
        instance = serializer.save()
        new_logo = (instance.media_data or {}).get("logo_url", "")
        # Sync when logo changed (including removal)
        if new_logo != old_logo:
            OnboardingResponse.objects.filter(
                website_config=instance,
                question__question_key="logo_upload",
            ).update(response_value=new_logo or "")

    @action(detail=False, methods=["get"])
    def my_site(self, request):
        """
        GET /api/websites/config/my_site/

        Obtiene el sitio web del tenant actual.
        Si no existe, retorna información para crearlo.
        """
        user = request.user
        if not hasattr(user, "tenant") or not user.tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=user.tenant)
            return Response(WebsiteConfigSerializer(config).data)
        except WebsiteConfig.DoesNotExist:
            return Response(
                {
                    "exists": False,
                    "message": "No tienes un sitio web. Selecciona un template para comenzar.",
                    "templates_url": "/api/websites/templates/",
                }
            )
