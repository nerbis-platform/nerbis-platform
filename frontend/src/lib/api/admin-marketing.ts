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

// ──────────────────────────────────────────────────────────────────────
// List all marketing sections
// ──────────────────────────────────────────────────────────────────────

export async function adminListMarketingSections(): Promise<
  AdminMarketingSectionResponse[]
> {
  const { data } = await adminClient.get<AdminMarketingSectionResponse[]>(
    '/admin/settings/marketing/',
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// Update a single marketing section
// ──────────────────────────────────────────────────────────────────────

export async function adminUpdateMarketingSection(
  key: MarketingSectionKey,
  payload: Partial<MarketingSectionData>,
): Promise<AdminMarketingSectionResponse> {
  const { data } = await adminClient.put<AdminMarketingSectionResponse>(
    `/admin/settings/marketing/${key}/`,
    payload,
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// Reset a section to its default content
// ──────────────────────────────────────────────────────────────────────

export async function adminResetMarketingSection(
  key: MarketingSectionKey,
): Promise<AdminMarketingSectionResponse> {
  const { data } = await adminClient.post<AdminMarketingSectionResponse>(
    `/admin/settings/marketing/${key}/reset/`,
  );
  return data;
}
