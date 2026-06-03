// src/app/(platform)/admin/settings/onboarding/_components/PromptBlocksTab.tsx
//
// Self-contained tab for managing PromptBlock records (CRUD) with a prompt
// preview feature. Follows the same visual patterns as the Questions / Pages /
// Sections tabs defined in the parent page.
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Eye,
  FileCode2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import {
  adminListPromptBlocks,
  adminCreatePromptBlock,
  adminUpdatePromptBlock,
  adminDeletePromptBlock,
  adminPreviewPrompt,
} from '@/lib/api/admin-settings';
import { toast } from 'sonner';
import type {
  AdminPromptBlock,
  AdminPromptBlockPayload,
  AdminPromptPreviewResponse,
  PromptBlockCategory,
  PromptBlockScope,
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

// ─── Constants ───────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: PromptBlockCategory; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'business', label: 'Business' },
  { value: 'visual', label: 'Visual' },
  { value: 'section', label: 'Section' },
  { value: 'rules', label: 'Rules' },
];

const SCOPE_OPTIONS: { value: PromptBlockScope; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'template', label: 'Template' },
  { value: 'industry', label: 'Industry' },
];

const CATEGORY_BADGE_CLASSES: Record<PromptBlockCategory, string> = {
  system: 'border-slate-200 bg-slate-50 text-slate-700',
  business: 'border-blue-200 bg-blue-50 text-blue-700',
  visual: 'border-violet-200 bg-violet-50 text-violet-700',
  section: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rules: 'border-amber-200 bg-amber-50 text-amber-700',
};

const SCOPE_BADGE_CLASSES: Record<PromptBlockScope, string> = {
  global: 'border-slate-200 bg-slate-50 text-slate-700',
  template: 'border-teal-200 bg-teal-50 text-teal-700',
  industry: 'border-indigo-200 bg-indigo-50 text-indigo-700',
};

// ─── Form state ──────────────────────────────────────────────────────

