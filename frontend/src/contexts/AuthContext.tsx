// src/contexts/AuthContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, RegisterData, RegisterTenantData, Tenant, SocialProvider } from '@/types';
import * as authApi from '@/lib/api/auth';
import { useRouter } from 'next/navigation';

// Helper para obtener tenant del localStorage
function getStoredTenant(): Tenant | null {
  if (typeof window === 'undefined') return null;
  const tenantStr = localStorage.getItem('tenant');
  return tenantStr ? JSON.parse(tenantStr) : null;
}

/**
 * Resultado de un intento de login manejado por el AuthContext.
 * - `authenticated` → sesión creada; ya se hizo redirect.
 * - `2fa_required` → falta verificar segundo factor con el challenge token.
 */
export type LoginOutcome =
  | { kind: 'authenticated' }
  | { kind: '2fa_required'; challengeToken: string; methods: string[] };

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  platformLogin: (credentials: { email: string; password: string }, redirectTo?: string) => Promise<LoginOutcome>;
  socialLogin: (provider: SocialProvider, token: string, extra?: { first_name?: string; last_name?: string }) => Promise<LoginOutcome>;
  completeTwoFactorChallenge: (challengeToken: string, code: string, redirectTo?: string) => Promise<void>;
  register: (data: RegisterData, redirectTo?: string) => Promise<{ message: string }>;
  registerTenant: (data: RegisterTenantData) => Promise<{ message: string }>;
  logout: (redirectTo?: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authApi.getStoredUser());
  const [tenant, setTenant] = useState<Tenant | null>(() => getStoredTenant());
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const refreshedRef = useRef(false);

  // Auto-refresh: obtener datos frescos del servidor al cargar la app
  useEffect(() => {
    if (refreshedRef.current) return;
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    refreshedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);

    authApi.getCurrentUser()
      .then((freshUser) => {
        setUser(freshUser);
        // Actualizar tenant desde localStorage (se actualiza en getCurrentUser)
        setTenant(getStoredTenant());
      })
      .catch(() => {
        // Si falla (token expirado, etc), no hacer nada.
        // El interceptor de 401 se encarga de limpiar la sesión.
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Redirigir según estado del tenant después de autenticarse
  const redirectAfterLogin = (tenant: Tenant | null, customRedirect?: string) => {
    if (customRedirect) {
      router.push(customRedirect);
    } else if (tenant && !tenant.modules_configured) {
      router.push('/dashboard/setup');
    } else if (tenant?.has_website && tenant.website_status !== 'published') {
      router.push('/dashboard/website-builder');
    } else {
      router.push('/dashboard');
    }
  };

  const platformLogin = async (
    credentials: { email: string; password: string },
    redirectTo?: string,
  ): Promise<LoginOutcome> => {
    const result = await authApi.platformLogin(credentials);
    if (result.kind === '2fa_required') {
      return { kind: '2fa_required', challengeToken: result.challengeToken, methods: result.methods };
    }
    const { response } = result;
    setUser(response.user);
    if (response.tenant) {
      setTenant(response.tenant);
    }
    redirectAfterLogin(response.tenant ?? null, redirectTo);
    return { kind: 'authenticated' };
  };

  const socialLogin = async (
    provider: SocialProvider,
    token: string,
    extra?: { first_name?: string; last_name?: string },
  ): Promise<LoginOutcome> => {
    // Detección de contexto:
    // - localhost:3000, 127.0.0.1 → platform (login de dueño de negocio, cross-tenant)
    // - nerbis.com (dominio raíz) → platform
    // - pixel-sabana.nerbis.com (subdominio) → tenant-scoped (login de cliente, puede auto-crear)
    const host = window.location.host;
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const baseDomain = process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN || 'nerbis.com';
    const isSubdomain = !isLocalhost && host !== baseDomain && host.endsWith(`.${baseDomain}`);

    const result = isSubdomain
      ? await authApi.socialLogin(provider, token, extra)
      : await authApi.platformSocialLogin(provider, token, extra);

    if (result.kind === '2fa_required') {
      return { kind: '2fa_required', challengeToken: result.challengeToken, methods: result.methods };
    }
    const { response } = result;
    setUser(response.user);
    if (response.tenant) {
      setTenant(response.tenant);
    }
    redirectAfterLogin(response.tenant ?? null);
    return { kind: 'authenticated' };
  };

  const completeTwoFactorChallenge = async (
    challengeToken: string,
    code: string,
    redirectTo?: string,
  ): Promise<void> => {
    const response = await authApi.completeTwoFactorChallenge(challengeToken, code);
    setUser(response.user);
    if (response.tenant) {
      setTenant(response.tenant);
    }
    redirectAfterLogin(response.tenant ?? null, redirectTo);
  };

  const register = async (data: RegisterData, redirectTo?: string) => {
    const response = await authApi.register(data);
    setUser(response.user);
    if (response.tenant) {
      setTenant(response.tenant);
    }
    router.push(redirectTo || '/');
    return { message: response.message || 'Usuario creado exitosamente' };
  };

  const registerTenant = async (data: RegisterTenantData) => {
    const response = await authApi.registerTenant(data);
    setUser(response.user);
    if (response.tenant) {
      setTenant(response.tenant);
    }
    router.push('/dashboard/setup');
    return { message: response.message || 'Negocio creado exitosamente' };
  };

  const logout = async (redirectTo?: string) => {
    await authApi.logout();
    setUser(null);
    setTenant(null);
    router.push(redirectTo || '/');
  };

  const value = {
    user,
    tenant,
    isAuthenticated: !!user,
    isLoading,
    platformLogin,
    socialLogin,
    completeTwoFactorChallenge,
    register,
    registerTenant,
    logout,
    setUser,
    setTenant,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}