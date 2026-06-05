// src/app/(tenant)/dashboard/settings/layout.tsx

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { BrandHeader } from '@/components/layout/BrandHeader';
import { NerbisFooterMark } from '@/components/layout/NerbisFooterMark';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { SETTINGS_NAV } from './settings-nav.config';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, tenant, logout } = useAuth();

  const visibleItems = SETTINGS_NAV.filter(
    (item) => !item.adminOnly || user?.role === 'admin',
  );

  return (
    <div
      className="min-h-screen bg-background"
      // Compat shim: las páginas login/team aún consumen --stg-*.
      // Ahora mapean a tokens del design system (sin hex hardcodeado).
      // Eliminar cuando login (PR2) y team (PR3) migren a tokens directos.
      style={
        {
          '--stg-primary': 'var(--primary)',
          '--stg-primary-hover': 'color-mix(in oklch, var(--primary), black 12%)',
          '--stg-accent': 'var(--color-text-brand)',
          '--stg-accent-hover': 'var(--color-interactive-hover)',
          '--stg-accent-subtle': 'var(--color-interactive-muted)',
        } as React.CSSProperties
      }
    >
      {/* Skip link */}
      <a
        href="#settings-content"
        className="sr-only rounded-md bg-card px-4 py-2 text-sm font-medium text-foreground shadow-md focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50"
      >
        Ir al contenido
      </a>

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <BrandHeader tenantName={tenant?.name} />
          <div className="flex items-center gap-1.5">
            <Link
              href="/dashboard"
              className="flex min-h-[44px] items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Volver al panel</span>
            </Link>
            <div className="h-4 w-px bg-border" aria-hidden="true" />
            <button
              type="button"
              onClick={() => void logout()}
              aria-label="Cerrar sesión"
              className="flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-1"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Content area with sidebar */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar — vertical en desktop, horizontal en mobile */}
          <nav className="shrink-0 lg:w-64" aria-label="Configuración de cuenta">
            {/* Mobile: horizontal scroll */}
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:hidden">
              {visibleItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                      isActive
                        ? 'border border-border bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      item.comingSoon && !isActive && 'opacity-70',
                    )}
                  >
                    <item.icon className="size-3.5" aria-hidden="true" />
                    {item.label}
                    {item.comingSoon ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        · Próximamente
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>

            {/* Desktop: vertical list */}
            <div className="hidden flex-col gap-0.5 lg:flex">
              {visibleItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-all',
                      isActive
                        ? 'border border-border bg-card shadow-sm'
                        : 'border border-transparent hover:bg-muted',
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        isActive
                          ? 'text-[var(--color-text-brand)]'
                          : 'text-muted-foreground',
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span
                        className={cn(
                          'flex items-center gap-1.5 text-sm font-medium',
                          isActive ? 'text-foreground' : 'text-foreground/90',
                          item.comingSoon && !isActive && 'text-muted-foreground',
                        )}
                      >
                        {item.label}
                        {item.comingSoon ? (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                            Próximamente
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <Separator
            orientation="vertical"
            className="hidden h-auto self-stretch lg:block"
          />

          {/* Main content */}
          <main id="settings-content" className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>

      {/* NERBIS firma discreta al final — solo el logo, sin barra */}
      <NerbisFooterMark />
    </div>
  );
}
