// src/components/settings/SettingCard.tsx
// Contenedor con borde para agrupar campos de configuración.
// Compone el Card de shadcn pero con padding propio del módulo de settings
// (las filas internas controlan su propio espaciado vertical).

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SettingCardProps extends React.ComponentProps<'div'> {
  /** Variante visual: por defecto neutra, "danger" para acciones destructivas. */
  tone?: 'default' | 'danger';
}

export function SettingCard({
  className,
  tone = 'default',
  children,
  ...props
}: SettingCardProps) {
  return (
    <div
      data-slot="setting-card"
      className={cn(
        'rounded-xl border bg-card text-card-foreground',
        tone === 'danger'
          ? 'border-destructive/30'
          : 'border-border',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
