// src/contexts/AuthContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, RegisterData, RegisterTenantData, Tenant } from '@/types';
import * as authApi from '@/lib/api/auth';
import { useRouter } from 'next/navigation';

// Helper para obtener tenant del localStorage
function getStoredTenant(): Tenant | null {
  if (typeof window === 'undefined') return null;
  const tenantStr = localStorage.getItem('tenant');
  return tenantStr ? JSON.parse(tenantStr) : null;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  platformLogin: (credentials: { email: string; password: string }, redirectTo?: string) => Promise<void>;
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

  // Auto-refresh: verificar sesión con el servidor al cargar la app.
  // Las cookies httpOnly se envían automáticamente — si hay sesión válida,
  // /auth/me/ responde con el usuario; si no, responde 401.
  useEffect(() => {
    if (refreshedRef.current) return;
    if (typeof window === 'undefined') return;

    // Si no hay user en localStorage, probablemente no hay sesión
    const storedUser = authApi.getStoredUser();
    if (!storedUser) return;

    refreshedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);

    authApi.getCurrentUser()
      .then((freshUser) => {
        setUser(freshUser);
        setTenant(getStoredTenant());
      })
      .catch(() => {
        // Si falla (cookie expirada, etc), limpiar estado local
        setUser(null);
        setTenant(null);
        localStorage.removeItem('user');
        localStorage.removeItem('tenant');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const platformLogin = async (credentials: { email: string; password: string }, redirectTo?: string) => {
    const response = await authApi.platformLogin(credentials);
    setUser(response.user);
    if (response.tenant) {
      setTenant(response.tenant);
    }
    // Redirigir según estado del tenant
    if (redirectTo) {
      router.push(redirectTo);
    } else if (response.tenant && !response.tenant.modules_configured) {
      router.push('/dashboard/setup');
    } else if (
      response.tenant?.has_website &&
      response.tenant.website_status !== 'published'
    ) {
      router.push('/dashboard/website-builder');
    } else {
      router.push('/dashboard');
    }
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