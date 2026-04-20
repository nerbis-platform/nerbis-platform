// src/lib/api/auth.ts

import { apiClient } from './client';
import { AuthResponse, LoginCredentials, RegisterData, RegisterTenantData, User, Tenant } from '@/types';

/**
 * Platform Login (cross-tenant — busca al usuario en todos los tenants)
 * Usado desde el formulario de login de la plataforma NERBIS
 * Los tokens se setean como cookies httpOnly por el backend.
 */
export async function platformLogin(credentials: { email: string; password: string }): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/public/platform-login/', credentials);

  if (typeof window !== 'undefined') {
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
 * Register
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register/', data);

  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(response.data.user));
    if (response.data.tenant) {
      localStorage.setItem('tenant', JSON.stringify(response.data.tenant));
    }
  }

  return response.data;
}

/**
 * Logout — el backend lee el refresh token de la cookie httpOnly,
 * lo blacklistea, y borra las cookies.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout/');
  } catch {
    // Si falla (token ya expiró, etc), continuar con limpieza local
  }
  if (typeof window !== 'undefined') {
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

// reactivateAccount() fue eliminada — usamos flujo OTP (requestReactivationOTP + verifyReactivationOTP)

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
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.tenant) {
      localStorage.setItem('tenant', JSON.stringify(data.tenant));
    }
  }

  return data;
}