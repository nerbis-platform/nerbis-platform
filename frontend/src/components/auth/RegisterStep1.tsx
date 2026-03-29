// src/components/auth/RegisterStep1.tsx
// First step of business registration: social signup, business name, industry, country.

'use client';

import { useState } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ArrowRight, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { RegisterBusinessFormValues } from './schemas';
import { countries, industries, LABEL_CLASS, LABEL_STYLE } from './constants';
import { useBusinessNameCheck } from './hooks';
import { SocialLoginButtons } from './SocialLoginButtons';
import { FormDivider } from './FormDivider';
import { features } from '@/lib/features';
import type { AuthPrefill } from './types';
import { cn } from '@/lib/utils';

// ─── Props ──────────────────────────────────────────────────────

interface RegisterStep1Props {
  form: UseFormReturn<RegisterBusinessFormValues>;
  onNextStep: () => void;
  onToggleMode: () => void;
  onSocialPrefill?: (prefill: AuthPrefill) => void;
}

// ─── Component ──────────────────────────────────────────────────

export function RegisterStep1({
  form,
  onNextStep,
  onToggleMode,
  onSocialPrefill,
}: RegisterStep1Props) {
  // Industry combobox
  const [industryOpen, setIndustryOpen] = useState(false);

  // Business name existence check
  const businessName = form.watch('business_name');
  const { exists: businessNameExists, checking: checkingName } = useBusinessNameCheck(businessName);

  // Block "Continuar" if name is duplicate or still checking
  const continueDisabled = businessNameExists || checkingName;

  return (
    <div data-auth-animated>
      {/* Step + Title */}
      <div className="mb-6">
        <h2
          className="text-[1.5rem] tracking-[-0.02em] mb-2 mt-4"
          tabIndex={-1}
          style={{
            color: 'var(--auth-primary)',
            fontWeight: 600,
            fontFamily: 'var(--auth-font-heading)',
          }}
        >
          Cuéntanos de tu negocio
        </h2>
        <p
          className="text-[0.85rem] leading-relaxed"
          style={{
            color: 'var(--auth-text-muted)',
            fontFamily: 'var(--auth-font-body)',
          }}
        >
          Queremos conocerte para personalizar tu experiencia.
        </p>
      </div>

      {/* Social signup buttons (feature flagged) */}
      {features.socialLogin && (
        <>
          <SocialLoginButtons mode="register" onSwitchToRegister={onSocialPrefill} />
          <FormDivider text="o continúa con email" />
        </>
      )}

      {/* Fields */}
      <div className="space-y-5">
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

        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => {
            const selectedIndustry = industries.find((i) => i.value === field.value);
            return (
              <FormItem className="flex flex-col">
                <FormLabel className={LABEL_CLASS} style={LABEL_STYLE}>
                  Industria{' '}
                  <span
                    className="font-normal"
                    style={{ color: 'var(--auth-text-placeholder)' }}
                  >
                    opcional
                  </span>
                </FormLabel>
                <Popover open={industryOpen} onOpenChange={setIndustryOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <button
                        type="button"
                        role="combobox"
                        aria-expanded={industryOpen}
                        aria-controls="industry-listbox"
                        className={cn(
                          'flex h-[var(--auth-input-height)] w-full items-center justify-between rounded-[var(--auth-radius-input)] border border-[var(--auth-border)] bg-[var(--auth-bg-input)] px-3 text-sm transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 focus-visible:outline-none',
                          !field.value && 'text-[var(--auth-text-placeholder)]',
                          field.value && 'text-[var(--auth-text)]',
                        )}
                        style={{ fontFamily: 'var(--auth-font-body)' }}
                      >
                        {selectedIndustry?.label || 'Selecciona tu industria'}
                        <ChevronsUpDown
                          className="ml-2 h-4 w-4 shrink-0"
                          style={{ color: 'var(--auth-text-muted)' }}
                        />
                      </button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                    style={
                      {
                        '--accent': '#E2F3F1',
                        '--accent-foreground': 'var(--auth-primary)',
                      } as React.CSSProperties
                    }
                  >
                    <Command>
                      <CommandInput
                        placeholder="Buscar industria..."
                        className="text-sm"
                      />
                      <CommandList id="industry-listbox">
                        <CommandEmpty className="py-3 text-center text-sm text-[var(--auth-text-muted)]">
                          No encontrada.
                        </CommandEmpty>
                        <CommandGroup>
                          {industries.map((ind) => (
                            <CommandItem
                              key={ind.value}
                              value={ind.label}
                              onSelect={() => {
                                field.onChange(ind.value);
                                setIndustryOpen(false);
                              }}
                              className="text-sm"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-3.5 w-3.5',
                                  field.value === ind.value
                                    ? 'opacity-100 text-[var(--auth-accent)]'
                                    : 'opacity-0',
                                )}
                              />
                              {ind.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p
                  className="text-[0.7rem] mt-1"
                  style={{
                    color: 'var(--auth-text-placeholder)',
                    fontFamily: 'var(--auth-font-body)',
                  }}
                >
                  Esto nos ayuda a personalizar tu plataforma.
                </p>
              </FormItem>
            );
          }}
        />

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

        <button
          type="button"
          onClick={onNextStep}
          disabled={continueDisabled}
          aria-label="Continuar al paso 2: Tu cuenta"
          className="w-full h-12 mt-6 rounded-[var(--auth-radius-button)] text-white text-[0.9375rem] font-medium transition-[background-color,transform,opacity] duration-[var(--auth-duration-fast)] ease-out hover:bg-[var(--auth-primary-hover)] hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
