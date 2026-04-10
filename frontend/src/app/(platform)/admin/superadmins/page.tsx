// src/app/(platform)/admin/superadmins/page.tsx
//
// Lists platform superadmins with create + deactivate flows. All requests
// go through `adminClient` (via `admin-auth` helpers) — never the tenant
// `apiClient`.
'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Plus,
  ShieldOff,
} from 'lucide-react';
import {
  adminDeactivateSuperadmin,
  adminListSuperadmins,
  adminReactivateSuperadmin,
  adminRegister,
} from '@/lib/api/admin-auth';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import type { AdminUser } from '@/types/admin';
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

const PAGE_SIZE = 20;

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

export default function SuperadminsPage() {
  const { admin: currentAdmin, logout } = useAdminAuth();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_FORM);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const [pendingDeactivate, setPendingDeactivate] = useState<AdminUser | null>(null);
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);
  const [reactivatingId, setReactivatingId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const loadPage = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await adminListSuperadmins(targetPage);
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista de superadministradores.';
      setListError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count],
  );

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
      await loadPage(page);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo crear el superadministrador.';
      setCreateError(message);
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleConfirmDeactivate() {
    if (!pendingDeactivate) return;
    setDeactivateSubmitting(true);
    setRowError(null);
    try {
      const updated = await adminDeactivateSuperadmin(pendingDeactivate.id);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setPendingDeactivate(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo desactivar el superadministrador.';
      setRowError(message);
    } finally {
      setDeactivateSubmitting(false);
    }
  }

  async function handleReactivate(target: AdminUser) {
    setRowError(null);
    setReactivatingId(target.id);
    try {
      const updated = await adminReactivateSuperadmin(target.id);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo reactivar el superadministrador.';
      setRowError(message);
    } finally {
      setReactivatingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar — same as dashboard */}
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
              <p className="text-xs text-white/50">
                {count === 0
                  ? 'Sin registros'
                  : `${count} superadmin${count === 1 ? '' : 'es'} en total`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-teal-500 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-teal-500/25 transition-all duration-200 hover:bg-teal-400 hover:shadow-teal-400/30"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo
            </button>
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
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
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

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[720px] w-full text-sm">
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
                      colSpan={5}
                      className="px-4 py-12 text-center text-slate-400"
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
                          {item.is_active ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {item.last_login
                            ? new Date(item.last_login).toLocaleString()
                            : 'Nunca'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.is_active ? (
                            <button
                              disabled={isSelf}
                              onClick={() => setPendingDeactivate(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`Desactivar ${item.email}`}
                            >
                              <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                              Desactivar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(item)}
                              disabled={reactivatingId === item.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600 disabled:opacity-50"
                              aria-label={`Reactivar ${item.email}`}
                            >
                              {reactivatingId === item.id
                                ? 'Reactivando...'
                                : 'Reactivar'}
                            </button>
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
      </main>

      {/* Create modal */}
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
            className="space-y-4"
            aria-describedby={createError ? 'create-admin-error' : undefined}
          >
            <div className="space-y-2">
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
            <div className="space-y-2">
              <label htmlFor="create-password" className="block text-sm font-medium text-slate-700">
                Contraseña
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showCreatePassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
              <div className="space-y-2">
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
              <div className="space-y-2">
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

      {/* Deactivate confirmation */}
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
    </div>
  );
}
