'use client';

import type { AdminTenantUserRole } from '@/types/admin';

// ─── Date formatting ──────────────────────────────────────

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── Badge classes ────────────────────────────────────────

export function roleBadgeClass(role: AdminTenantUserRole): string {
  switch (role) {
    case 'admin':
      return 'bg-teal-50 text-teal-700 ring-teal-200';
    case 'staff':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
    case 'customer':
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200';
  }
}

// ─── Shared sub-components ────────────────────────────────

export function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon ? (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </dt>
        <dd
          className={`mt-0.5 text-sm text-slate-900 ${mono ? 'font-mono' : ''}`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}
