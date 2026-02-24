'use client';

import { Loader2, Sparkles } from 'lucide-react';

interface VariantOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

interface VariantSwitcherProps {
  sectionKey: string;
  currentVariant: string;
  aiRecommendedVariant?: string;
  onChange: (variant: string) => void;
  isLoading?: boolean;
}

const SECTION_VARIANTS: Record<string, VariantOption[]> = {
  hero: [
    { id: 'centered', label: 'Centrado', description: 'Texto centrado con gradiente', icon: 'centered' },
    { id: 'split-image', label: 'Dividido', description: 'Texto + imagen lado a lado', icon: 'split' },
    { id: 'fullwidth-image', label: 'Imagen completa', description: 'Imagen de fondo con overlay', icon: 'fullwidth' },
    { id: 'bold-typography', label: 'Tipografía', description: 'Texto gigante minimalista', icon: 'bold-typo' },
    { id: 'diagonal-split', label: 'Diagonal', description: 'Corte diagonal moderno', icon: 'diagonal' },
    { id: 'glassmorphism', label: 'Cristal', description: 'Efecto glass moderno', icon: 'glass' },
  ],
  about: [
    { id: 'text-only', label: 'Solo texto', description: 'Texto con puntos destacados', icon: 'text-only' },
    { id: 'split-image', label: 'Con imagen', description: 'Imagen + texto lado a lado', icon: 'split' },
    { id: 'stats-banner', label: 'Estadísticas', description: 'Números grandes animados', icon: 'stats' },
    { id: 'timeline', label: 'Timeline', description: 'Línea de tiempo vertical', icon: 'timeline' },
    { id: 'overlapping-cards', label: 'Superpuestas', description: 'Cards con rotación', icon: 'overlap' },
    { id: 'fullwidth-banner', label: 'Banner', description: 'Fondo oscuro impactante', icon: 'banner' },
    { id: 'asymmetric', label: 'Asimétrico', description: 'Grid 2/3 + 1/3 con imagen', icon: 'asym' },
  ],
  services: [
    { id: 'grid-cards', label: 'Tarjetas', description: 'Cards con icono', icon: 'cards' },
    { id: 'grid-cards-image', label: 'Con imágenes', description: 'Cards con imagen', icon: 'cards-image' },
    { id: 'list-detailed', label: 'Lista', description: 'Filas numeradas detalladas', icon: 'list' },
    { id: 'featured-highlight', label: 'Destacado', description: '1 grande + grid pequeñas', icon: 'featured' },
    { id: 'horizontal-scroll', label: 'Carrusel', description: 'Scroll horizontal', icon: 'hscroll' },
    { id: 'icon-minimal', label: 'Minimal', description: 'Iconos + texto limpio', icon: 'icon-min' },
    { id: 'bento-grid', label: 'Bento', description: 'Grid asimétrico tipo dashboard', icon: 'bento' },
  ],
  products: [
    { id: 'grid-cards', label: 'Tarjetas', description: 'Cards con icono', icon: 'cards' },
    { id: 'grid-cards-image', label: 'Con imágenes', description: 'Cards con imagen', icon: 'cards-image' },
    { id: 'showcase-large', label: 'Vitrina', description: 'Cards grandes con overlay', icon: 'showcase' },
    { id: 'catalog-compact', label: 'Catálogo', description: 'Grid compacto 4 columnas', icon: 'catalog' },
    { id: 'masonry-staggered', label: 'Mosaico', description: 'Alturas variadas Pinterest', icon: 'masonry' },
    { id: 'price-table', label: 'Menú', description: 'Estilo menú de restaurante', icon: 'price-tbl' },
    { id: 'bento-grid', label: 'Bento', description: 'Grid asimétrico tipo dashboard', icon: 'bento' },
  ],
  gallery: [
    { id: 'masonry', label: 'Mosaico', description: 'Masonry con alturas variadas', icon: 'gal-masonry' },
    { id: 'grid-uniform', label: 'Grid', description: 'Grid uniforme con hover', icon: 'gal-grid' },
    { id: 'slider', label: 'Slider', description: 'Scroll horizontal con nav', icon: 'gal-slider' },
  ],
  testimonials: [
    { id: 'cards-grid', label: 'Tarjetas', description: 'Grid de tarjetas con estrellas', icon: 'test-grid' },
    { id: 'carousel', label: 'Carrusel', description: 'Carrusel con auto-play', icon: 'test-carousel' },
    { id: 'single-highlight', label: 'Destacado', description: 'Un testimonio grande rotando', icon: 'test-single' },
  ],
  faq: [
    { id: 'classic', label: 'Clásico', description: 'Accordion animado vertical', icon: 'faq-classic' },
    { id: 'side-by-side', label: 'Lado a lado', description: 'Preguntas izquierda, respuesta derecha', icon: 'faq-side' },
    { id: 'cards', label: 'Tarjetas', description: 'Cards expandibles en grid', icon: 'faq-cards' },
  ],
  pricing: [
    { id: 'cards', label: 'Tarjetas', description: 'Cards con features y CTA', icon: 'price-cards' },
    { id: 'comparison-table', label: 'Comparación', description: 'Tabla comparativa horizontal', icon: 'price-table' },
    { id: 'minimal-list', label: 'Lista', description: 'Lista minimalista con dots', icon: 'price-list' },
  ],
  contact: [
    { id: 'cards-grid', label: 'Tarjetas', description: 'Grid de cards de contacto', icon: 'contact-cards' },
    { id: 'split-form', label: 'Formulario', description: 'Info + formulario lado a lado', icon: 'contact-split' },
    { id: 'centered-minimal', label: 'Centrado', description: 'Una columna centrada', icon: 'contact-center' },
  ],
};

