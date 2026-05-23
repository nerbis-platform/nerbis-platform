// src/lib/api/marketing-content.ts
//
// Server-side data fetcher for the marketing landing page.
// Used by the marketing page.tsx (Server Component) to get content.
//
// Strategy:
//   1. Fetch all sections from the public API with a 3s timeout
//   2. Merge API data over defaults (defaults are always the base)
//   3. If the fetch fails entirely, return defaults (zero-downtime)

import { MARKETING_DEFAULTS } from '@/lib/marketing-defaults';
import type {
  MarketingSections,
  MarketingSectionKey,
} from '@/types/marketing';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const FETCH_TIMEOUT_MS = 3000;

interface ApiSectionResponse {
  key: string;
  content: Record<string, unknown>;
  is_visible: boolean;
}

/**
 * Fetches marketing content from the API and merges with defaults.
 *
 * - Server Component compatible (uses native fetch, no client-side deps)
 * - Timeout of 3 seconds to prevent slow page loads
 * - Never throws: returns defaults on any failure
 * - ISR-friendly: revalidates every 60 seconds
 */
export async function getMarketingContent(): Promise<MarketingSections> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(`${API_URL}/marketing/sections/`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(
        `[marketing-content] API responded with ${res.status} ${res.statusText}`,
      );
      return MARKETING_DEFAULTS;
    }

    const sections: ApiSectionResponse[] = await res.json();

    return mergeSectionsWithDefaults(sections);
  } catch (error) {
    // AbortError (timeout), network error, JSON parse error, etc.
    console.error('[marketing-content] Failed to fetch marketing content:', error);
    return MARKETING_DEFAULTS;
  }
}

/**
 * Merges API sections over defaults.
 * Each API section overrides the matching default; missing sections
 * keep their default values.
 */
function mergeSectionsWithDefaults(
  apiSections: ApiSectionResponse[],
): MarketingSections {
  // Start with a shallow copy of defaults
  const result = { ...MARKETING_DEFAULTS };

  const validKeys = new Set<string>(Object.keys(MARKETING_DEFAULTS));

  for (const section of apiSections) {
    if (!validKeys.has(section.key)) continue;

    const key = section.key as MarketingSectionKey;
    const defaultSection = MARKETING_DEFAULTS[key];

    result[key] = {
      is_visible: section.is_visible,
      // Deep merge: default content as base, API content as override
      content: {
        ...defaultSection.content,
        ...section.content,
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  return result;
}
