// src/components/auth/PasswordField.tsx
// Reusable password input with show/hide toggle, React Hook Form integration.

'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { PasswordFieldProps } from './types';

export function PasswordField({
  name,
  label,
  placeholder = '',
  control,
  disabled = false,
  showStrength = false,
  autoComplete = 'current-password',
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          {label && (
            <FormLabel
              className="text-[0.8125rem] font-normal"
              style={{ color: 'var(--auth-text-muted)', fontFamily: 'var(--auth-font-body)' }}
            >
              {label}
            </FormLabel>
          )}
          <FormControl>
            <div className="relative" data-auth-animated>
              <Input
                {...field}
                type={visible ? 'text' : 'password'}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete={autoComplete}
                aria-invalid={!!fieldState.error}
                className="h-[var(--auth-input-height)] rounded-[var(--auth-radius-input)] border-[var(--auth-border)] bg-[var(--auth-bg-input)] pr-10 text-[var(--auth-text)] placeholder:text-[var(--auth-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 aria-[invalid=true]:border-[var(--auth-border-error)]"
                style={{ fontFamily: 'var(--auth-font-body)' }}
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={visible}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--auth-text-muted)] transition-colors duration-[var(--auth-duration-fast)] hover:text-[var(--auth-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
              >
                {visible ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </FormControl>
          <FormMessage role="alert" aria-live="polite" />
          {showStrength && field.value && (
            <PasswordStrengthRules password={field.value} />
          )}
        </FormItem>
      )}
    />
  );
}

// ─── Inline Password Strength Rules ─────────────────────────────

interface PasswordStrengthRulesProps {
  password: string;
}

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'Mínimo 8 caracteres' },
  { test: (p: string) => /[a-z]/.test(p), label: 'Una letra minúscula' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Una letra mayúscula' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Un número' },
] as const;

function PasswordStrengthRules({ password }: PasswordStrengthRulesProps) {
  return (
    <ul
      className="mt-1.5 space-y-0.5 text-[0.75rem]"
      aria-label="Requisitos de contraseña"
      style={{ fontFamily: 'var(--auth-font-body)' }}
    >
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 transition-colors duration-[var(--auth-duration-fast)] ${
              passed
                ? 'text-[var(--auth-success)]'
                : 'text-[var(--auth-text-muted)]'
            }`}
          >
            <span className="inline-block h-1 w-1 rounded-full bg-current" aria-hidden="true" />
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
