// frontend/src/contexts/TenantContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { getClientTenantSlug } from '@/lib/tenant';
import { applyThemeToDOM, type ThemeConfig } from '@/lib/utils/theme-colors';

/** Rutas que no requieren tenant (auth, registro, etc.) */
const AUTH_PATHS = ['/login', '/forgot-password', '/reset-password', '/reactivate', '/register-business'];

// Tipos
export interface TenantModules {
  shop: boolean;
  bookings: boolean;
  services: boolean;
  marketing: boolean;
}

export interface TenantInfo {
  name: string;
  slug: string;
  logo: string | null;
}

export interface TenantConfig {
  primary_color: string;
  secondary_color: string;
  currency: string;
  timezone: string;
  language: string;
}

export interface TenantContact {
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

export interface TenantMetrics {
  years_experience: number;
  clients_count: number;
  treatments_count: number;
  average_rating: number;
}

export interface TenantImages {
  hero_home: string | null;
  hero_services: string | null;
}

export interface TenantPages {
  enabled: string[];
}

export interface TenantTheme {
  primary_color: string;
  secondary_color: string;
  font_heading?: string;
  font_body?: string;
  style?: string;
}

export interface TenantData {
  tenant: TenantInfo;
  modules: TenantModules;
  config: TenantConfig;
  contact?: TenantContact;
  metrics?: TenantMetrics;
  images?: TenantImages;
  pages?: TenantPages;
  theme?: TenantTheme;
}

// Context
const TenantContext = createContext<TenantData | null>(null);
const TenantReadyContext = createContext<boolean>(false);

// Provider
interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  // Auth pages don't require tenant — skip loading
  const isAuthPage = AUTH_PATHS.some(p => pathname?.startsWith(p));

  useEffect(() => {
    if (isAuthPage) {
      setLoading(false);
      return;
    }

    const loadTenantConfig = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<TenantData>('/tenant/config/');

        // Aplicar tema CSS ANTES del render → zero FOUC
        if (response.data.theme?.primary_color) {
          applyThemeToDOM(response.data.theme as ThemeConfig);
        }

        setTenantData(response.data);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 400 || err.status === 404)) {
          // Tenant no encontrado — redirigir al login
          window.location.href = '/login';
          return;
        }
        console.error('Error loading tenant config:', err);
        setError('Error al cargar la configuración del tenant');
      } finally {
        setLoading(false);
      }
    };

    loadTenantConfig();
  }, [isAuthPage]);

  const tenantReady = !!tenantData;

  // Auth pages render without tenant context
  if (isAuthPage) {
    return (
      <TenantContext.Provider value={tenantData}>
        <TenantReadyContext.Provider value={false}>
          {children}
        </TenantReadyContext.Provider>
      </TenantContext.Provider>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !tenantData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Error al cargar la configuración'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={tenantData}>
      <TenantReadyContext.Provider value={tenantReady}>
        {children}
      </TenantReadyContext.Provider>
    </TenantContext.Provider>
  );
}

// Hooks personalizados

/** Returns true when tenant data has been loaded successfully */
export function useTenantReady(): boolean {
  return useContext(TenantReadyContext);
}

export function useTenant(): TenantData {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}

export function useTenantInfo(): TenantInfo {
  const { tenant } = useTenant();
  return tenant;
}

export function useTenantModules(): TenantModules {
  const { modules } = useTenant();
  return modules;
}

export function useTenantConfig(): TenantConfig {
  const { config } = useTenant();
  return config;
}

/**
 * Hook para verificar si un módulo específico está activo
 * @param module - El nombre del módulo a verificar
 * @returns true si el módulo está activo, false en caso contrario
 */
export function useModule(module: keyof TenantModules): boolean {
  const { modules } = useTenant();
  return modules[module];
}

/**
 * Hook para verificar si CUALQUIERA de los módulos especificados está activo
 * @param moduleList - Array de nombres de módulos
 * @returns true si al menos uno está activo
 */
export function useAnyModule(moduleList: Array<keyof TenantModules>): boolean {
  const { modules } = useTenant();
  return moduleList.some(module => modules[module]);
}

/**
 * Hook para verificar si TODOS los módulos especificados están activos
 * @param moduleList - Array de nombres de módulos
 * @returns true si todos están activos
 */
export function useAllModules(moduleList: Array<keyof TenantModules>): boolean {
  const { modules } = useTenant();
  return moduleList.every(module => modules[module]);
}

/**
 * Hook para obtener el slug del tenant actual.
 * Útil para construir URLs o identificar el tenant.
 * @returns El slug del tenant detectado del subdominio
 */
export function useTenantSlug(): string {
  // Primero intentar del contexto (si ya se cargó)
  const context = useContext(TenantContext);
  if (context?.tenant?.slug) {
    return context.tenant.slug;
  }
  // Si no, detectar del subdominio
  return getClientTenantSlug();
}

/**
 * Hook para obtener la información de contacto del tenant.
 */
export function useTenantContact(): TenantContact | null {
  const data = useTenant();
  return data.contact || null;
}

/**
 * Hook para obtener las métricas del negocio.
 */
export function useTenantMetrics(): TenantMetrics | null {
  const data = useTenant();
  return data.metrics || null;
}

/**
 * Hook para obtener las imágenes del sitio (hero, etc).
 */
export function useTenantImages(): TenantImages | null {
  const data = useTenant();
  return data.images || null;
}

/**
 * Hook para obtener la lista de páginas habilitadas del tenant.
 */
export function useTenantPages(): string[] {
  const data = useTenant();
  return data.pages?.enabled || [];
}

/**
 * Hook para verificar si una página específica está habilitada.
 * Si no hay config de páginas (backwards compat), retorna true.
 */
export function usePageEnabled(pageSlug: string): boolean {
  const data = useTenant();
  if (!data.pages || data.pages.enabled.length === 0) return true;
  return data.pages.enabled.includes(pageSlug);
}

/**
 * Hook para obtener el tema del tenant (colores, fuentes, estilo).
 */
export function useTenantTheme(): TenantTheme | null {
  const data = useTenant();
  return data.theme || null;
}