interface BlockFormState {
  key: string;
  label: string;
  content: string;
  category: PromptBlockCategory;
  scope: PromptBlockScope;
  template: string;
  industry: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_BLOCK_FORM: BlockFormState = {
  key: '',
  label: '',
  content: '',
  category: 'system',
  scope: 'global',
  template: '',
  industry: '',
  sort_order: 0,
  is_active: true,
};

// ─── Component ───────────────────────────────────────────────────────

export function PromptBlocksTab() {
  // ── List state ──
  const [blocks, setBlocks] = useState<AdminPromptBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter ──
  const [filterCategory, setFilterCategory] = useState<PromptBlockCategory | 'all'>('all');

  // ── Dialog state ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AdminPromptBlock | null>(null);
  const [form, setForm] = useState<BlockFormState>(EMPTY_BLOCK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Delete state ──
  const [deletingBlock, setDeletingBlock] = useState<AdminPromptBlock | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // ── Preview state ──
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<AdminPromptPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // ── Data fetching ──

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListPromptBlocks();
      setBlocks(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'No se pudo cargar la lista de bloques de prompt.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlocks();
  }, [loadBlocks]);

  // ── Filtered list ──

  const filteredBlocks =
    filterCategory === 'all'
      ? blocks
      : blocks.filter((b) => b.category === filterCategory);

  // ── Handlers ──

  function openCreate() {
    setEditingBlock(null);
    setForm(EMPTY_BLOCK_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(block: AdminPromptBlock) {
    setEditingBlock(block);
    setForm({
      key: block.key,
      label: block.label,
      content: block.content,
      category: block.category,
      scope: block.scope,
      template: block.template != null ? String(block.template) : '',
      industry: block.industry ?? '',
      sort_order: block.sort_order,
      is_active: block.is_active,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const payload: AdminPromptBlockPayload = {
      key: form.key.trim(),
      label: form.label.trim(),
      content: form.content,
      category: form.category,
      scope: form.scope,
      template:
        form.scope === 'template' && form.template.trim()
          ? parseInt(form.template.trim(), 10)
          : null,
      industry: form.scope === 'industry' ? form.industry.trim() : '',
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    try {
      if (editingBlock) {
        await adminUpdatePromptBlock(editingBlock.id, payload);
        toast.success('Bloque actualizado correctamente.');
      } else {
        await adminCreatePromptBlock(payload);
        toast.success('Bloque creado correctamente.');
      }
      setDialogOpen(false);
      setEditingBlock(null);
      setForm(EMPTY_BLOCK_FORM);
      await loadBlocks();
    } catch (err) {
      setFormError(
        extractErrorMessage(
          err,
          editingBlock
            ? 'No se pudo actualizar el bloque.'
            : 'No se pudo crear el bloque.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(block: AdminPromptBlock) {
    try {
      await adminUpdatePromptBlock(block.id, { is_active: !block.is_active });
      toast.success(block.is_active ? `${block.key} desactivado.` : `${block.key} activado.`);
      await loadBlocks();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo cambiar el estado.'));
    }
  }

  async function handleConfirmDelete() {
    if (!deletingBlock) return;
    setDeleteSubmitting(true);
    try {
      await adminDeletePromptBlock(deletingBlock.id);
      toast.success(`${deletingBlock.key} eliminado.`);
      setDeletingBlock(null);
      await loadBlocks();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'No se pudo eliminar el bloque.'));
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handlePreview() {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    try {
      const data = await adminPreviewPrompt({});
      setPreviewData(data);
    } catch (err) {
      setPreviewError(extractErrorMessage(err, 'No se pudo generar la vista previa del prompt.'));
    } finally {
      setPreviewLoading(false);
    }
  }

  // ── Render ──

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500">
            Bloques de prompt que componen las instrucciones para Pipe.
          </p>
          <Select
            value={filterCategory}
            onValueChange={(v) =>
              setFilterCategory(v as PromptBlockCategory | 'all')
            }
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handlePreview()}
            className={BTN_SECONDARY}
          >
            <Eye className="mr-1.5 inline-block h-4 w-4" aria-hidden="true" />
            Preview prompt
          </button>
          <button type="button" onClick={openCreate} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo bloque
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadBlocks()}
            className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-4"
                aria-hidden="true"
              >
                <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando bloques de prompt...
          </div>
        </div>
      ) : filteredBlocks.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <FileCode2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            {filterCategory === 'all'
              ? 'No hay bloques de prompt configurados'
              : `No hay bloques en la categoria "${filterCategory}"`}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Los bloques de prompt definen las instrucciones que Pipe usa para generar sitios web.
          </p>
        </div>
      ) : (
        /* Table */
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
                  Categoria
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Scope
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
              {filteredBlocks.map((b) => (
                <tr
                  key={b.id}
                  className="group transition-colors hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{b.key}</span>
                  </td>
                  <td className="max-w-[240px] px-4 py-3 text-slate-600">
                    {truncate(b.label, 50)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`${CATEGORY_BADGE_CLASSES[b.category]} hover:bg-inherit`}
                    >
                      {b.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`${SCOPE_BADGE_CLASSES[b.scope]} hover:bg-inherit`}
                    >
                      {b.scope}
                      {b.scope === 'template' && b.template_detail
                        ? `: ${b.template_detail.name}`
                        : ''}
                      {b.scope === 'industry' && b.industry
                        ? `: ${b.industry}`
                        : ''}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-700">
                    {b.sort_order}
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={b.is_active}
                      onCheckedChange={() => void handleToggle(b)}
                      aria-label={`${b.is_active ? 'Desactivar' : 'Activar'} ${b.key}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Acciones para ${b.key}`}
                        className={ACTION_TRIGGER}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            openEdit(b);
                          }}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            void handleToggle(b);
                          }}
                        >
                          <Power className="h-4 w-4" aria-hidden="true" />
                          {b.is_active ? 'Desactivar' : 'Activar'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setDeletingBlock(b);
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

      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditingBlock(null);
            setForm(EMPTY_BLOCK_FORM);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? 'Editar bloque' : 'Nuevo bloque de prompt'}
            </DialogTitle>
            <DialogDescription>
              {editingBlock
                ? 'Modifica los campos del bloque de prompt.'
                : 'Crea un nuevo bloque de prompt para las instrucciones de Pipe.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {/* key */}
            <div>
              <label
                htmlFor="pb-key"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Key
              </label>
              <input
                id="pb-key"
                type="text"
                required
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="ej: system_base_instructions"
                className={INPUT_CLASS}
              />
            </div>

            {/* label */}
            <div>
              <label
                htmlFor="pb-label"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Label
              </label>
              <input
                id="pb-label"
                type="text"
                required
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="ej: Instrucciones base del sistema"
                className={INPUT_CLASS}
              />
            </div>

            {/* content */}
            <div>
              <label
                htmlFor="pb-content"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Contenido
              </label>
              <textarea
                id="pb-content"
                required
                rows={8}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Contenido del bloque de prompt..."
                className={`${TEXTAREA_CLASS} font-mono`}
              />
            </div>

            {/* category + scope */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Categoria
                </label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm({ ...form, category: v as PromptBlockCategory })
                  }
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Scope
                </label>
                <Select
                  value={form.scope}
                  onValueChange={(v) =>
                    setForm({ ...form, scope: v as PromptBlockScope })
                  }
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* template (conditional) */}
            {form.scope === 'template' && (
              <div>
                <label
                  htmlFor="pb-template"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Template ID
                </label>
                <input
                  id="pb-template"
                  type="number"
                  value={form.template}
                  onChange={(e) => setForm({ ...form, template: e.target.value })}
                  placeholder="ID del template"
                  className={INPUT_CLASS}
                />
              </div>
            )}

            {/* industry (conditional) */}
            {form.scope === 'industry' && (
              <div>
                <label
                  htmlFor="pb-industry"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Industria
                </label>
                <input
                  id="pb-industry"
                  type="text"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="ej: wellness, food, fitness"
                  className={INPUT_CLASS}
                />
              </div>
            )}

            {/* sort_order + is_active */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="pb-sort"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Orden
                </label>
                <input
                  id="pb-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })
                  }
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch
                  id="pb-active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <label
                  htmlFor="pb-active"
                  className="text-sm font-medium text-slate-700"
                >
                  Activo
                </label>
              </div>
            </div>

            {/* Form error */}
            {formError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
                {submitting && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {editingBlock ? 'Guardar cambios' : 'Crear bloque'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog
        open={!!deletingBlock}
        onOpenChange={(open) => {
          if (!open) setDeletingBlock(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar bloque</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara el bloque <strong>{deletingBlock?.key}</strong>. Esta
              accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleteSubmitting}
              className="bg-red-600 text-white hover:bg-red-500 focus:ring-red-600"
            >
              {deleteSubmitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Preview Dialog ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vista previa del prompt</DialogTitle>
            <DialogDescription>
              Prompt ensamblado a partir de los bloques activos.
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Generando vista previa...
            </div>
          ) : previewError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {previewError}
            </div>
          ) : previewData ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>
                  Bloques: <strong className="text-slate-700">{previewData.block_count}</strong>
                </span>
                {previewData.template_used && (
                  <span>
                    Template: <strong className="text-slate-700">{previewData.template_used}</strong>
                  </span>
                )}
              </div>
              <pre className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800">
                {previewData.prompt}
              </pre>
            </div>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className={BTN_SECONDARY}
            >
              Cerrar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
