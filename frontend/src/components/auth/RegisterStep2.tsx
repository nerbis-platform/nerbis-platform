// src/components/auth/RegisterStep2.tsx
// Second step of business registration: personal info, email, password.

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { RegisterBusinessFormValues } from './schemas';
import { DEBOUNCE_DELAY_MS, LABEL_CLASS, LABEL_STYLE } from './constants';
import { useDebounce } from './hooks';
import { PasswordField } from './PasswordField';
import { SubmitButton } from './SubmitButton';

// ─── Props ──────────────────────────────────────────────────────

interface RegisterStep2Props {
  form: UseFormReturn<RegisterBusinessFormValues>;
  isLoading: boolean;
  onPrevStep: () => void;
  onToggleMode: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export function RegisterStep2({
  form,
  isLoading,
  onPrevStep,
  onToggleMode,
}: RegisterStep2Props) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Email existence check
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const emailValue = form.watch('email');
  const debouncedEmail = useDebounce(emailValue, DEBOUNCE_DELAY_MS);

  const checkTenantEmail = useCallback(
    async (email: string, signal: AbortSignal) => {
      if (!email || !email.includes('@') || !email.includes('.')) {
        setEmailExists(false);
        return;
      }
      setCheckingEmail(true);
      try {
        const res = await fetch(
          `${API_URL}/api/public/check-tenant-email/?email=${encodeURIComponent(email.trim())}`,
          { signal },
        );
        if (res.ok) {
          const data = await res.json();
          if (!signal.aborted) setEmailExists(data.exists);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      } finally {
        if (!signal.aborted) setCheckingEmail(false);
      }
    },
    [API_URL],
  );

  useEffect(() => {
    if (!debouncedEmail || !debouncedEmail.includes('@') || !debouncedEmail.includes('.')) {
      setEmailExists(false);
      return;
    }
    const controller = new AbortController();
    checkTenantEmail(debouncedEmail, controller.signal);
    return () => controller.abort();
  }, [debouncedEmail, checkTenantEmail]);

  return (
    <div data-auth-animated>
      {/* Step + Title */}
      <div className="mb-6">
        <h2
          className="text-[1.5rem] tracking-[-0.03em] mb-2 mt-4"
          tabIndex={-1}
          style={{
            color: 'var(--auth-primary)',
            fontWeight: 600,
            fontFamily: 'var(--auth-font-heading)',
          }}
        >
          Crea tu cuenta
        </h2>
        <p
          className="text-[0.85rem] leading-relaxed"
          style={{
            color: 'var(--auth-text-muted)',
            fontFamily: 'var(--auth-font-body)',
          }}
        >
          Tus datos personales y acceso.
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        {/* First name + Last name */}
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

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={LABEL_CLASS} style={LABEL_STYLE}>
                Correo electrónico
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="correo@tunegocio.com"
                    disabled={isLoading}
                    autoComplete="email"
                    aria-required="true"
                    aria-invalid={!!form.formState.errors.email}
                    className="h-[var(--auth-input-height)] rounded-[var(--auth-radius-input)] border-[var(--auth-border)] bg-[var(--auth-bg-input)] text-[var(--auth-text)] placeholder:text-[var(--auth-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 aria-[invalid=true]:border-[var(--auth-border-error)]"
                    style={{ fontFamily: 'var(--auth-font-body)' }}
                    {...field}
                  />
                  {checkingEmail && (
                    <Loader2
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin"
                      style={{ color: 'var(--auth-text-muted)' }}
                      aria-label="Verificando email..."
                    />
                  )}
                </div>
              </FormControl>
              <FormMessage role="alert" aria-live="polite" />
              {emailExists && !checkingEmail && (
                <p
                  className="text-[0.75rem] mt-1"
                  role="alert"
                  style={{ color: 'var(--auth-warning)' }}
                >
                  Este email ya está registrado.{' '}
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

        {/* Password */}
        <PasswordField
          name="password"
          label="Contraseña"
          placeholder="••••••••"
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

        {/* Motivational text above CTA */}
        <p
          className="text-[0.75rem] text-center"
          style={{
            color: 'var(--auth-text-muted)',
            fontFamily: 'var(--auth-font-body)',
          }}
        >
          Tu sitio estará listo en menos de 2 minutos.
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onPrevStep}
            disabled={isLoading}
            className="h-12 px-5 rounded-[var(--auth-radius-button)] border border-[var(--auth-border)] text-[0.85rem] font-medium transition-all duration-[var(--auth-duration-fast)] hover:border-[var(--auth-text-muted)] active:scale-[0.98] flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2"
            style={{
              color: 'var(--auth-text-muted)',
              fontFamily: 'var(--auth-font-body)',
            }}
            data-auth-animated
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Atrás
          </button>
          <div className="flex-1">
            <SubmitButton
              isLoading={isLoading}
              disabled={emailExists}
              loadingLabel="Creando..."
            >
              Comenzar gratis
            </SubmitButton>
          </div>
        </div>
      </div>
    </div>
  );
}
