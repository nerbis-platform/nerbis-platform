// src/app/(platform)/admin/settings/industries/_components/AIModelsTab.tsx
//
// Per-task AI model configuration (list + edit the seeded rows).
// `task` is the natural key and is read-only; only model / max_tokens /
// temperature / is_active are editable. All requests go through `adminClient`.
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminListAIModels,
  adminUpdateAIModel,
} from '@/lib/api/admin-industries';
import type {
  AdminAIModelConfig,
  AdminAIModelConfigPayload,
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

const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20';

export function AIModelsTab() {
  const [models, setModels] = useState<AdminAIModelConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminAIModelConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formModel, setFormModel] = useState('');
  const [formMaxTokens, setFormMaxTokens] = useState(0);
  const [formTemperature, setFormTemperature] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await adminListAIModels();
      setModels(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la configuracion de modelos.';
      setListError(message);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  function openEdit(cfg: AdminAIModelConfig) {
    setEditing(cfg);
    setFormModel(cfg.model);
    setFormMaxTokens(cfg.max_tokens);
    setFormTemperature(cfg.temperature);
    setFormIsActive(cfg.is_active);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      const payload: AdminAIModelConfigPayload = {
        model: formModel.trim(),
        max_tokens: formMaxTokens,
        temperature: formTemperature.trim(),
        is_active: formIsActive,
      };
      await adminUpdateAIModel(editing.id, payload);
      toast.success(`Configuracion de "${editing.task_display}" actualizada.`);
      setEditing(null);
      void loadModels();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la configuracion.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <p className="mb-5 text-sm text-slate-500">
        Modelo de IA usado por cada tarea. Las tareas son fijas; edita el
        modelo, el limite de tokens, la temperatura y su estado.
      </p>

      {listError && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{listError}</span>
          <button
            type="button"
            onClick={() => void loadModels()}
            className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-4"
                aria-hidden="true"
              >
                <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[800px] w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Tarea
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Modelo
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Max tokens
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Temperatura
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
              {models.map((cfg) => (
                <tr
                  key={cfg.id}
                  className="group transition-colors hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3">
                    <span className="block font-medium text-slate-900">
                      {cfg.task_display}
                    </span>
                    <span className="block font-mono text-xs text-slate-500">
                      {cfg.task}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {cfg.model}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {cfg.max_tokens}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {cfg.temperature}
                  </td>
                  <td className="px-4 py-3">
                    {cfg.is_active ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        Activa
                      </Badge>
                    ) : (
                      <Badge className="border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-100">
                        Inactiva
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(cfg)}
                      aria-label={`Editar ${cfg.task_display}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Edit Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !submitting) setEditing(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Configuracion: {editing?.task_display}
            </DialogTitle>
            <DialogDescription>
              La tarea es fija. Edita el modelo y sus parametros.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="aim-model"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Modelo
              </label>
              <input
                id="aim-model"
                type="text"
                required
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                placeholder="ej: claude-3-haiku-20240307"
                className={INPUT_CLASS}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="aim-tokens"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Max tokens
                </label>
                <input
                  id="aim-tokens"
                  type="number"
                  min={1}
                  required
                  value={formMaxTokens}
                  onChange={(e) => setFormMaxTokens(Number(e.target.value))}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label
                  htmlFor="aim-temperature"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Temperatura
                </label>
                <input
                  id="aim-temperature"
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  required
                  value={formTemperature}
                  onChange={(e) => setFormTemperature(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="pb-1">
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <Switch
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
                <span>{formIsActive ? 'Activa' : 'Inactiva'}</span>
              </label>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={submitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !formModel.trim()}
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:opacity-50"
              >
                {submitting && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Guardar cambios
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
