// src/app/dashboard/DashboardShell.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, tenant } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Rutas con layout limpio (sin Header/Footer de tienda)
  const isBuilderRoute = pathname.startsWith('/dashboard/website-builder');
  const isSetupRoute = pathname === '/dashboard/setup';
  const isCleanLayout = isBuilderRoute || isSetupRoute;

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
    // Redirect to setup if modules not configured (except if already on setup)
    if (tenant && !tenant.modules_configured && !isSetupRoute) {
      router.push('/dashboard/setup');
    } else if (
      tenant?.has_website &&
      tenant.website_status !== 'published' &&
      !isBuilderRoute &&
      !isSetupRoute
    ) {
      router.push('/dashboard/website-builder');
    }
  }, [mounted, isAuthenticated, isLoading, tenant, isSetupRoute, isBuilderRoute, router]);

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

  return (
    <>
      <Header />
      <main className="container py-8">
        {!mounted ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-48" />
            <div className="grid md:grid-cols-3 gap-6">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        ) : isAuthenticated ? (
          children
        ) : null}
      </main>
      <Footer />
    </>
  );
}
