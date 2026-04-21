// src/app/dashboard/DashboardShell.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';

// Rutas que no requieren módulos configurados ni website publicado
const BYPASS_ROUTES = ['/dashboard/setup', '/dashboard/profile', '/dashboard/team', '/dashboard/settings'];

// NERBIS platform tokens — restored on dashboard entry so tenant
// ThemeInjector (which writes to :root) doesn't bleed into the panel.
const NERBIS_PLATFORM_VARS: Record<string, string> = {
  '--primary': '#1C3B57',
  '--primary-foreground': '#FFFFFF',
  '--secondary': '#F1F5F9',
  '--secondary-foreground': '#334155',
  '--muted': '#F1F5F9',
  '--muted-foreground': '#64748B',
  '--accent': '#E2F3F1',
  '--accent-foreground': '#1C3B57',
  '--destructive': '#DC2626',
  '--border': '#E2E8F0',
  '--input': '#E2E8F0',
  '--ring': '#0D9488',
  '--background': '#FAFAFA',
  '--foreground': '#111827',
  '--card': '#FFFFFF',
  '--card-foreground': '#111827',
  '--popover': '#FFFFFF',
  '--popover-foreground': '#111827',
  '--sidebar-primary': '#1C3B57',
  '--sidebar-primary-foreground': '#FFFFFF',
  '--sidebar-accent': '#F1F5F9',
  '--sidebar-accent-foreground': '#334155',
  '--sidebar-border': '#E2E8F0',
  '--sidebar-ring': '#0D9488',
  '--font-heading': "var(--font-geist-sans), sans-serif",
  '--font-body': "var(--font-geist-sans), sans-serif",
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, tenant, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Rutas con layout limpio (sin Header/Footer de tienda)
  const isBuilderRoute = pathname.startsWith('/dashboard/website-builder');
  const isSetupRoute = pathname === '/dashboard/setup';
  const isBypassRoute = BYPASS_ROUTES.some((r) => pathname.startsWith(r)) || isBuilderRoute;
  const isCleanLayout = isBuilderRoute || isSetupRoute || pathname === '/dashboard/profile' || pathname.startsWith('/dashboard/settings');

  // Reset platform identity — undo tenant ThemeInjector overrides on :root
  useEffect(() => {
    const root = document.documentElement;
    // Only apply light-mode platform vars if not in dark mode
    if (!root.classList.contains('dark')) {
      for (const [prop, value] of Object.entries(NERBIS_PLATFORM_VARS)) {
        root.style.setProperty(prop, value);
      }
    }
    // Always clean up tenant font overrides on the root element
    root.style.removeProperty('font-family');
  }, [tenant?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/dashboard');
      return;
    }
    // Redirect to setup/builder only for admins — staff shouldn't manage setup
    const isAdmin = user?.role === 'admin';
    if (isAdmin && tenant && !tenant.modules_configured && !isBypassRoute) {
      router.push('/dashboard/setup');
    } else if (
      isAdmin &&
      tenant?.has_website &&
      tenant.website_status !== 'published' &&
      !isBypassRoute
    ) {
      router.push('/dashboard/website-builder');
    }
  }, [mounted, isAuthenticated, isLoading, tenant, user, isBypassRoute, router]);

  // Determinar si se necesita redirect (antes de renderizar cualquier layout)
  const needsRedirect =
    mounted &&
    !isLoading &&
    isAuthenticated &&
    user?.role === 'admin' &&
    !isBypassRoute &&
    tenant &&
    (!tenant.modules_configured ||
      (tenant.has_website && tenant.website_status !== 'published'));

  // Layout limpio para Setup y Website Builder
  if (isCleanLayout) {
    return (
      <>
        {!mounted ? (
          <div className="min-h-screen flex items-center justify-center">
            <Skeleton className="h-10 w-64" />
          </div>
        ) : isAuthenticated ? (
          children
        ) : null}
      </>
    );
  }

  // No mostrar layout con Header/Footer si vamos a redirigir
  if (!mounted || isLoading || needsRedirect) {
    return <div className="min-h-screen" />;
  }

  return (
    <>
      <Header />
      <main className="container py-8">
        {isAuthenticated ? children : null}
      </main>
      <Footer />
    </>
  );
}
