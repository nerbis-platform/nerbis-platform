// src/app/(platform)/admin/settings/industries/_components/AIStatsTab.tsx
//
// Read-only AI usage statistics aggregated over AIGenerationLog.
// Shows grand totals + breakdowns by generation type and by model.
// All requests go through `adminClient`.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { adminGetAIStats } from '@/lib/api/admin-industries';
import type { AdminAIStats } from '@/types/admin';

const NUMBER_FMT = new Intl.NumberFormat('es-MX');

function formatTokens(n: number): string {
  return NUMBER_FMT.format(n);
}

function formatCost(value: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return `$${value}`;
  return `$${num.toFixed(4)}`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-slate-900">
        {value}
      </p>
    </div>
  );
}

export function AIStatsTab() {
  const [stats, setStats] = useState<AdminAIStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await adminGetAIStats();
      setStats(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las estadisticas.';
      setListError(message);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-16 text-sm text-slate-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando estadisticas...
      </div>
    );
  }

  if (listError) {
    return (
      <div
        role="alert"
        className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        <span>{listError}</span>
        <button
          type="button"
          onClick={() => void loadStats()}
          className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const { totals, by_generation_type, by_model } = stats;

  return (
    <div className="flex flex-col gap-6">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Generaciones"
          value={formatTokens(totals.count)}
        />
        <StatCard
          label="Tokens entrada"
          value={formatTokens(totals.tokens_input)}
        />
        <StatCard
          label="Tokens salida"
          value={formatTokens(totals.tokens_output)}
        />
        <StatCard
          label="Costo estimado"
          value={formatCost(totals.cost_estimated)}
        />
      </div>

      {/* By generation type */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Por tipo de generacion
        </h2>
        {by_generation_type.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Aun no hay generaciones registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[700px] w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Generaciones
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Tokens entrada
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Tokens salida
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Costo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {by_generation_type.map((row) => (
                  <tr key={row.generation_type}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {row.generation_type}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatTokens(row.count)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatTokens(row.tokens_input)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatTokens(row.tokens_output)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatCost(row.cost_estimated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* By model */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Por modelo
        </h2>
        {by_model.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Aun no hay generaciones registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[700px] w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Modelo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Generaciones
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Tokens entrada
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Tokens salida
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Costo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {by_model.map((row) => (
                  <tr key={row.model_used || 'unknown'}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {row.model_used || '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatTokens(row.count)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatTokens(row.tokens_input)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatTokens(row.tokens_output)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatCost(row.cost_estimated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
