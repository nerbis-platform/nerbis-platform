# backend/websites/views/sections.py
"""Views para gestión de secciones del website builder."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import WebsiteConfig


class ReorderSectionsView(APIView):
    """
    POST /api/websites/sections/reorder/

    Reordena las secciones del content_data.
    Body: {"order": ["hero", "services", "about", "contact"]}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"error": "No tienes un sitio web configurado"}, status=status.HTTP_404_NOT_FOUND)

        new_order = request.data.get("order", [])
        if not new_order or not isinstance(new_order, list):
            return Response(
                {"error": "Se requiere 'order' como lista de IDs de sección"}, status=status.HTTP_400_BAD_REQUEST
            )

        content = config.content_data or {}
        content["_section_order"] = new_order
        config.content_data = content
        config.save(update_fields=["content_data", "updated_at"])

        return Response({"message": "Secciones reordenadas", "order": new_order})

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant


class AddSectionView(APIView):
    """
    POST /api/websites/sections/add/

    Agrega una sección vacía al content_data.
    Body: {"section_id": "gallery"}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"error": "No tienes un sitio web configurado"}, status=status.HTTP_404_NOT_FOUND)

        section_id = request.data.get("section_id", "")
        if not section_id:
            return Response({"error": "Se requiere 'section_id'"}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar que la sección exista en el template
        structure = config.template.structure_schema or {}
        available = {s["id"] for s in structure.get("sections", [])}
        if section_id not in available:
            return Response(
                {"error": f"La sección '{section_id}' no existe en este template"}, status=status.HTTP_400_BAD_REQUEST
            )

        content = config.content_data or {}
        if section_id in content:
            return Response({"error": f"La sección '{section_id}' ya existe"}, status=status.HTTP_400_BAD_REQUEST)

        # Usar contenido inicial del frontend si viene, o defaults
        initial_content = request.data.get("initial_content")
        variant = request.data.get("variant")

        if initial_content and isinstance(initial_content, dict):
            content[section_id] = initial_content
        else:
            section_defaults = {
                "header": {"logo_text": "", "cta_text": "Contáctanos", "cta_link": "#contact"},
                "hero": {"title": "", "subtitle": "", "cta_text": "", "cta_link": "#"},
                "about": {"title": "Sobre Nosotros", "content": "", "highlights": []},
                "services": {"title": "Servicios", "subtitle": "", "items": []},
                "products": {"title": "Productos", "subtitle": "", "items": []},
                "testimonials": {"title": "Testimonios", "items": []},
                "gallery": {"title": "Galería", "subtitle": "", "items": []},
                "pricing": {"title": "Precios", "subtitle": "", "items": []},
                "faq": {"title": "Preguntas Frecuentes", "items": []},
                "contact": {"title": "Contacto", "subtitle": ""},
            }
            content[section_id] = section_defaults.get(section_id, {"title": "", "content": ""})

        # Guardar variante si viene
        if variant:
            content[section_id]["_variant"] = variant

        # Actualizar orden
        order = content.get("_section_order", [])
        if order and section_id not in order:
            order.append(section_id)
            content["_section_order"] = order

        config.content_data = content
        config.save(update_fields=["content_data", "updated_at"])

        return Response(
            {"message": f"Sección '{section_id}' agregada", "section": content[section_id]},
            status=status.HTTP_201_CREATED,
        )

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant


class RemoveSectionView(APIView):
    """
    POST /api/websites/sections/remove/

    Elimina una sección del content_data.
    Body: {"section_id": "gallery"}
    No permite eliminar secciones requeridas.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"error": "No tienes un sitio web configurado"}, status=status.HTTP_404_NOT_FOUND)

        section_id = request.data.get("section_id", "")
        if not section_id:
            return Response({"error": "Se requiere 'section_id'"}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar que no sea requerida
        structure = config.template.structure_schema or {}
        for s in structure.get("sections", []):
            if s["id"] == section_id and s.get("required", False):
                return Response(
                    {"error": f"La sección '{section_id}' es requerida y no se puede eliminar"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        content = config.content_data or {}
        if section_id not in content:
            return Response(
                {"error": f"La sección '{section_id}' no existe en el contenido"}, status=status.HTTP_404_NOT_FOUND
            )

        del content[section_id]

        # Actualizar orden
        order = content.get("_section_order", [])
        if order and section_id in order:
            order.remove(section_id)
            content["_section_order"] = order

        config.content_data = content
        config.save(update_fields=["content_data", "updated_at"])

        return Response({"message": f"Sección '{section_id}' eliminada"})

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant


# ===================================
# DUPLICAR SECCIÓN
# ===================================


class DuplicateSectionView(APIView):
    """
    POST /api/websites/sections/duplicate/

    Duplica una sección existente con todo su contenido.
    Body: {"section_id": "services"}
    Genera un id único: services_2, services_3, etc.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"error": "No tienes un sitio web configurado"}, status=status.HTTP_404_NOT_FOUND)

        section_id = request.data.get("section_id", "")
        if not section_id:
            return Response({"error": "Se requiere 'section_id'"}, status=status.HTTP_400_BAD_REQUEST)

        content = config.content_data or {}
        if section_id not in content:
            return Response(
                {"error": f"La sección '{section_id}' no existe en el contenido"}, status=status.HTTP_404_NOT_FOUND
            )

        # Generar id único para la copia
        import copy
        import re

        # Derive base type: use existing _type, or strip trailing _N suffix
        section_data = content[section_id]
        if isinstance(section_data, dict) and "_type" in section_data:
            base_id = section_data["_type"]
        else:
            base_id = re.sub(r"_\d+$", "", section_id)
        counter = 2
        new_id = f"{base_id}_{counter}"
        while new_id in content:
            counter += 1
            new_id = f"{base_id}_{counter}"

        # Copiar contenido de la sección original
        cloned = copy.deepcopy(content[section_id])
        # Preserve the base section type so render dispatch works for duplicated ids
        if "_type" not in cloned:
            cloned["_type"] = base_id
        content[new_id] = cloned

        # Insertar justo después del original en el orden
        order = content.get("_section_order", [])
        if order and section_id in order:
            idx = order.index(section_id)
            order.insert(idx + 1, new_id)
            content["_section_order"] = order

        config.content_data = content
        config.save(update_fields=["content_data", "updated_at"])

        return Response(
            {
                "message": f"Sección '{section_id}' duplicada como '{new_id}'",
                "new_section_id": new_id,
                "section": content[new_id],
            },
            status=status.HTTP_201_CREATED,
        )

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant


# ===================================
# CAMBIAR VARIANTE DE SECCIÓN
# ===================================


class UpdateSectionVariantView(APIView):
    """
    POST /api/websites/sections/variant/

    Cambia la variante visual de una sección.
    Body: {"section_id": "hero", "variant": "split-image"}
    """

    permission_classes = [IsAuthenticated]

    VALID_VARIANTS = {
        "hero": ["centered", "split-image", "fullwidth-image", "bold-typography", "diagonal-split", "glassmorphism"],
        "about": ["text-only", "split-image", "stats-banner", "timeline", "overlapping-cards", "fullwidth-banner"],
        "services": [
            "grid-cards",
            "grid-cards-image",
            "list-detailed",
            "featured-highlight",
            "horizontal-scroll",
            "icon-minimal",
        ],
        "products": [
            "grid-cards",
            "grid-cards-image",
            "showcase-large",
            "catalog-compact",
            "masonry-staggered",
            "price-table",
        ],
    }

    def post(self, request):
        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            config = WebsiteConfig.objects.get(tenant=tenant)
        except WebsiteConfig.DoesNotExist:
            return Response({"error": "No tienes un sitio web configurado"}, status=status.HTTP_404_NOT_FOUND)

        section_id = request.data.get("section_id", "")
        variant = request.data.get("variant", "")

        if not section_id or not variant:
            return Response({"error": "Se requieren 'section_id' y 'variant'"}, status=status.HTTP_400_BAD_REQUEST)

        # Validar variante
        valid = self.VALID_VARIANTS.get(section_id)
        if not valid:
            return Response(
                {"error": f"La sección '{section_id}' no soporta variantes"}, status=status.HTTP_400_BAD_REQUEST
            )

        if variant not in valid:
            return Response(
                {"error": f"Variante '{variant}' no válida. Opciones: {', '.join(valid)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content = config.content_data or {}
        if section_id not in content:
            return Response(
                {"error": f"La sección '{section_id}' no existe en el contenido"}, status=status.HTTP_404_NOT_FOUND
            )

        content[section_id]["_variant"] = variant
        config.content_data = content
        config.save(update_fields=["content_data", "updated_at"])

        return Response(
            {
                "message": f"Variante de '{section_id}' cambiada a '{variant}'",
                "section_id": section_id,
                "variant": variant,
            }
        )

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant
