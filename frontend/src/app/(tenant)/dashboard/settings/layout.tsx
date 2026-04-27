// src/app/dashboard/settings/layout.tsx

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  KeyRound,
  LogOut,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ─── Estilos hoisted ────────────────────────────────────────
const navyText = { color: '#1C3B57' } as const;

// ─── Navegación del sidebar ────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard/settings/profile',
    label: 'Mi Perfil',
    icon: UserCircle,
  },
  {
    href: '/dashboard/settings/login',
    label: 'Inicio de sesión',
    icon: KeyRound,
  },
  {
    href: '/dashboard/settings/team',
    label: 'Equipo',
    icon: Users,
    adminOnly: true,
  },
  // Futuras secciones:
  // { href: '/dashboard/settings/billing', label: 'Facturación', icon: CreditCard },
  // { href: '/dashboard/settings/notifications', label: 'Notificaciones', icon: Bell },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, tenant, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  return (
    <>
      <div className="min-h-screen bg-[#fafbfc]">
        {/* Skip link */}
        <a
          href="#settings-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-white focus:text-[#1C3B57] focus:rounded-md focus:shadow-md focus:text-sm focus:font-medium"
        >
          Ir al contenido
        </a>

        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/Isotipo_color_NERBIS.png"
                alt="Nerbis"
                width={36}
                height={36}
              />
              <span
                className="text-[0.85rem] font-semibold tracking-wide"
                style={navyText}
              >
                NERBIS
              </span>
              {tenant?.name && (
                <>
                  <span className="text-gray-300 text-[0.75rem]" aria-hidden="true">·</span>
                  <span className="text-[0.8rem] text-gray-500 font-medium truncate max-w-[160px]">
                    {tenant.name}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.72rem] text-gray-500 hover:text-[#1C3B57] hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Volver al panel</span>
              </Link>
              <div className="w-px h-4 bg-gray-200" aria-hidden="true" />
              <button
                type="button"
                onClick={() => void logout()}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.72rem] text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                Salir
              </button>
            </div>
          </div>
        </div>

        {/* Content area with sidebar */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar — vertical en desktop, horizontal en mobile */}
            <nav
              className="lg:w-56 shrink-0"
              aria-label="Configuración de cuenta"
            >
              {/* Mobile: horizontal scroll */}
              <div className="flex lg:hidden gap-1 overflow-x-auto pb-2 -mx-1 px-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8rem] font-medium whitespace-nowrap transition-all',
                        isActive
                          ? 'bg-white text-[#1C3B57] shadow-sm border border-gray-200'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                      )}
                    >
                      <item.icon className="w-3.5 h-3.5" aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {/* Desktop: vertical list */}
              <div className="hidden lg:flex flex-col gap-0.5">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.8rem] font-medium transition-all',
                        isActive
                          ? 'bg-white text-[#1C3B57] shadow-sm border border-gray-200'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'w-4 h-4',
                          isActive ? 'text-[#0D9488]' : ''
                        )}
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <Separator
              orientation="vertical"
              className="hidden lg:block h-auto self-stretch"
            />

            {/* Main content */}
            <main
              id="settings-content"
              className="flex-1 min-w-0"
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
