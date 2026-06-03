import { Building2, Palette, FileText, Phone } from 'lucide-react';
import type { QuestionSection } from '@/types';

// ─── Section config ───────────────────────────────────────

export const SECTIONS: { key: QuestionSection; label: string; icon: React.ElementType }[] = [
  { key: 'basic', label: 'Tu Negocio', icon: Building2 },
  { key: 'branding', label: 'Identidad', icon: Palette },
  { key: 'content', label: 'Paginas', icon: FileText },
  { key: 'contact', label: 'Contacto', icon: Phone },
];

// ─── sessionStorage helpers ──────────────────────────────

const SESSION_KEY_RESPONSES = (slug: string) => `onboarding_${slug}_responses`;
const SESSION_KEY_SECTION = (slug: string) => `onboarding_${slug}_section`;

export function saveToSession(slug: string, responses: Record<string, string | string[]>, section: number) {
  try {
    sessionStorage.setItem(SESSION_KEY_RESPONSES(slug), JSON.stringify(responses));
    sessionStorage.setItem(SESSION_KEY_SECTION(slug), String(section));
  } catch {
    // sessionStorage full or unavailable — silent fail
  }
}

export function loadFromSession(slug: string): { responses: Record<string, string | string[]>; section: number } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_RESPONSES(slug));
    const sec = sessionStorage.getItem(SESSION_KEY_SECTION(slug));
    if (!raw) return null;
    return { responses: JSON.parse(raw), section: sec ? parseInt(sec, 10) : 0 };
  } catch {
    return null;
  }
}

export function clearSession(slug: string) {
  try {
    sessionStorage.removeItem(SESSION_KEY_RESPONSES(slug));
    sessionStorage.removeItem(SESSION_KEY_SECTION(slug));
  } catch {
    // silent
  }
}

// ─── Format validators ──────────────────────────────────

export const FORMAT_VALIDATORS: Record<string, { regex: RegExp; message: string; minDigits?: number }> = {
  business_email: {
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Ingresa un email valido (ej: nombre@empresa.com)',
  },
  business_phone: {
    regex: /^\+?[\d\s\-()]+$/,
    message: 'Solo numeros, espacios, guiones y parentesis',
    minDigits: 7,
  },
  business_whatsapp: {
    regex: /^\+?[\d\s\-()]+$/,
    message: 'Solo numeros, espacios, guiones y parentesis',
    minDigits: 7,
  },
  primary_color: {
    regex: /^#[0-9a-fA-F]{6}$/,
    message: 'Usa formato hexadecimal (ej: #0D9488)',
  },
  secondary_color: {
    regex: /^#[0-9a-fA-F]{6}$/,
    message: 'Usa formato hexadecimal (ej: #1C3B57)',
  },
};

// ─── Default sections from tenant flags ─────────────────

export function getDefaultSections(tenant: { has_shop?: boolean; has_bookings?: boolean; has_services?: boolean; has_marketing?: boolean } | null): string[] {
  const sections = ['Sobre nosotros', 'Preguntas frecuentes'];
  if (tenant?.has_shop) {
    sections.push('Productos', 'Precios / Tarifas', 'Galeria de fotos');
  }
  if (tenant?.has_bookings || tenant?.has_services) {
    sections.push('Servicios');
    if (!sections.includes('Galeria de fotos')) sections.push('Galeria de fotos');
  }
  if (tenant?.has_marketing) {
    sections.push('Testimonios / Resenas');
  }
  return sections;
}
