// src/lib/api/auth.ts

import { apiClient } from './client';
import { AuthResponse, LoginCredentials, RegisterData, RegisterTenantData, User, Tenant, SocialProvider } from '@/types';
import {
  completeTwoFactorChallenge as completeTwoFactorChallengeApi,
  type LoginResult,
} from './twoFactor';

/**
 * Respuesta cruda del servidor que puede ser un par JWT normal
 * o un challenge de 2FA pendiente.
 */
type RawLoginResponse =
  | AuthResponse
  | { status: '2fa_required'; challenge_token: string; methods?: string[] };

function isTwoFactorRequired(
  data: RawLoginResponse,
): data is { status: '2fa_required'; challenge_token: string; methods?: string[] } {
  return (data as { status?: string }).status === '2fa_required';
}

/**
 * Persiste tokens/user/tenant tras un login exitoso (sin 2FA pendiente).
 */
function persistSession(data: AuthResponse): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', data.tokens.access);
  localStorage.setItem('refresh_token', data.tokens.refresh);
  localStorage.setItem('user', JSON.stringify(data.user));
  if (data.tenant) {
    localStorage.setItem('tenant', JSON.stringify(data.tenant));
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `tenant-slug=${data.tenant.slug}; path=/; SameSite=Lax${secure}`;
  }
}

/**
 * Platform Login (cross-tenant — busca al usuario en todos los tenants)
 * Usado desde el formulario de login de la plataforma NERBIS.
 *
 * Devuelve un LoginResult discriminado para que la UI pueda mostrar el
 * paso de 2FA sin persistir tokens cuando el backend exige challenge.
 */
export async function platformLogin(credentials: { email: string; password: string }): Promise<LoginResult> {
  const { data } = await apiClient.post<RawLoginResponse>('/public/platform-login/', credentials);

  if (isTwoFactorRequired(data)) {
    return { kind: '2fa_required', challengeToken: data.challenge_token, methods: data.methods ?? ['totp', 'backup'] };
  }

  persistSession(data);
  return { kind: 'tokens', response: data };
}

/**
 * Register
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register/', data);

  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', response.data.tokens.access);
    localStorage.setItem('refresh_token', response.data.tokens.refresh);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    if (response.data.tenant) {
      localStorage.setItem('tenant', JSON.stringify(response.data.tenant));
    }
  }

  return response.data;
}

/**
 * Logout — invalida refresh token en backend + limpia localStorage
 */
export async function logout(): Promise<void> {
  if (typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refresh_token');
    // Invalidar token en backend (blacklist)
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout/', { refresh: refreshToken });
      } catch {
        // Si falla (token ya expiró, etc), continuar con limpieza local
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
  }
}

/**
 * Get current user from API and update localStorage
 */
export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<{ user: User; tenant: Tenant }>('/auth/me/');

  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.tenant) {
      localStorage.setItem('tenant', JSON.stringify(data.tenant));
    }
  }

  return data.user;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
}

/**
 * Get stored user
 */
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// ===================================
// Configuración de módulos del tenant
// ===================================

export interface ModuleSelection {
  has_website: boolean;
  has_shop: boolean;
  has_bookings: boolean;
  has_services: boolean;
  has_marketing: boolean;
}

/**
 * Configura los módulos del tenant y marca modules_configured = true
 */
export interface SetupProfileData {
  industry?: string;
  business_name?: string;
  first_name?: string;
  last_name?: string;
  country?: string;
}

/**
 * Configura los módulos del tenant y marca modules_configured = true
 */
export async function configureModules(modules: ModuleSelection & SetupProfileData): Promise<Tenant> {
  const { data } = await apiClient.post<Tenant>('/configure-modules/', modules);

  // Actualizar tenant en localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('tenant', JSON.stringify(data));
  }

  return data;
}

// ===================================
// Social Auth
// ===================================

/**
 * Social Login (tenant-scoped — requiere X-Tenant-Slug)
 */
export async function socialLogin(
  provider: SocialProvider,
  token: string,
  extra?: { first_name?: string; last_name?: string }
): Promise<LoginResult> {
  const { data } = await apiClient.post<RawLoginResponse>(`/auth/social/${provider}/`, {
    token,
    ...extra,
  });

  if (isTwoFactorRequired(data)) {
    return { kind: '2fa_required', challengeToken: data.challenge_token, methods: data.methods ?? ['totp', 'backup'] };
  }

  persistSession(data);
  return { kind: 'tokens', response: data };
}

/**
 * Social Link — vincular cuenta social a usuario existente con contraseña
 */
