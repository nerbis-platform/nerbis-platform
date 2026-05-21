// src/app/(platform)/admin/settings/modules/page.tsx
//
// Platform modules management page for superadmins.
// CRUD operations for PlatformModule records. All requests go through
// `adminClient` (via `admin-settings` helpers) — never the tenant `apiClient`.
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ChevronRight,
  Edit,
  Loader2,
  LogOut,
  MoreHorizontal,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from 'lucide-react';
import {
  adminCreateModule,
  adminDeleteModule,
  adminListModules,
  adminUpdateModule,
} from '@/lib/api/admin-settings';
import { toast } from 'sonner';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import type {
  AdminPlatformModule,
  AdminPlatformModulePayload,
} from '@/types/admin';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────

export default function AdminModulesPage() {
  const { admin, logout } = useAdminAuth();

  useEffect(() => {
    document.title = 'Modulos — NERBIS Admin';
  }, []);

  // ── Data state ──────────────────────────────────────────────────────
  const [modules, setModules] = useState<AdminPlatformModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Dialog state (create / edit) ────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPlatformModule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formAccentColor, setFormAccentColor] = useState('#0D9488');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formDependencies, setFormDependencies] = useState<number[]>([]);

  // ── Delete confirmation state ───────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<AdminPlatformModule | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  // ── Data loading ────────────────────────────────────────────────────
  const loadModules = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await adminListModules();
      setModules(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista de modulos.';
      setListError(message);
      setModules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModules();
  }, [loadModules]);

  // ── Dialog helpers ──────────────────────────────────────────────────
  function resetForm() {
    setFormKey('');
    setFormLabel('');
    setFormDescription('');
    setFormIcon('');
    setFormAccentColor('#0D9488');
    setFormSortOrder(0);
    setFormIsActive(true);
    setFormDependencies([]);
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(mod: AdminPlatformModule) {
    setEditing(mod);
    setFormKey(mod.key);
    setFormLabel(mod.label);
    setFormDescription(mod.description);
    setFormIcon(mod.icon);
    setFormAccentColor(mod.accent_color);
    setFormSortOrder(mod.sort_order);
    setFormIsActive(mod.is_active);
    setFormDependencies(mod.dependencies);
    setDialogOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: AdminPlatformModulePayload = {
        key: formKey.trim(),
        label: formLabel.trim(),
        description: formDescription.trim(),
        icon: formIcon.trim(),
        accent_color: formAccentColor.trim(),
        sort_order: formSortOrder,
        is_active: formIsActive,
        dependencies: formDependencies,
      };

      if (editing) {
        await adminUpdateModule(editing.id, payload);
        toast.success(`Modulo "${payload.label}" actualizado.`);
      } else {
        await adminCreateModule(payload);
        toast.success(`Modulo "${payload.label}" creado.`);
      }

      setDialogOpen(false);
      void loadModules();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : editing
            ? 'No se pudo actualizar el modulo.'
            : 'No se pudo crear el modulo.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Toggle active status ────────────────────────────────────────────
  async function handleToggleActive(mod: AdminPlatformModule) {
    try {
      await adminUpdateModule(mod.id, { is_active: !mod.is_active });
      toast.success(
        mod.is_active
          ? `Modulo "${mod.label}" desactivado.`
          : `Modulo "${mod.label}" activado.`,
      );
      void loadModules();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar el estado del modulo.';
      toast.error(message);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteModule(deleteTarget.id);
      toast.success(`Modulo "${deleteTarget.label}" eliminado.`);
      setDeleteTarget(null);
      void loadModules();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el modulo.';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  // ── Dependency toggle helper ────────────────────────────────────────
  function toggleDependency(depId: number) {
    setFormDependencies((prev) =>
      prev.includes(depId) ? prev.filter((d) => d !== depId) : [...prev, depId],
    );
  }

  // Available modules for dependency selection (exclude current module when editing)
  const availableDeps = modules.filter(
    (m) => !editing || m.id !== editing.id,
  );

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
                Modulos
              </h1>
              <p className="text-xs text-white/50">
                {admin?.email ?? 'superadmin'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo modulo
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
              <span className="text-slate-500">Configuracion</span>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </li>
            <li className="font-medium text-slate-700">Modulos</li>
          </ol>
        </nav>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
            Modulos de la plataforma
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {modules.length === 0 && !isLoading
              ? 'No hay modulos configurados.'
              : `${modules.length} modulo${modules.length === 1 ? '' : 's'} configurado${modules.length === 1 ? '' : 's'}.`}
          </p>
        </div>

        {/* Error */}
        {listError && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{listError}</span>
            <button
              type="button"
              onClick={() => void loadModules()}
              className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-4"
                  aria-hidden="true"
                >
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Cargando modulos...
            </div>
          </div>
        ) : modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Plus className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              No hay modulos configurados
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Los modulos definen las funcionalidades disponibles para los
              negocios. Crea el primer modulo para comenzar.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo modulo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Icono
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Color
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Dependencias
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Orden
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modules.map((mod) => (
                  <tr
                    key={mod.id}
                    className="group transition-colors hover:bg-slate-50/60"
                  >
                    {/* Nombre */}
                    <td className="px-4 py-3">
                      <span className="block font-medium text-slate-900">
                        {mod.label}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {mod.key}
                      </span>
                    </td>

                    {/* Icono */}
                    <td className="px-4 py-3 text-slate-600">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                        {mod.icon || '\u2014'}
                      </code>
                    </td>

                    {/* Color */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 shrink-0 rounded-full border border-slate-200"
                          style={{ backgroundColor: mod.accent_color }}
                          aria-hidden="true"
                        />
                        <code className="text-xs text-slate-600">
                          {mod.accent_color}
                        </code>
                      </div>
                    </td>

                    {/* Dependencias */}
                    <td className="px-4 py-3">
                      {mod.dependencies_detail.length === 0 ? (
                        <span className="text-xs text-slate-400">\u2014</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {mod.dependencies_detail.map((dep) => (
                            <Badge
                              key={dep.id}
                              className="border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50"
                            >
                              {dep.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Orden */}
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-700">
                      {mod.sort_order}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      {mod.is_active ? (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          Activo
                        </Badge>
                      ) : (
                        <Badge className="border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-100">
                          Inactivo
                        </Badge>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Acciones para ${mod.label}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                        >
                          <MoreHorizontal
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              openEdit(mod);
                            }}
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              void handleToggleActive(mod);
                            }}
                          >
                            {mod.is_active ? (
                              <>
                                <PowerOff
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Power
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setDeleteTarget(mod);
                            }}
                            className="text-red-600 focus:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ── Create / Edit Dialog ─────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setDialogOpen(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar modulo' : 'Nuevo modulo'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Modifica los campos y guarda los cambios.'
                : 'Completa los campos para crear un nuevo modulo.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Key */}
            <div>
              <label
                htmlFor="mod-key"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Key
              </label>
              <input
                id="mod-key"
                type="text"
                required
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="ej: shop, bookings"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Label */}
            <div>
              <label
                htmlFor="mod-label"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Nombre
              </label>
              <input
                id="mod-label"
                type="text"
                required
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="ej: Tienda Online"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="mod-description"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Descripcion
              </label>
              <textarea
                id="mod-description"
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descripcion breve del modulo"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Icon + Color row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="mod-icon"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Icono (Lucide)
                </label>
                <input
                  id="mod-icon"
                  type="text"
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  placeholder="ej: ShoppingCart"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                />
              </div>
              <div>
                <label
                  htmlFor="mod-color"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Color de acento
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="mod-color"
                    type="text"
                    value={formAccentColor}
                    onChange={(e) => setFormAccentColor(e.target.value)}
                    placeholder="#0D9488"
                    className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                  />
                  <span
                    className="h-10 w-10 shrink-0 rounded-lg border border-slate-200"
                    style={{ backgroundColor: formAccentColor }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>

            {/* Sort order + Active row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="mod-sort"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Orden
                </label>
                <input
                  id="mod-sort"
                  type="number"
                  min={0}
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <Switch
                    checked={formIsActive}
                    onCheckedChange={setFormIsActive}
                  />
                  <span>{formIsActive ? 'Activo' : 'Inactivo'}</span>
                </label>
              </div>
            </div>

            {/* Dependencies */}
            {availableDeps.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Dependencias
                </label>
                <div className="max-h-32 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
                  {availableDeps.map((dep) => (
                    <label
                      key={dep.id}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <Checkbox
                        checked={formDependencies.includes(dep.id)}
                        onCheckedChange={() => toggleDependency(dep.id)}
                      />
                      <span>{dep.label}</span>
                      <span className="text-xs text-slate-400">
                        ({dep.key})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !formKey.trim() || !formLabel.trim()}
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:opacity-50"
              >
                {submitting && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {editing ? 'Guardar cambios' : 'Crear modulo'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────── */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar modulo</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Se eliminara permanentemente el modulo "${deleteTarget.label}" (${deleteTarget.key}). Esta accion no se puede deshacer.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 focus:ring-red-500"
            >
              {deleting ? 'Eliminando...' : 'Si, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
