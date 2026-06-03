// src/lib/api/admin-marketing.ts
//
// Marketing section management helpers for the superadmin surface.
// Allows admins to view, update, and reset marketing landing page content.
//
// ALL calls go through `adminClient` (admin-namespaced axios instance,
// admin-only JWT). This file MUST NOT import from any tenant-scoped
// module -- isolation is enforced by ESLint + scripts/assert-admin-isolation.mjs.
import { adminClient } from './admin-client';
import type {
  MarketingSectionData,
  MarketingSectionKey,
} from '@/types/marketing';

// ──────────────────────────────────────────────────────────────────────
// Response type from the backend list endpoint
// ──────────────────────────────────────────────────────────────────────

export interface AdminMarketingSectionResponse {
  key: MarketingSectionKey;
  content: Record<string, unknown>;
  is_visible: boolean;
  updated_at: string;
}

/** Raw shape from the backend (uses section_key, not key) */
interface AdminMarketingSectionRaw {
  section_key: string;
  content: Record<string, unknown>;
  is_visible: boolean;
  updated_at: string;
}

function mapRaw(raw: AdminMarketingSectionRaw): AdminMarketingSectionResponse {
  return {
    key: raw.section_key as MarketingSectionKey,
    content: raw.content,
    is_visible: raw.is_visible,
    updated_at: raw.updated_at,
  };
}

// ──────────────────────────────────────────────────────────────────────
// List all marketing sections
// ──────────────────────────────────────────────────────────────────────

export async function adminListMarketingSections(): Promise<
  AdminMarketingSectionResponse[]
> {
  const { data } = await adminClient.get<AdminMarketingSectionRaw[]>(
    '/admin/settings/marketing/',
  );
  return data.map(mapRaw);
}

// ──────────────────────────────────────────────────────────────────────
// Update a single marketing section
// ──────────────────────────────────────────────────────────────────────

export async function adminUpdateMarketingSection(
  key: MarketingSectionKey,
  payload: Partial<MarketingSectionData>,
): Promise<AdminMarketingSectionResponse> {
  const { data } = await adminClient.patch<AdminMarketingSectionRaw>(
    `/admin/settings/marketing/${key}/`,
    payload,
  );
  return mapRaw(data);
}

// ──────────────────────────────────────────────────────────────────────
// Reset a section to its default content
// ──────────────────────────────────────────────────────────────────────

export async function adminResetMarketingSection(
  key: MarketingSectionKey,
): Promise<AdminMarketingSectionResponse> {
  const { data } = await adminClient.post<AdminMarketingSectionRaw>(
    `/admin/settings/marketing/${key}/reset/`,
  );
  return mapRaw(data);
}
