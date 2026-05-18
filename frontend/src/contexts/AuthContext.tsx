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
  // Iniciar en true si hay tokens — evita que rutas protegidas redirijan
  // antes de validar la sesión con el servidor
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !!localStorage.getItem('access_token');
  });
  const router = useRouter();
  const refreshedRef = useRef(false);

  // Auto-refresh: obtener datos frescos del servidor al cargar la app
  useEffect(() => {
    if (refreshedRef.current) return;
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      return;
    }

    refreshedRef.current = true;

    authApi.getCurrentUser()
      .then((freshUser) => {
        setUser(freshUser);
        // Actualizar tenant desde localStorage (se actualiza en getCurrentUser)
        setTenant(getStoredTenant());
      })
      .catch(() => {
        // Si el interceptor no pudo refrescar, limpiar estado de React
        // para mantener consistencia (el interceptor ya limpió localStorage)
        setUser(null);
        setTenant(null);
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