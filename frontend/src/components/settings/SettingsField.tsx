// src/components/settings/SettingsField.tsx
// Campo de formulario etiquetado para el módulo de configuración.
// Gestiona la accesibilidad: asocia <Label> con el control, expone
// aria-invalid / aria-describedby y muestra el mensaje de error.
//
// Uso:
//   <SettingsField id="first_name" label="Nombre" error={errors.first_name}>
//     {({ id, describedBy, invalid }) => (
//       <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} />
//     )}
//   </SettingsField>

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FieldRenderProps {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

interface SettingsFieldProps {
  /** id del control (se enlaza con htmlFor del label). */
  id: string;
  label: string;
  /** Texto de ayuda mostrado bajo el control. */
  hint?: string;
  /** Mensaje de error; activa el estado inválido. */
  error?: string;
  /** Marca el campo como obligatorio (visual + aria). */
  required?: boolean;
  className?: string;
  /** Render prop que recibe ids y estado para cablear el control. */
  children: (props: FieldRenderProps) => React.ReactNode;
}

export function SettingsField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: SettingsFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const invalid = Boolean(error);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </Label>

      {children({ id, describedBy, invalid })}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground text-pretty">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-destructive text-pretty"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
