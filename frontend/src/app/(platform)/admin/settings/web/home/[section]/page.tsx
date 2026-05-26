// src/app/(platform)/admin/settings/web/home/[section]/page.tsx
//
// Dynamic route for individual home page section editing.
// Each section of the nerbis.com home page gets its own admin view.
'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { IndustryGalleryManager } from '@/components/admin/industry-gallery-manager';
import { MarketingSectionsManager } from '@/components/admin/marketing-sections-manager';
import type { MarketingSectionKey } from '@/types/marketing';

const SLUG_TO_KEY: Record<string, MarketingSectionKey> = {
  'problem-solution': 'problem_solution',
  'how-it-works': 'how_it_works',
  'cta-mid': 'cta_mid',
  'industries': 'industries',
  'faq': 'faq',
  'cta-final': 'cta_final',
  'header': 'header',
  'seo': 'seo',
};

const SLUG_LABELS: Record<string, string> = {
  gallery: 'Galeria de industrias',
  'problem-solution': 'Problema vs Solucion',
  'how-it-works': 'Como funciona',
  'cta-mid': 'CTA Intermedio',
  industries: 'Industrias',
  faq: 'FAQ',
  'cta-final': 'CTA Final',
  header: 'Header / Navegacion',
  seo: 'SEO y Metadata',
};

export default function WebHomeSectionPage() {
  const { section } = useParams<{ section: string }>();
  const label = SLUG_LABELS[section] ?? section;

  useEffect(() => {
    document.title = `${label} — NERBIS Admin`;
  }, [label]);

  if (section === 'gallery') {
    return <IndustryGalleryManager />;
  }

  const sectionKey = SLUG_TO_KEY[section];

  if (!sectionKey) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <h2 className="text-sm font-semibold text-slate-900">
          Seccion no encontrada
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          La seccion &ldquo;{section}&rdquo; no existe.
        </p>
      </div>
    );
  }

  return <MarketingSectionsManager sectionFilter={sectionKey} />;
}
