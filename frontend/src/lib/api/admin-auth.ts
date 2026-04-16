// src/lib/api/admin-auth.ts
//
// Auth + management helpers for the platform superadmin surface. ALL calls
// go through `adminClient` and ALL persistence uses the admin_* namespaced
// localStorage keys via ADMIN_STORAGE_KEYS.
import { adminClient, ADMIN_STORAGE_KEYS } from './admin-client';
import type {
  AdminLoginResponse,
  AdminPaginatedResponse,
  AdminUser,
} from '@/types/admin';

// ──────────────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────────────

export async function adminLogin(
  email: string,
  password: string,
): Promise<AdminLoginResponse> {
  const { data } = await adminClient.post<AdminLoginResponse>(
    '/admin/auth/login/',
    { email, password },
  );
  // Auth tokens (access, refresh) are now set as httpOnly cookies by the backend.
  // Only persist admin_user in localStorage for UI state.
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      ADMIN_STORAGE_KEYS.user,
      JSON.stringify(data.user),
    );
  }
  return data;
}

export async function adminMe(): Promise<AdminUser> {
  const { data } = await adminClient.get<AdminUser>('/admin/auth/me/');
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ADMIN_STORAGE_KEYS.user, JSON.stringify(data));
  }
  return data;
}

export async function adminLogout(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    // The backend reads the refresh token from the httpOnly cookie and
    // blacklists it. It also clears admin cookies on the response.
    await adminClient.post('/admin/auth/logout/', {});
  } catch {
    // Si falla (token ya expiró, etc), continuar con limpieza local.
  } finally {
    // Only clear admin_user from localStorage. Auth cookies are cleared
    // server-side via Set-Cookie with max_age=0.
    window.localStorage.removeItem(ADMIN_STORAGE_KEYS.user);
  }
}

export function getStoredAdmin(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ADMIN_STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  // Check admin_user instead of access token (tokens are now httpOnly cookies).
  return !!window.localStorage.getItem(ADMIN_STORAGE_KEYS.user);
}

// ──────────────────────────────────────────────────────────────────────
// Superadmin management
// ──────────────────────────────────────────────────────────────────────

export interface AdminRegisterPayload {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export async function adminRegister(
  payload: AdminRegisterPayload,
): Promise<AdminUser> {
  const { data } = await adminClient.post<AdminUser>(
    '/admin/auth/register/',
    payload,
  );
  return data;
}

export async function adminListSuperadmins(
  page = 1,
): Promise<AdminPaginatedResponse<AdminUser>> {
  const { data } = await adminClient.get<AdminPaginatedResponse<AdminUser>>(
    '/admin/superadmins/',
    { params: { page } },
  );
  return data;
}

export async function adminDeactivateSuperadmin(
  id: number,
): Promise<AdminUser> {
  const { data } = await adminClient.patch<AdminUser>(
    `/admin/superadmins/${id}/`,
    { is_active: false },
  );
  return data;
}

export async function adminReactivateSuperadmin(
  id: number,
): Promise<AdminUser> {
  const { data } = await adminClient.patch<AdminUser>(
    `/admin/superadmins/${id}/`,
    { is_active: true },
  );
  return data;
}
