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

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, tenant } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Rutas con layout limpio (sin Header/Footer de tienda)
  const isBuilderRoute = pathname.startsWith('/dashboard/website-builder');
  const isSetupRoute = pathname === '/dashboard/setup';
  const isBypassRoute = BYPASS_ROUTES.some((r) => pathname.startsWith(r)) || isBuilderRoute;
  const isCleanLayout = isBuilderRoute || isSetupRoute || pathname === '/dashboard/profile' || pathname.startsWith('/dashboard/settings');

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
    // Redirect to setup if modules not configured (except bypass routes)
    if (tenant && !tenant.modules_configured && !isBypassRoute) {
      router.push('/dashboard/setup');
    } else if (
      tenant?.has_website &&
      tenant.website_status !== 'published' &&
      !isBypassRoute
    ) {
      router.push('/dashboard/website-builder');
    }
  }, [mounted, isAuthenticated, isLoading, tenant, isBypassRoute, router]);

  // Determinar si se necesita redirect (antes de renderizar cualquier layout)
  const needsRedirect =
    mounted &&
    !isLoading &&
    isAuthenticated &&
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
