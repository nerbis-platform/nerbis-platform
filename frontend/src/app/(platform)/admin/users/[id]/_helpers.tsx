'use client';

import type {
  AdminPasskey,
  AdminSocialAccount,
  AdminSocialProvider,
  AdminTenantUserRole,
  AdminUserDetail,
} from '@/types/admin';
import type { LucideIcon } from 'lucide-react';
import { Apple, Chrome, Facebook } from 'lucide-react';

// Re-export shared helpers
export { formatDate, formatDateTime, roleBadgeClass, InfoRow } from '../../_shared/helpers';

// ─── Constants ────────────────────────────────────────────

export const ROLE_LABELS: Record<AdminTenantUserRole, string> = {
  admin: 'Admin',
  staff: 'Staff',
  customer: 'Cliente',
};

export const PROVIDER_LABELS: Record<AdminSocialProvider, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
};

export const PROVIDER_ICONS: Record<AdminSocialProvider, LucideIcon> = {
  google: Chrome,
  apple: Apple,
  facebook: Facebook,
};

// ─── Types ────────────────────────────────────────────────

export type PendingStatus = 'activate' | 'deactivate' | null;
export type PendingUnlink = { social: AdminSocialAccount } | null;
export type PendingPasskey = { passkey: AdminPasskey } | null;
export type PendingReset = boolean;
export type Pending2FA = boolean;

// ─── Badge helpers ────────────────────────────────────────

export function statusBadgeClass(isActive: boolean): string {
  return isActive
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : 'bg-slate-100 text-slate-500 ring-slate-200';
}

// ─── Utility functions ────────────────────────────────────

export function fullName(user: AdminUserDetail): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return name || '\u2014';
}

// ─── Sub-components ───────────────────────────────────────

export function AuthCardEmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 px-4 py-6 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
        {icon}
      </span>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="max-w-xs text-xs text-slate-500">{description}</p>
    </div>
  );
}

export function AdminUserDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="h-40 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 h-4 w-40 rounded bg-slate-100" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-3/4 rounded bg-slate-100" />
          <div className="h-3 w-2/3 rounded bg-slate-100" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-48 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-4 h-4 w-32 rounded bg-slate-100" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="h-3 w-3/4 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
