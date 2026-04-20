// src/app/(platform)/admin/tenants/[id]/page.tsx
//
// Platform superadmin: tenant detail page.
//
// Shows an overview of the tenant (business info, subscription, modules,
// stats) and an embedded users table with search + filters + pagination.
// All data flows through `adminClient` via `admin-tenants.ts`.
'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Globe2,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Users as UsersIcon,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  adminGetTenant,
  adminListTenantUsers,
  adminUpdateTenant,
} from '@/lib/api/admin-tenants';
import type {
  AdminSubscriptionStatus,
  AdminTenantDetail,
  AdminTenantPlan,
  AdminTenantUser,
  AdminTenantUserRole,
  AdminUserFilters,
} from '@/types/admin';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const USERS_PAGE_SIZE = 20;

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

const ROLE_LABELS: Record<AdminTenantUserRole, string> = {
  admin: 'Admin',
  staff: 'Staff',
  customer: 'Cliente',
};

type RoleFilter = 'all' | AdminTenantUserRole;
type StatusFilter = 'all' | 'active' | 'inactive';
type PendingAction = 'activate' | 'deactivate' | null;

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

function roleBadgeClass(role: AdminTenantUserRole): string {
  switch (role) {
    case 'admin':
      return 'bg-teal-50 text-teal-700 ring-teal-200';
    case 'staff':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
    case 'customer':
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200';
  }
}

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

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── Subcomponents ────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon ? (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </dt>
        <dd
          className={`mt-0.5 text-sm text-slate-900 ${mono ? 'font-mono' : ''}`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

function FeatureFlag({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/40 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      {enabled ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Activo
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Inactivo
        </span>
      )}
    </div>
  );
}

function AdminTenantDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-48 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-4 h-4 w-32 rounded bg-slate-100" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="h-3 w-3/4 rounded bg-slate-100" />
              <div className="h-3 w-2/3 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function AdminTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { admin, logout } = useAdminAuth();

  // ── Tenant detail ───────────────────────────────────────────────────
  const [tenant, setTenant] = useState<AdminTenantDetail | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);

  useEffect(() => {
    document.title = tenant
      ? `${tenant.name} — NERBIS Admin`
      : 'Detalle del tenant — NERBIS Admin';
  }, [tenant]);

  // ── Action state ────────────────────────────────────────────────────
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Users embedded table ────────────────────────────────────────────
  const [users, setUsers] = useState<AdminTenantUser[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userDebouncedSearch, setUserDebouncedSearch] = useState('');
  const [userRole, setUserRole] = useState<RoleFilter>('all');
  const [userStatus, setUserStatus] = useState<StatusFilter>('all');
  const [usersPage, setUsersPage] = useState(1);

  useEffect(() => {
    const handle = window.setTimeout(
      () => setUserDebouncedSearch(userSearch),
      300,
    );
    return () => window.clearTimeout(handle);
  }, [userSearch]);

  useEffect(() => {
    setUsersPage(1);
  }, [userDebouncedSearch, userRole, userStatus]);

  const loadTenant = useCallback(async () => {
    setTenantLoading(true);
    setTenantError(null);
    try {
      const data = await adminGetTenant(id);
      setTenant(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el detalle del tenant.';
      setTenantError(message);
      setTenant(null);
    } finally {
      setTenantLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadTenant();
  }, [loadTenant]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const filters: AdminUserFilters = {
        page: usersPage,
        page_size: USERS_PAGE_SIZE,
        ordering: '-date_joined',
      };
      if (userDebouncedSearch.trim()) filters.search = userDebouncedSearch.trim();
      if (userRole !== 'all') filters.role = userRole;
      if (userStatus === 'active') filters.is_active = true;
      if (userStatus === 'inactive') filters.is_active = false;
      const data = await adminListTenantUsers(id, filters);
      setUsers(data.results);
      setUsersCount(data.count);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista de usuarios del tenant.';
      setUsersError(message);
      setUsers([]);
      setUsersCount(0);
    } finally {
      setUsersLoading(false);
    }
  }, [id, usersPage, userDebouncedSearch, userRole, userStatus]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const totalUserPages = useMemo(
    () => Math.max(1, Math.ceil(usersCount / USERS_PAGE_SIZE)),
    [usersCount],
  );

  const hasUserFilters = useMemo(
    () => userSearch !== '' || userRole !== 'all' || userStatus !== 'all',
    [userSearch, userRole, userStatus],
  );

  function clearUserFilters() {
    setUserSearch('');
    setUserRole('all');
    setUserStatus('all');
  }

  async function handleConfirmTenantAction() {
    if (!tenant || !pendingAction) return;
    setActionSubmitting(true);
    setActionError(null);
    try {
      const updated = await adminUpdateTenant(tenant.id, {
        is_active: pendingAction === 'activate',
      });
      const name = tenant.name;
      const action = pendingAction;
      setTenant(updated);
      setPendingAction(null);
      toast.success(
        action === 'activate'
          ? `${name} reactivado correctamente.`
          : `${name} suspendido correctamente.`,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : pendingAction === 'activate'
            ? 'No se pudo reactivar el tenant.'
            : 'No se pudo suspender el tenant.';
      setActionError(message);
    } finally {
      setActionSubmitting(false);
    }
  }

  const headerBadge = tenant ? (
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
  ) : null;

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
              href="/admin/tenants"
              aria-label="Volver a tenants"
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
                {tenant?.name ?? 'Tenant'}
              </h1>
              <p className="text-xs text-white/50">
                {tenant ? `/${tenant.slug}` : admin?.email ?? 'superadmin'}
              </p>
            </div>
            {headerBadge}
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

      <main className="fade-up-auth mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Ruta" className="mb-4">
          <ol className="flex items-center gap-1.5 text-xs text-slate-600">
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
            <li>
              <Link
                href="/admin/tenants"
                className="transition-colors hover:text-slate-700"
              >
                Tenants
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </li>
            <li className="truncate font-medium text-slate-700">
              {tenant?.name ?? id}
            </li>
          </ol>
        </nav>

        {/* Tenant error */}
        {tenantError && (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{tenantError}</span>
            <button
              type="button"
              onClick={() => void loadTenant()}
              className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Action bar */}
        {tenant && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {tenant.name}
                </p>
                <p className="text-xs text-slate-500">
                  {PLAN_LABELS[tenant.plan]} &middot; {tenant.user_count}{' '}
                  usuario{tenant.user_count === 1 ? '' : 's'}
                  {tenant.days_remaining !== null &&
                    ` · ${tenant.days_remaining} día${
                      tenant.days_remaining === 1 ? '' : 's'
                    } restantes`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tenant.is_active ? (
                <button
                  type="button"
                  onClick={() => setPendingAction('deactivate')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <ShieldOff className="h-4 w-4" aria-hidden="true" />
                  Suspender tenant
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingAction('activate')}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-400 hover:shadow-teal-400/30"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Reactivar tenant
                </button>
              )}
            </div>
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {actionError}
          </div>
        )}

        {/* Overview cards */}
        {tenantLoading ? (
          <AdminTenantDetailSkeleton />
        ) : tenant ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Business info */}
            <section
              aria-labelledby="tenant-info-heading"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-200"
            >
              <div className="mb-4 flex items-center gap-2">
                <Building2
                  className="h-4 w-4 text-teal-600"
                  aria-hidden="true"
                />
                <h3
                  id="tenant-info-heading"
                  className="text-sm font-semibold text-slate-900"
                >
                  Información del negocio
                </h3>
              </div>
              <dl className="space-y-4">
                <InfoRow label="Nombre" value={tenant.name} />
                <InfoRow label="Slug" value={tenant.slug} mono />
                <InfoRow
                  icon={<Mail className="h-4 w-4" aria-hidden="true" />}
                  label="Email"
                  value={tenant.email || '\u2014'}
                />
                <InfoRow
                  icon={<Phone className="h-4 w-4" aria-hidden="true" />}
                  label="Teléfono"
                  value={tenant.phone || '\u2014'}
                />
                <InfoRow
                  icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                  label="Ubicación"
                  value={
                    [tenant.city, tenant.state, tenant.country]
                      .filter(Boolean)
                      .join(', ') || '\u2014'
                  }
                />
                <InfoRow
                  icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
                  label="Industria"
                  value={tenant.industry_name ?? tenant.industry}
                />
                <InfoRow
                  icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                  label="Creado"
                  value={formatDate(tenant.created_at)}
                />
              </dl>
            </section>

            {/* Subscription */}
            <section
              aria-labelledby="tenant-subscription-heading"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-200"
            >
              <div className="mb-4 flex items-center gap-2">
                <Calendar
                  className="h-4 w-4 text-teal-600"
                  aria-hidden="true"
                />
                <h3
                  id="tenant-subscription-heading"
                  className="text-sm font-semibold text-slate-900"
                >
                  Suscripción
                </h3>
              </div>
              <dl className="space-y-4">
                <InfoRow
                  label="Plan"
                  value={
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${planBadgeClass(tenant.plan)}`}
                    >
                      {PLAN_LABELS[tenant.plan]}
                    </span>
                  }
                />
                <InfoRow
                  label="Estado"
                  value={
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
                  }
                />
                <InfoRow
                  label="Vence"
                  value={formatDate(tenant.subscription_ends_at)}
                />
                <InfoRow
                  label="Días restantes"
                  value={
                    tenant.days_remaining !== null
                      ? `${tenant.days_remaining} día${
                          tenant.days_remaining === 1 ? '' : 's'
                        }`
                      : 'Sin fecha de corte'
                  }
                />
                <InfoRow
                  icon={<Globe2 className="h-4 w-4" aria-hidden="true" />}
                  label="Zona horaria"
                  value={`${tenant.timezone} · ${tenant.currency} · ${tenant.language}`}
                />
              </dl>
            </section>

            {/* Stats + modules */}
            <section
              aria-labelledby="tenant-stats-heading"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-200"
            >
              <div className="mb-4 flex items-center gap-2">
                <UsersIcon
                  className="h-4 w-4 text-teal-600"
                  aria-hidden="true"
                />
                <h3
                  id="tenant-stats-heading"
                  className="text-sm font-semibold text-slate-900"
                >
                  Equipo y modulos
                </h3>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Usuarios
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                    {tenant.user_count}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Admins
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                    {tenant.admin_count}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <FeatureFlag enabled={tenant.has_website} label="Website" />
                <FeatureFlag enabled={tenant.has_shop} label="Ecommerce" />
                <FeatureFlag enabled={tenant.has_bookings} label="Reservas" />
                <FeatureFlag enabled={tenant.has_services} label="Servicios" />
                <FeatureFlag
                  enabled={tenant.has_marketing}
                  label="Marketing"
                />
              </div>
            </section>
          </div>
        ) : null}

        {/* Users table */}
        <section
          aria-labelledby="tenant-users-heading"
          className="mt-8"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3
                id="tenant-users-heading"
                className="text-lg font-semibold tracking-tight text-slate-900"
              >
                Usuarios del tenant
              </h3>
              <p className="text-sm text-slate-500">
                {usersCount === 0
                  ? 'Sin resultados para los filtros actuales.'
                  : `${usersCount} usuario${usersCount === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>

          {/* User toolbar */}
          <div className="mb-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar por email o nombre"
                aria-label="Buscar usuarios del tenant"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>
            <Select
              value={userRole}
              onValueChange={(value) => setUserRole(value as RoleFilter)}
            >
              <SelectTrigger
                aria-label="Filtrar por rol"
                className="h-10 w-full border-slate-200"
              >
                <SelectValue placeholder="Todos los roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={userStatus}
              onValueChange={(value) =>
                setUserStatus(value as StatusFilter)
              }
            >
              <SelectTrigger
                aria-label="Filtrar por estado"
                className="h-10 w-full border-slate-200"
              >
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={clearUserFilters}
              disabled={!hasUserFilters}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpiar
            </button>
          </div>

          {usersError && (
            <div
              role="alert"
              className="mb-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span>{usersError}</span>
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Reintentar
              </button>
            </div>
          )}

          {usersLoading ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-4"
                    aria-hidden="true"
                  >
                    <div className="h-4 w-56 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Cargando usuarios...
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <UsersIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900">
                {hasUserFilters
                  ? 'Ningún usuario coincide con los filtros'
                  : 'Este tenant aún no tiene usuarios'}
              </h4>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                {hasUserFilters
                  ? 'Ajusta la búsqueda o limpia los filtros para ver más resultados.'
                  : 'Cuando el negocio invite a su equipo, aparecerá aquí.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-[860px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Rol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Último acceso
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => {
                    const fullName =
                      [user.first_name, user.last_name]
                        .filter(Boolean)
                        .join(' ') || '\u2014';
                    return (
                      <tr
                        key={user.id}
                        className="cursor-pointer transition-colors hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="font-medium text-slate-900 hover:text-teal-700"
                          >
                            {user.email}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{fullName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${roleBadgeClass(user.role)}`}
                          >
                            {ROLE_LABELS[user.role]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.is_active ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDateTime(user.last_login)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalUserPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>
                Página {usersPage} de {totalUserPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={usersPage <= 1 || usersLoading}
                  onClick={() =>
                    setUsersPage((p) => Math.max(1, p - 1))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  disabled={
                    usersPage >= totalUserPages || usersLoading
                  }
                  onClick={() =>
                    setUsersPage((p) => Math.min(totalUserPages, p + 1))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Tenant action confirmation */}
      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === 'activate'
                ? 'Reactivar tenant'
                : 'Suspender tenant'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tenant
                ? pendingAction === 'activate'
                  ? `${tenant.name} recuperará acceso a la plataforma y sus usuarios podrán iniciar sesión de nuevo.`
                  : `${tenant.name} quedará suspendido. Sus usuarios no podrán iniciar sesión hasta que lo reactives.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmTenantAction();
              }}
              disabled={actionSubmitting}
              className={
                pendingAction === 'deactivate'
                  ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500'
                  : undefined
              }
            >
              {actionSubmitting
                ? 'Procesando...'
                : pendingAction === 'activate'
                  ? 'Reactivar'
                  : 'Suspender'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