function LayoutIcon({ type, isActive }: { type: string; isActive: boolean }) {
  const stroke = isActive ? '#1C3B57' : '#9ca3af';
  const fill = isActive ? '#E2F3F1' : '#f3f4f6';

  switch (type) {
    // ── Hero ──
    case 'centered':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="14" y="8" width="20" height="3" rx="1.5" fill={stroke} />
          <rect x="10" y="14" width="28" height="2" rx="1" fill={stroke} opacity=".4" />
          <rect x="17" y="22" width="14" height="4" rx="2" fill={stroke} />
        </svg>
      );
    case 'split':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="3" y="6" width="18" height="3" rx="1.5" fill={stroke} />
          <rect x="3" y="12" width="16" height="2" rx="1" fill={stroke} opacity=".4" />
          <rect x="3" y="16" width="14" height="2" rx="1" fill={stroke} opacity=".4" />
          <rect x="3" y="22" width="10" height="4" rx="2" fill={stroke} />
          <rect x="26" y="4" width="19" height="24" rx="3" fill={stroke} opacity=".2" />
        </svg>
      );
    case 'fullwidth':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={stroke} opacity=".15" />
          <rect x="12" y="8" width="24" height="3" rx="1.5" fill={stroke} />
          <rect x="8" y="14" width="32" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="17" y="22" width="14" height="4" rx="2" fill={stroke} />
        </svg>
      );
    case 'bold-typo':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="6" y="6" width="36" height="6" rx="2" fill={stroke} />
          <rect x="6" y="15" width="36" height="1.5" rx=".75" fill={stroke} opacity=".15" />
          <rect x="12" y="19" width="24" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="18" y="25" width="12" height="3" rx="1.5" fill={stroke} opacity=".5" />
        </svg>
      );
    case 'diagonal':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <path d="M0 0h28L20 32H0z" fill={stroke} opacity=".15" />
          <rect x="3" y="8" width="14" height="3" rx="1.5" fill={stroke} />
          <rect x="3" y="14" width="12" height="2" rx="1" fill={stroke} opacity=".4" />
          <rect x="3" y="22" width="8" height="3" rx="1.5" fill={stroke} />
          <rect x="28" y="4" width="17" height="24" rx="3" fill={stroke} opacity=".12" />
        </svg>
      );
    case 'glass':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <circle cx="8" cy="8" r="8" fill={stroke} opacity=".08" />
          <circle cx="42" cy="26" r="7" fill={stroke} opacity=".08" />
          <rect x="10" y="6" width="28" height="20" rx="6" fill={stroke} opacity=".08" stroke={stroke} strokeWidth=".5" strokeOpacity=".2" />
          <rect x="16" y="10" width="16" height="3" rx="1.5" fill={stroke} />
          <rect x="14" y="16" width="20" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="18" y="21" width="12" height="3" rx="1.5" fill={stroke} opacity=".5" />
        </svg>
      );

    // ── About ──
    case 'text-only':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="4" y="5" width="16" height="3" rx="1.5" fill={stroke} />
          <rect x="4" y="11" width="40" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="4" y="15" width="36" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="4" y="21" width="12" height="3" rx="1.5" fill={stroke} opacity=".5" />
          <rect x="18" y="21" width="12" height="3" rx="1.5" fill={stroke} opacity=".5" />
          <rect x="32" y="21" width="12" height="3" rx="1.5" fill={stroke} opacity=".5" />
        </svg>
      );
    case 'stats':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="4" y="4" width="14" height="2" rx="1" fill={stroke} />
          <rect x="4" y="8" width="40" height="1.5" rx=".75" fill={stroke} opacity=".2" />
          <rect x="2" y="14" width="13" height="14" rx="3" fill={stroke} opacity=".08" />
          <rect x="17.5" y="14" width="13" height="14" rx="3" fill={stroke} opacity=".08" />
          <rect x="33" y="14" width="13" height="14" rx="3" fill={stroke} opacity=".08" />
          <rect x="5" y="18" width="7" height="4" rx="1" fill={stroke} />
          <rect x="20.5" y="18" width="7" height="4" rx="1" fill={stroke} />
          <rect x="36" y="18" width="7" height="4" rx="1" fill={stroke} />
        </svg>
      );
    case 'timeline':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <line x1="24" y1="4" x2="24" y2="28" stroke={stroke} strokeWidth="1" opacity=".3" />
          <circle cx="24" cy="8" r="2" fill={stroke} />
          <circle cx="24" cy="16" r="2" fill={stroke} />
          <circle cx="24" cy="24" r="2" fill={stroke} />
          <rect x="4" y="6" width="16" height="4" rx="2" fill={stroke} opacity=".15" />
          <rect x="28" y="14" width="16" height="4" rx="2" fill={stroke} opacity=".15" />
          <rect x="4" y="22" width="16" height="4" rx="2" fill={stroke} opacity=".15" />
        </svg>
      );
    case 'overlap':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="4" y="8" width="14" height="18" rx="3" fill={stroke} opacity=".12" transform="rotate(-2 4 8)" />
          <rect x="17" y="8" width="14" height="18" rx="3" fill={stroke} opacity=".18" />
          <rect x="30" y="8" width="14" height="18" rx="3" fill={stroke} opacity=".12" transform="rotate(2 30 8)" />
          <rect x="7" y="13" width="8" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="20" y="13" width="8" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="33" y="13" width="8" height="2" rx="1" fill={stroke} opacity=".5" />
        </svg>
      );
    case 'banner':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={stroke} opacity=".8" />
          <rect x="12" y="6" width="24" height="3" rx="1.5" fill="#fff" />
          <rect x="8" y="12" width="32" height="2" rx="1" fill="#fff" opacity=".5" />
          <rect x="8" y="20" width="10" height="2" rx="1" fill="#fff" opacity=".6" />
          <rect x="20" y="20" width="10" height="2" rx="1" fill="#fff" opacity=".6" />
          <rect x="32" y="20" width="10" height="2" rx="1" fill="#fff" opacity=".6" />
        </svg>
      );

    // ── Services / Products shared ──
    case 'cards':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="4" width="13" height="24" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="17.5" y="4" width="13" height="24" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="33" y="4" width="13" height="24" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <circle cx="8.5" cy="12" r="3" fill={stroke} opacity=".3" />
          <circle cx="24" cy="12" r="3" fill={stroke} opacity=".3" />
          <circle cx="39.5" cy="12" r="3" fill={stroke} opacity=".3" />
          <rect x="4" y="18" width="9" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="19.5" y="18" width="9" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="35" y="18" width="9" height="2" rx="1" fill={stroke} opacity=".5" />
        </svg>
      );
    case 'cards-image':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="4" width="13" height="24" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="17.5" y="4" width="13" height="24" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="33" y="4" width="13" height="24" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="2" y="4" width="13" height="12" rx="2" fill={stroke} opacity=".2" />
          <rect x="17.5" y="4" width="13" height="12" rx="2" fill={stroke} opacity=".2" />
          <rect x="33" y="4" width="13" height="12" rx="2" fill={stroke} opacity=".2" />
          <rect x="4" y="19" width="9" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="19.5" y="19" width="9" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="35" y="19" width="9" height="2" rx="1" fill={stroke} opacity=".5" />
        </svg>
      );

    // ── Services new ──
    case 'list':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="3" y="5" width="6" height="4" rx="1" fill={stroke} opacity=".3" />
          <rect x="11" y="6" width="20" height="2" rx="1" fill={stroke} />
          <line x1="3" y1="12" x2="45" y2="12" stroke={stroke} strokeWidth=".5" opacity=".2" />
          <rect x="3" y="14" width="6" height="4" rx="1" fill={stroke} opacity=".3" />
          <rect x="11" y="15" width="20" height="2" rx="1" fill={stroke} />
          <line x1="3" y1="21" x2="45" y2="21" stroke={stroke} strokeWidth=".5" opacity=".2" />
          <rect x="3" y="23" width="6" height="4" rx="1" fill={stroke} opacity=".3" />
          <rect x="11" y="24" width="20" height="2" rx="1" fill={stroke} />
        </svg>
      );
    case 'featured':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="3" width="28" height="26" rx="3" fill={stroke} opacity=".12" />
          <rect x="5" y="18" width="14" height="3" rx="1.5" fill={stroke} />
          <rect x="5" y="23" width="22" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="33" y="3" width="13" height="12" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="33" y="17" width="13" height="12" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
        </svg>
      );
    case 'hscroll':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="6" width="16" height="20" rx="3" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="20" y="6" width="16" height="20" rx="3" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="38" y="6" width="16" height="20" rx="3" stroke={stroke} strokeWidth=".8" fill="none" opacity=".3" />
          <circle cx="10" cy="14" r="2.5" fill={stroke} opacity=".3" />
          <circle cx="28" cy="14" r="2.5" fill={stroke} opacity=".3" />
          <rect x="5" y="20" width="10" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="23" y="20" width="10" height="2" rx="1" fill={stroke} opacity=".5" />
        </svg>
      );
    case 'icon-min':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="3" y="5" width="6" height="6" rx="2" fill={stroke} opacity=".15" />
          <rect x="11" y="6" width="10" height="2" rx="1" fill={stroke} />
          <rect x="11" y="9.5" width="8" height="1.5" rx=".75" fill={stroke} opacity=".3" />
          <rect x="27" y="5" width="6" height="6" rx="2" fill={stroke} opacity=".15" />
          <rect x="35" y="6" width="10" height="2" rx="1" fill={stroke} />
          <rect x="35" y="9.5" width="8" height="1.5" rx=".75" fill={stroke} opacity=".3" />
          <rect x="3" y="16" width="6" height="6" rx="2" fill={stroke} opacity=".15" />
          <rect x="11" y="17" width="10" height="2" rx="1" fill={stroke} />
          <rect x="11" y="20.5" width="8" height="1.5" rx=".75" fill={stroke} opacity=".3" />
          <rect x="27" y="16" width="6" height="6" rx="2" fill={stroke} opacity=".15" />
          <rect x="35" y="17" width="10" height="2" rx="1" fill={stroke} />
          <rect x="35" y="20.5" width="8" height="1.5" rx=".75" fill={stroke} opacity=".3" />
        </svg>
      );

    // ── Products new ──
    case 'showcase':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="3" width="21" height="26" rx="3" fill={stroke} opacity=".15" />
          <rect x="25" y="3" width="21" height="26" rx="3" fill={stroke} opacity=".15" />
          <rect x="4" y="22" width="12" height="3" rx="1.5" fill="#fff" />
          <rect x="27" y="22" width="12" height="3" rx="1.5" fill="#fff" />
          <rect x="4" y="26" width="8" height="2" rx="1" fill="#fff" opacity=".5" />
          <rect x="27" y="26" width="8" height="2" rx="1" fill="#fff" opacity=".5" />
        </svg>
      );
    case 'catalog':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="3" width="10" height="10" rx="2" fill={stroke} opacity=".15" />
          <rect x="14" y="3" width="10" height="10" rx="2" fill={stroke} opacity=".15" />
          <rect x="26" y="3" width="10" height="10" rx="2" fill={stroke} opacity=".15" />
          <rect x="38" y="3" width="8" height="10" rx="2" fill={stroke} opacity=".15" />
          <rect x="3" y="15" width="8" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="15" y="15" width="8" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="27" y="15" width="8" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="39" y="15" width="6" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="2" y="20" width="10" height="10" rx="2" fill={stroke} opacity=".15" />
          <rect x="14" y="20" width="10" height="10" rx="2" fill={stroke} opacity=".15" />
          <rect x="26" y="20" width="10" height="10" rx="2" fill={stroke} opacity=".15" />
          <rect x="38" y="20" width="8" height="10" rx="2" fill={stroke} opacity=".15" />
        </svg>
      );
    case 'masonry':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="3" width="14" height="16" rx="2" fill={stroke} opacity=".15" />
          <rect x="2" y="21" width="14" height="8" rx="2" fill={stroke} opacity=".12" />
          <rect x="18" y="3" width="12" height="10" rx="2" fill={stroke} opacity=".12" />
          <rect x="18" y="15" width="12" height="14" rx="2" fill={stroke} opacity=".15" />
          <rect x="32" y="3" width="14" height="12" rx="2" fill={stroke} opacity=".15" />
          <rect x="32" y="17" width="14" height="12" rx="2" fill={stroke} opacity=".12" />
        </svg>
      );
    case 'price-tbl':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="4" y="6" width="14" height="2.5" rx="1" fill={stroke} />
          <line x1="20" y1="7.25" x2="38" y2="7.25" stroke={stroke} strokeWidth=".5" strokeDasharray="1.5 1" opacity=".3" />
          <rect x="38" y="6" width="7" height="2.5" rx="1" fill={stroke} opacity=".6" />
          <rect x="4" y="15" width="14" height="2.5" rx="1" fill={stroke} />
          <line x1="20" y1="16.25" x2="38" y2="16.25" stroke={stroke} strokeWidth=".5" strokeDasharray="1.5 1" opacity=".3" />
          <rect x="38" y="15" width="7" height="2.5" rx="1" fill={stroke} opacity=".6" />
          <rect x="4" y="24" width="14" height="2.5" rx="1" fill={stroke} />
          <line x1="20" y1="25.25" x2="38" y2="25.25" stroke={stroke} strokeWidth=".5" strokeDasharray="1.5 1" opacity=".3" />
          <rect x="38" y="24" width="7" height="2.5" rx="1" fill={stroke} opacity=".6" />
        </svg>
      );

    // ── Gallery ──
    case 'gal-masonry':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="3" width="14" height="16" rx="2" fill={stroke} opacity=".2" />
          <rect x="2" y="21" width="14" height="8" rx="2" fill={stroke} opacity=".15" />
          <rect x="18" y="3" width="12" height="10" rx="2" fill={stroke} opacity=".15" />
          <rect x="18" y="15" width="12" height="14" rx="2" fill={stroke} opacity=".2" />
          <rect x="32" y="3" width="14" height="12" rx="2" fill={stroke} opacity=".2" />
          <rect x="32" y="17" width="14" height="12" rx="2" fill={stroke} opacity=".15" />
        </svg>
      );
    case 'gal-grid':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="3" width="14" height="12" rx="2" fill={stroke} opacity=".2" />
          <rect x="18" y="3" width="12" height="12" rx="2" fill={stroke} opacity=".2" />
          <rect x="32" y="3" width="14" height="12" rx="2" fill={stroke} opacity=".2" />
          <rect x="2" y="17" width="14" height="12" rx="2" fill={stroke} opacity=".2" />
          <rect x="18" y="17" width="12" height="12" rx="2" fill={stroke} opacity=".2" />
          <rect x="32" y="17" width="14" height="12" rx="2" fill={stroke} opacity=".2" />
        </svg>
      );
    case 'gal-slider':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="4" y="4" width="20" height="24" rx="3" fill={stroke} opacity=".2" />
          <rect x="26" y="4" width="20" height="24" rx="3" fill={stroke} opacity=".12" />
          <path d="M2 16l3-3v6l-3-3z" fill={stroke} opacity=".4" />
          <path d="M46 16l-3-3v6l3-3z" fill={stroke} opacity=".4" />
        </svg>
      );

    // ── Testimonials ──
    case 'test-grid':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="3" width="13" height="26" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="17.5" y="3" width="13" height="26" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="33" y="3" width="13" height="26" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <text x="8.5" y="10" textAnchor="middle" fontSize="6" fill={stroke} opacity=".6">&ldquo;</text>
          <text x="24" y="10" textAnchor="middle" fontSize="6" fill={stroke} opacity=".6">&ldquo;</text>
          <text x="39.5" y="10" textAnchor="middle" fontSize="6" fill={stroke} opacity=".6">&ldquo;</text>
          <rect x="4" y="13" width="9" height="1.5" rx=".75" fill={stroke} opacity=".3" />
          <rect x="19.5" y="13" width="9" height="1.5" rx=".75" fill={stroke} opacity=".3" />
          <rect x="35" y="13" width="9" height="1.5" rx=".75" fill={stroke} opacity=".3" />
          <circle cx="6" cy="24" r="2.5" fill={stroke} opacity=".2" />
          <circle cx="21.5" cy="24" r="2.5" fill={stroke} opacity=".2" />
          <circle cx="37" cy="24" r="2.5" fill={stroke} opacity=".2" />
        </svg>
      );
    case 'test-carousel':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="8" y="3" width="32" height="22" rx="3" stroke={stroke} strokeWidth=".8" fill="none" />
          <text x="24" y="12" textAnchor="middle" fontSize="8" fill={stroke} opacity=".5">&ldquo;</text>
          <rect x="14" y="16" width="20" height="1.5" rx=".75" fill={stroke} opacity=".3" />
          <circle cx="20" cy="29" r="1.5" fill={stroke} opacity=".2" />
          <circle cx="24" cy="29" r="1.5" fill={stroke} />
          <circle cx="28" cy="29" r="1.5" fill={stroke} opacity=".2" />
        </svg>
      );
    case 'test-single':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <text x="24" y="10" textAnchor="middle" fontSize="10" fill={stroke} opacity=".4">&ldquo;</text>
          <rect x="10" y="14" width="28" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="14" y="18" width="20" height="2" rx="1" fill={stroke} opacity=".2" />
          <circle cx="24" cy="26" r="2.5" fill={stroke} opacity=".3" />
        </svg>
      );

    // ── FAQ ──
    case 'faq-classic':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="6" y="3" width="36" height="7" rx="2" stroke={stroke} strokeWidth=".8" fill={stroke} opacity=".08" />
          <rect x="8" y="5" width="16" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="38" y="5.5" width="2" height="2" rx=".5" fill={stroke} opacity=".3" />
          <rect x="6" y="12" width="36" height="7" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="8" y="14" width="14" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="6" y="21" width="36" height="7" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="8" y="23" width="18" height="2" rx="1" fill={stroke} opacity=".3" />
        </svg>
      );
    case 'faq-side':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="4" width="18" height="6" rx="2" fill={stroke} opacity=".15" />
          <rect x="2" y="12" width="18" height="6" rx="2" fill={stroke} opacity=".08" />
          <rect x="2" y="20" width="18" height="6" rx="2" fill={stroke} opacity=".08" />
          <rect x="4" y="6" width="10" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="4" y="14" width="8" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="4" y="22" width="12" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="24" y="4" width="22" height="22" rx="3" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="27" y="8" width="16" height="2" rx="1" fill={stroke} opacity=".4" />
          <rect x="27" y="13" width="14" height="1.5" rx=".75" fill={stroke} opacity=".2" />
          <rect x="27" y="17" width="16" height="1.5" rx=".75" fill={stroke} opacity=".2" />
        </svg>
      );
    case 'faq-cards':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="3" width="21" height="12" rx="2" stroke={stroke} strokeWidth=".8" fill={stroke} opacity=".08" />
          <rect x="25" y="3" width="21" height="12" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="2" y="17" width="21" height="12" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="25" y="17" width="21" height="12" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="5" y="6" width="12" height="2" rx="1" fill={stroke} opacity=".5" />
          <rect x="5" y="10" width="16" height="1.5" rx=".75" fill={stroke} opacity=".2" />
          <rect x="28" y="6" width="10" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="5" y="20" width="14" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="28" y="20" width="12" height="2" rx="1" fill={stroke} opacity=".3" />
        </svg>
      );

    // ── Pricing ──
    case 'price-cards':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="4" width="13" height="24" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="17.5" y="2" width="13" height="28" rx="2" stroke={stroke} strokeWidth="1.2" fill={stroke} opacity=".06" />
          <rect x="33" y="4" width="13" height="24" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="20" y="0" width="8" height="3" rx="1.5" fill={stroke} opacity=".4" />
          <rect x="5" y="8" width="7" height="3" rx="1" fill={stroke} opacity=".4" />
          <rect x="20.5" y="8" width="7" height="3" rx="1" fill={stroke} />
          <rect x="36" y="8" width="7" height="3" rx="1" fill={stroke} opacity=".4" />
          <rect x="4" y="14" width="9" height="1" rx=".5" fill={stroke} opacity=".15" />
          <rect x="4" y="16.5" width="9" height="1" rx=".5" fill={stroke} opacity=".15" />
          <rect x="4" y="19" width="9" height="1" rx=".5" fill={stroke} opacity=".15" />
          <rect x="19.5" y="14" width="9" height="1" rx=".5" fill={stroke} opacity=".15" />
          <rect x="19.5" y="16.5" width="9" height="1" rx=".5" fill={stroke} opacity=".15" />
          <rect x="19.5" y="19" width="9" height="1" rx=".5" fill={stroke} opacity=".15" />
          <rect x="35" y="14" width="9" height="1" rx=".5" fill={stroke} opacity=".15" />
          <rect x="35" y="16.5" width="9" height="1" rx=".5" fill={stroke} opacity=".15" />
          <rect x="35" y="19" width="9" height="1" rx=".5" fill={stroke} opacity=".15" />
          <rect x="4" y="23" width="9" height="3" rx="1.5" fill={stroke} opacity=".15" />
          <rect x="19.5" y="23" width="9" height="3" rx="1.5" fill={stroke} opacity=".3" />
          <rect x="35" y="23" width="9" height="3" rx="1.5" fill={stroke} opacity=".15" />
        </svg>
      );
    case 'price-table':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="2" width="44" height="28" rx="3" stroke={stroke} strokeWidth=".5" opacity=".2" fill="none" />
          <line x1="16" y1="2" x2="16" y2="30" stroke={stroke} strokeWidth=".5" opacity=".15" />
          <rect x="4" y="5" width="10" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="4" y="11" width="8" height="1.5" rx=".75" fill={stroke} opacity=".2" />
          <rect x="4" y="16" width="10" height="1.5" rx=".75" fill={stroke} opacity=".2" />
          <rect x="4" y="21" width="7" height="1.5" rx=".75" fill={stroke} opacity=".2" />
          <rect x="19" y="5" width="8" height="2" rx="1" fill={stroke} />
          <rect x="31" y="5" width="8" height="2" rx="1" fill={stroke} />
          <circle cx="23" cy="12" r="1.5" fill={stroke} opacity=".4" />
          <circle cx="35" cy="12" r="1.5" fill={stroke} opacity=".4" />
          <circle cx="23" cy="17" r="1.5" fill={stroke} opacity=".4" />
          <circle cx="35" cy="17" r="1.5" fill={stroke} opacity=".15" />
          <circle cx="23" cy="22" r="1.5" fill={stroke} opacity=".15" />
          <circle cx="35" cy="22" r="1.5" fill={stroke} opacity=".4" />
        </svg>
      );
    case 'price-list':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="8" y="5" width="12" height="2.5" rx="1" fill={stroke} />
          <line x1="22" y1="6.25" x2="34" y2="6.25" stroke={stroke} strokeWidth=".5" strokeDasharray="2 1" opacity=".3" />
          <rect x="35" y="5" width="6" height="2.5" rx="1" fill={stroke} opacity=".6" />
          <rect x="8" y="12" width="16" height="2.5" rx="1" fill={stroke} opacity=".15" />
          <rect x="35" y="12" width="6" height="2.5" rx="1" fill={stroke} opacity=".6" />
          <rect x="8" y="19" width="10" height="2.5" rx="1" fill={stroke} />
          <line x1="20" y1="20.25" x2="34" y2="20.25" stroke={stroke} strokeWidth=".5" strokeDasharray="2 1" opacity=".3" />
          <rect x="35" y="19" width="6" height="2.5" rx="1" fill={stroke} opacity=".6" />
          <rect x="10" y="25" width="4" height="2" rx="1" fill={stroke} opacity=".15" />
          <rect x="16" y="25" width="5" height="2" rx="1" fill={stroke} opacity=".15" />
        </svg>
      );

    // ── Contact ──
    case 'contact-cards':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="2" y="4" width="21" height="12" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="25" y="4" width="21" height="12" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="2" y="18" width="21" height="12" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="25" y="18" width="21" height="12" rx="2" stroke={stroke} strokeWidth=".8" fill="none" />
          <circle cx="8" cy="10" r="2.5" fill={stroke} opacity=".2" />
          <circle cx="31" cy="10" r="2.5" fill={stroke} opacity=".2" />
          <circle cx="8" cy="24" r="2.5" fill={stroke} opacity=".2" />
          <circle cx="31" cy="24" r="2.5" fill={stroke} opacity=".2" />
          <rect x="13" y="8" width="8" height="1.5" rx=".75" fill={stroke} opacity=".4" />
          <rect x="36" y="8" width="8" height="1.5" rx=".75" fill={stroke} opacity=".4" />
          <rect x="13" y="22" width="8" height="1.5" rx=".75" fill={stroke} opacity=".4" />
          <rect x="36" y="22" width="8" height="1.5" rx=".75" fill={stroke} opacity=".4" />
        </svg>
      );
    case 'contact-split':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <circle cx="8" cy="8" r="2" fill={stroke} opacity=".2" />
          <rect x="12" y="7" width="8" height="2" rx="1" fill={stroke} opacity=".4" />
          <circle cx="8" cy="15" r="2" fill={stroke} opacity=".2" />
          <rect x="12" y="14" width="10" height="2" rx="1" fill={stroke} opacity=".4" />
          <circle cx="8" cy="22" r="2" fill={stroke} opacity=".2" />
          <rect x="12" y="21" width="6" height="2" rx="1" fill={stroke} opacity=".4" />
          <rect x="26" y="4" width="20" height="24" rx="3" stroke={stroke} strokeWidth=".8" fill="none" />
          <rect x="29" y="8" width="14" height="3" rx="1.5" fill={stroke} opacity=".1" />
          <rect x="29" y="14" width="14" height="3" rx="1.5" fill={stroke} opacity=".1" />
          <rect x="29" y="20" width="14" height="5" rx="1.5" fill={stroke} opacity=".1" />
        </svg>
      );
    case 'contact-center':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="14" y="3" width="20" height="3" rx="1.5" fill={stroke} />
          <rect x="10" y="8" width="28" height="2" rx="1" fill={stroke} opacity=".2" />
          <circle cx="18" cy="16" r="2.5" fill={stroke} opacity=".15" />
          <rect x="22" y="15" width="12" height="2" rx="1" fill={stroke} opacity=".4" />
          <circle cx="18" cy="23" r="2.5" fill={stroke} opacity=".15" />
          <rect x="22" y="22" width="10" height="2" rx="1" fill={stroke} opacity=".4" />
        </svg>
      );

    // ── Bento Grid (services + products) ──
    case 'bento':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="3" y="3" width="20" height="16" rx="2" fill={stroke} opacity=".3" />
          <rect x="25" y="3" width="10" height="7" rx="2" fill={stroke} opacity=".2" />
          <rect x="37" y="3" width="8" height="7" rx="2" fill={stroke} opacity=".2" />
          <rect x="25" y="12" width="20" height="7" rx="2" fill={stroke} opacity=".25" />
          <rect x="3" y="21" width="10" height="8" rx="2" fill={stroke} opacity=".2" />
          <rect x="15" y="21" width="10" height="8" rx="2" fill={stroke} opacity=".2" />
          <rect x="27" y="21" width="18" height="8" rx="2" fill={stroke} opacity=".3" />
        </svg>
      );

    // ── About Asymmetric ──
    case 'asym':
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
          <rect width="48" height="32" rx="4" fill={fill} />
          <rect x="3" y="4" width="28" height="3" rx="1.5" fill={stroke} />
          <rect x="3" y="10" width="28" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="3" y="14" width="24" height="2" rx="1" fill={stroke} opacity=".3" />
          <rect x="3" y="19" width="12" height="2" rx="1" fill={stroke} opacity=".2" />
          <rect x="3" y="23" width="12" height="2" rx="1" fill={stroke} opacity=".2" />
          <rect x="34" y="4" width="11" height="24" rx="3" fill={stroke} opacity=".25" />
        </svg>
      );

    default:
      return null;
  }
}

