// src/lib/api/admin-industries.ts
//
// Industry catalog management helpers for the superadmin surface.
// Covers the global Industry catalog (CRUD + promote), per-task AI model
// configuration, and read-only AI usage statistics.
//
// ALL calls go through `adminClient` (admin-namespaced axios instance,
// admin-only JWT via httpOnly cookies). This file MUST NOT import from any
// tenant-scoped module — isolation is enforced by ESLint +
// scripts/assert-admin-isolation.mjs.
import { adminClient } from './admin-client';
import type {
  AdminIndustry,
  AdminIndustryPayload,
  AdminAIModelConfig,
  AdminAIModelConfigPayload,
  AdminAIStats,
  AdminAIGenerationLogPage,
  AdminAILogsParams,
} from '@/types/admin';

// ──────────────────────────────────────────────────────────────────────
// Industries
// ──────────────────────────────────────────────────────────────────────

export async function adminListIndustries(): Promise<AdminIndustry[]> {
  const { data } = await adminClient.get<AdminIndustry[]>(
    '/admin/settings/industries/',
  );
  return data;
}

export async function adminCreateIndustry(
  payload: AdminIndustryPayload,
): Promise<AdminIndustry> {
  const { data } = await adminClient.post<AdminIndustry>(
    '/admin/settings/industries/',
    payload,
  );
  return data;
}

export async function adminUpdateIndustry(
  id: number,
  payload: Partial<AdminIndustryPayload>,
): Promise<AdminIndustry> {
  const { data } = await adminClient.patch<AdminIndustry>(
    `/admin/settings/industries/${id}/`,
    payload,
  );
  return data;
}

export async function adminDeleteIndustry(id: number): Promise<void> {
  await adminClient.delete<void>(`/admin/settings/industries/${id}/`);
}

/**
 * Promote a `proposed_by_model` industry to `reviewed`. One-way and
 * idempotent: a `reviewed` row is returned unchanged (200).
 */
export async function adminPromoteIndustry(
  id: number,
): Promise<AdminIndustry> {
  const { data } = await adminClient.post<AdminIndustry>(
    `/admin/settings/industries/${id}/promote/`,
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// AI model config (per task — fixed seeded set, list + update only)
// ──────────────────────────────────────────────────────────────────────

export async function adminListAIModels(): Promise<AdminAIModelConfig[]> {
  const { data } = await adminClient.get<AdminAIModelConfig[]>(
    '/admin/settings/ai-models/',
  );
  return data;
}

export async function adminUpdateAIModel(
  id: number,
  payload: AdminAIModelConfigPayload,
): Promise<AdminAIModelConfig> {
  const { data } = await adminClient.patch<AdminAIModelConfig>(
    `/admin/settings/ai-models/${id}/`,
    payload,
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// AI usage stats (read-only aggregation over AIGenerationLog)
// ──────────────────────────────────────────────────────────────────────

export async function adminGetAIStats(): Promise<AdminAIStats> {
  const { data } = await adminClient.get<AdminAIStats>(
    '/admin/settings/ai-stats/',
  );
  return data;
}

/**
 * Paginated detail of `AIGenerationLog` rows (all fields, for data analysis).
 * Optional filters: tenant id, generation_type, model_used, is_successful.
 */
export async function adminListAILogs(
  params: AdminAILogsParams = {},
): Promise<AdminAIGenerationLogPage> {
  const query: Record<string, string> = {};
  if (params.tenant != null) query.tenant = String(params.tenant);
  if (params.generation_type) query.generation_type = params.generation_type;
  if (params.model_used) query.model_used = params.model_used;
  if (params.is_successful != null)
    query.is_successful = String(params.is_successful);
  if (params.page != null) query.page = String(params.page);
  if (params.page_size != null) query.page_size = String(params.page_size);

  const { data } = await adminClient.get<AdminAIGenerationLogPage>(
    '/admin/settings/ai-logs/',
    { params: query },
  );
  return data;
}
