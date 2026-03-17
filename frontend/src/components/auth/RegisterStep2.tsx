// src/components/auth/RegisterStep2.tsx
// Second step of business registration: personal info, email, phone, password.

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { ArrowLeft, Check, ChevronsUpDown } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { RegisterBusinessFormValues } from './schemas';
import { countries, DEBOUNCE_DELAY_MS } from './constants';
import { PasswordField } from './PasswordField';
import { SubmitButton } from './SubmitButton';
import { StepIndicator } from './StepIndicator';

// ─── Props ──────────────────────────────────────────────────────

interface RegisterStep2Props {
  form: UseFormReturn<RegisterBusinessFormValues>;
  isLoading: boolean;
  phoneCountry: string;
  onPhoneCountryChange: (country: string) => void;
  onPrevStep: () => void;
  onToggleMode: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export function RegisterStep2({
  form,
  isLoading,
  phoneCountry,
  onPhoneCountryChange,
  onPrevStep,
  onToggleMode,
}: RegisterStep2Props) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Phone code popover
  const [phoneCodeOpen, setPhoneCodeOpen] = useState(false);

  // Email existence check
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkTenantEmail = useCallback(
    async (email: string) => {
      if (!email || !email.includes('@')) {
        setEmailExists(false);
        return;
      }
      setCheckingEmail(true);
      try {
        const res = await fetch(
          `${API_URL}/api/public/check-tenant-email/?email=${encodeURIComponent(email.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          setEmailExists(data.exists);
        }
      } catch {
        /* silent */
      } finally {
        setCheckingEmail(false);
      }
    },
    [API_URL],
  );

  const emailValue = form.watch('email');
  useEffect(() => {
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    if (!emailValue || !emailValue.includes('@') || !emailValue.includes('.')) {
      setEmailExists(false);
      return;
    }
    emailCheckTimer.current = setTimeout(
      () => checkTenantEmail(emailValue),
      DEBOUNCE_DELAY_MS,
    );
    return () => {
      if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    };
  }, [emailValue, checkTenantEmail]);

  // Password match check
  const passwordValue = form.watch('password');
  const password2Value = form.watch('password2');
  const passwordsMatch = !password2Value || passwordValue === password2Value;

  const currentPhoneCountry = countries.find((c) => c.value === phoneCountry);

  return (
    <div data-auth-animated>
      {/* Step + Title */}
      <div className="mb-10">
        <StepIndicator currentStep={2} totalSteps={2} />
        <h2
          className="text-[1.5rem] tracking-[-0.02em] mb-2 mt-4"
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
          Tus credenciales de administrador.
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {/* First name + Last name */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel
                  className="text-[0.8125rem] font-normal"
                  style={{
                    color: 'var(--auth-text-muted)',
                    fontFamily: 'var(--auth-font-body)',
                  }}
                >
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
                <FormLabel
                  className="text-[0.8125rem] font-normal"
                  style={{
                    color: 'var(--auth-text-muted)',
                    fontFamily: 'var(--auth-font-body)',
                  }}
                >
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
              <FormLabel
                className="text-[0.8125rem] font-normal"
                style={{
                  color: 'var(--auth-text-muted)',
                  fontFamily: 'var(--auth-font-body)',
                }}
              >
                Email
              </FormLabel>
              <FormControl>
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
              </FormControl>
              <FormMessage role="alert" aria-live="polite" />
              {emailExists && !checkingEmail && (
                <p
                  className="text-[0.75rem] mt-1"
                  role="alert"
                  style={{ color: 'var(--auth-warning, #D97706)' }}
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

        {/* Phone with country code */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel
                className="text-[0.8125rem] font-normal"
                style={{
                  color: 'var(--auth-text-muted)',
                  fontFamily: 'var(--auth-font-body)',
                }}
              >
                Teléfono{' '}
                <span
                  className="font-normal"
                  style={{ color: 'var(--auth-text-placeholder)' }}
                >
                  opcional
                </span>
              </FormLabel>
              <FormControl>
                <div
                  className="flex h-[var(--auth-input-height)] items-center rounded-[var(--auth-radius-input)] border border-[var(--auth-border)] bg-[var(--auth-bg-input)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-within:border-[var(--auth-border-focus)] focus-within:ring-[3px] focus-within:ring-[var(--auth-accent)]/10"
                >
                  <Popover open={phoneCodeOpen} onOpenChange={setPhoneCodeOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Seleccionar código de país"
                        className="flex h-full items-center gap-1.5 border-r border-[var(--auth-border)] px-3 text-sm hover:bg-gray-50 transition-colors rounded-l-[var(--auth-radius-input)] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2"
                        style={{ fontFamily: 'var(--auth-font-body)' }}
                      >
                        <span className="text-base leading-none">
                          {currentPhoneCountry?.flag}
                        </span>
                        <span style={{ color: 'var(--auth-text-muted)' }}>
                          {currentPhoneCountry?.code}
                        </span>
                        <ChevronsUpDown
                          className="h-3 w-3"
                          style={{ color: 'var(--auth-text-placeholder)' }}
                        />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-52 p-0"
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
                          placeholder="Buscar país..."
                          className="text-sm"
                        />
                        <CommandList>
                          <CommandEmpty className="py-3 text-center text-sm text-[var(--auth-text-muted)]">
                            No encontrado.
                          </CommandEmpty>
                          <CommandGroup>
                            {countries.map((c) => (
                              <CommandItem
                                key={c.value}
                                value={c.label}
                                onSelect={() => {
                                  onPhoneCountryChange(c.value);
                                  setPhoneCodeOpen(false);
                                }}
                                className="text-sm"
                              >
                                <Check
                                  className={`mr-2 h-3.5 w-3.5 ${
                                    phoneCountry === c.value
                                      ? 'opacity-100 text-[var(--auth-accent)]'
                                      : 'opacity-0'
                                  }`}
                                />
                                <span className="text-base leading-none mr-2">
                                  {c.flag}
                                </span>
                                <span className="flex-1">{c.label}</span>
                                <span className="text-[var(--auth-text-muted)] ml-auto">
                                  {c.code}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <input
                    placeholder="Número de contacto"
                    inputMode="numeric"
                    disabled={isLoading}
                    aria-label="Número de teléfono"
                    className="flex-1 h-full bg-transparent px-3 text-sm outline-none text-[var(--auth-text)] placeholder:text-[var(--auth-text-placeholder)]"
                    style={{ fontFamily: 'var(--auth-font-body)' }}
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      field.onChange(e.target.value.replace(/[^\d\s]/g, ''));
                    }}
                  />
                </div>
              </FormControl>
              <FormMessage role="alert" aria-live="polite" />
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

        {/* Confirm password */}
        <div>
          <PasswordField
            name="password2"
            label="Confirmar contraseña"
            placeholder="••••••••"
            control={form.control as unknown as import('react-hook-form').Control<Record<string, string>>}
            disabled={isLoading}
            autoComplete="new-password"
          />
          {password2Value && (
            <p
              role="status"
              aria-live="polite"
              className="text-[0.7rem] mt-1 transition-colors"
              style={{
                color: passwordsMatch
                  ? 'var(--auth-success)'
                  : 'var(--auth-warning, #D97706)',
                fontFamily: 'var(--auth-font-body)',
              }}
            >
              {passwordsMatch
                ? 'Las contraseñas coinciden'
                : 'Las contraseñas no coinciden'}
            </p>
          )}
        </div>

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

        <p
          className="text-[0.75rem] text-center mt-3"
          style={{
            color: 'var(--auth-text-muted)',
            fontFamily: 'var(--auth-font-body)',
          }}
        >
          Tu sitio estará listo en menos de 2 minutos.
        </p>
      </div>
    </div>
  );
}
