// ─── Types ──────────────────────────────────────────────────

export interface SiteSettings {
  // SEO
  meta_title: string;
  meta_description: string;
  keywords: string[];
  // Favicon
  favicon_url: string;
  // OG (Open Graph)
  og_image_url: string;
  og_title?: string;
  og_description?: string;
  og_inherit_seo?: boolean;
  // Social links
  social_links: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
    linkedin?: string;
    twitter?: string;
    pinterest?: string;
    whatsapp?: string;
  };
  // Analytics
  google_analytics_id: string;
  gtm_id?: string;
  facebook_pixel_id?: string;
  hotjar_id?: string;
  // Custom code
  custom_head_code?: string;
  custom_body_code?: string;
  // Cookie banner
  cookie_banner_enabled?: boolean;
  cookie_banner_position?: 'bottom-bar' | 'bottom-left' | 'bottom-right';
  cookie_banner_text?: string;
  cookie_accept_label?: string;
  cookie_decline_label?: string;
  // Noindex
  hide_from_search?: boolean;
  // Search engine verification
  google_site_verification?: string;
  bing_site_verification?: string;
  // Site access
  site_access_mode?: 'public' | 'coming_soon' | 'password';
  site_password?: string;
  coming_soon_message?: string;
  coming_soon_launch_date?: string;
  // WhatsApp floating button
  whatsapp_float_enabled?: boolean;
  whatsapp_float_number?: string;
  whatsapp_float_message?: string;
  whatsapp_float_position?: 'bottom-left' | 'bottom-right';
  // Structured data
  schema_enabled?: boolean;
  schema_business_type?: string;
  // Branding
  show_nerbis_badge?: boolean;
}

export interface SeoSuggestion {
  title: string;
  description: string;
  extra_keywords: string[];
}

export interface SettingsPanelProps {
  settings: SiteSettings;
  siteName: string;
  siteUrl?: string;
  isPublished?: boolean;
  tenantPhone?: string;
  tenantCountry?: string;
  hasWhiteLabel?: boolean;
  onChange: (settings: SiteSettings) => void;
  onSuggestSeo?: (keywords: string[], businessName: string, currentTitle: string, currentDesc: string) => Promise<SeoSuggestion>;
  onUploadMedia?: (file: File, purpose: 'og_image' | 'favicon' | 'general') => Promise<{ url: string }>;
}
