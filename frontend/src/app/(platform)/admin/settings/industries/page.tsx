// src/app/(platform)/admin/settings/industries/page.tsx
//
// Industry catalog management for superadmins (Issue #262).
// Three sections:
//   - Industrias: CRUD over the global Industry catalog + promote
//     (proposed_by_model -> reviewed) for AI-proposed rows.
//   - Modelos IA: per-task model configuration (list + edit the seeded rows).
//   - Estadisticas: read-only AI usage aggregation.
//
// All requests go through `adminClient` (via `admin-industries` helpers) —
// never the tenant `apiClient`.
'use client';

import { useEffect } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { IndustriesTab } from './_components/IndustriesTab';
import { AIModelsTab } from './_components/AIModelsTab';
import { AIStatsTab } from './_components/AIStatsTab';

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
          Catalogo global de industrias, configuracion de modelos de IA y uso.
        </p>
      </div>

      <Tabs defaultValue="industries">
        <TabsList className="mb-6">
          <TabsTrigger value="industries">Catalogo</TabsTrigger>
          <TabsTrigger value="ai-models">Modelos IA</TabsTrigger>
          <TabsTrigger value="ai-stats">Estadisticas</TabsTrigger>
        </TabsList>

        <TabsContent value="industries">
          <IndustriesTab />
        </TabsContent>
        <TabsContent value="ai-models">
          <AIModelsTab />
        </TabsContent>
        <TabsContent value="ai-stats">
          <AIStatsTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
