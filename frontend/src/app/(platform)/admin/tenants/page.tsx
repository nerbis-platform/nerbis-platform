// src/app/(platform)/admin/tenants/page.tsx
//
// Platform superadmin: tenant list page.
//
// Lists every tenant in the platform with search + filters + pagination
// and exposes quick activate/suspend actions guarded by AlertDialog
// confirmations. Data flows through `adminClient` via `admin-tenants.ts` —
// NEVER the tenant-scoped apiClient.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Filter,
  Loader2,
  LogOut,
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShieldOff,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  adminListTenants,
  adminUpdateTenant,
} from '@/lib/api/admin-tenants';
import type {
  AdminTenant,
  AdminTenantFilters,
  AdminTenantPhase,
  AdminTenantPlan,
  AdminSubscriptionStatus,
} from '@/types/admin';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PAGE_SIZE = 20;

type PlanFilter = 'all' | AdminTenantPlan;
type StatusFilter = 'all' | 'active' | 'inactive';

const PLAN_LABELS: Record<AdminTenantPlan, string> = {
  trial: 'Trial',
  basic: 'Básico',
  professional: 'Profesional',
  enterprise: 'Enterprise',
};

const SUBSCRIPTION_LABELS: Record<AdminSubscriptionStatus, string> = {
  active: 'Activa',
  trial: 'Trial',
  expired: 'Vencida',
  inactive: 'Inactiva',
};

function planBadgeClass(plan: AdminTenantPlan): string {
  switch (plan) {
    case 'enterprise':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
    case 'professional':
      return 'bg-teal-50 text-teal-700 ring-teal-200';
    case 'basic':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    case 'trial':
    default:
      return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
}

function subscriptionBadgeClass(
  status: AdminSubscriptionStatus,
  isActive: boolean,
): string {
  if (!isActive) return 'bg-red-50 text-red-700 ring-red-200';
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'trial':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'expired':
      return 'bg-red-50 text-red-700 ring-red-200';
    case 'inactive':
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200';
  }
}

