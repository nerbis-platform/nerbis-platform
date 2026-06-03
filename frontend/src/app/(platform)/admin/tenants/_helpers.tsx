'use client';

import type {
  AdminTenant,
  AdminTenantPlan,
  AdminSubscriptionStatus,
} from '@/types/admin';

// Re-export shared helpers used by both list and detail pages
export {
  formatDate,
  PLAN_LABELS,
  SUBSCRIPTION_LABELS,
  planBadgeClass,
  subscriptionBadgeClass,
  PhaseBadge,
} from './[id]/_helpers';

// ─── Constants ────────────────────────────────────────────

export const PAGE_SIZE = 20;

// ─── Types ────────────────────────────────────────────────

export type PlanFilter = 'all' | AdminTenantPlan;
export type StatusFilter = 'all' | 'active' | 'inactive';

export type PendingAction = {
  tenant: AdminTenant;
  target: 'activate' | 'deactivate' | 'delete' | 'restore';
};

// ─── Filter chip labels ──────────────────────────────────

export const PLAN_CHIP_LABELS: Record<AdminTenantPlan, string> = {
  trial: 'Plan: Trial',
  basic: 'Plan: Basico',
  professional: 'Plan: Profesional',
  enterprise: 'Plan: Enterprise',
};

export const STATUS_CHIP_LABELS: Record<Exclude<StatusFilter, 'all'>, string> = {
  active: 'Estado: Activos',
  inactive: 'Estado: Suspendidos',
};
