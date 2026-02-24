'use client';

import { useEffect } from 'react';
import { useWebsiteContent } from '@/contexts/WebsiteContentContext';
import { applyThemeToDOM, type ThemeConfig } from '@/lib/utils/theme-colors';

/**
 * ThemeSync — Sincroniza el tema del website builder con el storefront.
 *
 * Cuando un tenant tiene un sitio publicado con tema personalizado (colores,
 * fuentes del builder), este componente aplica ese tema a TODO el sitio,
 * incluyendo páginas del storefront como /products, /services, etc.
 *
 * Prioridad:
 * 1. Tema del website builder (si está publicado) — override
 * 2. Tema del tenant config (aplicado por TenantProvider) — base
 *
 * Esto garantiza continuidad visual: el visitante ve los mismos colores
 * y fuentes tanto en la home (website builder) como en /products (storefront).
 */
export function ThemeSync() {
  const website = useWebsiteContent();

  useEffect(() => {
    if (!website?.has_website || website.status !== 'published' || !website.theme) {
      return;
    }

    const theme = website.theme;

    // Only override if the builder has meaningful theme data
    if (!theme.primary_color || !theme.secondary_color) return;

    const themeConfig: ThemeConfig = {
      primary_color: theme.primary_color,
      secondary_color: theme.secondary_color,
      font_heading: theme.font_heading,
      font_body: theme.font_body,
      style: theme.style,
    };

    applyThemeToDOM(themeConfig);
  }, [website]);

  // SEO: apply meta title/description from the builder
  useEffect(() => {
    if (!website?.has_website || website.status !== 'published' || !website.seo) {
      return;
    }

    if (website.seo.meta_title) {
      document.title = website.seo.meta_title;
    }

    if (website.seo.meta_description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', website.seo.meta_description);
    }

    // Favicon from builder media
    if (website.media?.favicon_url) {
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = website.media.favicon_url;
    }
  }, [website]);

  return null; // Render nothing — pure side-effect component
}
