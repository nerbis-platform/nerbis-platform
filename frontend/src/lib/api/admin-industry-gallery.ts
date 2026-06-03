// src/lib/api/admin-industry-gallery.ts
//
// Industry gallery card management helpers for the superadmin surface.
// Allows admins to CRUD gallery cards and reorder them.
//
// ALL calls go through `adminClient` (admin-namespaced axios instance,
// admin-only JWT). This file MUST NOT import from any tenant-scoped
// module -- isolation is enforced by ESLint + scripts/assert-admin-isolation.mjs.

import { adminClient } from './admin-client';
import type { IndustryGalleryCard } from '@/types/marketing';

// ──────────────────────────────────────────────────────────────────────
// List all gallery cards
// ──────────────────────────────────────────────────────────────────────

export async function adminListGalleryCards(): Promise<IndustryGalleryCard[]> {
  const { data } = await adminClient.get<IndustryGalleryCard[]>(
    '/admin/settings/industry-gallery/',
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// Create a gallery card (multipart — supports image upload)
// ──────────────────────────────────────────────────────────────────────

export async function adminCreateGalleryCard(
  formData: FormData,
): Promise<IndustryGalleryCard> {
  const { data } = await adminClient.post<IndustryGalleryCard>(
    '/admin/settings/industry-gallery/',
    formData,
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// Update a gallery card (multipart — supports image upload)
// ──────────────────────────────────────────────────────────────────────

export async function adminUpdateGalleryCard(
  id: number,
  formData: FormData,
): Promise<IndustryGalleryCard> {
  const { data } = await adminClient.patch<IndustryGalleryCard>(
    `/admin/settings/industry-gallery/${id}/`,
    formData,
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// Delete a gallery card
// ──────────────────────────────────────────────────────────────────────

export async function adminDeleteGalleryCard(id: number): Promise<void> {
  await adminClient.delete(`/admin/settings/industry-gallery/${id}/`);
}

// ──────────────────────────────────────────────────────────────────────
// Reorder gallery cards (bulk update of row + sort_order)
// ──────────────────────────────────────────────────────────────────────

export async function adminReorderGalleryCards(
  items: { id: number; row: number; sort_order: number }[],
): Promise<void> {
  await adminClient.post('/admin/settings/industry-gallery/reorder/', {
    items,
  });
}
