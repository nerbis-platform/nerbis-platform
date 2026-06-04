import {
  ShoppingBag,
  CalendarCheck,
  BarChart3,
  Star,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  visual: string;
  iconBg: string;
  iconText: string;
}

// ─── Data ────────────────────────────────────────────────

export const FEATURES: Feature[] = [
  {
    icon: ShoppingBag,
    title: 'Tienda online',
    description: 'Catálogo, carrito y pagos integrados. Vende desde el primer día.',
    visual: 'store',
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
  },
  {
    icon: CalendarCheck,
    title: 'Reservas',
    description: 'Tus clientes reservan solos. Sin llamadas, sin WhatsApp.',
    visual: 'calendar',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: TrendingUp,
    title: 'Marketing',
    description: 'Campañas y notificaciones automáticas que traen clientes de vuelta.',
    visual: 'chart-bars',
    iconBg: 'bg-violet-500/10',
    iconText: 'text-violet-600 dark:text-violet-400',
  },
  {
    icon: Star,
    title: 'Reseñas',
    description: 'Reseñas reales que generan confianza y mejoran tu posición en Google.',
    visual: 'reviews',
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-600 dark:text-amber-400',
  },
  {
    icon: BarChart3,
    title: 'Analíticas',
    description: 'Métricas claras de visitas, ventas y rendimiento. Sin complicaciones.',
    visual: 'chart-line',
    iconBg: 'bg-sky-500/10',
    iconText: 'text-sky-600 dark:text-sky-400',
  },
];
