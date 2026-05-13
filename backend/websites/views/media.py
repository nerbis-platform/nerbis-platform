# backend/websites/views/media.py
"""View para upload de media del website builder."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class UploadWebsiteMediaView(APIView):
    """
    POST /api/websites/upload-media/

    Sube una imagen para el website builder (OG image, favicon, etc).
    Devuelve la URL absoluta del archivo subido.
    """

    permission_classes = [IsAuthenticated]

    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    ALLOWED_IMAGE_TYPES = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/svg+xml",
        "image/x-icon",
        "image/vnd.microsoft.icon",
    }

    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".ico"}
    # Magic bytes for image format detection
    _MAGIC_BYTES = {
        b"\xff\xd8\xff": ".jpg",
        b"\x89PNG": ".png",
        b"RIFF": ".webp",  # WebP starts with RIFF....WEBP
        b"GIF8": ".gif",
        b"\x00\x00\x01\x00": ".ico",
        b"\x00\x00\x02\x00": ".ico",
    }

    def _detect_image_type(self, uploaded_file):
        """Detect image type from file content (magic bytes), not client headers."""
        uploaded_file.seek(0)
        header = uploaded_file.read(12)
        uploaded_file.seek(0)

        # Check SVG (text-based)
        if header.lstrip(b"\xef\xbb\xbf").lstrip()[:5] in (b"<?xml", b"<svg "):
            return ".svg"
        # WebP: RIFF....WEBP
        if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
            return ".webp"
        for magic, ext in self._MAGIC_BYTES.items():
            if magic != b"RIFF" and header[: len(magic)] == magic:
                return ext
        return None

    def post(self, request):
        import uuid

        from django.core.files.storage import default_storage

        tenant = self._get_tenant(request)
        if not tenant:
            return Response({"error": "Usuario no asociado a un tenant"}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"error": "No se envió ningún archivo"}, status=status.HTTP_400_BAD_REQUEST)

        # Validar tamaño
        if uploaded_file.size > self.MAX_FILE_SIZE:
            return Response({"error": "La imagen es muy grande. El máximo es 5MB."}, status=status.HTTP_400_BAD_REQUEST)

        # Validar tipo real del archivo (magic bytes, no content_type del cliente)
        detected_ext = self._detect_image_type(uploaded_file)
        if not detected_ext or detected_ext not in self.ALLOWED_EXTENSIONS:
            return Response(
                {"error": "Formato no soportado. Usa JPG, PNG, WebP, GIF o SVG."}, status=status.HTTP_400_BAD_REQUEST
            )

        purpose = request.data.get("purpose", "general")
        if purpose not in ("og_image", "favicon", "general"):
            purpose = "general"

        # Generar nombre seguro con extensión detectada (no la del cliente)
        ext = detected_ext
        filename = f"{purpose}_{uuid.uuid4().hex[:8]}{ext}"
        path = f"websites/{tenant.slug}/{filename}"

        # Guardar archivo
        saved_path = default_storage.save(path, uploaded_file)
        file_url = request.build_absolute_uri(f"/media/{saved_path}")

        return Response(
            {
                "url": file_url,
                "path": saved_path,
            },
            status=status.HTTP_201_CREATED,
        )

    def _get_tenant(self, request):
        if not hasattr(request.user, "tenant") or not request.user.tenant:
            return None
        return request.user.tenant
