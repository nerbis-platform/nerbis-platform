'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import type {
  AdminTenantPlan,
  AdminSubscriptionStatus,
  AdminTenantPhase,
  AdminTenantUserRole,
} from '@/types/admin';

// Re-export shared helpers
export { formatDate, formatDateTime, roleBadgeClass, InfoRow } from '../../_shared/helpers';

// ─── Constants ────────────────────────────────────────────

export const USERS_PAGE_SIZE = 20;

export const PLAN_LABELS: Record<AdminTenantPlan, string> = {
  trial: 'Trial',
  basic: 'Básico',
  professional: 'Profesional',
  enterprise: 'Enterprise',
};

export const SUBSCRIPTION_LABELS: Record<AdminSubscriptionStatus, string> = {
  active: 'Activa',
  trial: 'Trial',
  expired: 'Vencida',
  inactive: 'Inactiva',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  customer: 'Cliente',
};

export const INDUSTRY_OPTIONS: { value: string; label: string }[] = [
  { value: 'beauty', label: 'Salon de Belleza / Barberia' },
  { value: 'spa', label: 'Spa / Centro de Bienestar' },
  { value: 'nails', label: 'Unas / Nail Bar' },
  { value: 'gym', label: 'Gimnasio / Fitness' },
  { value: 'yoga', label: 'Yoga / Pilates / Danza' },
  { value: 'clinic', label: 'Clinica / Consultorio Medico' },
  { value: 'dental', label: 'Odontologia' },
  { value: 'psychology', label: 'Psicologia / Terapias' },
  { value: 'nutrition', label: 'Nutricion / Dietetica' },
  { value: 'veterinary', label: 'Veterinaria / Pet Shop' },
  { value: 'restaurant', label: 'Restaurante / Cafeteria' },
  { value: 'bakery', label: 'Panaderia / Pasteleria' },
  { value: 'store', label: 'Tienda / Retail' },
  { value: 'fashion', label: 'Moda / Boutique' },
  { value: 'education', label: 'Educacion / Academia' },
  { value: 'coworking', label: 'Coworking / Oficina' },
  { value: 'photography', label: 'Fotografia / Videografia' },
  { value: 'architecture', label: 'Arquitectura / Diseno' },
  { value: 'legal', label: 'Abogados / Consultoria Legal' },
  { value: 'accounting', label: 'Contabilidad / Finanzas' },
  { value: 'marketing', label: 'Marketing / Publicidad' },
  { value: 'tech', label: 'Tecnologia / Software' },
  { value: 'real_estate', label: 'Inmobiliaria' },
  { value: 'automotive', label: 'Automotriz / Taller Mecanico' },
  { value: 'events', label: 'Eventos / Wedding Planner' },
  { value: 'travel', label: 'Turismo / Agencia de Viajes' },
  { value: 'services', label: 'Servicios Profesionales' },
  { value: 'other', label: 'Otro' },
];

export const INDUSTRY_LABELS: Record<string, string> = Object.fromEntries(
  INDUSTRY_OPTIONS.map(({ value, label }) => [value, label]),
);

// ─── Types ────────────────────────────────────────────────

export type RoleFilter = 'all' | AdminTenantUserRole;
export type StatusFilter = 'all' | 'active' | 'inactive';
export type PendingAction = 'activate' | 'deactivate' | 'delete' | null;

// ─── Badge helpers ────────────────────────────────────────

export function planBadgeClass(plan: AdminTenantPlan): string {
  switch (plan) {
    case 'enterprise':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200';
    case 'professional':
      return 'bg-teal-50 text-teal-700 ring-teal-200';
    case 'basic':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    case 'trial':
    default:
      return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
}

export function subscriptionBadgeClass(
  status: AdminSubscriptionStatus,
  isActive: boolean,
): string {
  if (!isActive) return 'bg-red-50 text-red-700 ring-red-200';
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'trial':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'expired':
      return 'bg-red-50 text-red-700 ring-red-200';
    case 'inactive':
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200';
  }
}

// ─── Sub-components ───────────────────────────────────────

export function FeatureFlag({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/40 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      {enabled ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Activo
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Inactivo
        </span>
      )}
    </div>
  );
}

