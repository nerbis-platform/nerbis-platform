// src/components/auth/RegisterStep1.tsx
// First step of business registration: business name, country selector.

'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { ArrowRight } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { RegisterBusinessFormValues } from './schemas';
import { countries, DEBOUNCE_DELAY_MS } from './constants';
import { useDebounce } from './hooks';
import { StepIndicator } from './StepIndicator';

// ─── Props ──────────────────────────────────────────────────────

interface RegisterStep1Props {
  form: UseFormReturn<RegisterBusinessFormValues>;
  onNextStep: () => void;
  onToggleMode: () => void;
  onPhoneCountryChange: (country: string) => void;
}

// ─── Component ──────────────────────────────────────────────────

export function RegisterStep1({
  form,
  onNextStep,
  onToggleMode,
  onPhoneCountryChange,
}: RegisterStep1Props) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Business name existence check
  const [businessNameExists, setBusinessNameExists] = useState(false);
  const [checkingName, setCheckingName] = useState(false);

  const businessName = form.watch('business_name');
  const debouncedName = useDebounce(businessName, DEBOUNCE_DELAY_MS);

  const checkBusinessName = useCallback(
    async (name: string, signal: AbortSignal) => {
      if (!name || name.trim().length < 2) {
        setBusinessNameExists(false);
        return;
      }
      setCheckingName(true);
      try {
        const res = await fetch(
          `${API_URL}/api/public/check-business-name/?name=${encodeURIComponent(name.trim())}`,
          { signal },
        );
        if (res.ok) {
          const data = await res.json();
          if (!signal.aborted) setBusinessNameExists(data.exists);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      } finally {
        if (!signal.aborted) setCheckingName(false);
      }
    },
    [API_URL],
  );

  useEffect(() => {
    if (!debouncedName || debouncedName.trim().length < 2) {
      setBusinessNameExists(false);
      return;
    }
    const controller = new AbortController();
    checkBusinessName(debouncedName, controller.signal);
    return () => controller.abort();
  }, [debouncedName, checkBusinessName]);

  return (
    <div data-auth-animated>
      {/* Step + Title */}
      <div className="mb-10">
        <StepIndicator currentStep={1} totalSteps={2} />
        <h2
          className="text-[1.5rem] tracking-[-0.02em] mb-2 mt-4"
          style={{
            color: 'var(--auth-primary)',
            fontWeight: 600,
            fontFamily: 'var(--auth-font-heading)',
          }}
        >
          Sobre tu negocio
        </h2>
        <p
          className="text-[0.85rem] leading-relaxed"
          style={{
            color: 'var(--auth-text-muted)',
            fontFamily: 'var(--auth-font-body)',
          }}
        >
          Cuéntanos qué tipo de negocio tienes.
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        <FormField
          control={form.control}
          name="business_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel
                className="text-[0.9375rem] font-normal"
                style={{
                  color: 'var(--auth-text)',
                  fontFamily: 'var(--auth-font-body)',
                }}
              >
                Nombre del negocio
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Mi Negocio"
                  aria-required="true"
                  aria-invalid={!!form.formState.errors.business_name}
                  className="h-[var(--auth-input-height)] rounded-[var(--auth-radius-input)] border-[var(--auth-border)] bg-[var(--auth-bg-input)] text-[var(--auth-text)] placeholder:text-[var(--auth-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 aria-[invalid=true]:border-[var(--auth-border-error)]"
                  style={{ fontFamily: 'var(--auth-font-body)' }}
                  {...field}
                />
              </FormControl>
              <FormMessage role="alert" aria-live="polite" />
              {businessNameExists && !checkingName && (
                <p
                  className="text-[0.75rem] mt-1"
                  role="alert"
                  style={{ color: 'var(--auth-warning, #D97706)' }}
                >
                  Este nombre ya existe.{' '}
                  <button
                    type="button"
                    onClick={onToggleMode}
                    className="font-medium underline underline-offset-2 cursor-pointer"
                    style={{ color: 'inherit' }}
                  >
                    ¿Es tuyo?
                  </button>
                </p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel
                className="text-[0.9375rem] font-normal"
                style={{
                  color: 'var(--auth-text)',
                  fontFamily: 'var(--auth-font-body)',
                }}
              >
                País
              </FormLabel>
              <Select
                onValueChange={(val) => {
                  field.onChange(val);
                  onPhoneCountryChange(val);
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger
                    className="data-[size=default]:h-[var(--auth-input-height)] w-full rounded-[var(--auth-radius-input)] border-[var(--auth-border)] bg-[var(--auth-bg-input)] text-sm text-[var(--auth-text)] data-placeholder:text-[var(--auth-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 [&_svg]:text-[var(--auth-text-muted)]"
                    style={{ fontFamily: 'var(--auth-font-body)' }}
                  >
                    <SelectValue placeholder="Selecciona">
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

        <button
          type="button"
          onClick={onNextStep}
          className="w-full h-12 mt-10 rounded-[var(--auth-radius-button)] text-white text-[0.9375rem] font-medium transition-[background-color,transform,opacity] duration-[var(--auth-duration-fast)] ease-out hover:bg-[var(--auth-primary-hover)] hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2"
          style={{
            background: 'var(--auth-primary)',
            fontFamily: 'var(--auth-font-body)',
          }}
          data-auth-animated
        >
          Continuar
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Toggle link */}
      <div className="mt-10 pt-6 border-t border-gray-100 text-center">
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
