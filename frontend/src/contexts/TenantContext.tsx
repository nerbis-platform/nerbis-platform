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

export interface TenantSubscription {
  is_subscribed: boolean;
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
  subscription?: TenantSubscription;
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
        if (err instanceof ApiError && err.code === 'NETWORK_ERROR') {
          setError('NETWORK_ERROR');
        } else {
          setError('Error al cargar la configuración del tenant');
        }
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
    const isNetworkError = error === 'NETWORK_ERROR';
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-gray-50 to-white p-6">
        <div className="text-center max-w-sm">
          {/* Icon */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            {isNetworkError ? (
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {isNetworkError ? 'Sin conexión al servidor' : 'Algo salió mal'}
          </h2>

          {/* Message */}
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {isNetworkError
              ? 'No pudimos conectar con el servidor. Esto puede pasar si hay un mantenimiento o si tu conexión a internet se perdió.'
              : 'Hubo un problema al cargar tu sitio. Por favor intenta de nuevo.'}
          </p>

          {/* Retry button */}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C3B57] text-white text-sm font-medium rounded-lg hover:bg-[#15304a] transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Reintentar
          </button>

          {/* Subtle help text */}
          <p className="text-xs text-gray-400 mt-4">
            Si el problema persiste, espera unos minutos e intenta de nuevo.
          </p>
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
