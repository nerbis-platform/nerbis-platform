// src/app/(platform)/admin/settings/ai-usage/page.tsx
//
// Platform-level AI usage management for superadmins (Issue #262).
// Two sections:
//   - Modelos: per-task model configuration (list + edit the seeded rows).
//   - Estadisticas: read-only AI usage aggregation (tokens / cost).
//
// AI config + usage are global (not industry-scoped), so they live in their own
// section rather than under Industrias. All requests go through `adminClient`.
'use client';

import { useEffect } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { AIModelsTab } from './_components/AIModelsTab';
import { AIStatsTab } from './_components/AIStatsTab';

export default function AdminAIUsagePage() {
  useEffect(() => {
    document.title = 'Uso de IA — NERBIS Admin';
  }, []);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
          Uso de IA
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configuracion de modelos por tarea y consumo de IA en la plataforma.
        </p>
      </div>

      <Tabs defaultValue="ai-models">
        <TabsList className="mb-6">
          <TabsTrigger value="ai-models">Modelos</TabsTrigger>
          <TabsTrigger value="ai-stats">Estadisticas</TabsTrigger>
        </TabsList>

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
