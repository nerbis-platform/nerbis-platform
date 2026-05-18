// frontend/src/components/common/PageGuard.tsx
'use client';

import { usePageEnabled, useTenantReady } from '@/contexts/TenantContext';
import { notFound } from 'next/navigation';
import { type ReactNode } from 'react';

interface PageGuardProps {
  page: string;
  children: ReactNode;
}

/**
 * Gate de páginas: verifica que la página esté habilitada en el tenant.
 * Muestra skeleton mientras carga (evita flash 404).
 * Si la página no está habilitada, muestra 404.
 */
export function PageGuard({ page, children }: PageGuardProps) {
  const tenantReady = useTenantReady();
  const isEnabled = usePageEnabled(page);

  if (!tenantReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-auth-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isEnabled) {
    notFound();
  }

  return <>{children}</>;
}
