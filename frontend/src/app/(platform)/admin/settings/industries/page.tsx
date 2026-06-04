// src/app/(platform)/admin/settings/industries/page.tsx
//
// Industry catalog management for superadmins (Issue #262).
// CRUD over the global Industry catalog + promote (proposed_by_model -> reviewed)
// for AI-proposed rows. AI model config + usage stats live in their own section
// (/admin/settings/ai-usage), not here.
//
// All requests go through `adminClient` (via `admin-industries` helpers) —
// never the tenant `apiClient`.
'use client';

import { useEffect } from 'react';
import { IndustriesTab } from './_components/IndustriesTab';

export default function AdminIndustriesPage() {
  useEffect(() => {
    document.title = 'Industrias — NERBIS Admin';
  }, []);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
          Industrias
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Catalogo global de industrias usado en el onboarding y la generacion de sitios.
        </p>
      </div>

      <IndustriesTab />
    </>
  );
}
