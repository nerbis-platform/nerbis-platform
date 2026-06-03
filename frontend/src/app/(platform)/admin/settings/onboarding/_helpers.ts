import type { AdminModuleRef } from '@/types/admin';

// ─── Helpers ──────────────────────────────────────────────

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export function modulesLabel(detail: AdminModuleRef[]): string {
  if (detail.length === 0) return '\u2014';
  return detail.map((m) => m.label).join(', ');
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\u2026';
}

// ─── Question form ────────────────────────────────────────

export interface QuestionFormState {
  question_key: string;
  question_text: string;
  message: string;
  question_type: string;
  input_type: string;
  section: string;
  placeholder: string;
  hint: string;
  help_text: string;
  is_required: boolean;
  min_length: string;
  max_length: string;
  required_modules: number[];
  template: string;
  ai_context: string;
  options: string;
  sort_order: number;
  is_active: boolean;
}

export const EMPTY_QUESTION_FORM: QuestionFormState = {
  question_key: '',
  question_text: '',
  message: '',
  question_type: 'text',
  input_type: 'input',
  section: 'basic',
  placeholder: '',
  hint: '',
  help_text: '',
  is_required: false,
  min_length: '',
  max_length: '',
  required_modules: [],
  template: '',
  ai_context: '',
  options: '',
  sort_order: 0,
  is_active: true,
};

export const QUESTION_TYPE_OPTIONS = [
  { value: 'text', label: 'Texto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'choice', label: 'Seleccion unica' },
  { value: 'multi_choice', label: 'Seleccion multiple' },
  { value: 'color', label: 'Color' },
  { value: 'image', label: 'Imagen' },
  { value: 'number', label: 'Numero' },
  { value: 'url', label: 'URL' },
];

export const INPUT_TYPE_OPTIONS = [
  { value: 'input', label: 'Input' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'multiselect', label: 'Multiselect' },
  { value: 'modules', label: 'Selector de modulos' },
  { value: 'style_select', label: 'Selector de estilo' },
  { value: 'color_picker', label: 'Selector de colores' },
  { value: 'tone_select', label: 'Selector de tono' },
];

export const SECTION_OPTIONS = [
  { value: 'setup', label: 'Setup' },
  { value: 'basic', label: 'Basico' },
  { value: 'branding', label: 'Branding' },
  { value: 'content', label: 'Contenido' },
  { value: 'contact', label: 'Contacto' },
];

export const SECTION_BADGE_CLASSES: Record<string, string> = {
  setup: 'border-teal-200 bg-teal-50 text-teal-700',
  basic: 'border-slate-200 bg-slate-50 text-slate-700',
  branding: 'border-violet-200 bg-violet-50 text-violet-700',
  content: 'border-blue-200 bg-blue-50 text-blue-700',
  contact: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export const QUESTION_TYPE_BADGE_CLASSES: Record<string, string> = {
  text: 'border-slate-200 bg-slate-50 text-slate-700',
  textarea: 'border-slate-200 bg-slate-50 text-slate-700',
  choice: 'border-blue-200 bg-blue-50 text-blue-700',
  multi_choice: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  color: 'border-pink-200 bg-pink-50 text-pink-700',
  image: 'border-amber-200 bg-amber-50 text-amber-700',
  number: 'border-teal-200 bg-teal-50 text-teal-700',
  url: 'border-cyan-200 bg-cyan-50 text-cyan-700',
};

// ─── Page form ────────────────────────────────────────────

export interface PageFormState {
  key: string;
  label: string;
  description: string;
  icon: string;
  is_mandatory: boolean;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
  auto_include_modules: number[];
}

export const EMPTY_PAGE_FORM: PageFormState = {
  key: '',
  label: '',
  description: '',
  icon: '',
  is_mandatory: false,
  is_default: false,
  sort_order: 0,
  is_active: true,
  auto_include_modules: [],
};

// ─── Section form ─────────────────────────────────────────

export interface SectionFormState {
  key: string;
  label: string;
  description: string;
  page: string; // '' means null (Home)
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
}

export const EMPTY_SECTION_FORM: SectionFormState = {
  key: '',
  label: '',
  description: '',
  page: '',
  is_default: false,
  sort_order: 0,
  is_active: true,
};

// ─── Shared CSS classes ───────────────────────────────────

export const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20';

export const TEXTAREA_CLASS =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20';

export const BTN_PRIMARY =
  'inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-500';

export const BTN_SECONDARY =
  'rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50';

export const ACTION_TRIGGER =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50';
