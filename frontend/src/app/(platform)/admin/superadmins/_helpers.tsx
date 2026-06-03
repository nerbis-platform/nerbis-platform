'use client';

import type { InternalRole, SuperadminStatus } from '@/types/admin';
import { Badge } from '@/components/ui/badge';

// ─── Constants ────────────────────────────────────────────

export const PAGE_SIZE = 20;

export const ROLE_LABELS: Record<Exclude<InternalRole, 'owner'>, { label: string; description: string }> = {
  admin: { label: 'Admin', description: 'Acceso completo excepto cambio de roles y eliminacion.' },
  support: { label: 'Soporte', description: 'Puede ver datos y gestionar tenants. No puede gestionar superadmins.' },
  viewer: { label: 'Viewer', description: 'Solo lectura. No puede realizar acciones.' },
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  superadmin_blocked: 'Superadmin bloqueado',
  superadmin_unblocked: 'Superadmin desbloqueado',
  superadmin_deactivated: 'Superadmin desactivado',
  superadmin_reactivated: 'Superadmin reactivado',
  superadmin_deleted: 'Superadmin eliminado',
  superadmin_role_changed: 'Rol cambiado',
  superadmin_created: 'Superadmin creado',
  superadmin_login: 'Inicio de sesion',
};

// ─── Types ────────────────────────────────────────────────

export interface CreateFormState {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export const EMPTY_FORM: CreateFormState = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
};

// ─── Helpers ──────────────────────────────────────────────

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isInactive(lastLogin: string | null): boolean {
  if (!lastLogin) return true;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return new Date(lastLogin).getTime() < thirtyDaysAgo;
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const data = (err as { data?: { blocking_summary?: string } }).data;
    const message = err instanceof Error ? err.message : fallback;
    if (data?.blocking_summary) {
      return `${message} (${data.blocking_summary})`;
    }
    if (err instanceof Error) return err.message;
  }
  return fallback;
}

// ─── Badge components ─────────────────────────────────────

export function statusBadge(status: SuperadminStatus) {
  switch (status) {
    case 'active':
      return (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
          Activo
        </Badge>
      );
    case 'blocked':
      return (
        <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
          Bloqueado
        </Badge>
      );
    case 'deactivated':
      return (
        <Badge variant="secondary" className="text-slate-500">
          Desactivado
        </Badge>
      );
  }
}

export function roleBadge(role: InternalRole) {
  switch (role) {
    case 'owner':
      return <Badge className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-50">Owner</Badge>;
    case 'admin':
      return <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">Admin</Badge>;
    case 'support':
      return <Badge variant="secondary">Soporte</Badge>;
    case 'viewer':
      return <Badge variant="outline">Viewer</Badge>;
  }
}
