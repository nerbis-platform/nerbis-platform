// src/app/(platform)/admin/users/[id]/page.tsx
//
// Platform superadmin: user detail page.
//
// Shows the user profile (email, name, role, status, tenant link, dates)
// and three auth-method cards: social accounts, passkeys, and 2FA. Exposes
// destructive admin actions per the SDD contract:
//   - Activate / deactivate user (AlertDialog)
//   - Trigger password reset email (AlertDialog)
//   - Unlink a social account (AlertDialog, per provider)
//   - Delete a passkey (AlertDialog, per credential)
//   - Disable 2FA (AlertDialog)
//
// Every destructive action shows an extra "last auth method" warning when
// removing the target would leave the user with contraseña as their only
// remaining way back in.
//
// All data flows through `adminClient` via `admin-tenants.ts` — never the
// tenant-scoped client.
'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Apple,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Chrome,
  Facebook,
  Fingerprint,
  KeyRound,
  Link as LinkIcon,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Sparkles,
  Trash2,
  UserCircle2,
  Users as UsersIcon,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  adminDeleteUserPasskey,
  adminDisableUser2FA,
  adminGetUser,
  adminResetUserPassword,
  adminUnlinkUserSocial,
  adminUpdateUser,
} from '@/lib/api/admin-tenants';
import type {
  AdminPasskey,
  AdminSocialAccount,
  AdminSocialProvider,
  AdminTenantUserRole,
  AdminUserDetail,
} from '@/types/admin';
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

// ── Labels & styling helpers ─────────────────────────────────────────

const ROLE_LABELS: Record<AdminTenantUserRole, string> = {
  admin: 'Admin',
  staff: 'Staff',
  customer: 'Cliente',
};

const PROVIDER_LABELS: Record<AdminSocialProvider, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
};

const PROVIDER_ICONS: Record<AdminSocialProvider, LucideIcon> = {
  google: Chrome,
  apple: Apple,
  facebook: Facebook,
};

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

function statusBadgeClass(isActive: boolean): string {
  return isActive
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : 'bg-slate-100 text-slate-500 ring-slate-200';
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

function fullName(user: AdminUserDetail): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return name || '\u2014';
}

// ── Types for pending destructive actions ────────────────────────────

type PendingStatus = 'activate' | 'deactivate' | null;
type PendingUnlink = { social: AdminSocialAccount } | null;
type PendingPasskey = { passkey: AdminPasskey } | null;
type PendingReset = boolean;
type Pending2FA = boolean;

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

function AuthCardEmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 px-4 py-6 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
        {icon}
      </span>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="max-w-xs text-xs text-slate-500">{description}</p>
    </div>
  );
}

function AdminUserDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="h-40 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 h-4 w-40 rounded bg-slate-100" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-3/4 rounded bg-slate-100" />
          <div className="h-3 w-2/3 rounded bg-slate-100" />
        </div>
      </div>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const userId = Number.parseInt(id, 10);
  const { admin, logout } = useAdminAuth();

  // ── User detail state ───────────────────────────────────────────────
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = user
      ? `${user.email} — NERBIS Admin`
      : 'Detalle del usuario — NERBIS Admin';
  }, [user]);

  // ── Pending-action state (one per destructive surface) ──────────────
  const [pendingStatus, setPendingStatus] = useState<PendingStatus>(null);
  const [pendingReset, setPendingReset] = useState<PendingReset>(false);
  const [pendingUnlink, setPendingUnlink] = useState<PendingUnlink>(null);
  const [pendingPasskey, setPendingPasskey] = useState<PendingPasskey>(null);
  const [pending2FA, setPending2FA] = useState<Pending2FA>(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const loadUser = useCallback(async () => {
    if (!/^\d+$/.test(id) || !Number.isFinite(userId)) {
      setError('ID de usuario inválido.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetUser(userId);
      setUser(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el detalle del usuario.';
      setError(message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  // ── Derived values ──────────────────────────────────────────────────

  /**
   * Total "alternative" auth methods on this user. The backend does not
   * expose `has_password` explicitly, so we treat password as always
   * available (count = 1) and add social + passkeys on top. 2FA is NOT
   * a primary auth method — it is a second factor — so it never counts
   * toward this tally.
   */
  const authMethodCount = useMemo(() => {
    if (!user) return 0;
    return 1 + user.social_accounts.length + user.passkeys.length;
  }, [user]);

  /**
   * After removing `removed` social/passkey entries, how many alternative
   * auth paths does the user still have? Used to render the "last method"
   * warning inside destructive AlertDialogs.
   */
  function projectedAuthCountAfterRemoval(count: number): number {
    return Math.max(0, authMethodCount - count);
  }

  const isLastSocial = useMemo(() => {
    if (!user) return false;
    // Removing a social leaves: password(1) + remaining socials + passkeys
    // The warning triggers when the user ends up with ONLY the password.
    const remaining = user.social_accounts.length - 1 + user.passkeys.length;
    return remaining === 0;
  }, [user]);

  const isLastPasskey = useMemo(() => {
    if (!user) return false;
    const remaining = user.social_accounts.length + (user.passkeys.length - 1);
    return remaining === 0;
  }, [user]);

  // ── Handlers ────────────────────────────────────────────────────────

  async function handleStatusConfirm() {
    if (!user || !pendingStatus) return;
    setActionSubmitting(true);
    try {
      const updated = await adminUpdateUser(user.id, {
        is_active: pendingStatus === 'activate',
      });
      setUser(updated);
      toast.success(
        pendingStatus === 'activate'
          ? 'Usuario reactivado. Puede iniciar sesión de nuevo.'
          : 'Usuario desactivado. Sus sesiones activas fueron invalidadas.',
      );
      setPendingStatus(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : pendingStatus === 'activate'
            ? 'No se pudo reactivar el usuario.'
            : 'No se pudo desactivar el usuario.';
      toast.error(message);
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleResetConfirm() {
    if (!user) return;
    setActionSubmitting(true);
    try {
      const { message } = await adminResetUserPassword(user.id);
      toast.success(
        message || 'Enviamos al usuario un enlace para restablecer su contraseña.',
      );
      setPendingReset(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo disparar el restablecimiento de contraseña.';
      toast.error(message);
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleUnlinkConfirm() {
    if (!user || !pendingUnlink) return;
    setActionSubmitting(true);
    try {
      await adminUnlinkUserSocial(user.id, pendingUnlink.social.provider);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              social_accounts: prev.social_accounts.filter(
                (s) => s.id !== pendingUnlink.social.id,
              ),
            }
          : prev,
      );
      toast.success(
        `Cuenta de ${PROVIDER_LABELS[pendingUnlink.social.provider]} desvinculada.`,
      );
      setPendingUnlink(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo desvincular la cuenta social.';
      toast.error(message);
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handlePasskeyConfirm() {
    if (!user || !pendingPasskey) return;
    setActionSubmitting(true);
    try {
      await adminDeleteUserPasskey(user.id, pendingPasskey.passkey.id);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              passkeys: prev.passkeys.filter(
                (p) => p.id !== pendingPasskey.passkey.id,
              ),
            }
          : prev,
      );
      toast.success(
        `Passkey "${pendingPasskey.passkey.name}" eliminada correctamente.`,
      );
      setPendingPasskey(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar la passkey.';
      toast.error(message);
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handle2FAConfirm() {
    if (!user) return;
    setActionSubmitting(true);
    try {
      await adminDisableUser2FA(user.id);
      setUser((prev) =>
        prev
          ? { ...prev, totp_enabled: false, totp_confirmed_at: null }
          : prev,
      );
      toast.success('Autenticación en dos pasos desactivada. El usuario deberá activarla de nuevo.');
      setPending2FA(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo desactivar la 2FA.';
      toast.error(message);
    } finally {
      setActionSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────

  const backHref = user?.tenant_id
    ? `/admin/tenants/${user.tenant_id}`
    : '/admin/tenants';

  const headerSubtitle = user
    ? fullName(user) === '\u2014'
      ? user.email
      : `${fullName(user)} · ${user.email}`
    : admin?.email ?? 'superadmin';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href={backHref}
              aria-label="Volver"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 transition-colors hover:bg-white/15"
            >
              <ArrowLeft
                className="h-5 w-5 text-white/80"
                aria-hidden="true"
              />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-white">
                {user?.email ?? 'Usuario'}
              </h1>
              <p className="truncate text-xs text-white/50">
                {headerSubtitle}
              </p>
            </div>
            {user ? (
              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${roleBadgeClass(user.role)}`}
                >
                  {ROLE_LABELS[user.role]}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(user.is_active)}`}
                >
                  {user.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3 text-white/70">
            <span className="hidden text-xs md:inline">
              {admin?.email ?? ''}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3.5 py-2 text-sm transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="fade-up-auth mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
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
            <li>
              <Link
                href="/admin/tenants"
                className="transition-colors hover:text-slate-700"
              >
                Tenants
              </Link>
            </li>
            {user?.tenant_id && user.tenant_name ? (
              <>
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </li>
                <li>
                  <Link
                    href={`/admin/tenants/${user.tenant_id}`}
                    className="truncate transition-colors hover:text-slate-700"
                  >
                    {user.tenant_name}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </li>
            <li className="truncate font-medium text-slate-700">
              {user?.email ?? id}
            </li>
          </ol>
        </nav>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadUser()}
              className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Reintentar
            </button>
          </div>
        )}

        {loading ? (
          <AdminUserDetailSkeleton />
        ) : user ? (
          <>
            {/* Profile card */}
            <section
              aria-labelledby="user-profile-heading"
              className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-200"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <UserCircle2
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h2
                      id="user-profile-heading"
                      className="text-sm font-semibold text-slate-900"
                    >
                      Perfil del usuario
                    </h2>
                    <p className="text-xs text-slate-500">
                      Información básica y estado de la cuenta.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {user.is_active ? (
                    <button
                      type="button"
                      onClick={() => setPendingStatus('deactivate')}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      <ShieldOff className="h-4 w-4" aria-hidden="true" />
                      Desactivar usuario
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPendingStatus('activate')}
                      className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-400 hover:shadow-teal-400/30"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Reactivar usuario
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingReset(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Restablecer contraseña
                  </button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <dl className="space-y-4">
                  <InfoRow
                    icon={<Mail className="h-4 w-4" aria-hidden="true" />}
                    label="Email"
                    value={user.email}
                  />
                  <InfoRow
                    icon={
                      <UserCircle2 className="h-4 w-4" aria-hidden="true" />
                    }
                    label="Nombre"
                    value={fullName(user)}
                  />
                  <InfoRow
                    icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
                    label="Rol"
                    value={
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${roleBadgeClass(user.role)}`}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    }
                  />
                  <InfoRow
                    icon={<UsersIcon className="h-4 w-4" aria-hidden="true" />}
                    label="Tenant"
                    value={
                      user.tenant_id && user.tenant_name ? (
                        <Link
                          href={`/admin/tenants/${user.tenant_id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 transition-colors hover:text-teal-800 hover:underline"
                        >
                          {user.tenant_name}
                          {user.tenant_slug ? (
                            <span className="font-mono text-xs text-slate-400">
                              /{user.tenant_slug}
                            </span>
                          ) : null}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-500">
                          Sin tenant asignado
                        </span>
                      )
                    }
                  />
                </dl>
                <dl className="space-y-4">
                  <InfoRow
                    icon={
                      user.is_active ? (
                        <CheckCircle2
                          className="h-4 w-4 text-emerald-500"
                          aria-hidden="true"
                        />
                      ) : (
                        <XCircle
                          className="h-4 w-4 text-slate-400"
                          aria-hidden="true"
                        />
                      )
                    }
                    label="Estado"
                    value={
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(user.is_active)}`}
                      >
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    }
                  />
                  <InfoRow
                    icon={
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    }
                    label="Último acceso"
                    value={formatDateTime(user.last_login)}
                  />
                  <InfoRow
                    icon={
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    }
                    label="Se unió"
                    value={formatDate(user.date_joined)}
                  />
                  <InfoRow
                    label="Métodos de acceso"
                    value={
                      <span className="text-sm text-slate-700">
                        {authMethodCount} activo
                        {authMethodCount === 1 ? '' : 's'}{' '}
                        <span className="text-slate-400">
                          (contraseña + {user.social_accounts.length} social
                          {user.social_accounts.length === 1 ? '' : 'es'} +{' '}
                          {user.passkeys.length} passkey
                          {user.passkeys.length === 1 ? '' : 's'})
                        </span>
                      </span>
                    }
                  />
                </dl>
              </div>
            </section>

            {/* Auth methods — grid of 3 cards */}
            <section aria-labelledby="user-auth-heading" className="mb-4">
              <div className="mb-3">
                <h3
                  id="user-auth-heading"
                  className="text-lg font-semibold tracking-tight text-slate-900"
                >
                  Métodos de autenticación
                </h3>
                <p className="text-sm text-slate-500">
                  Revisa y administra las formas en que este usuario inicia
                  sesion. Las acciones destructivas quedan registradas en la
                  bitacora de auditoria.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {/* Social accounts card */}
                <article
                  aria-labelledby="social-heading"
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-200"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                      <LinkIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h4
                        id="social-heading"
                        className="text-sm font-semibold text-slate-900"
                      >
                        Inicios de sesion sociales
                      </h4>
                      <p className="text-xs text-slate-500">
                        Cuentas OAuth vinculadas.
                      </p>
                    </div>
                  </div>

                  {user.social_accounts.length === 0 ? (
                    <AuthCardEmptyState
                      icon={<LinkIcon className="h-4 w-4" aria-hidden="true" />}
                      title="Sin cuentas sociales vinculadas"
                      description="Este usuario todavía no conectó ninguna cuenta de Google, Apple o Facebook."
                    />
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {user.social_accounts.map((social) => {
                        const Icon = PROVIDER_ICONS[social.provider];
                        return (
                          <li
                            key={social.id}
                            className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                                <Icon
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {PROVIDER_LABELS[social.provider]}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {social.email || 'Sin correo registrado'}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  Conectada el{' '}
                                  {formatDate(social.connected_at)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPendingUnlink({ social })}
                              aria-label={`Desvincular cuenta de ${PROVIDER_LABELS[social.provider]}`}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              Desvincular
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </article>

                {/* Passkeys card */}
                <article
                  aria-labelledby="passkeys-heading"
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-200"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                      <KeyRound className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h4
                        id="passkeys-heading"
                        className="text-sm font-semibold text-slate-900"
                      >
                        Passkeys (WebAuthn)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Credenciales biométricas y hardware.
                      </p>
                    </div>
                  </div>

                  {user.passkeys.length === 0 ? (
                    <AuthCardEmptyState
                      icon={<Fingerprint className="h-4 w-4" aria-hidden="true" />}
                      title="Sin passkeys registradas"
                      description="Cuando el usuario registre una passkey desde su dispositivo, aparecerá aquí."
                    />
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {user.passkeys.map((passkey) => (
                        <li
                          key={passkey.id}
                          className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                              <Fingerprint
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {passkey.name || 'Passkey sin nombre'}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                Usada por ultima vez:{' '}
                                {formatDateTime(passkey.last_used)}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                Creada el {formatDate(passkey.created_at)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPendingPasskey({ passkey })}
                            aria-label={`Eliminar passkey ${passkey.name || passkey.id}`}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Eliminar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>

                {/* 2FA card */}
                <article
                  aria-labelledby="twofa-heading"
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-200"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                      <Shield className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h4
                        id="twofa-heading"
                        className="text-sm font-semibold text-slate-900"
                      >
                        Autenticación en dos pasos
                      </h4>
                      <p className="text-xs text-slate-500">
                        TOTP mediante app (Google Authenticator, Authy).
                      </p>
                    </div>
                  </div>

                  {user.totp_enabled ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <CheckCircle2
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Activo
                        </span>
                        <span className="text-xs text-slate-500">
                          {user.totp_confirmed_at
                            ? `Desde ${formatDate(user.totp_confirmed_at)}`
                            : 'Sin fecha registrada'}
                        </span>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/40 px-3 py-2">
                        <Smartphone
                          className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                          aria-hidden="true"
                        />
                        <p className="text-xs text-slate-600">
                          Al desactivar, se elimina el dispositivo TOTP y
                          todos los códigos de respaldo asociados. El usuario
                          solo podrá recuperarlo inscribiéndose de nuevo.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPending2FA(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        <ShieldOff className="h-4 w-4" aria-hidden="true" />
                        Desactivar 2FA
                      </button>
                    </div>
                  ) : (
                    <AuthCardEmptyState
                      icon={<Shield className="h-4 w-4" aria-hidden="true" />}
                      title="2FA no activada"
                      description="El usuario puede activar 2FA desde su panel de seguridad para proteger su cuenta."
                    />
                  )}
                </article>
              </div>
            </section>
          </>
        ) : !error ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <UserCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">
              Usuario no encontrado
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Es posible que haya sido eliminado o que no tengas permisos para
              verlo.
            </p>
          </div>
        ) : null}
      </main>

      {/* ── Status toggle dialog ───────────────────────────────────── */}
      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatus === 'activate'
                ? 'Reactivar usuario'
                : 'Desactivar usuario'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user
                ? pendingStatus === 'activate'
                  ? `${user.email} recuperará acceso inmediatamente y podrá iniciar sesión como siempre.`
                  : `${user.email} perderá acceso a la plataforma hasta que lo reactives. Las sesiones activas serán invalidadas.`
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
                void handleStatusConfirm();
              }}
              disabled={actionSubmitting}
              className={
                pendingStatus === 'deactivate'
                  ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500'
                  : undefined
              }
            >
              {actionSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Procesando...
                </span>
              ) : pendingStatus === 'activate' ? (
                'Reactivar'
              ) : (
                'Desactivar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Password reset dialog ──────────────────────────────────── */}
      <AlertDialog
        open={pendingReset}
        onOpenChange={(open) => {
          if (!open) setPendingReset(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar restablecimiento de contraseña</AlertDialogTitle>
            <AlertDialogDescription>
              {user
                ? `Se enviará un correo a ${user.email} con un enlace válido por 24 horas para que defina una nueva contraseña. Los tokens anteriores quedarán invalidados.`
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
                void handleResetConfirm();
              }}
              disabled={actionSubmitting}
            >
              {actionSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Enviando...
                </span>
              ) : (
                'Enviar correo'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Unlink social dialog ───────────────────────────────────── */}
      <AlertDialog
        open={pendingUnlink !== null}
        onOpenChange={(open) => {
          if (!open) setPendingUnlink(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingUnlink
                ? `Desvincular cuenta de ${PROVIDER_LABELS[pendingUnlink.social.provider]}`
                : 'Desvincular cuenta social'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingUnlink
                ? `El usuario ya no podrá iniciar sesión usando ${PROVIDER_LABELS[pendingUnlink.social.provider]} (${pendingUnlink.social.email || 'sin correo'}). Podrá volver a vincularla cuando quiera desde su panel.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingUnlink && isLastSocial && user?.passkeys.length === 0 ? (
            <div
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
            >
              <strong className="block font-semibold">
                Este es el último método alternativo.
              </strong>
              Después de desvincular solo podrá acceder con contraseña
              ({Math.max(0, projectedAuthCountAfterRemoval(1) - 1)} método restante además de
              la contraseña).
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleUnlinkConfirm();
              }}
              disabled={actionSubmitting}
              className="bg-red-600 hover:bg-red-500 focus:ring-red-500"
            >
              {actionSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Desvinculando...
                </span>
              ) : (
                'Desvincular'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete passkey dialog ──────────────────────────────────── */}
      <AlertDialog
        open={pendingPasskey !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPasskey(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingPasskey
                ? `Eliminar passkey "${pendingPasskey.passkey.name || 'sin nombre'}"`
                : 'Eliminar passkey'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPasskey
                ? 'Esta credencial dejará de funcionar de inmediato. El usuario podrá registrar una nueva desde su dispositivo cuando lo necesite.'
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingPasskey && isLastPasskey && user?.social_accounts.length === 0 ? (
            <div
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
            >
              <strong className="block font-semibold">
                Este es el último método alternativo.
              </strong>
              Después de eliminar solo podrá acceder con contraseña.
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handlePasskeyConfirm();
              }}
              disabled={actionSubmitting}
              className="bg-red-600 hover:bg-red-500 focus:ring-red-500"
            >
              {actionSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Eliminando...
                </span>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Disable 2FA dialog ─────────────────────────────────────── */}
      <AlertDialog
        open={pending2FA}
        onOpenChange={(open) => {
          if (!open) setPending2FA(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar autenticacion en dos pasos</AlertDialogTitle>
            <AlertDialogDescription>
              {user
                ? `Se eliminará el dispositivo TOTP de ${user.email} y todos sus códigos de respaldo. El usuario tendrá que inscribirse de nuevo para volver a activarla.`
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
                void handle2FAConfirm();
              }}
              disabled={actionSubmitting}
              className="bg-red-600 hover:bg-red-500 focus:ring-red-500"
            >
              {actionSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Desactivando...
                </span>
              ) : (
                'Desactivar 2FA'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
