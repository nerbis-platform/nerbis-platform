'use client';

import { useEffect } from 'react';
import { IndustryGalleryManager } from '@/components/admin/industry-gallery-manager';
import { MarketingSectionsManager } from '@/components/admin/marketing-sections-manager';

export default function WebHomePage() {
  useEffect(() => {
    document.title = 'Home — NERBIS Admin';
  }, []);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
          Home
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configura las secciones de la pagina principal de nerbis.com
        </p>
      </div>

      <div className="space-y-12">
        <IndustryGalleryManager />
        <MarketingSectionsManager />
      </div>
    </>
  );
}
