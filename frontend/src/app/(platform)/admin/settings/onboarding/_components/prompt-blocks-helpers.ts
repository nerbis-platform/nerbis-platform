import type { PromptBlockCategory, PromptBlockScope } from '@/types/admin';

// ─── Constants ───────────────────────────────────────────────

export const CATEGORY_OPTIONS: { value: PromptBlockCategory; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'business', label: 'Business' },
  { value: 'visual', label: 'Visual' },
  { value: 'section', label: 'Section' },
  { value: 'rules', label: 'Rules' },
];

export const SCOPE_OPTIONS: { value: PromptBlockScope; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'template', label: 'Template' },
  { value: 'industry', label: 'Industry' },
];

export const CATEGORY_BADGE_CLASSES: Record<PromptBlockCategory, string> = {
  system: 'border-slate-200 bg-slate-50 text-slate-700',
  business: 'border-blue-200 bg-blue-50 text-blue-700',
  visual: 'border-violet-200 bg-violet-50 text-violet-700',
  section: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rules: 'border-amber-200 bg-amber-50 text-amber-700',
};

export const SCOPE_BADGE_CLASSES: Record<PromptBlockScope, string> = {
  global: 'border-slate-200 bg-slate-50 text-slate-700',
  template: 'border-teal-200 bg-teal-50 text-teal-700',
  industry: 'border-indigo-200 bg-indigo-50 text-indigo-700',
};

// ─── Form state ──────────────────────────────────────────────

export interface BlockFormState {
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

export const EMPTY_BLOCK_FORM: BlockFormState = {
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
