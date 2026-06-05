'use client';

import { MonitorSmartphone } from 'lucide-react';
import { SectionHeader, ComingSoonState } from '@/components/settings';

export function ActiveSessionsSection() {
  return (
    <section>
      <SectionHeader as={3} title="Sesiones activas" />
      <ComingSoonState
        title="Sesiones activas"
        description="Próximamente podrás ver y cerrar las sesiones abiertas en tus dispositivos."
        icon={MonitorSmartphone}
      />
    </section>
  );
}
