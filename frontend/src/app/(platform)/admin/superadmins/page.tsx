// src/app/(platform)/admin/superadmins/page.tsx
//
// Lists platform superadmins with create, block/unblock, deactivate/reactivate,
// role management, permanent deletion, and audit log. All requests go through
// `adminClient` (via `admin-auth` helpers) — never the tenant `apiClient`.
'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  MoreHorizontal,
  Plus,
  Shield,
  ShieldOff,
  Trash2,
  Unlock,
  UserCog,
} from 'lucide-react';
import {
  adminBlockSuperadmin,
  adminChangeRole,
  adminDeactivateSuperadmin,
  adminDeleteSuperadmin,
  adminListAuditLog,
  adminListSuperadmins,
  adminReactivateSuperadmin,
  adminRegister,
  adminUnblockSuperadmin,
} from '@/lib/api/admin-auth';
import { toast } from 'sonner';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import type {
  AdminAuditLogEntry,
  AdminUser,
  InternalRole,
  SuperadminStatus,
} from '@/types/admin';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PAGE_SIZE = 20;

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isInactive(lastLogin: string | null): boolean {
  if (!lastLogin) return true;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return new Date(lastLogin).getTime() < thirtyDaysAgo;
}

function statusBadge(status: SuperadminStatus) {
  switch (status) {
    case 'active':
      return (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
          Activo
        </Badge>
      );
    case 'blocked':
      return (
        <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
          Bloqueado
        </Badge>
      );
    case 'deactivated':
      return (
        <Badge variant="secondary" className="text-slate-500">
          Desactivado
        </Badge>
      );
  }
}

function roleBadge(role: InternalRole) {
  switch (role) {
    case 'owner':
      return <Badge className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-50">Owner</Badge>;
    case 'admin':
      return <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">Admin</Badge>;
    case 'support':
      return <Badge variant="secondary">Soporte</Badge>;
    case 'viewer':
      return <Badge variant="outline">Viewer</Badge>;
  }
}

const ROLE_LABELS: Record<Exclude<InternalRole, 'owner'>, { label: string; description: string }> = {
  admin: { label: 'Admin', description: 'Acceso completo excepto cambio de roles y eliminacion.' },
  support: { label: 'Soporte', description: 'Puede ver datos y gestionar tenants. No puede gestionar superadmins.' },
  viewer: { label: 'Viewer', description: 'Solo lectura. No puede realizar acciones.' },
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  superadmin_blocked: 'Superadmin bloqueado',
  superadmin_unblocked: 'Superadmin desbloqueado',
  superadmin_deactivated: 'Superadmin desactivado',
  superadmin_reactivated: 'Superadmin reactivado',
  superadmin_deleted: 'Superadmin eliminado',
  superadmin_role_changed: 'Rol cambiado',
  superadmin_created: 'Superadmin creado',
  superadmin_login: 'Inicio de sesion',
};

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const data = (err as { data?: { blocking_summary?: string } }).data;
    const message = err instanceof Error ? err.message : fallback;
    if (data?.blocking_summary) {
      return `${message} (${data.blocking_summary})`;
    }
    if (err instanceof Error) return err.message;
  }
  return fallback;
}

// ──────────────────────────────────────────────────────────────────────
// Create form state
// ──────────────────────────────────────────────────────────────────────

interface CreateFormState {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

const EMPTY_FORM: CreateFormState = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
};

// ──────────────────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────────────────

