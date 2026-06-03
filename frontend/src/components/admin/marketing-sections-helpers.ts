import type { MarketingSectionKey } from '@/types/marketing';

// ─── Section display config ──────────────────────────────────

export const SECTION_LABELS: Record<MarketingSectionKey, string> = {
  hero: 'Hero',
  problem_solution: 'Problema vs Solucion',
  how_it_works: 'Como Funciona',
  cta_mid: 'CTA Intermedio',
  industries: 'Industrias',
  faq: 'Preguntas Frecuentes',
  cta_final: 'CTA Final',
  header: 'Header / Navegacion',
  seo: 'SEO y Metadata',
};

// The order in which sections appear in the UI
// hero is excluded — its content is fixed for now.
export const SECTION_ORDER: MarketingSectionKey[] = [
  'problem_solution',
  'how_it_works',
  'cta_mid',
  'industries',
  'faq',
  'cta_final',
  'header',
  'seo',
];

// ─── Field definitions for each section type ─────────────────

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url';
}

export interface ArrayFieldDef {
  key: string;
  label: string;
  itemLabel: string;
  fields: FieldDef[];
}

export interface SectionFieldConfig {
  fields: FieldDef[];
  arrayFields?: ArrayFieldDef[];
}

export const SECTION_FIELDS: Record<MarketingSectionKey, SectionFieldConfig> = {
  hero: {
    fields: [
      { key: 'title_line1', label: 'Titulo linea 1', type: 'text' },
      { key: 'title_line2', label: 'Titulo linea 2', type: 'text' },
      { key: 'subtitle', label: 'Subtitulo', type: 'textarea' },
      { key: 'cta_text', label: 'Texto CTA', type: 'text' },
      { key: 'cta_href', label: 'URL CTA', type: 'url' },
      { key: 'cta_subtext', label: 'Texto secundario', type: 'text' },
    ],
  },
  problem_solution: {
    fields: [
      { key: 'badge', label: 'Badge', type: 'text' },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'before_label', label: 'Etiqueta "Antes"', type: 'text' },
      { key: 'after_label', label: 'Etiqueta "Despues"', type: 'text' },
    ],
    arrayFields: [
      {
        key: 'comparisons',
        label: 'Comparaciones',
        itemLabel: 'Comparacion',
        fields: [
          { key: 'before', label: 'Antes', type: 'text' },
          { key: 'after', label: 'Despues', type: 'text' },
        ],
      },
    ],
  },
  how_it_works: {
    fields: [
      { key: 'badge', label: 'Badge', type: 'text' },
      { key: 'title', label: 'Titulo', type: 'text' },
    ],
    arrayFields: [
      {
        key: 'steps',
        label: 'Pasos',
        itemLabel: 'Paso',
        fields: [
          { key: 'step_label', label: 'Etiqueta del paso', type: 'text' },
          { key: 'title', label: 'Titulo', type: 'text' },
          { key: 'description', label: 'Descripcion', type: 'textarea' },
        ],
      },
    ],
  },
  cta_mid: {
    fields: [
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'subtitle', label: 'Subtitulo', type: 'textarea' },
      { key: 'cta_text', label: 'Texto CTA', type: 'text' },
      { key: 'cta_href', label: 'URL CTA', type: 'url' },
    ],
  },
  industries: {
    fields: [
      { key: 'badge', label: 'Badge', type: 'text' },
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'subtitle', label: 'Subtitulo', type: 'textarea' },
      { key: 'overflow_text', label: 'Texto de desbordamiento', type: 'text' },
    ],
    arrayFields: [
      {
        key: 'industries',
        label: 'Industrias',
        itemLabel: 'Industria',
        fields: [
          { key: 'name', label: 'Nombre', type: 'text' },
          { key: 'emoji', label: 'Emoji', type: 'text' },
        ],
      },
    ],
  },
  faq: {
    fields: [
      { key: 'badge', label: 'Badge', type: 'text' },
      { key: 'title', label: 'Titulo', type: 'text' },
    ],
    arrayFields: [
      {
        key: 'items',
        label: 'Preguntas',
        itemLabel: 'Pregunta',
        fields: [
          { key: 'question', label: 'Pregunta', type: 'text' },
          { key: 'answer', label: 'Respuesta', type: 'textarea' },
        ],
      },
    ],
  },
  cta_final: {
    fields: [
      { key: 'title_line1', label: 'Titulo linea 1', type: 'text' },
      { key: 'title_line2', label: 'Titulo linea 2', type: 'text' },
      { key: 'cta_text', label: 'Texto CTA', type: 'text' },
      { key: 'cta_href', label: 'URL CTA', type: 'url' },
      { key: 'cta_subtext', label: 'Texto secundario', type: 'text' },
    ],
  },
  header: {
    fields: [
      { key: 'cta_text', label: 'Texto CTA', type: 'text' },
      { key: 'cta_href', label: 'URL CTA', type: 'url' },
      { key: 'login_text', label: 'Texto login', type: 'text' },
      { key: 'login_href', label: 'URL login', type: 'url' },
    ],
    arrayFields: [
      {
        key: 'nav_links',
        label: 'Enlaces de navegacion',
        itemLabel: 'Enlace',
        fields: [
          { key: 'label', label: 'Texto', type: 'text' },
          { key: 'href', label: 'URL', type: 'url' },
        ],
      },
    ],
  },
  seo: {
    fields: [
      { key: 'title', label: 'Titulo', type: 'text' },
      { key: 'description', label: 'Descripcion', type: 'textarea' },
    ],
  },
};

// ─── Input styles ────────────────────────────────────────────

export const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20';
export const TEXTAREA_CLASS =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20';
