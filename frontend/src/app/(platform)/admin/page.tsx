// src/app/(platform)/admin/page.tsx
//
// Superadmin dashboard. Dark teal header with light content area.
// Shows quick metrics and navigation cards.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Building2, LogOut, ShieldCheck, Users } from 'lucide-react';
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
              <p className="text-xs text-white/60">
                {admin?.email ?? 'superadmin'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3.5 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-400/50"
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
            Bienvenido de nuevo
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Vista general del ecosistema NERBIS.
          </p>
        </div>

        {/* Resumen */}
        <section className="mb-10">
          <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Resumen
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">Negocios</p>
                <Building2 className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
                {tenantCount !== null ? tenantCount : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">registrados en total</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">Activos</p>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-emerald-700">
                {activeTenants !== null ? activeTenants : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">negocios operando</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">Administradores</p>
                <ShieldCheck className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
                {superadminCount !== null ? superadminCount : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">con acceso a este panel</p>
            </div>
          </div>
        </section>

        {/* Separador */}
        <div className="mb-10 border-t border-slate-200" />

        {/* Accesos */}
        <section>
          <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Gestión
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Superadmins card */}
            <Link
              href="/admin/superadmins"
              className="group flex items-center gap-5 rounded-lg border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-teal-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:ring-offset-2"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900">
                  Superadministradores
                </h4>
                <p className="mt-0.5 text-xs text-slate-500">
                  Controla quién accede a este panel.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-500" />
            </Link>

            {/* Tenants card */}
            <Link
              href="/admin/tenants"
              className="group flex items-center gap-5 rounded-lg border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-teal-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:ring-offset-2"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900">
                  Negocios
                </h4>
                <p className="mt-0.5 text-xs text-slate-500">
                  Planes, usuarios y estado de cada cuenta.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-500" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
