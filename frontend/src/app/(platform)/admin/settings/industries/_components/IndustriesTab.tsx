// src/app/(platform)/admin/settings/industries/_components/IndustriesTab.tsx
//
// CRUD over the global Industry catalog + promote AI-proposed industries.
// All requests go through `adminClient` (via `admin-industries` helpers).
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Power,
  PowerOff,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  adminCreateIndustry,
  adminDeleteIndustry,
  adminListIndustries,
  adminPromoteIndustry,
  adminUpdateIndustry,
} from '@/lib/api/admin-industries';
import type { AdminIndustry, AdminIndustryPayload } from '@/types/admin';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20';

export function IndustriesTab() {
  // ── Data state ──────────────────────────────────────────────────────
  const [industries, setIndustries] = useState<AdminIndustry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Dialog state (create / edit) ────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminIndustry | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formDefaultTemplate, setFormDefaultTemplate] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  // ── Delete + promote state ──────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<AdminIndustry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [promotingId, setPromotingId] = useState<number | null>(null);

  // ── Data loading ────────────────────────────────────────────────────
  const loadIndustries = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await adminListIndustries();
      setIndustries(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el catalogo de industrias.';
      setListError(message);
      setIndustries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIndustries();
  }, [loadIndustries]);

  // ── Dialog helpers ──────────────────────────────────────────────────
  function resetForm() {
    setFormKey('');
    setFormLabel('');
    setFormDescription('');
    setFormIcon('');
    setFormDefaultTemplate('');
    setFormSortOrder(0);
    setFormIsActive(true);
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    const maxOrder =
      industries.length > 0
        ? Math.max(...industries.map((i) => i.sort_order))
        : -1;
    setFormSortOrder(maxOrder + 1);
    setDialogOpen(true);
  }

  function openEdit(ind: AdminIndustry) {
    setEditing(ind);
    setFormKey(ind.key);
    setFormLabel(ind.label);
    setFormDescription(ind.description);
    setFormIcon(ind.icon);
    setFormDefaultTemplate(
      ind.default_template != null ? String(ind.default_template) : '',
    );
    setFormSortOrder(ind.sort_order);
    setFormIsActive(ind.is_active);
    setDialogOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const trimmedTemplate = formDefaultTemplate.trim();
      const payload: AdminIndustryPayload = {
        key: formKey.trim(),
        label: formLabel.trim(),
        description: formDescription.trim(),
        icon: formIcon.trim(),
        default_template: trimmedTemplate
          ? parseInt(trimmedTemplate, 10)
          : null,
        sort_order: formSortOrder,
        is_active: formIsActive,
      };

      if (editing) {
        await adminUpdateIndustry(editing.id, payload);
        toast.success(`Industria "${payload.label}" actualizada.`);
      } else {
        await adminCreateIndustry(payload);
        toast.success(`Industria "${payload.label}" creada.`);
      }

      setDialogOpen(false);
      void loadIndustries();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : editing
            ? 'No se pudo actualizar la industria.'
            : 'No se pudo crear la industria.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Toggle active ───────────────────────────────────────────────────
  async function handleToggleActive(ind: AdminIndustry) {
    try {
      await adminUpdateIndustry(ind.id, { is_active: !ind.is_active });
      toast.success(
        ind.is_active
          ? `Industria "${ind.label}" desactivada.`
          : `Industria "${ind.label}" activada.`,
      );
      void loadIndustries();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar el estado de la industria.';
      toast.error(message);
    }
  }

  // ── Promote (proposed_by_model -> reviewed) ─────────────────────────
  async function handlePromote(ind: AdminIndustry) {
    setPromotingId(ind.id);
    try {
      await adminPromoteIndustry(ind.id);
      toast.success(`Industria "${ind.label}" revisada.`);
      void loadIndustries();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo revisar la industria.';
      toast.error(message);
    } finally {
      setPromotingId(null);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────
  async function handleDelete() {
    const target = deleteTarget;
    if (!target) return;
    setDeleting(true);
    try {
      await adminDeleteIndustry(target.id);
      setDeleteTarget(null);
      toast.success(`Industria "${target.label}" eliminada.`);
      void loadIndustries();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar la industria.';
      setDeleteTarget(null);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {industries.length === 0 && !isLoading
            ? 'No hay industrias en el catalogo.'
            : `${industries.length} industria${industries.length === 1 ? '' : 's'} en el catalogo.`}
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-500"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva industria
        </button>
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
            onClick={() => void loadIndustries()}
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
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-4"
                aria-hidden="true"
              >
                <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando industrias...
          </div>
        </div>
      ) : industries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Plus className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            No hay industrias en el catalogo
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Las industrias definen los sectores de negocio y su template por
            defecto. Crea la primera para comenzar.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva industria
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Industria
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Template por defecto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Origen
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Revision
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
              {industries.map((ind) => {
                const isProposed = ind.status === 'proposed_by_model';
                return (
                  <tr
                    key={ind.id}
                    className="group transition-colors hover:bg-slate-50/60"
                  >
                    {/* Industria */}
                    <td className="px-4 py-3">
                      <span className="block font-medium text-slate-900">
                        {ind.label}
                      </span>
                      <span className="block font-mono text-xs text-slate-500">
                        {ind.key}
                      </span>
                    </td>

                    {/* Template por defecto */}
                    <td className="px-4 py-3 text-slate-600">
                      {ind.default_template_detail ? (
                        <span className="text-xs">
                          {ind.default_template_detail.name}
                          <span className="ml-1 font-mono text-slate-400">
                            ({ind.default_template_detail.slug})
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {'\u2014'}
                        </span>
                      )}
                    </td>

                    {/* Origen (created_by_ai) */}
                    <td className="px-4 py-3">
                      {ind.created_by_ai ? (
                        <Badge className="gap-1 border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50">
                          <Sparkles className="h-3 w-3" aria-hidden="true" />
                          IA
                        </Badge>
                      ) : (
                        <Badge className="border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50">
                          Manual
                        </Badge>
                      )}
                    </td>

                    {/* Revision (status) */}
                    <td className="px-4 py-3">
                      {isProposed ? (
                        <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
                          Propuesta
                        </Badge>
                      ) : (
                        <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          <CheckCircle2
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                          Revisada
                        </Badge>
                      )}
                    </td>

                    {/* Estado (is_active) */}
                    <td className="px-4 py-3">
                      {ind.is_active ? (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          Activa
                        </Badge>
                      ) : (
                        <Badge className="border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-100">
                          Inactiva
                        </Badge>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isProposed && (
                          <button
                            type="button"
                            onClick={() => void handlePromote(ind)}
                            disabled={promotingId === ind.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {promotingId === ind.id ? (
                              <Loader2
                                className="h-3.5 w-3.5 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <CheckCircle2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                            Revisar
                          </button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={`Acciones para ${ind.label}`}
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
                                openEdit(ind);
                              }}
                            >
                              <Edit className="h-4 w-4" aria-hidden="true" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                void handleToggleActive(ind);
                              }}
                            >
                              {ind.is_active ? (
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
                                setDeleteTarget(ind);
                              }}
                              className="text-red-600 focus:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Dialog ───────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setDialogOpen(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar industria' : 'Nueva industria'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Modifica los campos y guarda los cambios.'
                : 'Completa los campos para crear una nueva industria.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Key */}
            <div>
              <label
                htmlFor="ind-key"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Key
              </label>
              <input
                id="ind-key"
                type="text"
                required
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="ej: beauty, fitness"
                className={INPUT_CLASS}
              />
            </div>

            {/* Label */}
            <div>
              <label
                htmlFor="ind-label"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Nombre
              </label>
              <input
                id="ind-label"
                type="text"
                required
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="ej: Belleza y bienestar"
                className={INPUT_CLASS}
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="ind-description"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Descripcion
              </label>
              <textarea
                id="ind-description"
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descripcion breve de la industria"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Icon + Default template row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="ind-icon"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Icono
                </label>
                <input
                  id="ind-icon"
                  type="text"
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  placeholder="ej: scissors"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label
                  htmlFor="ind-template"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Template (ID)
                </label>
                <input
                  id="ind-template"
                  type="number"
                  min={1}
                  value={formDefaultTemplate}
                  onChange={(e) => setFormDefaultTemplate(e.target.value)}
                  placeholder="Opcional"
                  className={INPUT_CLASS}
                />
                {editing?.default_template_detail && (
                  <p className="mt-1 text-xs text-slate-400">
                    Actual: {editing.default_template_detail.name}
                  </p>
                )}
              </div>
            </div>

            {/* Sort order + Active row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="ind-sort"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Orden
                </label>
                <input
                  id="ind-sort"
                  type="number"
                  min={0}
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value))}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <Switch
                    checked={formIsActive}
                    onCheckedChange={setFormIsActive}
                  />
                  <span>{formIsActive ? 'Activa' : 'Inactiva'}</span>
                </label>
              </div>
            </div>

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
                {editing ? 'Guardar cambios' : 'Crear industria'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar industria</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Se eliminara permanentemente la industria "${deleteTarget.label}" (${deleteTarget.key}). Esta accion no se puede deshacer.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {deleting ? 'Eliminando...' : 'Si, eliminar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
