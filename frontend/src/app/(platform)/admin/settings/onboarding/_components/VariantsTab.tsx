// src/app/(platform)/admin/settings/onboarding/_components/VariantsTab.tsx
//
// Self-contained tab component for managing SectionVariant records (CRUD).
// Follows the same visual patterns as the Questions / Pages / Sections tabs
// in the parent onboarding settings page.
'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import {
  adminListVariants,
  adminCreateVariant,
  adminUpdateVariant,
  adminDeleteVariant,
  adminListSections,
} from '@/lib/api/admin-settings';
import { toast } from 'sonner';
import type {
  AdminSectionVariant,
  AdminSectionVariantPayload,
  AdminWebsiteSection,
  VariantMood,
} from '@/types/admin';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  extractErrorMessage,
  truncate,
  INPUT_CLASS,
  TEXTAREA_CLASS,
  BTN_PRIMARY,
  BTN_SECONDARY,
  ACTION_TRIGGER,
} from '../_helpers';

// ─── Constants ───────────────────────────────────────────────

const MOOD_OPTIONS: { value: VariantMood; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'playful', label: 'Playful' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'bold', label: 'Bold' },
  { value: 'minimal', label: 'Minimal' },
];

const MOOD_BADGE_CLASSES: Record<VariantMood, string> = {
  professional: 'border-slate-200 bg-slate-50 text-slate-700',
  playful: 'border-amber-200 bg-amber-50 text-amber-700',
  elegant: 'border-violet-200 bg-violet-50 text-violet-700',
  bold: 'border-red-200 bg-red-50 text-red-700',
  minimal: 'border-teal-200 bg-teal-50 text-teal-700',
};

// ─── Form state ──────────────────────────────────────────────

interface VariantFormState {
  section: string;
  key: string;
  label: string;
  description: string;
  css_class_hint: string;
  mood: VariantMood;
  tags: string;
  is_default: boolean;
  sort_order: number;
}

const EMPTY_VARIANT_FORM: VariantFormState = {
  section: '',
  key: '',
  label: '',
  description: '',
  css_class_hint: '',
  mood: 'professional',
  tags: '',
  is_default: false,
  sort_order: 0,
};

// Filter sentinel — represents "show all sections"
const FILTER_ALL = '__all__';

// ─── Component ───────────────────────────────────────────────

