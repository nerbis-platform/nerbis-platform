// ─── Tenant context types ────────────────────────────────

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

export interface TenantLegal {
  legal_name: string;
  tax_id: string;
  legal_address: string;
  tax_rate: number;
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
  legal?: TenantLegal;
}

// ─── Constants ───────────────────────────────────────────

/** Rutas que no requieren tenant (landing, auth, registro, etc.) */
export const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/reactivate', '/register-business', '/ayuda'];
