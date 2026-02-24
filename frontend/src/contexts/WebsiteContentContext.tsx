// frontend/src/contexts/WebsiteContentContext.tsx
'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useTenantReady } from '@/contexts/TenantContext';

// ─── Types ─────────────────────────────────────────────────
export interface WebsiteTheme {
  primary_color: string;
  secondary_color: string;
  font_heading: string;
  font_body: string;
  style: string;
  color_mode?: 'light' | 'dark';
}

export interface WebsiteSeo {
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
  og_image_url?: string;
  google_analytics_id?: string;
  social_links?: Record<string, string>;
}

export interface WebsiteMedia {
  logo_url?: string;
  favicon_url?: string;
  og_image_url?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SectionData = Record<string, any>;

export interface WebsiteContentData {
  has_website: boolean;
  status: string;
  content: Record<string, SectionData>;
  enabled_pages: string[];
  theme?: WebsiteTheme;
  seo?: WebsiteSeo;
  media?: WebsiteMedia;
  template_slug?: string;
}

// ─── Context ───────────────────────────────────────────────
const WebsiteContentContext = createContext<WebsiteContentData | null>(null);

export function WebsiteContentProvider({ children }: { children: ReactNode }) {
  const tenantReady = useTenantReady();

  const { data } = useQuery<WebsiteContentData>({
    queryKey: ['website-content'],
    queryFn: async () => {
      const res = await apiClient.get<WebsiteContentData>('/tenant/website-content/');
      return res.data;
    },
    enabled: tenantReady,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <WebsiteContentContext.Provider value={data ?? null}>
      {children}
    </WebsiteContentContext.Provider>
  );
}

// ─── Hooks ─────────────────────────────────────────────────

/**
 * Hook para obtener el contenido IA de una página específica.
 * Retorna null si no hay contenido o la página no existe.
 */
export function usePageContent<T = Record<string, unknown>>(pageSlug: string): T | null {
  const ctx = useContext(WebsiteContentContext);
  if (!ctx || !ctx.has_website || !ctx.content) return null;
  const pageData = ctx.content[pageSlug];
  if (!pageData) return null;
  return pageData as T;
}

/**
 * Hook para acceder al contexto completo del website content.
 */
export function useWebsiteContent(): WebsiteContentData | null {
  return useContext(WebsiteContentContext);
}

/**
 * Hook para obtener los datos del sitio publicado.
 * Retorna null si no hay website o no está publicado.
 */
export function usePublishedWebsite(): WebsiteContentData | null {
  const ctx = useContext(WebsiteContentContext);
  if (!ctx || !ctx.has_website || ctx.status !== 'published') return null;
  return ctx;
}
