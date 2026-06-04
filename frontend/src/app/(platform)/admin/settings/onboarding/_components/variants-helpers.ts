import type { VariantMood } from '@/types/admin';

// ─── Constants ───────────────────────────────────────────────

export const MOOD_OPTIONS: { value: VariantMood; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'playful', label: 'Playful' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'bold', label: 'Bold' },
  { value: 'minimal', label: 'Minimal' },
];

export const MOOD_BADGE_CLASSES: Record<VariantMood, string> = {
  professional: 'border-slate-200 bg-slate-50 text-slate-700',
  playful: 'border-amber-200 bg-amber-50 text-amber-700',
  elegant: 'border-violet-200 bg-violet-50 text-violet-700',
  bold: 'border-red-200 bg-red-50 text-red-700',
  minimal: 'border-teal-200 bg-teal-50 text-teal-700',
};

// Filter sentinel — represents "show all sections"
export const FILTER_ALL = '__all__';

// ─── Form state ──────────────────────────────────────────────

export interface VariantFormState {
  section: string;
  key: string;
  label: string;
  description: string;
  css_class_hint: string;
  mood: VariantMood;
  tags: string;
  is_default: boolean;
  sort_order: number;
}

export const EMPTY_VARIANT_FORM: VariantFormState = {
  section: '',
  key: '',
  label: '',
  description: '',
  css_class_hint: '',
  mood: 'professional',
  tags: '',
  is_default: false,
  sort_order: 0,
};
