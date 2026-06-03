// src/app/(tenant)/(shop)/layout.tsx
// Layout para las páginas públicas del tenant (shop, services, about, etc.)
// Usa ISR para pre-cargar el website content y generar metadata SEO.

import type { Metadata } from 'next';
import { fetchServer } from '@/lib/api/server';
import type { WebsiteContentData } from '@/contexts/WebsiteContentContext';

// ISR: revalidar cada 60 segundos
export const revalidate = 60;

/**
 * Metadata SEO dinámica por tenant.
 * Next.js la renderiza en el <head> del HTML estático.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const data = await fetchServer<WebsiteContentData>('/tenant/website-content/', {
      revalidate: 60,
    });

    const seo = data.seo || {};
    const media = data.media || {};

    return {
      title: seo.meta_title || undefined,
      description: seo.meta_description || undefined,
      keywords: seo.keywords?.join(', ') || undefined,
      openGraph: {
        title: seo.meta_title || undefined,
        description: seo.meta_description || undefined,
        images: media.og_image_url ? [{ url: media.og_image_url }] : undefined,
      },
      icons: media.favicon_url ? { icon: media.favicon_url } : undefined,
    };
  } catch {
    return {
      title: 'Tienda Online',
      description: 'Bienvenido a nuestra tienda',
    };
  }
}

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
