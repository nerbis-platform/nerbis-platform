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
    id: 'ai-website',
    headline: 'Tu sitio web profesional, listo en minutos',
    subtitle:
      'Describe tu negocio y nuestra IA genera un sitio web completo, personalizado y optimizado para móviles. Sin código, sin complicaciones.',
    features: ['Generado con IA', 'Personalizable', 'Optimizado para móviles'],
  },
  {
    id: 'all-in-one',
    headline: 'Todo tu negocio en un solo lugar',
    subtitle:
      'Sitio web, tienda online, reservas, pagos y clientes. Un panel de control intuitivo para gestionar todo desde cualquier dispositivo.',
    features: ['Tienda online', 'Reservas', 'Gestión de clientes'],
  },
  {
    id: 'grow',
    headline: 'Las herramientas para crecer',
    subtitle:
      'Analytics, email marketing y automatizaciones para llevar tu negocio al siguiente nivel. Todo incluido, sin costos extras.',
    features: ['Analytics', 'Email marketing', 'Automatizaciones'],
  },
  {
    id: 'latam',
    headline: 'Hecho para Latinoamérica',
    subtitle:
      'Soporte en español, pasarelas de pago locales y una comunidad que entiende tu mercado. Construido para emprendedores como tú.',
    features: ['Soporte en español', 'Pagos locales', 'Comunidad activa'],
  },
];
