// src/app/(platform)/admin/page.tsx
//
// Superadmin dashboard. Quick metrics overview.
'use client';

import { useEffect, useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { adminListTenants } from '@/lib/api/admin-tenants';
import { adminListSuperadmins } from '@/lib/api/admin-auth';

export default function AdminDashboardPage() {
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
        // Metrics are non-critical
      }
    }
    void loadMetrics();
  }, []);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Vista general del ecosistema NERBIS.
        </p>
      </div>

      {/* Metrics */}
      <section>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Resumen
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Negocios</p>
              <Building2 className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
              {tenantCount !== null ? tenantCount : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">registrados en total</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Activos</p>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-emerald-700">
              {activeTenants !== null ? activeTenants : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">negocios operando</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
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
    </>
  );
}
