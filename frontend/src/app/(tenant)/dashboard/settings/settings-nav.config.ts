// src/app/(tenant)/dashboard/settings/settings-nav.config.ts
// Configuración declarativa de la navegación de configuración.
// Añadir una sección = añadir una entrada aquí (label, descripción, icono,
// restricción de admin y bandera "próximamente").

import {
  Bell,
  CreditCard,
  KeyRound,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface SettingsNavItem {
  href: string;
  label: string;
  /** Descripción corta mostrada bajo la etiqueta en el sidebar. */
  description: string;
  icon: LucideIcon;
  /** Solo visible para usuarios con rol admin. */
  adminOnly?: boolean;
  /** Sección aún no disponible: navegable pero atenuada. */
  comingSoon?: boolean;
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    href: '/dashboard/settings/profile',
    label: 'Mi perfil',
    description: 'Tus datos personales',
    icon: UserCircle,
  },
  {
    href: '/dashboard/settings/login',
    label: 'Inicio de sesión',
    description: 'Contraseña, accesos y seguridad',
    icon: KeyRound,
  },
  {
    href: '/dashboard/settings/team',
    label: 'Equipo',
    description: 'Miembros e invitaciones',
    icon: Users,
    adminOnly: true,
  },
  {
    href: '/dashboard/settings/billing',
    label: 'Facturación',
    description: 'Plan y métodos de pago',
    icon: CreditCard,
    adminOnly: true,
    comingSoon: true,
  },
  {
    href: '/dashboard/settings/notifications',
    label: 'Notificaciones',
    description: 'Avisos por correo y en la app',
    icon: Bell,
    comingSoon: true,
  },
];
