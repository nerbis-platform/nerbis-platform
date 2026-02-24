# backend/websites/services/unsplash_service.py
"""
Servicio para integración con Unsplash API.

Busca imágenes de stock relevantes para el sitio web generado,
usando toda la información del onboarding (nombre, descripción,
servicios, industria) para máxima relevancia.
"""

import logging
import re
import requests
from typing import Dict, List

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Palabras comunes en español que no aportan a la búsqueda de imágenes
STOP_WORDS = {
    'de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas',
    'en', 'con', 'por', 'para', 'al', 'y', 'o', 'que', 'es', 'su', 'se',
    'nos', 'nuestro', 'nuestra', 'nuestros', 'nuestras', 'somos', 'como',
    'más', 'muy', 'tu', 'tus', 'mi', 'mis', 'te', 'ti', 'nos',
}


class UnsplashService:
    BASE_URL = "https://api.unsplash.com"
    CACHE_TTL = 3600  # 1 hora

    # Mapeo de industria del tenant (onboarding) → keywords para Unsplash
    INDUSTRY_KEYWORDS = {
        'beauty': 'beauty salon hairdresser',
        'spa': 'spa wellness massage',
        'nails': 'nail salon manicure',
        'gym': 'gym fitness workout',
        'yoga': 'yoga pilates studio',
        'clinic': 'medical clinic doctor',
        'dental': 'dental clinic dentist',
        'psychology': 'therapy psychology office',
        'nutrition': 'nutrition healthy food',
        'veterinary': 'veterinary pet clinic',
        'restaurant': 'restaurant dining food',
        'bakery': 'bakery coffee pastry',
        'store': 'retail store shopping',
        'fashion': 'fashion boutique clothing',
        'education': 'education classroom academy',
        'coworking': 'coworking office modern',
        'photography': 'photography studio camera',
        'architecture': 'architecture design modern',
        'legal': 'law office professional',
        'accounting': 'accounting finance office',
        'marketing': 'marketing agency creative',
        'tech': 'technology startup office',
        'real_estate': 'real estate luxury home',
        'automotive': 'automotive car workshop',
        'events': 'events wedding celebration',
        'travel': 'travel tourism vacation',
        'services': 'professional services office',
        'other': 'modern business workspace',
    }

    def __init__(self):
        self.api_key = getattr(settings, 'UNSPLASH_ACCESS_KEY', '')

    @property
    def is_configured(self):
        return bool(self.api_key)

    def search_photos(
        self,
        query: str,
        per_page: int = 5,
        orientation: str = 'landscape',
    ) -> List[Dict]:
        """Busca fotos en Unsplash API con cache."""
        if not self.is_configured:
            return []

        cache_key = f"unsplash:{query}:{orientation}:{per_page}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            resp = requests.get(
                f"{self.BASE_URL}/search/photos",
                params={
                    'query': query,
                    'per_page': per_page,
                    'orientation': orientation,
                    'content_filter': 'high',
                },
                headers={'Authorization': f'Client-ID {self.api_key}'},
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            results = [self._format_photo(p) for p in data.get('results', [])]
            cache.set(cache_key, results, self.CACHE_TTL)
            return results
        except requests.RequestException as e:
            logger.warning(f"Unsplash API error: {e}")
            return []

    def get_images_for_generation(
        self,
        sections: List[str],
        onboarding_responses: Dict[str, str],
        tenant_industry: str = '',
        template_industry: str = 'generic',
    ) -> Dict[str, List[Dict]]:
        """
        Busca imágenes relevantes usando TODA la info del onboarding.

        Construye queries específicas por sección:
        - Hero: query atmosférica (negocio + interior/espacio)
        - About: query de equipo/personas
        - Services: query por nombre de servicios principales

        Args:
            sections: IDs de secciones generadas (hero, about, services, ...)
            onboarding_responses: Dict con todas las respuestas del onboarding
            tenant_industry: Industria del tenant (ej: 'bakery', 'yoga')
            template_industry: Industria del template (fallback)

        Returns:
            Dict con section_id → lista de imágenes.
        """
        if not self.is_configured:
            return {}

        # Extraer datos clave del onboarding
        biz_name = onboarding_responses.get('business_name', '')
        biz_desc = onboarding_responses.get('business_description', '')
        main_services = onboarding_responses.get('main_services', '')
        tagline = onboarding_responses.get('business_tagline', '')

        # Construir la base semántica del negocio
        base_keywords = self._extract_business_keywords(
            biz_name, biz_desc, tagline, tenant_industry, template_industry
        )

        logger.info(f"Unsplash base query: '{base_keywords}' (industry={tenant_industry})")

        results = {}
        for section in sections:
            if section not in ('hero', 'about', 'services'):
                continue

            if section == 'hero':
                # Hero: imagen atmosférica del espacio/negocio
                query = f"{base_keywords} interior"
                results['hero'] = self.search_photos(query, per_page=3, orientation='landscape')

            elif section == 'about':
                # About: equipo, personas, workspace
                query = f"{base_keywords} team people"
                results['about'] = self.search_photos(query, per_page=2, orientation='landscape')

            elif section == 'services':
                # Services: usar nombres de servicios si están disponibles
                if main_services:
                    query = self._services_query(main_services, tenant_industry)
                else:
                    query = base_keywords
                results['services'] = self.search_photos(query, per_page=6, orientation='landscape')

        return results

    def _extract_business_keywords(
        self,
        name: str,
        description: str,
        tagline: str,
        tenant_industry: str,
        template_industry: str,
    ) -> str:
        """
        Extrae las palabras clave más relevantes del negocio.

        Ejemplo para "Café Don Pedro" con descripción "Somos una cafetería
        especializada en café de origen colombiano y pasteles artesanales":
        → "café cafetería pasteles artesanales"

        Ejemplo para "Studio Glow" (beauty salon):
        → "beauty salon hairdresser"
        """
        # Juntar toda la info disponible
        raw_text = f"{name} {tagline} {description}".strip()

        if raw_text and len(raw_text) > 5:
            # Extraer palabras significativas (sin stop words, > 2 chars)
            words = re.findall(r'\b[a-záéíóúñü]+\b', raw_text.lower())
            keywords = [w for w in words if w not in STOP_WORDS and len(w) > 2]

            # Tomar las primeras 5 palabras únicas (sin repetir)
            seen = set()
            unique = []
            for w in keywords:
                if w not in seen:
                    seen.add(w)
                    unique.append(w)
                if len(unique) >= 5:
                    break

            if len(unique) >= 2:
                return ' '.join(unique)

        # Fallback: usar mapeo de industria
        if tenant_industry:
            mapped = self.INDUSTRY_KEYWORDS.get(tenant_industry)
            if mapped:
                return mapped

        # Último fallback: industria del template
        return self.INDUSTRY_KEYWORDS.get(template_industry, 'modern business workspace')

    def _services_query(self, main_services: str, tenant_industry: str) -> str:
        """
        Construye query para la sección services usando los nombres de los servicios.

        Si main_services es "Café espresso, Pasteles artesanales, Brunch"
        → "café espresso pasteles brunch"
        """
        # main_services puede ser texto libre o separado por comas/saltos de línea
        words = re.findall(r'\b[a-záéíóúñü]+\b', main_services.lower())
        keywords = [w for w in words if w not in STOP_WORDS and len(w) > 2]

        seen = set()
        unique = []
        for w in keywords:
            if w not in seen:
                seen.add(w)
                unique.append(w)
            if len(unique) >= 4:
                break

        if len(unique) >= 2:
            return ' '.join(unique)

        # Fallback a industria
        return self.INDUSTRY_KEYWORDS.get(tenant_industry, 'professional services')

    def trigger_download(self, download_location: str):
        """
        Trigger Unsplash download event (requerido por API terms).
        Debe llamarse cuando la imagen se "usa" (asignada a una sección).
        Best-effort, no bloquea si falla.
        """
        if not self.is_configured or not download_location:
            return
        try:
            requests.get(
                download_location,
                headers={'Authorization': f'Client-ID {self.api_key}'},
                timeout=5,
            )
        except Exception:
            pass

    def _format_photo(self, photo: Dict) -> Dict:
        """Formatea respuesta de Unsplash API a nuestro formato interno."""
        return {
            'id': photo['id'],
            'url': f"{photo['urls']['raw']}&w=1200&q=80&fm=webp",
            'thumb_url': f"{photo['urls']['raw']}&w=400&q=60&fm=webp",
            'alt': photo.get('alt_description', '') or photo.get('description', '') or '',
            'photographer': photo['user']['name'],
            'photographer_url': photo['user']['links']['html'],
            'unsplash_url': photo['links']['html'],
            'download_location': photo.get('links', {}).get('download_location', ''),
        }
