// src/lib/api/admin-tenants.ts
//
// Cross-tenant management helpers for the platform superadmin surface.
// ALL calls go through `adminClient` (admin-namespaced axios instance,
// admin-namespaced localStorage, admin-only JWT). This file MUST NOT
// import from any tenant-scoped module (`./auth`, `./tenant`, `./client`,
// etc.) — isolation is enforced by ESLint + scripts/assert-admin-isolation.mjs.
//
// Error handling: the underlying `adminClient` already maps HTTP failures
// to `AdminApiError` with localized messages (see `admin-client.ts`), so
// callers only need to `try/catch` and read `error.message` / `error.status`.
import { adminClient } from './admin-client';
import type {
  AdminPaginatedResponse,
  AdminTenant,
  AdminTenantDetail,
  AdminTenantFilters,
  AdminTenantUpdatePayload,
  AdminTenantUser,
  AdminUserDetail,
  AdminUserFilters,
  AdminUserUpdatePayload,
} from '@/types/admin';

// ──────────────────────────────────────────────────────────────────────
// Query-param serialization
// ──────────────────────────────────────────────────────────────────────
//
// Axios drops `undefined` values from `params` automatically, but booleans
// are sent as their native strings (`"true"` / `"false"`) which is exactly
// what the backend expects. We still strip `undefined` explicitly so the
// caller can pass partial filter objects without leaking empty keys into
// the URL.

function cleanParams(
  filters: object | undefined,
): Record<string, string | number | boolean> | undefined {
  if (!filters) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value as string | number | boolean;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// ──────────────────────────────────────────────────────────────────────
// Tenants
// ──────────────────────────────────────────────────────────────────────

export async function adminListTenants(
  filters?: AdminTenantFilters,
): Promise<AdminPaginatedResponse<AdminTenant>> {
  const { data } = await adminClient.get<AdminPaginatedResponse<AdminTenant>>(
    '/admin/tenants/',
    { params: cleanParams(filters) },
  );
  return data;
}

export async function adminGetTenant(id: string): Promise<AdminTenantDetail> {
  const { data } = await adminClient.get<AdminTenantDetail>(
    `/admin/tenants/${id}/`,
  );
  return data;
}

export async function adminUpdateTenant(
  id: string,
  payload: AdminTenantUpdatePayload,
): Promise<AdminTenantDetail> {
  const { data } = await adminClient.patch<AdminTenantDetail>(
    `/admin/tenants/${id}/`,
    payload,
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// Tenant users
// ──────────────────────────────────────────────────────────────────────

export async function adminListTenantUsers(
  tenantId: string,
  filters?: AdminUserFilters,
): Promise<AdminPaginatedResponse<AdminTenantUser>> {
  const { data } = await adminClient.get<
    AdminPaginatedResponse<AdminTenantUser>
  >(`/admin/tenants/${tenantId}/users/`, {
    params: cleanParams(filters),
  });
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// Users (cross-tenant)
// ──────────────────────────────────────────────────────────────────────

export async function adminGetUser(id: number): Promise<AdminUserDetail> {
  const { data } = await adminClient.get<AdminUserDetail>(
    `/admin/users/${id}/`,
  );
  return data;
}

export async function adminUpdateUser(
  id: number,
  payload: AdminUserUpdatePayload,
): Promise<AdminUserDetail> {
  const { data } = await adminClient.patch<AdminUserDetail>(
    `/admin/users/${id}/`,
    payload,
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────
// Destructive auth-method actions
// ──────────────────────────────────────────────────────────────────────
//
// Every function below maps to a backend endpoint that writes an entry
// in `AdminAuditLog`. The server records actor, IP, and action details.

export async function adminResetUserPassword(
  id: number,
): Promise<{ message: string }> {
  const { data } = await adminClient.post<{ detail?: string; message?: string }>(
    `/admin/users/${id}/reset-password/`,
  );
  // Backend returns `{ detail: "..." }`; normalize to `{ message }` per
  // this module's public contract.
  return { message: data.message ?? data.detail ?? '' };
}

export async function adminDeleteUserPasskey(
  userId: number,
  passkeyId: number,
): Promise<void> {
  await adminClient.delete<void>(
    `/admin/users/${userId}/passkeys/${passkeyId}/`,
  );
}

export async function adminDisableUser2FA(
  id: number,
): Promise<{ message: string }> {
  const { data } = await adminClient.post<{ detail?: string; message?: string }>(
    `/admin/users/${id}/disable-2fa/`,
  );
  return { message: data.message ?? data.detail ?? '' };
}

export async function adminUnlinkUserSocial(
  userId: number,
  provider: string,
): Promise<void> {
  await adminClient.delete<void>(
    `/admin/users/${userId}/social/${encodeURIComponent(provider)}/`,
  );
}
