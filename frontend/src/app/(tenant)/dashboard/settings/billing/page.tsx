// src/app/(tenant)/dashboard/settings/billing/page.tsx
// Placeholder navegable para Facturación (PR1). La funcionalidad real llega después.

import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeader, ComingSoonState } from '@/components/settings';

export default function SettingsBillingPage() {
  return (
    <div className="max-w-2xl">
      <SectionHeader
        title="Facturación"
        description="Gestiona tu plan, métodos de pago e historial de cobros."
      />
      <ComingSoonState
        icon={CreditCard}
        title="La facturación llega pronto"
        description="Aquí podrás ver tu plan actual, actualizar tu método de pago y descargar tus facturas."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/settings/profile">Volver a Mi perfil</Link>
          </Button>
        }
      />
    </div>
  );
}
