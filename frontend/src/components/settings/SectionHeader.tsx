// src/components/settings/SectionHeader.tsx
// Encabezado de sección reutilizable para las páginas de configuración.
// Promueve los antiguos "overlines" en mayúsculas a títulos legibles (--text-lg),
// con una acción opcional alineada a la derecha (p. ej. "Editar").

import * as React from 'react';
import { cn } from '@/lib/utils';

type HeadingLevel = 2 | 3 | 4;

interface SectionHeaderProps {
  /** Título de la sección. */
  title: string;
  /** Texto descriptivo opcional debajo del título. */
  description?: string;
  /** Acción alineada a la derecha (botón "Editar", etc.). */
  action?: React.ReactNode;
  /** Nivel semántico del encabezado. Por defecto h2. */
  as?: HeadingLevel;
  /** id para asociar con aria-labelledby de la sección. */
  id?: string;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  as = 2,
  id,
  className,
}: SectionHeaderProps) {
  const Heading = `h${as}` as const;

  return (
    <div
      className={cn(
        'mb-4 flex items-start justify-between gap-4',
        className,
      )}
    >
      <div className="min-w-0">
        <Heading
          id={id}
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
