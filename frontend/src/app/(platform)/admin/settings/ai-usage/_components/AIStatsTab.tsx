// src/app/(platform)/admin/settings/ai-usage/_components/AIStatsTab.tsx
//
// Read-only AI usage statistics aggregated over AIGenerationLog.
// Shows grand totals + breakdowns by generation type, model and tenant,
// plus a paginated detail of individual logs (all fields, for data analysis).
// All requests go through `adminClient`.
'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { adminGetAIStats, adminListAILogs } from '@/lib/api/admin-industries';
import type {
  AdminAIStats,
  AdminAIGenerationLog,
  AdminAIGenerationLogPage,
} from '@/types/admin';

const NUMBER_FMT = new Intl.NumberFormat('es-MX');
const DATE_FMT = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const LOGS_PAGE_SIZE = 25;

function formatTokens(n: number): string {
  return NUMBER_FMT.format(n);
}

function formatCost(value: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return `$${value}`;
  return `$${num.toFixed(4)}`;
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return DATE_FMT.format(d);
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

const TH_LEFT =
  'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500';
const TH_RIGHT =
  'px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500';

function LogDetail({ log }: { log: AdminAIGenerationLog }) {
  return (
    <div className="grid gap-3 bg-slate-50/70 px-4 py-4 text-xs text-slate-700 lg:grid-cols-2">
      <dl className="space-y-1">
        <div className="flex gap-2">
          <dt className="font-medium text-slate-500">ID:</dt>
          <dd className="font-mono">{log.id}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-slate-500">Website config:</dt>
          <dd className="font-mono">{log.website_config ?? '\u2014'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-slate-500">Seccion:</dt>
          <dd className="font-mono">{log.section_id || '\u2014'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-slate-500">Facturable:</dt>
          <dd>{log.is_billable ? 'Si' : 'No'}</dd>
        </div>
        {log.error_message ? (
          <div className="flex gap-2">
            <dt className="font-medium text-red-500">Error:</dt>
            <dd className="text-red-700">{log.error_message}</dd>
          </div>
        ) : null}
      </dl>
      <div className="space-y-2">
        {log.prompt_summary ? (
          <div>
            <p className="font-medium text-slate-500">Resumen del prompt</p>
            <p className="mt-0.5 whitespace-pre-wrap break-words">
              {log.prompt_summary}
            </p>
          </div>
        ) : null}
        {log.full_prompt ? (
          <details>
            <summary className="cursor-pointer font-medium text-slate-500">
              Prompt completo
            </summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-white p-2">
              {log.full_prompt}
            </pre>
          </details>
        ) : null}
        {log.raw_response ? (
          <details>
            <summary className="cursor-pointer font-medium text-slate-500">
              Respuesta cruda
            </summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-white p-2">
              {log.raw_response}
            </pre>
          </details>
        ) : null}
        {log.onboarding_snapshot ? (
          <details>
            <summary className="cursor-pointer font-medium text-slate-500">
              Snapshot de onboarding
            </summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-white p-2">
              {JSON.stringify(log.onboarding_snapshot, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}

export function AIStatsTab() {
  const [stats, setStats] = useState<AdminAIStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [logs, setLogs] = useState<AdminAIGenerationLogPage | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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

  const loadLogs = useCallback(async (page: number) => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const data = await adminListAILogs({
        page,
        page_size: LOGS_PAGE_SIZE,
      });
      setLogs(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el detalle de logs.';
      setLogsError(message);
      setLogs(null);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadLogs(logsPage);
  }, [loadLogs, logsPage]);

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
  const by_tenant = stats.by_tenant ?? [];

  const totalPages = logs
    ? Math.max(1, Math.ceil(logs.count / LOGS_PAGE_SIZE))
    : 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Generaciones" value={formatTokens(totals.count)} />
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
                  <th className={TH_LEFT}>Tipo</th>
                  <th className={TH_RIGHT}>Generaciones</th>
                  <th className={TH_RIGHT}>Tokens entrada</th>
                  <th className={TH_RIGHT}>Tokens salida</th>
                  <th className={TH_RIGHT}>Costo</th>
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
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Por modelo</h2>
        {by_model.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Aun no hay generaciones registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[700px] w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className={TH_LEFT}>Modelo</th>
                  <th className={TH_RIGHT}>Generaciones</th>
                  <th className={TH_RIGHT}>Tokens entrada</th>
                  <th className={TH_RIGHT}>Tokens salida</th>
                  <th className={TH_RIGHT}>Costo</th>
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

      {/* By tenant */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Por tenant
        </h2>
        {by_tenant.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Aun no hay generaciones registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[800px] w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className={TH_LEFT}>Tenant</th>
                  <th className={TH_RIGHT}>Generaciones</th>
                  <th className={TH_RIGHT}>Exitosas</th>
                  <th className={TH_RIGHT}>Fallidas</th>
                  <th className={TH_RIGHT}>Tokens entrada</th>
                  <th className={TH_RIGHT}>Tokens salida</th>
                  <th className={TH_RIGHT}>Costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {by_tenant.map((row) => (
                  <tr key={row.tenant_id ?? 'unknown'}>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="font-medium">
                        {row.tenant_name || '\u2014'}
                      </span>
                      {row.tenant_slug ? (
                        <span className="ml-1 font-mono text-xs text-slate-400">
                          {row.tenant_slug}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatTokens(row.count)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-600">
                      {formatTokens(row.successful)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600">
                      {formatTokens(row.failed)}
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

      {/* Detailed logs */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Detalle de consultas
          </h2>
          {logs ? (
            <p className="text-xs text-slate-500">
              {formatTokens(logs.count)} registros
            </p>
          ) : null}
        </div>

        {logsError ? (
          <div
            role="alert"
            className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{logsError}</span>
            <button
              type="button"
              onClick={() => void loadLogs(logsPage)}
              className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Reintentar
            </button>
          </div>
        ) : logsLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-12 text-sm text-slate-500 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando detalle...
          </div>
        ) : !logs || logs.results.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Aun no hay generaciones registradas.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="w-8 px-2 py-3" />
                    <th className={TH_LEFT}>Fecha</th>
                    <th className={TH_LEFT}>Tenant</th>
                    <th className={TH_LEFT}>Tipo</th>
                    <th className={TH_LEFT}>Modelo</th>
                    <th className={TH_RIGHT}>Tokens</th>
                    <th className={TH_RIGHT}>Costo</th>
                    <th className={TH_LEFT}>Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.results.map((log) => {
                    const isExpanded = expandedId === log.id;
                    return (
                      <Fragment key={log.id}>
                        <tr
                          className="cursor-pointer hover:bg-slate-50/50"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : log.id)
                          }
                        >
                          <td className="px-2 py-3 text-slate-400">
                            {isExpanded ? (
                              <ChevronDown
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            ) : (
                              <ChevronRight
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <span className="font-medium">
                              {log.tenant_name || '\u2014'}
                            </span>
                            {log.tenant_slug ? (
                              <span className="ml-1 font-mono text-xs text-slate-400">
                                {log.tenant_slug}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {log.generation_type}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {log.model_used || '\u2014'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                            {formatTokens(log.total_tokens)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                            {formatCost(log.cost_estimated)}
                          </td>
                          <td className="px-4 py-3">
                            {log.is_successful ? (
                              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                Exitosa
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                Fallida
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr>
                            <td colSpan={8} className="p-0">
                              <LogDetail log={log} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-3 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                disabled={!logs.previous}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs text-slate-500">
                Pagina {logsPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setLogsPage((p) => p + 1)}
                disabled={!logs.next}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
