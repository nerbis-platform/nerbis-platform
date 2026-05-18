// src/app/admin/layout.tsx
//
// Wraps the entire /admin/* route tree with the AdminAuthProvider and a
// route guard. The guard explicitly excludes /admin/login from the redirect
// rule to prevent infinite redirects on the login page itself.
'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  AdminAuthProvider,
  useAdminAuth,
} from '@/contexts/AdminAuthContext';

function AdminGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === '/admin/login';

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isLoginRoute) {
      router.replace('/admin/login');
    }
  }, [isAuthenticated, isLoading, isLoginRoute, router]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-slate-50"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        <span className="sr-only">Cargando…</span>
      </div>
    );
  }

  if (!isAuthenticated && !isLoginRoute) {
    return null;
  }

  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AdminAuthProvider>
  );
}
