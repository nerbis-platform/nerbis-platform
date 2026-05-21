// src/lib/api/admin-settings.ts
//
// Platform settings management helpers for the superadmin surface.
// Covers platform modules, website pages, and onboarding questions.
//
// ALL calls go through `adminClient` (admin-namespaced axios instance,
// admin-only JWT). This file MUST NOT import from any tenant-scoped
// module — isolation is enforced by ESLint + scripts/assert-admin-isolation.mjs.
import { adminClient } from './admin-client';
import type {
  AdminOnboardingQuestion,
  AdminOnboardingQuestionPayload,
  AdminPlatformModule,
  AdminPlatformModulePayload,
  AdminWebsitePage,
  AdminWebsitePagePayload,
} from '@/types/admin';

// ──────────────────────────────────────────────────────────────────────
// Modules
// ──────────────────────────────────────────────────────────────────────

export async function adminListModules(): Promise<AdminPlatformModule[]> {
  const { data } = await adminClient.get<AdminPlatformModule[]>(
    '/admin/settings/modules/',
  );
  return data;
}

export async function adminCreateModule(
  payload: AdminPlatformModulePayload,
): Promise<AdminPlatformModule> {
  const { data } = await adminClient.post<AdminPlatformModule>(
    '/admin/settings/modules/',
    payload,
  );
  return data;
}

export async function adminUpdateModule(
  id: number,
  payload: Partial<AdminPlatformModulePayload>,
): Promise<AdminPlatformModule> {
  const { data } = await adminClient.patch<AdminPlatformModule>(
    `/admin/settings/modules/${id}/`,
    payload,
  );
  return data;
}

export async function adminDeleteModule(id: number): Promise<void> {
  await adminClient.delete<void>(`/admin/settings/modules/${id}/`);
}

// ──────────────────────────────────────────────────────────────────────
// Pages
// ──────────────────────────────────────────────────────────────────────

export async function adminListPages(): Promise<AdminWebsitePage[]> {
  const { data } = await adminClient.get<AdminWebsitePage[]>(
    '/admin/settings/pages/',
  );
  return data;
}

export async function adminCreatePage(
  payload: AdminWebsitePagePayload,
): Promise<AdminWebsitePage> {
  const { data } = await adminClient.post<AdminWebsitePage>(
    '/admin/settings/pages/',
    payload,
  );
  return data;
}

export async function adminUpdatePage(
  id: number,
  payload: Partial<AdminWebsitePagePayload>,
): Promise<AdminWebsitePage> {
  const { data } = await adminClient.patch<AdminWebsitePage>(
    `/admin/settings/pages/${id}/`,
    payload,
  );
  return data;
}

export async function adminDeletePage(id: number): Promise<void> {
  await adminClient.delete<void>(`/admin/settings/pages/${id}/`);
}

// ──────────────────────────────────────────────────────────────────────
// Questions
// ──────────────────────────────────────────────────────────────────────

export async function adminListQuestions(): Promise<
  AdminOnboardingQuestion[]
> {
  const { data } = await adminClient.get<AdminOnboardingQuestion[]>(
    '/admin/settings/questions/',
  );
  return data;
}

export async function adminCreateQuestion(
  payload: AdminOnboardingQuestionPayload,
): Promise<AdminOnboardingQuestion> {
  const { data } = await adminClient.post<AdminOnboardingQuestion>(
    '/admin/settings/questions/',
    payload,
  );
  return data;
}

export async function adminUpdateQuestion(
  id: number,
  payload: Partial<AdminOnboardingQuestionPayload>,
): Promise<AdminOnboardingQuestion> {
  const { data } = await adminClient.patch<AdminOnboardingQuestion>(
    `/admin/settings/questions/${id}/`,
    payload,
  );
  return data;
}

export async function adminDeleteQuestion(id: number): Promise<void> {
  await adminClient.delete<void>(`/admin/settings/questions/${id}/`);
}
