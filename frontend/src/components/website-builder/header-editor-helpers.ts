// ─── Types ────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  visible: boolean;
}

export interface SectionContent {
  [key: string]: unknown;
}

export interface HeaderEditorProps {
  content: SectionContent;
  logoUrl: string;
  onChange: (content: SectionContent) => void;
  onLogoUrlChange: (url: string | null) => void;
  onUploadMedia: (file: File) => Promise<{ url: string }>;
  availableNavSections: string[];
  contactWhatsapp?: string;
  industry?: string;
  contactContent?: SectionContent;
  socialLinks?: Record<string, string>;
}

// ─── Nav label defaults (mirrors backend SECTION_NAV_LABELS) ──

export const NAV_LABELS: Record<string, string> = {
  about: 'Nosotros',
  services: 'Servicios',
  products: 'Productos',
  testimonials: 'Testimonios',
  gallery: 'Galería',
  pricing: 'Precios',
  faq: 'FAQ',
  contact: 'Contacto',
  team: 'Equipo',
  blog: 'Blog',
};

export const NAV_ICONS: Record<string, string> = {
  about: '📖',
  services: '⚙️',
  products: '🛍️',
  testimonials: '⭐',
  gallery: '🖼️',
  pricing: '💰',
  faq: '❓',
  contact: '📞',
  team: '👥',
  blog: '✍️',
};

// ─── Industry defaults ───────────────────────────────────────

export const INDUSTRY_HEADER_DEFAULTS: Record<string, Record<string, unknown>> = {
  retail: {
    action_login_enabled: true,
    action_cart_enabled: true,
    action_wishlist_enabled: true,
  },
  beauty: {
    action_login_enabled: true,
    action_booking_enabled: true,
    action_booking_text: 'Reservar cita',
  },
  health: {
    action_login_enabled: true,
    action_booking_enabled: true,
    action_booking_text: 'Agendar cita',
  },
  fitness: {
    action_login_enabled: true,
    action_booking_enabled: true,
    action_booking_text: 'Reservar clase',
  },
  restaurant: {
    action_booking_enabled: true,
    action_booking_text: 'Reservar mesa',
  },
  events: {
    action_booking_enabled: true,
    action_booking_text: 'Reservar',
  },
};

export function getField(content: SectionContent, field: string, industry: string, fallback: unknown = undefined): unknown {
  if (field in content) return content[field];
  const defaults = INDUSTRY_HEADER_DEFAULTS[industry];
  if (defaults && field in defaults) return defaults[field];
  return fallback;
}
