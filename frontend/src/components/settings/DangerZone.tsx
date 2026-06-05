// src/components/settings/DangerZone.tsx
// Zona de peligro para acciones destructivas e irreversibles.
// DangerZone renderiza un encabezado con separadores; DangerAction representa
// cada acción (título + descripción + control destructivo, normalmente un
// AlertDialog que confirma antes de ejecutar).

import * as React from 'react';
import { SettingCard } from './SettingCard';
import { cn } from '@/lib/utils';

interface DangerZoneProps {
  /** Título de la zona. Por defecto "Zona de peligro". */
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function DangerZone({
  title = 'Zona de peligro',
  className,
  children,
}: DangerZoneProps) {
  return (
    <section className={cn('mb-16', className)} aria-label={title}>
      <div className="mb-3 flex items-center gap-2">
        <div className="h-px flex-1 bg-border" aria-hidden="true" />
        <h2 className="text-sm font-semibold tracking-tight text-destructive">
          {title}
        </h2>
        <div className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <SettingCard tone="danger">
        <div className="divide-y divide-destructive/20">{children}</div>
      </SettingCard>
    </section>
  );
}

interface DangerActionProps {
  title: string;
  description: string;
  /** Control que dispara la acción (botón / AlertDialogTrigger). */
  action: React.ReactNode;
  className?: string;
}

export function DangerAction({
  title,
  description,
  action,
  className,
}: DangerActionProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
