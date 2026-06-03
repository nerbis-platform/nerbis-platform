// src/components/admin/marketing-sections-manager.tsx
//
// Reusable component for marketing landing page content management.
// Extracted from the marketing page so it can be embedded
// in the unified "Home" admin page as well.
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import {
  adminListMarketingSections,
  adminUpdateMarketingSection,
  adminResetMarketingSection,
  type AdminMarketingSectionResponse,
} from '@/lib/api/admin-marketing';
import { toast } from 'sonner';
import type { MarketingSectionKey } from '@/types/marketing';
import {
  SECTION_LABELS,
  SECTION_ORDER,
  SECTION_FIELDS,
  INPUT_CLASS,
  TEXTAREA_CLASS,
  type FieldDef,
  type ArrayFieldDef,
  type SectionFieldConfig,
} from './marketing-sections-helpers';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

// ──────────────────────────────────────────────────────────────────────
// Section Card component
// ──────────────────────────────────────────────────────────────────────

function SectionCard({
  section,
  onSave,
  onReset,
  onToggleVisibility,
}: {
  section: AdminMarketingSectionResponse;
  onSave: (key: MarketingSectionKey, content: Record<string, unknown>) => Promise<void>;
  onReset: (key: MarketingSectionKey) => void;
  onToggleVisibility: (key: MarketingSectionKey, visible: boolean) => Promise<void>;
}) {
  const sectionKey = section.key;
  const config = SECTION_FIELDS[sectionKey];
  const label = SECTION_LABELS[sectionKey] ?? sectionKey;

  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<Record<string, unknown>>(
    () => ({ ...section.content }),
  );
  const [saving, setSaving] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  // Sync content when section prop changes (e.g. after reset)
  useEffect(() => {
    setContent({ ...section.content });
  }, [section.content]);

  // ── Field value helpers ─────────────────────────────────────────────

  function getFieldValue(fieldKey: string): string {
    const val = content[fieldKey];
    return typeof val === 'string' ? val : '';
  }

  function setFieldValue(fieldKey: string, value: string) {
    setContent((prev) => ({ ...prev, [fieldKey]: value }));
  }

  function getArrayValue(arrayKey: string): Record<string, unknown>[] {
    const val = content[arrayKey];
    return Array.isArray(val) ? (val as Record<string, unknown>[]) : [];
  }

  function setArrayItemField(
    arrayKey: string,
    index: number,
    fieldKey: string,
    value: string,
  ) {
    setContent((prev) => {
      const arr = Array.isArray(prev[arrayKey])
        ? [...(prev[arrayKey] as Record<string, unknown>[])]
        : [];
      arr[index] = { ...arr[index], [fieldKey]: value };
      return { ...prev, [arrayKey]: arr };
    });
  }

  function addArrayItem(arrayKey: string, arrayFieldDef: ArrayFieldDef) {
    setContent((prev) => {
      const arr = Array.isArray(prev[arrayKey])
        ? [...(prev[arrayKey] as Record<string, unknown>[])]
        : [];
      const newItem: Record<string, string> = {};
      for (const field of arrayFieldDef.fields) {
        newItem[field.key] = '';
      }
      return { ...prev, [arrayKey]: [...arr, newItem] };
    });
  }

  function removeArrayItem(arrayKey: string, index: number) {
    setContent((prev) => {
      const arr = Array.isArray(prev[arrayKey])
        ? [...(prev[arrayKey] as Record<string, unknown>[])]
        : [];
      arr.splice(index, 1);
      return { ...prev, [arrayKey]: arr };
    });
  }

  // ── Save handler ────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(sectionKey, content);
    } finally {
      setSaving(false);
    }
  }

  // ── Visibility toggle ──────────────────────────────────────────────

  async function handleToggleVisibility(checked: boolean) {
    setTogglingVisibility(true);
    try {
      await onToggleVisibility(sectionKey, checked);
    } finally {
      setTogglingVisibility(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Section header */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex flex-1 items-center gap-3 text-left focus:outline-none"
              aria-label={`${isOpen ? 'Colapsar' : 'Expandir'} seccion ${label}`}
            >
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-0' : '-rotate-90'
                }`}
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-slate-900">
                {label}
              </span>
              {!section.is_visible && (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                  Oculta
                </span>
              )}
            </button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hidden sm:inline">Visible</span>
              <Switch
                checked={section.is_visible}
                onCheckedChange={handleToggleVisibility}
                disabled={togglingVisibility}
                aria-label={`Visibilidad de ${label}`}
              />
            </label>
          </div>
        </div>

        {/* Collapsible content */}
        <CollapsibleContent>
          <div className="border-t border-slate-100 px-4 py-5 sm:px-6">
            {/* Simple text fields */}
            <div className="space-y-4">
              {config.fields.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={`${sectionKey}-${field.key}`}
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    {field.label}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={`${sectionKey}-${field.key}`}
                      rows={3}
                      value={getFieldValue(field.key)}
                      onChange={(e) => setFieldValue(field.key, e.target.value)}
                      className={TEXTAREA_CLASS}
                    />
                  ) : (
                    <input
                      id={`${sectionKey}-${field.key}`}
                      type={field.type === 'url' ? 'url' : 'text'}
                      value={getFieldValue(field.key)}
                      onChange={(e) => setFieldValue(field.key, e.target.value)}
                      className={INPUT_CLASS}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Array fields */}
            {config.arrayFields?.map((arrayField) => {
              const items = getArrayValue(arrayField.key);
              return (
                <div key={arrayField.key} className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-700">
                      {arrayField.label}
                    </h4>
                    <button
                      type="button"
                      onClick={() => addArrayItem(arrayField.key, arrayField)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Agregar {arrayField.itemLabel.toLowerCase()}
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                      No hay elementos. Usa el boton para agregar uno.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div
                          key={index}
                          className="relative rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                              {arrayField.itemLabel} {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removeArrayItem(arrayField.key, index)
                              }
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label={`Eliminar ${arrayField.itemLabel.toLowerCase()} ${index + 1}`}
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                              Eliminar
                            </button>
                          </div>
                          <div
                            className={`grid gap-3 ${
                              arrayField.fields.length <= 2
                                ? 'sm:grid-cols-2'
                                : 'sm:grid-cols-1'
                            }`}
                          >
                            {arrayField.fields.map((subField) => (
                              <div key={subField.key}>
                                <label
                                  htmlFor={`${sectionKey}-${arrayField.key}-${index}-${subField.key}`}
                                  className="mb-1 block text-xs font-medium text-slate-600"
                                >
                                  {subField.label}
                                </label>
                                {subField.type === 'textarea' ? (
                                  <textarea
                                    id={`${sectionKey}-${arrayField.key}-${index}-${subField.key}`}
                                    rows={2}
                                    value={
                                      typeof item[subField.key] === 'string'
                                        ? (item[subField.key] as string)
                                        : ''
                                    }
                                    onChange={(e) =>
                                      setArrayItemField(
                                        arrayField.key,
                                        index,
                                        subField.key,
                                        e.target.value,
                                      )
                                    }
                                    className={TEXTAREA_CLASS}
                                  />
                                ) : (
                                  <input
                                    id={`${sectionKey}-${arrayField.key}-${index}-${subField.key}`}
                                    type="text"
                                    value={
                                      typeof item[subField.key] === 'string'
                                        ? (item[subField.key] as string)
                                        : ''
                                    }
                                    onChange={(e) =>
                                      setArrayItemField(
                                        arrayField.key,
                                        index,
                                        subField.key,
                                        e.target.value,
                                      )
                                    }
                                    className={INPUT_CLASS}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Actions */}
            <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => onReset(sectionKey)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Restablecer
              </button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────

export function MarketingSectionsManager({
  sectionFilter,
}: {
  sectionFilter?: MarketingSectionKey;
} = {}) {
  // ── Data state ──────────────────────────────────────────────────────
  const [sections, setSections] = useState<AdminMarketingSectionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Reset confirmation state ──────────────────────────────────────
  const [resetTarget, setResetTarget] = useState<MarketingSectionKey | null>(null);
  const [resetting, setResetting] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────
  const loadSections = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await adminListMarketingSections();
      setSections(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar las secciones de marketing.';
      setListError(message);
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  // ── Save section content ──────────────────────────────────────────
  async function handleSave(
    key: MarketingSectionKey,
    content: Record<string, unknown>,
  ) {
    try {
      const updated = await adminUpdateMarketingSection(key, { content });
      setSections((prev) =>
        prev.map((s) => (s.key === key ? updated : s)),
      );
      toast.success(
        `Seccion "${SECTION_LABELS[key]}" actualizada.`,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la seccion.';
      toast.error(message);
    }
  }

  // ── Toggle visibility ─────────────────────────────────────────────
  async function handleToggleVisibility(
    key: MarketingSectionKey,
    visible: boolean,
  ) {
    try {
      const updated = await adminUpdateMarketingSection(key, {
        is_visible: visible,
      });
      setSections((prev) =>
        prev.map((s) => (s.key === key ? updated : s)),
      );
      toast.success(
        visible
          ? `Seccion "${SECTION_LABELS[key]}" visible.`
          : `Seccion "${SECTION_LABELS[key]}" oculta.`,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar la visibilidad.';
      toast.error(message);
    }
  }

  // ── Reset section ─────────────────────────────────────────────────
  async function handleReset() {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const updated = await adminResetMarketingSection(resetTarget);
      setSections((prev) =>
        prev.map((s) => (s.key === resetTarget ? updated : s)),
      );
      toast.success(
        `Seccion "${SECTION_LABELS[resetTarget]}" restablecida.`,
      );
      setResetTarget(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo restablecer la seccion.';
      toast.error(message);
    } finally {
      setResetting(false);
    }
  }

  // ── Sorted sections ───────────────────────────────────────────────
  const order = sectionFilter ? [sectionFilter] : SECTION_ORDER;
  const sortedSections = order
    .map((key) => sections.find((s) => s.key === key))
    .filter(Boolean) as AdminMarketingSectionResponse[];

  const title = sectionFilter
    ? SECTION_LABELS[sectionFilter]
    : 'Secciones de contenido';

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
          {title}
        </h2>
        {!sectionFilter && (
          <p className="mt-1 text-sm text-slate-500">
            Edita los textos de cada seccion del landing.
          </p>
        )}
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
              onClick={() => void loadSections()}
              className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                aria-hidden="true"
              >
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="h-4 w-4 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                  <div className="ml-auto h-5 w-10 animate-pulse rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Cargando secciones...
            </div>
          </div>
        ) : sortedSections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              No hay secciones configuradas
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Las secciones del landing page se crean automaticamente desde el
              backend. Verifica la conexion con la API.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSections.map((section) => (
              <SectionCard
                key={section.key}
                section={section}
                onSave={handleSave}
                onReset={(key) => setResetTarget(key)}
                onToggleVisibility={handleToggleVisibility}
              />
            ))}
          </div>
        )}
      {/* ── Reset Confirmation Dialog ─────────────────────────────────── */}
      <AlertDialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restablecer seccion</AlertDialogTitle>
            <AlertDialogDescription>
              {resetTarget
                ? `Se restablecera la seccion "${SECTION_LABELS[resetTarget]}" a sus valores por defecto. Los cambios actuales se perderan.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleReset();
              }}
              disabled={resetting}
              className="bg-red-600 hover:bg-red-500 focus:ring-red-500"
            >
              {resetting ? 'Restableciendo...' : 'Si, restablecer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
