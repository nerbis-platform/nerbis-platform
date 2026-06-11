import {
  FileText,
  Layout,
  MessageSquare,
  Search,
  Sparkles,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { PlatformModule, WebsitePage } from '@/types';

// ─── Brand constants ──────────────────────────────────────

export const NAVY = '#1C3B57';
export const TEAL = '#0D9488';
export const WARM_GRAY_50 = '#FAFAF8';
export const WARM_GRAY_100 = '#F5F5F0';
export const WARM_GRAY_200 = '#E8E6E1';
export const WARM_GRAY_400 = '#A8A29E';
export const WARM_GRAY_500 = '#78716C';
export const WARM_GRAY_600 = '#57534E';
export const WARM_GRAY_800 = '#292524';
export const ERROR_RED = '#B91C1C';
export const SUCCESS_GREEN = '#16A34A';

// ─── Types ────────────────────────────────────────────────

export interface StyleOption { key: string; label: string; description: string; icon: string; color: string }
export interface PaletteOption { primary: string; secondary: string; label: string }
export interface ToneOption { key: string; label: string; emoji: string }

export interface ConversationStep {
  id: string;
  message: string;
  type: 'textarea' | 'input' | 'action' | 'multiselect' | 'modules' | 'pages' | 'style_select' | 'color_picker' | 'tone_select';
  placeholder?: string;
  hint?: string;
  inputType?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  options?: StyleOption[] | PaletteOption[] | ToneOption[];
}

// ─── Agent identity ───────────────────────────────────────

export const AGENT_NAME = 'Pipe';

// ─── Lucide icon resolver ─────────────────────────────────

export function getLucideIcon(name: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  const pascalName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[pascalName] || LucideIcons.Circle;
}

// ─── Fallback data (used while API loads) ─────────────────

export const FALLBACK_MODULES: PlatformModule[] = [
  { key: 'has_website', label: 'Sitio Web', description: 'Tu presencia online', icon: 'Globe', accent_color: '#1C3B57', sort_order: 0, dependencies: [] },
  { key: 'has_shop', label: 'Tienda Online', description: 'Vende productos 24/7', icon: 'ShoppingCart', accent_color: '#0D9488', sort_order: 1, dependencies: [] },
  { key: 'has_services', label: 'Servicios', description: 'Muestra y vende tus servicios', icon: 'Briefcase', accent_color: '#6366F1', sort_order: 2, dependencies: [] },
  { key: 'has_bookings', label: 'Reservas', description: 'Agenda de citas online', icon: 'Calendar', accent_color: '#F59E0B', sort_order: 3, dependencies: ['has_services'] },
];

export const FALLBACK_PAGES: WebsitePage[] = [
  { key: 'home', label: 'Inicio', description: 'Página principal', icon: 'home', is_mandatory: true, is_default: true, sort_order: 0, auto_include_modules: [] },
  { key: 'contact', label: 'Contacto', description: 'Formulario de contacto', icon: 'mail', is_mandatory: true, is_default: true, sort_order: 1, auto_include_modules: [] },
  { key: 'about', label: 'Sobre nosotros', description: 'Tu historia', icon: 'users', is_mandatory: false, is_default: true, sort_order: 2, auto_include_modules: [] },
  { key: 'blog', label: 'Blog', description: 'Artículos y noticias', icon: 'file-text', is_mandatory: false, is_default: false, sort_order: 6, auto_include_modules: [] },
];

export const FALLBACK_STYLE_OPTIONS: StyleOption[] = [
  { key: 'moderno', label: 'Moderno', description: 'Limpio y contemporáneo', icon: 'Sparkles', color: '#6366F1' },
  { key: 'clasico', label: 'Clásico', description: 'Elegante y atemporal', icon: 'Crown', color: '#D97706' },
  { key: 'minimalista', label: 'Minimalista', description: 'Menos es más', icon: 'Minus', color: '#1C3B57' },
  { key: 'vibrante', label: 'Vibrante', description: 'Colorido y energético', icon: 'Zap', color: '#EC4899' },
];

export const FALLBACK_PALETTES: PaletteOption[] = [
  { primary: '#1C3B57', secondary: '#0D9488', label: 'NERBIS' },
  { primary: '#1E293B', secondary: '#3B82F6', label: 'Corporativo' },
  { primary: '#0F172A', secondary: '#10B981', label: 'Tech' },
  { primary: '#7C3AED', secondary: '#EC4899', label: 'Creativo' },
  { primary: '#DC2626', secondary: '#F59E0B', label: 'Energético' },
  { primary: '#059669', secondary: '#34D399', label: 'Natural' },
];

export const FALLBACK_TONE_OPTIONS: ToneOption[] = [
  { key: 'profesional', label: 'Profesional', emoji: '💼' },
  { key: 'calido', label: 'Cálido', emoji: '🤗' },
  { key: 'moderno', label: 'Moderno', emoji: '✨' },
  { key: 'minimalista', label: 'Minimalista', emoji: '🎯' },
  { key: 'juvenil', label: 'Juvenil', emoji: '🚀' },
];

// ─── Generation progress steps ────────────────────────────

export const GENERATION_STEPS = [
  { message: 'Estoy conociendo tu negocio', icon: FileText },
  { message: 'Eligiendo el diseño ideal para ti', icon: Layout },
  { message: 'Escribiendo el contenido de tu sitio', icon: MessageSquare },
  { message: 'Optimizando para que te encuentren en Google', icon: Search },
  { message: 'Últimos detalles, ya casi', icon: Sparkles },
];

export const SECTION_LABELS: Record<string, string> = {
  hero: 'Inicio',
  about: 'Sobre nosotros',
  services: 'Servicios',
  products: 'Productos',
  contact: 'Contacto',
  testimonials: 'Testimonios',
  gallery: 'Galería',
  pricing: 'Precios',
  faq: 'Preguntas frecuentes',
};

export type PageState = 'chat' | 'generating' | 'success' | 'error' | 'limit-reached';
