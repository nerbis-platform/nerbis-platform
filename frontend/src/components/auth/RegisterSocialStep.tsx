// src/components/auth/RegisterSocialStep.tsx
// Combined single-step registration when user authenticates via social login.
// Shows confirmed social profile + business fields + password in one form.

'use client';

import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Loader2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { RegisterBusinessFormValues } from './schemas';
import type { AuthPrefill } from './types';
import { countries, LABEL_CLASS, LABEL_STYLE } from './constants';
import { useBusinessNameCheck } from './hooks';
import { PasswordField } from './PasswordField';
import { SubmitButton } from './SubmitButton';

// ─── Props ──────────────────────────────────────────────────────

interface RegisterSocialStepProps {
  form: UseFormReturn<RegisterBusinessFormValues>;
  isLoading: boolean;
  prefill: AuthPrefill;
  onToggleMode: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────

const providerLabels: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
};

// ─── Component ──────────────────────────────────────────────────

export function RegisterSocialStep({
  form,
  isLoading,
  prefill,
  onToggleMode,
}: RegisterSocialStepProps) {
  const businessName = form.watch('business_name');
  const { exists: businessNameExists, checking: checkingName } = useBusinessNameCheck(businessName);

  const providerName = providerLabels[prefill.provider || ''] || 'tu cuenta social';

  return (
    <div data-auth-animated>
      {/* Title */}
      <div className="mb-6">
        <h2
          className="text-[1.5rem] tracking-[-0.02em]"
          tabIndex={-1}
          style={{
            color: 'var(--auth-primary)',
            fontWeight: 600,
            fontFamily: 'var(--auth-font-heading)',
          }}
        >
          Ya casi estamos
        </h2>
      </div>

      {/* Social profile confirmation */}
      <div
        className="flex items-center gap-3 rounded-[var(--auth-radius-input)] border px-4 py-3 mb-6"
        style={{
          borderColor: 'var(--auth-accent)',
          background: 'var(--auth-accent-bg, #E2F3F1)',
        }}
      >
        {prefill.avatar ? (
          <img
            src={prefill.avatar}
            alt=""
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shrink-0"
            style={{
              background: 'var(--auth-primary)',
              color: 'white',
            }}
          >
            {(prefill.first_name?.[0] || prefill.email?.[0] || '?').toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="text-[0.85rem] font-medium truncate"
            style={{
              color: 'var(--auth-text)',
              fontFamily: 'var(--auth-font-body)',
            }}
          >
            {prefill.email}
          </p>
          <p
            className="text-[0.75rem] truncate"
            style={{
              color: 'var(--auth-text-muted)',
              fontFamily: 'var(--auth-font-body)',
            }}
          >
            Conectado con {providerName}
          </p>
        </div>
        <Check
          className="h-4 w-4 shrink-0"
          style={{ color: 'var(--auth-success)' }}
          aria-hidden="true"
        />
      </div>

      {/* Fields */}
      <div className="space-y-5">
        {/* First name + Last name (editable — social providers may return incomplete data) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLASS} style={LABEL_STYLE}>
                  Nombre
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Tu nombre"
                    disabled={isLoading}
                    aria-required="true"
                    aria-invalid={!!form.formState.errors.first_name}
                    className="h-[var(--auth-input-height)] rounded-[var(--auth-radius-input)] border-[var(--auth-border)] bg-[var(--auth-bg-input)] text-[var(--auth-text)] placeholder:text-[var(--auth-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 aria-[invalid=true]:border-[var(--auth-border-error)]"
                    style={{ fontFamily: 'var(--auth-font-body)' }}
                    {...field}
                  />
                </FormControl>
                <FormMessage role="alert" aria-live="polite" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={LABEL_CLASS} style={LABEL_STYLE}>
                  Apellido
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Tu apellido"
                    disabled={isLoading}
                    aria-required="true"
                    aria-invalid={!!form.formState.errors.last_name}
                    className="h-[var(--auth-input-height)] rounded-[var(--auth-radius-input)] border-[var(--auth-border)] bg-[var(--auth-bg-input)] text-[var(--auth-text)] placeholder:text-[var(--auth-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 aria-[invalid=true]:border-[var(--auth-border-error)]"
                    style={{ fontFamily: 'var(--auth-font-body)' }}
                    {...field}
                  />
                </FormControl>
                <FormMessage role="alert" aria-live="polite" />
              </FormItem>
            )}
          />
        </div>

        {/* Business name */}
        <FormField
          control={form.control}
          name="business_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_CLASS} style={LABEL_STYLE}>
                Nombre del negocio
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Ej: Mi Negocio"
                    disabled={isLoading}
                    autoFocus
                    aria-required="true"
                    aria-invalid={!!form.formState.errors.business_name}
                    className="h-[var(--auth-input-height)] rounded-[var(--auth-radius-input)] border-[var(--auth-border)] bg-[var(--auth-bg-input)] text-[var(--auth-text)] placeholder:text-[var(--auth-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 aria-[invalid=true]:border-[var(--auth-border-error)]"
                    style={{ fontFamily: 'var(--auth-font-body)' }}
                    {...field}
                  />
                  {checkingName && (
                    <Loader2
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin"
                      style={{ color: 'var(--auth-text-muted)' }}
                      aria-label="Verificando nombre..."
                    />
                  )}
                </div>
              </FormControl>
              <FormMessage role="alert" aria-live="polite" />
              {businessNameExists && !checkingName && (
                <p
                  className="text-[0.75rem] mt-1"
                  role="alert"
                  style={{ color: 'var(--auth-warning, #D97706)' }}
                >
                  Este nombre ya está registrado.{' '}
                  <button
                    type="button"
                    onClick={onToggleMode}
                    className="font-medium underline underline-offset-2 cursor-pointer"
                    style={{ color: 'inherit' }}
                  >
                    Inicia sesión
                  </button>
                </p>
              )}
            </FormItem>
          )}
        />

        {/* Country */}
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_CLASS} style={LABEL_STYLE}>
                País
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger
                    aria-required="true"
                    aria-invalid={!!form.formState.errors.country}
                    className="data-[size=default]:h-[var(--auth-input-height)] w-full rounded-[var(--auth-radius-input)] border-[var(--auth-border)] bg-[var(--auth-bg-input)] text-sm text-[var(--auth-text)] data-placeholder:text-[var(--auth-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 [&_svg]:text-[var(--auth-text-muted)]"
                    style={{ fontFamily: 'var(--auth-font-body)' }}
                  >
                    <SelectValue placeholder="Selecciona tu país">
                      {field.value && (
                        <span className="flex items-center gap-2">
                          <span className="text-base leading-none">
                            {countries.find((c) => c.value === field.value)?.flag}
                          </span>
                          {countries.find((c) => c.value === field.value)?.label}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent
                  style={
                    {
                      '--accent': '#E2F3F1',
                      '--accent-foreground': 'var(--auth-primary)',
                    } as React.CSSProperties
                  }
                >
                  {countries.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className="text-base leading-none">{c.flag}</span>
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage role="alert" aria-live="polite" />
            </FormItem>
          )}
        />

        {/* Password */}
        <PasswordField
          name="password"
          label="Contraseña"
          placeholder="Crea una contraseña segura"
          control={form.control as unknown as import('react-hook-form').Control<Record<string, string>>}
          disabled={isLoading}
          showStrength
          autoComplete="new-password"
        />

        {/* Terms */}
        <p
          className="text-[0.75rem] leading-relaxed text-center pt-1"
          style={{
            color: 'var(--auth-text-muted)',
            fontFamily: 'var(--auth-font-body)',
          }}
        >
          Al crear tu cuenta aceptas los{' '}
          <Link
            href="/terms"
            className="underline underline-offset-2 hover:text-[var(--auth-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
          >
            Términos de Servicio
          </Link>{' '}
          y la{' '}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-[var(--auth-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
          >
            Política de Privacidad
          </Link>
          .
        </p>

        {/* Submit */}
        <SubmitButton
          isLoading={isLoading}
          disabled={businessNameExists || checkingName}
          loadingLabel="Creando tu negocio..."
        >
          Crear mi negocio
        </SubmitButton>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <p
          className="text-[0.8rem]"
          style={{
            color: 'var(--auth-text-muted)',
            fontFamily: 'var(--auth-font-body)',
          }}
        >
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            onClick={onToggleMode}
            className="font-medium hover:underline underline-offset-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
            style={{ color: 'var(--auth-primary)' }}
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}