export default function VariantSwitcher({
  sectionKey,
  currentVariant,
  aiRecommendedVariant,
  onChange,
  isLoading,
}: VariantSwitcherProps) {
  const variants = SECTION_VARIANTS[sectionKey];
  if (!variants) return null;

  return (
    <div className="mb-5">
      <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide block mb-2">
        Diseño de sección
      </label>
      <div className="grid grid-cols-3 gap-2">
        {variants.map((v) => {
          const isActive = currentVariant === v.id;
          const isRecommended = aiRecommendedVariant === v.id;

          return (
            <button
              key={v.id}
              type="button"
              disabled={isLoading}
              onClick={() => onChange(v.id)}
              className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all cursor-pointer disabled:opacity-50 ${
                isActive
                  ? 'border-[#1C3B57] bg-[#E2F3F1]/30'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              {isLoading && isActive ? (
                <Loader2 className="h-5 w-5 text-[#1C3B57] animate-spin" />
              ) : (
                <LayoutIcon type={v.icon} isActive={isActive} />
              )}
              <span className={`text-[0.65rem] font-medium leading-tight text-center ${
                isActive ? 'text-[#1C3B57]' : 'text-gray-500'
              }`}>
                {v.label}
              </span>
              {isRecommended && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-[#1C3B57] text-white text-[0.5rem] font-medium px-1.5 py-0.5 rounded-full">
                  <Sparkles className="h-2 w-2" />
                  IA
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
