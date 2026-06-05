// src/components/settings/ViewEditRow.tsx
// Fila de solo-lectura (etiqueta + valor) para el modo "ver" del patrón
// ver→editar. Los valores vacíos se muestran atenuados con un placeholder.
//
// ViewEditList agrupa varias filas con separadores consistentes.

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ViewEditRowProps {
  label: string;
  /** Valor a mostrar. Si está vacío, se usa `emptyLabel`. */
  value?: React.ReactNode;
  /** Texto mostrado (atenuado) cuando no hay valor. */
  emptyLabel?: string;
  className?: string;
}

function isEmptyValue(value: React.ReactNode): boolean {
  return value === null || value === undefined || value === '';
}

export function ViewEditRow({
  label,
  value,
  emptyLabel = 'Sin registrar',
  className,
}: ViewEditRowProps) {
  const empty = isEmptyValue(value);

  return (
    <div
      className={cn(
        'flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4',
        className,
      )}
    >
      <span className="text-sm text-muted-foreground sm:w-28 sm:shrink-0">
        {label}
      </span>
      <span
        className={cn(
          'text-base',
          empty ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {empty ? emptyLabel : value}
      </span>
    </div>
  );
}

interface ViewEditListProps extends React.ComponentProps<'div'> {
  children: React.ReactNode;
}

export function ViewEditList({
  className,
  children,
  ...props
}: ViewEditListProps) {
  return (
    <div className={cn('divide-y divide-border', className)} {...props}>
      {children}
    </div>
  );
}