export function VariantsTab() {
  // ── Data state ──
  const [variants, setVariants] = useState<AdminSectionVariant[]>([]);
  const [sections, setSections] = useState<AdminWebsiteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter state ──
  const [filterSection, setFilterSection] = useState<string>(FILTER_ALL);

  // ── Dialog state ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSectionVariant | null>(null);
  const [form, setForm] = useState<VariantFormState>(EMPTY_VARIANT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Delete state ──
  const [deleting, setDeleting] = useState<AdminSectionVariant | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // ── Data fetching ──

  const loadSections = useCallback(async () => {
    try {
      const data = await adminListSections();
      setSections(data);
    } catch {
      // Sections are auxiliary for the dropdown — don't block the tab
    }
  }, []);

  const loadVariants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListVariants();
      setVariants(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'No se pudo cargar la lista de variantes.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSections();
    void loadVariants();
  }, [loadSections, loadVariants]);

  // ── Filtered list ──

  const filteredVariants = useMemo(() => {
    if (filterSection === FILTER_ALL) return variants;
    const sectionId = parseInt(filterSection, 10);
    return variants.filter((v) => v.section === sectionId);
  }, [variants, filterSection]);

  // ── Handlers ──

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_VARIANT_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(v: AdminSectionVariant) {
    setEditing(v);
    setForm({
      section: String(v.section),
      key: v.key,
      label: v.label,
      description: v.description,
      css_class_hint: v.css_class_hint,
      mood: v.mood,
      tags: v.tags.join(', '),
      is_default: v.is_default,
      sort_order: v.sort_order,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    if (!form.section) {
      setFormError('Selecciona una seccion.');
      setSubmitting(false);
      return;
    }

    const tagsArray = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: AdminSectionVariantPayload = {
      section: parseInt(form.section, 10),
      key: form.key.trim(),
      label: form.label.trim(),
      description: form.description.trim() || undefined,
      css_class_hint: form.css_class_hint.trim() || undefined,
      mood: form.mood,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      is_default: form.is_default,
      sort_order: form.sort_order,
    };

    try {
      if (editing) {
        await adminUpdateVariant(editing.id, payload);
        toast.success('Variante actualizada correctamente.');
      } else {
        await adminCreateVariant(payload);
        toast.success('Variante creada correctamente.');
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_VARIANT_FORM);
      await loadVariants();
    } catch (err) {
      setFormError(
        extractErrorMessage(
          err,
          editing ? 'No se pudo actualizar la variante.' : 'No se pudo crear la variante.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleDefault(v: AdminSectionVariant) {
    try {
      await adminUpdateVariant(v.id, { is_default: !v.is_default });
      toast.success(v.is_default ? `${v.key} ya no es default.` : `${v.key} marcada como default.`);
      await loadVariants();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo cambiar el estado.'));
    }
  }

  async function handleToggleActive(v: AdminSectionVariant) {
    try {
      await adminUpdateVariant(v.id, { is_active: !v.is_active });
      toast.success(v.is_active ? `${v.key} desactivada.` : `${v.key} activada.`);
      await loadVariants();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo cambiar el estado.'));
    }
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    setDeleteSubmitting(true);
    try {
      await adminDeleteVariant(deleting.id);
      toast.success(`${deleting.key} eliminada.`);
      setDeleting(null);
      await loadVariants();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo eliminar la variante.'));
    } finally {
      setDeleteSubmitting(false);
    }
  }

  // ── Render ──

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500">
            Variantes visuales disponibles para cada seccion.
          </p>
          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger className="h-8 w-[180px] border-slate-200 text-xs">
              <SelectValue placeholder="Filtrar por seccion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Todas las secciones</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button onClick={openCreate} className={BTN_PRIMARY}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva variante
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadVariants()}
            className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-4"
                aria-hidden="true"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando variantes...
          </div>
        </div>
      ) : filteredVariants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            {filterSection !== FILTER_ALL
              ? 'No hay variantes para esta seccion'
              : 'No hay variantes configuradas'}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Las variantes definen estilos visuales alternativos para cada seccion del sitio.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Label
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Seccion
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Mood
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Default
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
              {filteredVariants.map((v) => (
                <tr
                  key={v.id}
                  className="group transition-colors hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">
                      {v.key}
                    </span>
                  </td>
                  <td className="max-w-[200px] px-4 py-3 text-slate-600">
                    {truncate(v.label, 40)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-inherit">
                      {v.section_detail?.label ?? '\u2014'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`${MOOD_BADGE_CLASSES[v.mood] ?? 'border-slate-200 bg-slate-50 text-slate-700'} hover:bg-inherit`}
                    >
                      {v.mood}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={v.is_default}
                      onCheckedChange={() => void handleToggleDefault(v)}
                      aria-label={`Default para ${v.key}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={v.is_active}
                      onCheckedChange={() => void handleToggleActive(v)}
                      aria-label={`Estado de ${v.key}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Acciones para ${v.key}`}
                        className={ACTION_TRIGGER}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            openEdit(v);
                          }}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            void handleToggleActive(v);
                          }}
                        >
                          <Power className="h-4 w-4" aria-hidden="true" />
                          {v.is_active ? 'Desactivar' : 'Activar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setDeleting(v);
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

      {/* ── Variant Dialog (Create / Edit) ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditing(null);
            setForm(EMPTY_VARIANT_FORM);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar variante' : 'Nueva variante'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Modifica los datos de la variante de seccion.'
                : 'Define una nueva variante visual para una seccion.'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            {/* ── Section: Basico ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Basico
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="v-section" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Seccion
                  </label>
                  <Select
                    value={form.section}
                    onValueChange={(val) => setForm((f) => ({ ...f, section: val }))}
                  >
                    <SelectTrigger id="v-section" className="h-10 border-slate-200 text-sm">
                      <SelectValue placeholder="Seleccionar seccion" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.label} ({s.key})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="v-key" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Key
                  </label>
                  <input
                    id="v-key"
                    type="text"
                    required
                    value={form.key}
                    onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                    placeholder="ej. hero_centered"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="v-label" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Label
                </label>
                <input
                  id="v-label"
                  type="text"
                  required
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="ej. Hero centrado"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="v-desc" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Descripcion
                </label>
                <textarea
                  id="v-desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descripcion breve de la variante"
                  className={TEXTAREA_CLASS}
                />
              </div>
            </div>

            {/* ── Section: Estilo ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Estilo
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="v-css" className="mb-1.5 block text-sm font-medium text-slate-700">
                    CSS class hint
                  </label>
                  <input
                    id="v-css"
                    type="text"
                    value={form.css_class_hint}
                    onChange={(e) => setForm((f) => ({ ...f, css_class_hint: e.target.value }))}
                    placeholder="ej. hero--centered"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="v-mood" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Mood
                  </label>
                  <Select
                    value={form.mood}
                    onValueChange={(val) => setForm((f) => ({ ...f, mood: val as VariantMood }))}
                  >
                    <SelectTrigger id="v-mood" className="h-10 border-slate-200 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOOD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label htmlFor="v-tags" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tags
                </label>
                <input
                  id="v-tags"
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="Separados por coma: moderno, minimalista, oscuro"
                  className={INPUT_CLASS}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Separados por coma. Se convierten en un arreglo al guardar.
                </p>
              </div>
            </div>

            {/* ── Section: Meta ── */}
            <div className="space-y-4">
              <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Meta
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="v-sort" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Orden
                  </label>
                  <input
                    id="v-sort"
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                  />
                </div>
                <div className="flex items-center justify-between self-end rounded-lg border border-slate-200 px-3 py-2.5">
                  <label htmlFor="v-default" className="text-sm font-medium text-slate-700">
                    Default
                  </label>
                  <Switch
                    id="v-default"
                    checked={form.is_default}
                    onCheckedChange={(val) => setForm((f) => ({ ...f, is_default: val }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`${BTN_PRIMARY} disabled:opacity-50`}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {editing ? 'Guardar cambios' : 'Crear variante'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Variant Delete Confirmation ── */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar variante</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara permanentemente la variante{' '}
              <strong>{deleting?.key}</strong>. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDelete()}
              disabled={deleteSubmitting}
              className="bg-red-600 text-white hover:bg-red-500 focus:ring-red-400"
            >
              {deleteSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