export default function SuperadminsPage() {
  const { admin: currentAdmin, logout } = useAdminAuth();
  const currentRole = currentAdmin?.internal_role ?? 'viewer';
  const isOwner = currentRole === 'owner';
  const canManage = currentRole === 'owner' || currentRole === 'admin';

  // ── Superadmin list state ──
  const [items, setItems] = useState<AdminUser[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Create dialog state ──
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_FORM);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // ── Deactivate dialog state ──
  const [pendingDeactivate, setPendingDeactivate] = useState<AdminUser | null>(null);
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);

  // ── Block dialog state ──
  const [blockTarget, setBlockTarget] = useState<AdminUser | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockUntil, setBlockUntil] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  // ── Delete dialog state ──
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // ── Role change dialog state ──
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  // ── Row-level errors and loading ──
  const [rowError, setRowError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // ── Audit log state ──
  const [auditEntries, setAuditEntries] = useState<AdminAuditLogEntry[]>([]);
  const [auditCount, setAuditCount] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('superadmins');

  // ── Data fetching ──

  const loadPage = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await adminListSuperadmins(targetPage);
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      setListError(extractErrorMessage(err, 'No se pudo cargar la lista de superadministradores.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAuditLog = useCallback(async (targetPage: number, action?: string) => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const params: { page: number; page_size: number; action?: string } = {
        page: targetPage,
        page_size: PAGE_SIZE,
      };
      if (action && action !== 'all') params.action = action;
      const data = await adminListAuditLog(params);
      setAuditEntries(data.results);
      setAuditCount(data.count);
    } catch (err) {
      setAuditError(extractErrorMessage(err, 'No se pudo cargar el registro de actividad.'));
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Superadministradores — NERBIS Admin';
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  // Load audit log when tab changes or filter/page changes
  useEffect(() => {
    if (activeTab === 'audit') {
      void loadAuditLog(auditPage, auditActionFilter);
    }
  }, [activeTab, auditPage, auditActionFilter, loadAuditLog]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count],
  );

  const auditTotalPages = useMemo(
    () => Math.max(1, Math.ceil(auditCount / PAGE_SIZE)),
    [auditCount],
  );

  // ── Helpers to update an item in-place ──

  function updateItem(updated: AdminUser) {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setCount((c) => Math.max(0, c - 1));
  }

  // ── Handlers ──

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      await adminRegister({
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        first_name: createForm.first_name.trim() || undefined,
        last_name: createForm.last_name.trim() || undefined,
      });
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
      toast.success('Superadministrador creado correctamente.');
      await loadPage(page);
    } catch (err) {
      setCreateError(extractErrorMessage(err, 'No se pudo crear el superadministrador.'));
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleConfirmDeactivate() {
    if (!pendingDeactivate) return;
    const targetEmail = pendingDeactivate.email;
    setDeactivateSubmitting(true);
    setRowError(null);
    try {
      const updated = await adminDeactivateSuperadmin(pendingDeactivate.id);
      updateItem(updated);
      setPendingDeactivate(null);
      toast.success(`${targetEmail} desactivado correctamente.`);
    } catch (err) {
      setRowError(extractErrorMessage(err, 'No se pudo desactivar el superadministrador.'));
    } finally {
      setDeactivateSubmitting(false);
    }
  }

  async function handleReactivate(target: AdminUser) {
    setRowError(null);
    setActionLoadingId(target.id);
    try {
      const updated = await adminReactivateSuperadmin(target.id);
      updateItem(updated);
      toast.success(`${target.email} reactivado correctamente.`);
    } catch (err) {
      setRowError(extractErrorMessage(err, 'No se pudo reactivar el superadministrador.'));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!blockTarget) return;
    setBlockError(null);
    setBlockSubmitting(true);
    try {
      const updated = await adminBlockSuperadmin(blockTarget.id, {
        reason: blockReason.trim(),
        blocked_until: blockUntil || null,
      });
      updateItem(updated);
      setBlockTarget(null);
      setBlockReason('');
      setBlockUntil('');
      toast.success(`${updated.email} bloqueado correctamente.`);
    } catch (err) {
      setBlockError(extractErrorMessage(err, 'No se pudo bloquear el superadministrador.'));
    } finally {
      setBlockSubmitting(false);
    }
  }

  async function handleUnblock(target: AdminUser) {
    setRowError(null);
    setActionLoadingId(target.id);
    try {
      const updated = await adminUnblockSuperadmin(target.id);
      updateItem(updated);
      toast.success(`${target.email} desbloqueado correctamente.`);
    } catch (err) {
      setRowError(extractErrorMessage(err, 'No se pudo desbloquear el superadministrador.'));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      await adminDeleteSuperadmin(deleteTarget.id, { password: deletePassword });
      removeItem(deleteTarget.id);
      const targetEmail = deleteTarget.email;
      setDeleteTarget(null);
      setDeletePassword('');
      setDeleteConfirmed(false);
      toast.success(`${targetEmail} eliminado permanentemente.`);
    } catch (err) {
      setDeleteError(extractErrorMessage(err, 'No se pudo eliminar el superadministrador.'));
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleChangeRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roleTarget || !newRole) return;
    setRoleError(null);
    setRoleSubmitting(true);
    try {
      const updated = await adminChangeRole(roleTarget.id, { internal_role: newRole });
      updateItem(updated);
      const targetEmail = roleTarget.email;
      setRoleTarget(null);
      setNewRole('');
      toast.success(`Rol de ${targetEmail} actualizado a ${newRole}.`);
    } catch (err) {
      setRoleError(extractErrorMessage(err, 'No se pudo cambiar el rol.'));
    } finally {
      setRoleSubmitting(false);
    }
  }

  // ── Actions available for a given user row ──

  function getAvailableActions(target: AdminUser) {
    const isSelf = currentAdmin?.id === target.id;
    const targetIsOwner = target.internal_role === 'owner';
    const actions: {
      key: string;
      label: string;
      icon: typeof Ban;
      variant?: 'destructive';
      handler: () => void;
    }[] = [];

    if (!canManage) return actions;

    // Block (if target is active, not owner, not self)
    if (target.superadmin_status === 'active' && !targetIsOwner && !isSelf) {
      actions.push({
        key: 'block',
        label: 'Bloquear',
        icon: Ban,
        handler: () => {
          setBlockTarget(target);
          setBlockReason('');
          setBlockUntil('');
          setBlockError(null);
        },
      });
    }

    // Unblock (if target is blocked)
    if (target.superadmin_status === 'blocked' && !targetIsOwner) {
      actions.push({
        key: 'unblock',
        label: 'Desbloquear',
        icon: Unlock,
        handler: () => void handleUnblock(target),
      });
    }

    // Deactivate (if target is active, not owner, not self)
    if (target.superadmin_status === 'active' && !targetIsOwner && !isSelf) {
      actions.push({
        key: 'deactivate',
        label: 'Desactivar',
        icon: ShieldOff,
        handler: () => setPendingDeactivate(target),
      });
    }

    // Reactivate (if target is deactivated)
    if (target.superadmin_status === 'deactivated') {
      actions.push({
        key: 'reactivate',
        label: 'Reactivar',
        icon: CheckCircle2,
        handler: () => void handleReactivate(target),
      });
    }

    // Change role (owner only, target is not owner)
    if (isOwner && !targetIsOwner && !isSelf) {
      actions.push({
        key: 'role',
        label: 'Cambiar rol',
        icon: UserCog,
        handler: () => {
          setRoleTarget(target);
          setNewRole(target.internal_role);
          setRoleError(null);
        },
      });
    }

    // Delete (owner/admin, target is not owner, not self)
    if (canManage && !targetIsOwner && !isSelf) {
      actions.push({
        key: 'delete',
        label: 'Eliminar permanentemente',
        icon: Trash2,
        variant: 'destructive',
        handler: () => {
          setDeleteTarget(target);
          setDeletePassword('');
          setDeleteConfirmed(false);
          setDeleteError(null);
        },
      });
    }

    return actions;
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
          style={{ background: 'radial-gradient(circle, #0D9488, transparent 70%)' }}
        />
        <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
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
                Superadministradores
              </h1>
              <p className="text-xs text-white/60">
                {count === 0
                  ? 'Sin registros'
                  : `${count} superadmin${count === 1 ? '' : 'es'} en total`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canManage && (
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-teal-500 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-teal-500/25 transition-all duration-200 hover:bg-teal-400 hover:shadow-teal-400/30"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nuevo
              </button>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3.5 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="fade-up-auth mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al panel
        </Link>

        {/* Errors */}
        {listError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {listError}
          </div>
        )}
        {rowError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {rowError}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="superadmins">
              <Shield className="h-4 w-4" />
              Superadmins
            </TabsTrigger>
            <TabsTrigger value="audit">
              Registro de actividad
            </TabsTrigger>
          </TabsList>

          {/* ── Superadmins tab ── */}
          <TabsContent value="superadmins">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando...
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-[820px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Nombre
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Rol
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Ultimo acceso
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-12 text-center text-slate-500"
                        >
                          No hay superadministradores registrados.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const isSelf = currentAdmin?.id === item.id;
                        const fullName =
                          [item.first_name, item.last_name]
                            .filter(Boolean)
                            .join(' ') || '\u2014';
                        const actions = getAvailableActions(item);
                        const isActionLoading = actionLoadingId === item.id;

                        return (
                          <tr
                            key={item.id}
                            className="transition-colors hover:bg-slate-50/50"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {item.email}
                              {isSelf && (
                                <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-600">
                                  tu
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{fullName}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                {statusBadge(item.superadmin_status)}
                                {item.superadmin_status === 'blocked' && item.block_reason && (
                                  <span className="text-[11px] text-amber-600 leading-tight">
                                    {item.block_reason}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {roleBadge(item.internal_role)}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              <div className="flex items-center gap-1.5">
                                {item.last_login ? formatDate(item.last_login) : 'Nunca'}
                                {isInactive(item.last_login) && (
                                  <AlertTriangle
                                    className="h-3.5 w-3.5 text-amber-500"
                                    aria-label="Inactivo hace mas de 30 dias"
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {actions.length > 0 ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    disabled={isActionLoading}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400/50 disabled:opacity-50"
                                    aria-label={`Acciones para ${item.email}`}
                                  >
                                    {isActionLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreHorizontal className="h-4 w-4" />
                                    )}
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuGroup>
                                      {actions.map((action, idx) => {
                                        const Icon = action.icon;
                                        const isDestructive = action.variant === 'destructive';
                                        return (
                                          <span key={action.key}>
                                            {isDestructive && idx > 0 && <DropdownMenuSeparator />}
                                            <DropdownMenuItem
                                              variant={isDestructive ? 'destructive' : 'default'}
                                              onClick={action.handler}
                                            >
                                              <Icon />
                                              {action.label}
                                            </DropdownMenuItem>
                                          </span>
                                        );
                                      })}
                                    </DropdownMenuGroup>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <span className="text-xs text-slate-400">&mdash;</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>
                  Pagina {page} de {totalPages}
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
          </TabsContent>

          {/* ── Audit log tab ── */}
          <TabsContent value="audit">
            {/* Filter */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm text-slate-500">Filtrar por accion:</span>
              <Select
                value={auditActionFilter}
                onValueChange={(val) => {
                  setAuditActionFilter(val);
                  setAuditPage(1);
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todas las acciones</SelectItem>
                    {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {auditError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {auditError}
              </div>
            )}

            {auditLoading ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando...
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-[720px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Actor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Accion
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Objetivo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Detalles
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditEntries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-12 text-center text-slate-500"
                        >
                          No hay registros de actividad.
                        </td>
                      </tr>
                    ) : (
                      auditEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="transition-colors hover:bg-slate-50/50"
                        >
                          <td className="px-4 py-3 text-slate-500 tabular-nums">
                            {formatDate(entry.created_at)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {entry.actor_email ?? 'Sistema'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">
                              {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {entry.target_repr || '\u2014'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {Object.keys(entry.details).length > 0 ? (
                              <span className="font-mono text-xs">
                                {JSON.stringify(entry.details)}
                              </span>
                            ) : (
                              '\u2014'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Audit pagination */}
            {auditTotalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>
                  Pagina {auditPage} de {auditTotalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={auditPage <= 1 || auditLoading}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={auditPage >= auditTotalPages || auditLoading}
                    onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Create modal ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo superadministrador</DialogTitle>
            <DialogDescription>
              La nueva cuenta podra acceder al panel de plataforma de inmediato.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-4"
            aria-describedby={createError ? 'create-admin-error' : undefined}
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="create-email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="create-email"
                type="email"
                required
                autoComplete="off"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="create-password" className="block text-sm font-medium text-slate-700">
                Contrasena
              </label>
              <div className="relative">
                <input
                  id="create-password"
                  type={showCreatePassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                  aria-label={showCreatePassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showCreatePassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Minimo 8 caracteres.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="create-first-name" className="block text-sm font-medium text-slate-700">
                  Nombre
                </label>
                <input
                  id="create-first-name"
                  value={createForm.first_name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="create-last-name" className="block text-sm font-medium text-slate-700">
                  Apellido
                </label>
                <input
                  id="create-last-name"
                  value={createForm.last_name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                />
              </div>
            </div>

            {createError && (
              <div
                id="create-admin-error"
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {createError}
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={createSubmitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createSubmitting}
                className="flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-400 disabled:opacity-50"
              >
                {createSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear superadmin'
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Deactivate confirmation ── */}
      <AlertDialog
        open={pendingDeactivate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeactivate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar superadministrador</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeactivate
                ? `${pendingDeactivate.email} perdera acceso al panel de plataforma. Puedes reactivar la cuenta mas tarde.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeactivate();
              }}
              disabled={deactivateSubmitting}
            >
              {deactivateSubmitting ? 'Desactivando...' : 'Desactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Block dialog ── */}
      <Dialog
        open={blockTarget !== null}
        onOpenChange={(open) => {
          if (!open) setBlockTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear superadministrador</DialogTitle>
            <DialogDescription>
              {blockTarget
                ? `${blockTarget.email} no podra iniciar sesion mientras este bloqueado.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleBlock}
            className="flex flex-col gap-4"
            aria-describedby={blockError ? 'block-error' : undefined}
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="block-reason" className="block text-sm font-medium text-slate-700">
                Motivo del bloqueo
              </label>
              <textarea
                id="block-reason"
                required
                rows={3}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Describe el motivo del bloqueo..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="block-until" className="block text-sm font-medium text-slate-700">
                Bloquear hasta (opcional)
              </label>
              <input
                id="block-until"
                type="datetime-local"
                value={blockUntil}
                onChange={(e) => setBlockUntil(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
              <p className="text-xs text-slate-500">
                Si no se especifica, el bloqueo sera permanente hasta desbloqueo manual.
              </p>
            </div>

            {/* Preview */}
            {blockReason.trim() && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-medium text-xs uppercase tracking-wider text-amber-600 mb-1">
                  El usuario vera:
                </p>
                <p>Tu cuenta esta bloqueada. Motivo: {blockReason.trim()}</p>
              </div>
            )}

            {blockError && (
              <div
                id="block-error"
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {blockError}
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setBlockTarget(null)}
                disabled={blockSubmitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={blockSubmitting || !blockReason.trim()}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-amber-400 disabled:opacity-50"
              >
                {blockSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Bloqueando...
                  </>
                ) : (
                  'Bloquear'
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete dialog ── */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeletePassword('');
            setDeleteConfirmed(false);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar superadministrador</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Estas a punto de eliminar permanentemente la cuenta de ${deleteTarget.email}.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form
            onSubmit={handleDelete}
            className="flex flex-col gap-4"
            aria-describedby={deleteError ? 'delete-error' : undefined}
          >
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Esta accion es permanente y no se puede deshacer. Todos los datos
              asociados a esta cuenta seran eliminados.
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="delete-password" className="block text-sm font-medium text-slate-700">
                Tu contrasena (para confirmar)
              </label>
              <div className="relative">
                <input
                  id="delete-password"
                  type={showDeletePassword ? 'text' : 'password'}
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                  aria-label={showDeletePassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showDeletePassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="delete-confirm"
                checked={deleteConfirmed}
                onCheckedChange={(checked) => setDeleteConfirmed(checked === true)}
              />
              <label htmlFor="delete-confirm" className="text-sm text-slate-600">
                Entiendo que esta accion es irreversible
              </label>
            </div>

            {deleteError && (
              <div
                id="delete-error"
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {deleteError}
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteSubmitting}>
                Cancelar
              </AlertDialogCancel>
              <button
                type="submit"
                disabled={deleteSubmitting || !deletePassword || !deleteConfirmed}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-red-500 disabled:opacity-50"
              >
                {deleteSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar permanentemente'
                )}
              </button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Role change dialog ── */}
      <Dialog
        open={roleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRoleTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar rol</DialogTitle>
            <DialogDescription>
              {roleTarget
                ? `Cambiar el rol de ${roleTarget.email}. El rol actual es ${roleTarget.internal_role}.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleChangeRole}
            className="flex flex-col gap-4"
            aria-describedby={roleError ? 'role-error' : undefined}
          >
            <div className="flex flex-col gap-2">
              <label className="block text-sm font-medium text-slate-700">
                Nuevo rol
              </label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(ROLE_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Role description */}
            {newRole && newRole !== 'owner' && ROLE_LABELS[newRole as Exclude<InternalRole, 'owner'>] && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {ROLE_LABELS[newRole as Exclude<InternalRole, 'owner'>].description}
              </div>
            )}

            {roleError && (
              <div
                id="role-error"
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {roleError}
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setRoleTarget(null)}
                disabled={roleSubmitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={roleSubmitting || !newRole || newRole === roleTarget?.internal_role}
                className="flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-teal-400 disabled:opacity-50"
              >
                {roleSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  'Cambiar rol'
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
