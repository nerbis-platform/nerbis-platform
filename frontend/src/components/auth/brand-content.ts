// src/components/auth/brand-content.ts
// Data file with carousel slides for the brand storytelling panel.

import type { BrandSlide } from './types';

/**
 * Carousel slides highlighting NERBIS value propositions.
 * Content is in Spanish (LatAm target market).
 * Each slide has a title, description, and an icon identifier
 * for optional future SVG/illustration rendering.
 */
export const brandSlides: BrandSlide[] = [
  {
    id: 'create-store',
    headline: 'Crea tu tienda online en minutos',
    subtitle:
      'Con inteligencia artificial, tu sitio web profesional está listo en minutos. Sin conocimientos técnicos, sin complicaciones.',
    features: ['Sitio web con IA', 'Personalizable', 'Optimizado para móviles'],
  },
  {
    id: 'manage-anywhere',
    headline: 'Gestiona tu negocio desde cualquier lugar',
    subtitle:
      'Panel de control intuitivo para administrar citas, clientes, pagos y más. Todo en un solo lugar, accesible desde cualquier dispositivo.',
    features: ['Panel de admin', 'Reservas online', 'Gestión de clientes'],
  },
  {
    id: 'premium-tools',
    headline: 'Herramientas premium para crecer',
    subtitle:
      'Desde analytics hasta automatizaciones de marketing. Las herramientas que necesitas para escalar tu negocio al siguiente nivel.',
    features: ['Analytics avanzados', 'Email marketing', 'Automatizaciones'],
  },
  {
    id: 'support-spanish',
    headline: 'Soporte dedicado en español',
    subtitle:
      'Equipo de soporte que habla tu idioma, entiende tu mercado y está disponible cuando lo necesitas. Nunca te sentirás solo.',
    features: ['Chat en vivo', 'Tutoriales en español', 'Comunidad activa'],
  },
];
