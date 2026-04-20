// src/app/(platform)/admin/page.tsx
//
// Superadmin dashboard. Dark teal header with light content area.
// Shows quick metrics and navigation cards.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Building2, LogOut, ShieldCheck, Users } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminListTenants } from '@/lib/api/admin-tenants';
import { adminListSuperadmins } from '@/lib/api/admin-auth';

export default function AdminDashboardPage() {
  const { admin, logout } = useAdminAuth();
  const [tenantCount, setTenantCount] = useState<number | null>(null);
  const [activeTenants, setActiveTenants] = useState<number | null>(null);
  const [superadminCount, setSuperadminCount] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Panel — NERBIS Admin';
  }, []);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [allTenants, activeOnly, admins] = await Promise.all([
          adminListTenants({ page: 1, page_size: 1 }),
          adminListTenants({ page: 1, page_size: 1, is_active: true }),
          adminListSuperadmins(1),
        ]);
        setTenantCount(allTenants.count);
        setActiveTenants(activeOnly.count);
        setSuperadminCount(admins.count);
      } catch {
        // Metrics are non-critical — fail silently
      }
    }
    void loadMetrics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <header
        className="relative overflow-hidden border-b border-white/10"
        style={{
          background:
            'linear-gradient(135deg, #0f2233 0%, #1C3B57 50%, #1a4a5e 100%)',
        }}
      >
        {/* Subtle glow */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #0D9488, transparent 70%)' }}
        />

        <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <Image
                src="/Isotipo_color_NERBIS.png"
                alt=""
                width={24}
                height={24}
                className="brightness-0 invert"
                aria-hidden="true"
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-[0.12em] text-white">
                NERBIS
              </h1>
              <p className="text-xs text-white/50">
                {admin?.email ?? 'superadmin'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3.5 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Salir
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="fade-up-auth mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
            Panel de plataforma
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona la configuración global de NERBIS.
          </p>
        </div>

        {/* Quick metrics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Tenants totales
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {tenantCount !== null ? tenantCount : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Tenants activos
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">
              {activeTenants !== null ? activeTenants : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Superadministradores
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {superadminCount !== null ? superadminCount : '—'}
            </p>
          </div>
        </div>

        {/* Navigation cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Superadmins card */}
          <Link
            href="/admin/superadmins"
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Superadministradores
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Gestiona quién tiene acceso al panel de plataforma.
            </p>
          </Link>

          {/* Tenants card */}
          <Link
            href="/admin/tenants"
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Tenants
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Negocios registrados, planes, usuarios y métodos de autenticación.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