// ─── Phase stepper ────────────────────────────────────────

export const PHASE_META: Record<AdminTenantPhase, { label: string; color: string; bgColor: string; ringColor: string }> = {
  onboarding: { label: 'En Onboarding', color: 'text-amber-700', bgColor: 'bg-amber-50', ringColor: 'ring-amber-200' },
  modules_configured: { label: 'Modulos OK', color: 'text-blue-700', bgColor: 'bg-blue-50', ringColor: 'ring-blue-200' },
  website_building: { label: 'Construyendo', color: 'text-violet-700', bgColor: 'bg-violet-50', ringColor: 'ring-violet-200' },
  website_generated: { label: 'Generado', color: 'text-indigo-700', bgColor: 'bg-indigo-50', ringColor: 'ring-indigo-200' },
  operational: { label: 'Operativo', color: 'text-emerald-700', bgColor: 'bg-emerald-50', ringColor: 'ring-emerald-200' },
  suspended: { label: 'Suspendido', color: 'text-red-700', bgColor: 'bg-red-50', ringColor: 'ring-red-200' },
};

export const PHASE_ORDER: AdminTenantPhase[] = [
  'onboarding',
  'modules_configured',
  'website_building',
  'website_generated',
  'operational',
];

function PhaseStepperIndex(phase: AdminTenantPhase): number {
  if (phase === 'suspended') return -1;
  return PHASE_ORDER.indexOf(phase);
}

export function PhaseStepper({ phase }: { phase: AdminTenantPhase }) {
  const currentIdx = PhaseStepperIndex(phase);
  const isSuspended = phase === 'suspended';
  const meta = PHASE_META[phase];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${meta.bgColor} ${meta.color} ${meta.ringColor}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isSuspended ? 'bg-red-500' : 'bg-current'} ${!isSuspended ? 'animate-pulse' : ''}`} />
          {meta.label}
        </span>
        {!isSuspended && (
          <span className="text-[11px] text-slate-400">
            Paso {currentIdx + 1} de {PHASE_ORDER.length}
          </span>
        )}
      </div>

      <div className="flex items-center gap-0">
        {PHASE_ORDER.map((p, idx) => {
          const isCompleted = !isSuspended && idx < currentIdx;
          const isCurrent = !isSuspended && idx === currentIdx;

          return (
            <div key={p} className="flex items-center flex-1 min-w-0 last:flex-none">
              <div className="relative group flex-shrink-0">
                <div
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#1C3B57]'
                      : isCurrent
                        ? 'bg-[#0D9488] ring-4 ring-teal-100'
                        : isSuspended
                          ? 'bg-red-200'
                          : 'bg-slate-200'
                  }`}
                />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {PHASE_META[p].label}
                </span>
              </div>
              {idx < PHASE_ORDER.length - 1 && (
                <div
                  className={`h-[2px] flex-1 min-w-2 transition-colors duration-500 ${
                    isCompleted
                      ? 'bg-[#1C3B57]'
                      : isSuspended
                        ? 'bg-red-100'
                        : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden sm:flex items-center gap-0">
        {PHASE_ORDER.map((p, idx) => {
          const isCompleted = !isSuspended && idx < currentIdx;
          const isCurrent = !isSuspended && idx === currentIdx;

          return (
            <div key={p} className="flex items-center flex-1 min-w-0 last:flex-none">
              <span
                className={`text-[10px] font-medium leading-tight truncate ${
                  isCurrent
                    ? 'text-[#1C3B57] font-semibold'
                    : isCompleted
                      ? 'text-slate-500'
                      : 'text-slate-300'
                }`}
              >
                {PHASE_META[p].label}
              </span>
              {idx < PHASE_ORDER.length - 1 && (
                <div className="flex-1 min-w-2" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PhaseBadge({ phase }: { phase: AdminTenantPhase }) {
  const meta = PHASE_META[phase];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${meta.bgColor} ${meta.color} ${meta.ringColor}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${phase !== 'suspended' && phase !== 'operational' ? 'animate-pulse' : ''}`} />
      {meta.label}
    </span>
  );
}

export function AdminTenantDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
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
              <div className="h-3 w-2/3 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