export async function socialLinkAccount(
  provider: SocialProvider,
  token: string,
  password: string,
  extra?: { first_name?: string; last_name?: string }
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/social/link/', {
    provider,
    token,
    password,
    ...extra,
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.tenant) {
      localStorage.setItem('tenant', JSON.stringify(data.tenant));
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `tenant-slug=${data.tenant.slug}; path=/; SameSite=Lax${secure}`;
    }
  }

  return data;
}

/**
 * Platform Social Login (cross-tenant — busca en todos los tenants)
 */
export async function platformSocialLogin(
  provider: SocialProvider,
  token: string,
  extra?: { first_name?: string; last_name?: string }
): Promise<LoginResult> {
  const { data } = await apiClient.post<RawLoginResponse>('/public/platform-social-login/', {
    provider,
    token,
    ...extra,
  });

  if (isTwoFactorRequired(data)) {
    return { kind: '2fa_required', challengeToken: data.challenge_token, methods: data.methods ?? ['totp', 'backup'] };
  }

  persistSession(data);
  return { kind: 'tokens', response: data };
}

/**
 * Social Link (solo vincula, no toca tokens/localStorage).
 * Usado post-registro para vincular la cuenta social sin re-autenticar.
 */
export async function socialLinkOnly(
  provider: SocialProvider,
  token: string,
  extra?: { first_name?: string; last_name?: string }
): Promise<void> {
  await apiClient.post(`/auth/social/${provider}/`, {
    token,
    ...extra,
  });
}

// reactivateAccount() fue eliminada — usamos flujo OTP (requestReactivationOTP + verifyReactivationOTP)

/**
 * Completa el login tras el challenge de 2FA. Persiste tokens igual que
 * un login normal exitoso.
 */
export async function completeTwoFactorChallenge(
  challengeToken: string,
  code: string,
): Promise<AuthResponse> {
  const data = await completeTwoFactorChallengeApi({
    challenge_token: challengeToken,
    code,
  });
  persistSession(data);
  return data;
}

// ===================================
// Registro de Negocio (Tenant)
// ===================================

/**
 * Registrar un nuevo negocio (tenant + usuario admin)
 * Endpoint público: no requiere tenant previo
 */
export async function registerTenant(data: RegisterTenantData): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/public/register-tenant/', data);

  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', response.data.tokens.access);
    localStorage.setItem('refresh_token', response.data.tokens.refresh);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    if (response.data.tenant) {
      localStorage.setItem('tenant', JSON.stringify(response.data.tenant));
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `tenant-slug=${response.data.tenant.slug}; path=/; SameSite=Lax${secure}`;
    }
  }

  return response.data;
}

// ===================================
// OTP - Recuperación de contraseña
// ===================================

interface OTPRequestResponse {
  message: string;
  email: string;
}

/**
 * Solicitar OTP para restablecer contraseña
 */
export async function requestPasswordResetOTP(email: string): Promise<OTPRequestResponse> {
  const { data } = await apiClient.post<OTPRequestResponse>('/auth/forgot-password/', { email });
  return data;
}

/**
 * Verificar OTP y establecer nueva contraseña (tenant-scoped)
 * No genera tokens — el usuario debe iniciar sesión manualmente
 */
export async function verifyPasswordResetOTP(
  email: string,
  code: string,
  newPassword: string
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/auth/verify-reset-otp/', {
    email,
    code,
    new_password: newPassword,
  });
  return data;
}

// ===================================
// OTP - Recuperación de contraseña (plataforma cross-tenant)
// ===================================

/**
 * Solicitar OTP para restablecer contraseña (cross-tenant)
 */
export async function platformRequestPasswordResetOTP(email: string): Promise<OTPRequestResponse> {
  const { data } = await apiClient.post<OTPRequestResponse>('/public/platform-forgot-password/', { email });
  return data;
}

/**
 * Verificar OTP y establecer nueva contraseña (cross-tenant)
 * No genera tokens — el usuario debe iniciar sesión manualmente
 */
export async function platformVerifyPasswordResetOTP(
  email: string,
  code: string,
  newPassword: string
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/public/platform-verify-reset-otp/', {
    email,
    code,
    new_password: newPassword,
  });
  return data;
}

// ===================================
// OTP - Reactivación de cuenta
// ===================================

/**
 * Solicitar OTP para reactivar cuenta
 */
export async function requestReactivationOTP(credentials: LoginCredentials): Promise<OTPRequestResponse> {
  const { data } = await apiClient.post<OTPRequestResponse>('/auth/request-reactivation/', credentials);
  return data;
}

/**
 * Verificar OTP y reactivar cuenta
 */
export async function verifyReactivationOTP(email: string, code: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/verify-reactivation/', { email, code });

  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.tenant) {
      localStorage.setItem('tenant', JSON.stringify(data.tenant));
    }
  }

  return data;
}