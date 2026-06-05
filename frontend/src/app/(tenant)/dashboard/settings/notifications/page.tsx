// src/app/(tenant)/dashboard/settings/notifications/page.tsx
// Placeholder navegable para Notificaciones (PR1). La funcionalidad real llega después.

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeader, ComingSoonState } from '@/components/settings';

export default function SettingsNotificationsPage() {
  return (
    <div className="max-w-2xl">
      <SectionHeader
        title="Notificaciones"
        description="Decide qué avisos quieres recibir por correo y dentro de la app."
      />
      <ComingSoonState
        icon={Bell}
        title="Las notificaciones llegan pronto"
        description="Aquí podrás elegir qué eventos te avisamos por correo y cuáles ves dentro de NERBIS."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/settings/profile">Volver a Mi perfil</Link>
          </Button>
        }
      />
    </div>
  );
}
