// src/components/settings/ComingSoonState.tsx
// Estado "Próximamente" para secciones de configuración aún no disponibles.
// Funcional, no decorativo: explica qué llegará y deja un punto de retorno claro.

import * as React from 'react';
import { SettingCard } from './SettingCard';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface ComingSoonStateProps {
  title: string;
  description: string;
  /** Icono representativo de la sección (decorativo). */
  icon?: LucideIcon;
  /** Acción opcional (p. ej. enlace a otra sección disponible). */
  action?: React.ReactNode;
  className?: string;
}

export function ComingSoonState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: ComingSoonStateProps) {
  return (
    <SettingCard className={cn('px-6 py-12', className)}>
      <div className="mx-auto flex max-w-sm flex-col items-center text-center">
        {Icon ? (
          <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Icon className="size-5" aria-hidden="true" />
          </div>
        ) : null}

        <span className="mb-2 inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
          Próximamente
        </span>

        <h2 className="text-lg font-semibold tracking-tight text-foreground text-balance">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>

        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </SettingCard>
  );
}
