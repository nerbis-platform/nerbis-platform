// src/lib/api/industry-gallery.ts
//
// Server-side data fetcher for the industry gallery on the marketing landing page.
// Used by the marketing page.tsx (Server Component) to get gallery cards.
//
// Strategy:
//   1. Fetch all cards from the public API with a 3s timeout
//   2. If the fetch fails entirely, return hardcoded defaults (zero-downtime)

import type { IndustryGalleryCard } from '@/types/marketing';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const FETCH_TIMEOUT_MS = 3000;

// ──────────────────────────────────────────────────────────────────────
// Hardcoded fallback data (current gradients from social-proof.tsx)
// ──────────────────────────────────────────────────────────────────────

const GALLERY_DEFAULTS: IndustryGalleryCard[] = [
  // Row 1
  { id: 0, name: 'Tiendas online', image: null, gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', row: 1, sort_order: 0, is_visible: true },
  { id: 1, name: 'Restaurantes', image: null, gradient: 'linear-gradient(135deg, #4a1942 0%, #6b2d5b 50%, #d63031 100%)', row: 1, sort_order: 1, is_visible: true },
  { id: 2, name: 'Salones de belleza', image: null, gradient: 'linear-gradient(135deg, #c6a0a0 0%, #e8c4c4 50%, #f5e6cc 100%)', row: 1, sort_order: 2, is_visible: true },
  { id: 3, name: 'Gimnasios', image: null, gradient: 'linear-gradient(135deg, #0d2137 0%, #1b4332 50%, #2d6a4f 100%)', row: 1, sort_order: 3, is_visible: true },
  { id: 4, name: 'Coaches', image: null, gradient: 'linear-gradient(135deg, #2c3e50 0%, #3498db 50%, #2980b9 100%)', row: 1, sort_order: 4, is_visible: true },
  { id: 5, name: 'Cafeterias', image: null, gradient: 'linear-gradient(135deg, #3e2723 0%, #5d4037 50%, #8d6e63 100%)', row: 1, sort_order: 5, is_visible: true },
  // Row 2
  { id: 6, name: 'Portafolios', image: null, gradient: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2d2d2d 100%)', row: 2, sort_order: 0, is_visible: true },
  { id: 7, name: 'Blogs', image: null, gradient: 'linear-gradient(135deg, #1d3557 0%, #457b9d 50%, #a8dadc 100%)', row: 2, sort_order: 1, is_visible: true },
  { id: 8, name: 'Consultorios', image: null, gradient: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)', row: 2, sort_order: 2, is_visible: true },
  { id: 9, name: 'Estudios creativos', image: null, gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)', row: 2, sort_order: 3, is_visible: true },
  { id: 10, name: 'Agencias', image: null, gradient: 'linear-gradient(135deg, #141e30 0%, #243b55 50%, #141e30 100%)', row: 2, sort_order: 4, is_visible: true },
  { id: 11, name: 'Fotografos', image: null, gradient: 'linear-gradient(135deg, #2c2c2c 0%, #3d3d3d 50%, #1a1a1a 100%)', row: 2, sort_order: 5, is_visible: true },
];

/**
 * Fetches industry gallery cards from the public API.
 *
 * - Server Component compatible (uses native fetch, no client-side deps)
 * - Timeout of 3 seconds to prevent slow page loads
 * - Never throws: returns defaults on any failure
 * - ISR-friendly: revalidates every 60 seconds
 */
export async function getIndustryGalleryCards(): Promise<IndustryGalleryCard[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(`${API_URL}/public/industry-gallery/`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(
        `[industry-gallery] API responded with ${res.status} ${res.statusText}`,
      );
      return GALLERY_DEFAULTS;
    }

    const cards: IndustryGalleryCard[] = await res.json();

    if (!Array.isArray(cards) || cards.length === 0) {
      return GALLERY_DEFAULTS;
    }

    return cards;
  } catch (error) {
    // AbortError (timeout), network error, JSON parse error, etc.
    console.error('[industry-gallery] Failed to fetch gallery cards:', error);
    return GALLERY_DEFAULTS;
  }
}

export { GALLERY_DEFAULTS };
