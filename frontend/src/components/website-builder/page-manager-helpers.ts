import {
  Menu,
  Home,
  BookOpen,
  Wrench,
  ShoppingBag,
  Phone,
  Star,
  Image,
  DollarSign,
  HelpCircle,
  PanelBottom,
  Users,
  PenLine,
  Sparkles,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import type { PagesData, SitePage } from '@/types';

export const SECTION_LABELS: Record<string, string> = {
  header: 'Menú principal',
  hero: 'Inicio',
  about: 'Sobre Nosotros',
  services: 'Servicios',
  products: 'Productos',
  contact: 'Contacto',
  testimonials: 'Testimonios',
  gallery: 'Galería',
  pricing: 'Precios',
  faq: 'Preguntas frecuentes',
  footer: 'Pie de página',
  team: 'Equipo',
  blog: 'Blog',
  features: 'Características',
  stats: 'Estadísticas',
};

export const SECTION_ICONS: Record<string, LucideIcon> = {
  header: Menu,
  hero: Home,
  about: BookOpen,
  services: Wrench,
  products: ShoppingBag,
  contact: Phone,
  testimonials: Star,
  gallery: Image,
  pricing: DollarSign,
  faq: HelpCircle,
  footer: PanelBottom,
  team: Users,
  blog: PenLine,
  features: Sparkles,
  stats: BarChart3,
};

export const PAGE_ICONS: Record<string, LucideIcon> = {
  home: Home,
  about: BookOpen,
  services: Wrench,
  products: ShoppingBag,
  contact: Phone,
  pricing: DollarSign,
  blog: PenLine,
  gallery: Image,
  faq: HelpCircle,
};

export interface SectionInfo {
  id: string;
  name: string;
  required: boolean;
}

export interface PageManagerProps {
  pagesData: PagesData;
  activePage: string;
  activeSection: string;
  allSections: SectionInfo[];
  editorContent?: React.ReactNode;
  onSelectPage: (pageId: string) => void;
  onSelectSection: (sectionId: string) => void;
  onAddPage: (page: SitePage) => void;
  onRemovePage: (pageId: string) => void;
  onUpdatePages: (pagesData: PagesData) => void;
  onAddSectionWithContent?: (sectionId: string, initialContent?: Record<string, unknown>, variant?: string) => void;
}