const PHASE_BADGE_META: Record<AdminTenantPhase, { label: string; cls: string }> = {
  onboarding: { label: 'Onboarding', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  modules_configured: { label: 'Modulos OK', cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
  website_building: { label: 'Construyendo', cls: 'bg-violet-50 text-violet-700 ring-violet-200' },
  website_generated: { label: 'Generado', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  operational: { label: 'Operativo', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  suspended: { label: 'Suspendido', cls: 'bg-red-50 text-red-700 ring-red-200' },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

type PendingAction = {
  tenant: AdminTenant;
  target: 'activate' | 'deactivate';
};

// ── Filter chip labels ─────────────────────────────────────────────
const PLAN_CHIP_LABELS: Record<AdminTenantPlan, string> = {
  trial: 'Plan: Trial',
  basic: 'Plan: Básico',
  professional: 'Plan: Profesional',
  enterprise: 'Plan: Enterprise',
};

const STATUS_CHIP_LABELS: Record<Exclude<StatusFilter, 'all'>, string> = {
  active: 'Estado: Activos',
  inactive: 'Estado: Suspendidos',
};

// ── Shared filter selects (used in desktop inline + mobile popover) ──
function TenantFilterSelects({
  plan,
  status,
  onPlanChange,
  onStatusChange,
  size = 'default',
}: {
  plan: PlanFilter;
  status: StatusFilter;
  onPlanChange: (v: PlanFilter) => void;
  onStatusChange: (v: StatusFilter) => void;
  size?: 'default' | 'compact';
}) {
  const h = size === 'compact' ? 'h-9' : 'h-10';
  return (
    <>
      <Select value={plan} onValueChange={(v) => onPlanChange(v as PlanFilter)}>
        <SelectTrigger aria-label="Filtrar por plan" className={`${h} w-full border-slate-200 text-sm`}>
          <SelectValue placeholder="Todos los planes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los planes</SelectItem>
          <SelectItem value="trial">Trial</SelectItem>
          <SelectItem value="basic">Básico</SelectItem>
          <SelectItem value="professional">Profesional</SelectItem>
          <SelectItem value="enterprise">Enterprise</SelectItem>
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
        <SelectTrigger aria-label="Filtrar por estado" className={`${h} w-full border-slate-200 text-sm`}>
          <SelectValue placeholder="Todos los estados" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="active">Activos</SelectItem>
          <SelectItem value="inactive">Suspendidos</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}

export default function AdminTenantsPage() {
  const { admin, logout } = useAdminAuth();

  useEffect(() => {
    document.title = 'Tenants — NERBIS Admin';
  }, []);

  // ── Filters + pagination state ──────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [plan, setPlan] = useState<PlanFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Data state ──────────────────────────────────────────────────────
  const [items, setItems] = useState<AdminTenant[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  // ── Action state ────────────────────────────────────────────────────
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Debounce search (300ms) — ensures we don't hammer the API on every keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  // Reset to page 1 whenever filter inputs change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, plan, status]);

  const loadPage = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const filters: AdminTenantFilters = {
        page,
        page_size: PAGE_SIZE,
        ordering: '-created_at',
      };
      if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
      if (plan !== 'all') filters.plan = plan;
      if (status === 'active') filters.is_active = true;
      if (status === 'inactive') filters.is_active = false;
      const data = await adminListTenants(filters);
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista de tenants.';
      setListError(message);
      setItems([]);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, plan, status]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count],
  );

  const totalActiveFilters = useMemo(
    () =>
      (search !== '' ? 1 : 0) +
      (plan !== 'all' ? 1 : 0) +
      (status !== 'all' ? 1 : 0),
    [search, plan, status],
  );
  const hasActiveFilters = totalActiveFilters > 0;
  const popoverFilterCount = totalActiveFilters - (search !== '' ? 1 : 0);

  function clearFilters() {
    setSearch('');
    setPlan('all');
    setStatus('all');
  }

  async function handleConfirmAction() {
    if (!pending) return;
    setSubmitting(true);
    setRowError(null);
    try {
      const updated = await adminUpdateTenant(pending.tenant.id, {
        is_active: pending.target === 'activate',
      });
      setItems((prev) =>
        prev.map((row) =>
          row.id === updated.id
            ? { ...row, is_active: updated.is_active, subscription_status: updated.subscription_status }
            : row,
        ),
      );
      const name = pending.tenant.name;
      const action = pending.target;
      setPending(null);
      toast.success(
        action === 'activate'
          ? `${name} reactivado correctamente.`
          : `${name} suspendido correctamente.`,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : pending.target === 'activate'
            ? 'No se pudo activar el tenant.'
            : 'No se pudo suspender el tenant.';
      setRowError(message);
    } finally {
      setSubmitting(false);
    }
  }

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
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-15 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #0D9488, transparent 70%)',
          }}
        />
        <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              aria-label="Volver al panel"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 transition-colors hover:bg-white/15"
            >
              <Image
                src="/Isotipo_color_NERBIS.png"
                alt=""
                width={24}
                height={24}
                className="brightness-0 invert"
                aria-hidden="true"
              />
            </Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">
                Tenants
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
      <main className="fade-up-auth mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb + back link */}
        <nav aria-label="Ruta" className="mb-4">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            <li>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 transition-colors hover:text-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Panel
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </li>
            <li className="font-medium text-slate-700">Tenants</li>
          </ol>
        </nav>

        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
              Gestión de tenants
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {count === 0
                ? 'Sin tenants que coincidan con los filtros actuales.'
                : `${count} tenant${count === 1 ? '' : 's'} en total.`}
            </p>
          </div>
        </div>

        {/* ── Search + Filters toolbar ──────────────────────────────── */}
        <div className="mb-3 space-y-3">
          {/* Row 1: Search bar + filter toggle (mobile) / filter selects (desktop) */}
          <div className="flex items-center gap-2">
            {/* Search — always prominent */}
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, slug o email..."
                aria-label="Buscar tenants"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Desktop: inline filter selects */}
            <div className="hidden items-center gap-2 md:flex [&>*]:w-44">
              <TenantFilterSelects
                plan={plan}
                status={status}
                onPlanChange={setPlan}
                onStatusChange={setStatus}
              />
            </div>

            {/* Mobile: filter popover */}
            <div className="md:hidden">
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Abrir filtros"
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                  >
                    <Filter className="h-4 w-4" aria-hidden="true" />
                    {popoverFilterCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-semibold text-white">
                        {popoverFilterCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-64 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">
                      Filtros
                    </span>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          clearFilters();
                          setFiltersOpen(false);
                        }}
                        className="text-xs text-teal-600 transition-colors hover:text-teal-700"
                      >
                        Limpiar todo
                      </button>
                    )}
                  </div>
                  <div className="mt-3 space-y-3">
                    <TenantFilterSelects
                      plan={plan}
                      status={status}
                      onPlanChange={setPlan}
                      onStatusChange={setStatus}
                      size="compact"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Row 2: Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Filtros activos:</span>

              {search !== '' && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label={`Quitar búsqueda "${search}"`}
                  className="group inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="max-w-[120px] truncate">
                    Búsqueda: &ldquo;{search}&rdquo;
                  </span>
                  <X className="h-3 w-3 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" aria-hidden="true" />
                </button>
              )}

              {plan !== 'all' && (
                <button
                  type="button"
                  onClick={() => setPlan('all')}
                  aria-label={`Quitar ${PLAN_CHIP_LABELS[plan]}`}
                  className="group inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  {PLAN_CHIP_LABELS[plan]}
                  <X className="h-3 w-3 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" aria-hidden="true" />
                </button>
              )}

              {status !== 'all' && (
                <button
                  type="button"
                  onClick={() => setStatus('all')}
                  aria-label={`Quitar ${STATUS_CHIP_LABELS[status]}`}
                  className="group inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  {STATUS_CHIP_LABELS[status]}
                  <X className="h-3 w-3 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" aria-hidden="true" />
                </button>
              )}

              {/* Clear all — desktop only, shown when 2+ filters active */}
              {totalActiveFilters > 1 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="hidden text-xs text-teal-600 transition-colors hover:text-teal-700 md:inline"
                >
                  Limpiar todo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Errors */}
        {listError && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{listError}</span>
            <button
              type="button"
              onClick={() => void loadPage()}
              className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Reintentar
            </button>
          </div>
        )}
        {rowError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {rowError}
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Skeleton rows */}
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-4"
                  aria-hidden="true"
                >
                  <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Cargando tenants...
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {hasActiveFilters
                ? 'Ningún tenant coincide con los filtros'
                : 'Aún no hay tenants registrados'}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {hasActiveFilters
                ? 'Prueba ajustar la búsqueda o limpiar los filtros para ver más resultados.'
                : 'Cuando se registre un negocio, aparecerá aquí para que puedas gestionarlo.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[920px] w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Fase
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Usuarios
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Vence
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="group transition-colors hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="group/link block"
                      >
                        <span className="block font-medium text-slate-900 transition-colors group-hover/link:text-teal-700">
                          {tenant.name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {tenant.slug}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${planBadgeClass(tenant.plan)}`}
                      >
                        {PLAN_LABELS[tenant.plan]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${subscriptionBadgeClass(
                          tenant.subscription_status,
                          tenant.is_active,
                        )}`}
                      >
                        {tenant.is_active
                          ? SUBSCRIPTION_LABELS[tenant.subscription_status]
                          : 'Suspendido'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const pm = PHASE_BADGE_META[tenant.onboarding_phase] ?? PHASE_BADGE_META.onboarding;
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${pm.cls}`}>
                            <span className={`h-1.5 w-1.5 rounded-full bg-current ${tenant.onboarding_phase !== 'suspended' && tenant.onboarding_phase !== 'operational' ? 'animate-pulse' : ''}`} />
                            {pm.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-700">
                      {tenant.user_count}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(tenant.subscription_ends_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Acciones para ${tenant.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                        >
                          <MoreHorizontal
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/tenants/${tenant.id}`}>
                              Ver detalle
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {tenant.is_active ? (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setPending({
                                  tenant,
                                  target: 'deactivate',
                                });
                              }}
                              className="text-red-600 focus:text-red-700"
                            >
                              <ShieldOff
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              Suspender
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setPending({
                                  tenant,
                                  target: 'activate',
                                });
                              }}
                              className="text-teal-700 focus:text-teal-800"
                            >
                              <ShieldCheck
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              Reactivar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Activate / Suspend confirmation */}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.target === 'activate'
                ? 'Reactivar tenant'
                : 'Suspender tenant'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? pending.target === 'activate'
                  ? `${pending.tenant.name} recuperará acceso a la plataforma y sus usuarios podrán iniciar sesión de nuevo.`
                  : `${pending.tenant.name} quedará suspendido: sus usuarios no podrán iniciar sesión. Puedes reactivar el tenant más tarde.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmAction();
              }}
              disabled={submitting}
              className={
                pending?.target === 'deactivate'
                  ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500'
                  : undefined
              }
            >
              {submitting
                ? 'Procesando...'
                : pending?.target === 'activate'
                  ? 'Sí, reactivar'
                  : 'Sí, suspender'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
