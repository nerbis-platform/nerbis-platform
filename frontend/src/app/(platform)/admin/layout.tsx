// src/app/(platform)/admin/layout.tsx
//
// Admin layout with persistent sidebar navigation.
// Wraps all /admin/* routes with auth guard + sidebar.
'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Settings,
  Users,
} from 'lucide-react';
import { PipeAdmin } from '@/components/pipe-avatar';
import {
  AdminAuthProvider,
  useAdminAuth,
} from '@/contexts/AdminAuthContext';
import { Toaster } from '@/components/ui/sonner';

// ── Sidebar nav items ──
const NAV_MAIN = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/superadmins', label: 'Superadmins', icon: Users },
  { href: '/admin/tenants', label: 'Negocios', icon: Building2 },
];

const NAV_CONFIG = [
  { href: '/admin/settings/modules', label: 'Modulos', icon: Package },
  { href: '/admin/settings/onboarding', label: 'Onboarding', icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname.startsWith(href);
}

// ── Sidebar ──
function AdminSidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <PipeAdmin size={32} />
        <div>
          <span className="text-sm font-bold tracking-[-0.02em] text-slate-900">
            NERBIS{' '}
            <span className="text-xs font-medium text-teal-600">Admin</span>
          </span>
          <p className="text-[0.65rem] text-slate-400 truncate max-w-[140px]">
            {admin?.email ?? 'superadmin'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_MAIN.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[0.82rem] font-medium transition-colors ${
                active
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`h-4 w-4 ${active ? 'text-teal-600' : 'text-slate-400'}`} />
              {item.label}
            </Link>
          );
        })}

        {/* Config section */}
        <div className="pt-4 pb-1">
          <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400">
            Configuracion
          </p>
        </div>
        {NAV_CONFIG.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[0.82rem] font-medium transition-colors ${
                active
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`h-4 w-4 ${active ? 'text-teal-600' : 'text-slate-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-100 px-3 py-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[0.82rem] font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Salir
        </button>
      </div>
    </aside>
  );
}

// ── Auth guard ──
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
        <span className="sr-only">Cargando...</span>
      </div>
    );
  }

  if (!isAuthenticated && !isLoginRoute) {
    return null;
  }

  // Login page — no sidebar
  if (isLoginRoute) {
    return <>{children}</>;
  }

  // All other admin pages — sidebar + content
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="pl-60">
        <div className="mx-auto max-w-5xl px-6 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminGuard>{children}</AdminGuard>
      <Toaster position="top-right" />
    </AdminAuthProvider>
  );
}
