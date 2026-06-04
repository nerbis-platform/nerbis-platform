// ─── Types ───────────────────────────────────────────────

export interface VerticalPreview {
  name: string;
  slug: string;
  industry: string;
  accent: string;
  accentLight: string;
  navItems: string[];
  heroTitle: string;
  heroSubtitle: string;
  cards: { label: string; sub: string }[];
}

// ─── Data ────────────────────────────────────────────────

export const verticals: VerticalPreview[] = [
  {
    name: 'GC Belleza',
    slug: 'gcbelleza',
    industry: 'Salon de belleza',
    accent: '#b5838d',
    accentLight: '#b5838d26',
    navItems: ['Servicios', 'Equipo', 'Contacto'],
    heroTitle: 'Tu mejor version',
    heroSubtitle: 'Reserva tu cita hoy',
    cards: [
      { label: 'Corte y Peinado', sub: 'Desde $25.000' },
      { label: 'Color y Mechas', sub: 'Desde $45.000' },
      { label: 'Tratamientos', sub: 'Desde $35.000' },
    ],
  },
  {
    name: 'FitZone',
    slug: 'fitzone',
    industry: 'Gimnasio',
    accent: '#e07a5f',
    accentLight: '#e07a5f22',
    navItems: ['Clases', 'Planes', 'Ubicacion'],
    heroTitle: 'Entrena sin limites',
    heroSubtitle: 'Planes desde $39.900/mes',
    cards: [
      { label: 'CrossFit', sub: 'Lun-Vie 7am' },
      { label: 'Yoga', sub: 'Mar-Jue 6pm' },
      { label: 'Spinning', sub: 'Todos los dias' },
    ],
  },
  {
    name: 'La Cocina de Maria',
    slug: 'lacocina',
    industry: 'Restaurante',
    accent: '#8b7355',
    accentLight: '#8b735522',
    navItems: ['Menu', 'Reservas', 'Nosotros'],
    heroTitle: 'Sabor de casa',
    heroSubtitle: 'Cocina tradicional colombiana',
    cards: [
      { label: 'Almuerzo Ejecutivo', sub: '$18.000' },
      { label: 'Bandeja Paisa', sub: '$28.000' },
      { label: 'Postres', sub: 'Desde $8.000' },
    ],
  },
  {
    name: 'Urban Style',
    slug: 'urbanstyle',
    industry: 'Tienda de ropa',
    accent: '#555555',
    accentLight: '#55555518',
    navItems: ['Catalogo', 'Nuevos', 'Ofertas'],
    heroTitle: 'Estilo urbano',
    heroSubtitle: 'Envio gratis desde $99.000',
    cards: [
      { label: 'Camisetas', sub: 'Desde $49.900' },
      { label: 'Jeans', sub: 'Desde $89.900' },
      { label: 'Accesorios', sub: 'Desde $19.900' },
    ],
  },
];
