// src/components/auth/RegisterForm.tsx
// Single-step registration form: name + email + password.
// Business data (name, industry, country) is collected post-registro in onboarding.

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { socialLinkOnly } from '@/lib/api/auth';
import { features } from '@/lib/features';
import type { SocialProvider } from '@/types';
import {
  registerSimpleSchema,
  type RegisterSimpleFormValues,
} from './schemas';
import { LABEL_CLASS, LABEL_STYLE, DEFAULT_PHONE_COUNTRY, DEBOUNCE_DELAY_MS } from './constants';
import { useAuthForm } from './hooks/useAuthForm';
import { PasswordField } from './PasswordField';
import { SubmitButton } from './SubmitButton';
import { SocialLoginButtons } from './SocialLoginButtons';
import { FormDivider } from './FormDivider';
import type { AuthPrefill } from './types';

// ─── Placeholder business name for backend compatibility ────────
const AUTO_BUSINESS_NAME = 'Mi Negocio';

// ─── Props ──────────────────────────────────────────────────────

interface RegisterFormComponentProps {
  onToggleMode: () => void;
  onStepChange?: (step: 1 | 2) => void;
  initialPrefill?: AuthPrefill | null;
}

// ─── Component ──────────────────────────────────────────────────

export function RegisterForm({
  onToggleMode,
  initialPrefill,
}: RegisterFormComponentProps) {
  const { registerTenant } = useAuth();
  const [socialPrefill, setSocialPrefill] = useState<AuthPrefill | null>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);

  const activePrefill = socialPrefill || initialPrefill;

  const handleRegister = useCallback(
    async (data: RegisterSimpleFormValues) => {
      const result = await registerTenant({
        business_name: AUTO_BUSINESS_NAME,
        country: DEFAULT_PHONE_COUNTRY,
        email: data.email,
        password: data.password,
        password2: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        data_consent: data.data_consent,
        marketing_consent: data.marketing_consent,
      });

      // Link social account if registration came from social flow
      const VALID_PROVIDERS: SocialProvider[] = ['google', 'apple', 'facebook'];
      const provider = activePrefill?.provider;
      if (
        provider &&
        VALID_PROVIDERS.includes(provider as SocialProvider) &&
        activePrefill?.token
      ) {
        socialLinkOnly(provider as SocialProvider, activePrefill.token).catch(() => {
          toast.info('No se pudo vincular tu cuenta social automáticamente. Puedes hacerlo después desde tu perfil.');
        });
      }

      toast.success(result.message);
    },
    [registerTenant, activePrefill],
  );

  const { form, isLoading, handleSubmit } = useAuthForm<RegisterSimpleFormValues>({
    schema: registerSimpleSchema,
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      data_consent: false,
      marketing_consent: false,
    },
    onSubmit: handleRegister,
  });

  // Pre-fill from social login data
  const { setValue } = form;
  useEffect(() => {
    if (activePrefill) {
      if (activePrefill.email) setValue('email', activePrefill.email);
      if (activePrefill.first_name) setValue('first_name', activePrefill.first_name);
      if (activePrefill.last_name) setValue('last_name', activePrefill.last_name);
    }
  }, [activePrefill, setValue]);

  // Email existence check with debounce
  const [emailExists, setEmailExists] = useState(false);
  const emailValue = form.watch('email');
  const emailHasError = !!form.formState.errors.email;
  useEffect(() => {
    if (!emailValue || emailHasError) {
      // Use a microtask to avoid synchronous setState in effect
      const id = requestAnimationFrame(() => setEmailExists(false));
      return () => cancelAnimationFrame(id);
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/check-tenant-email/?email=${encodeURIComponent(emailValue)}`);
        if (res.ok) {
          const data = await res.json();
          setEmailExists(!!data.exists);
        }
      } catch {
        // Silently fail — non-critical check
      }
    }, DEBOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [emailValue, emailHasError]);

  // Focus management
  useEffect(() => {
    if (formContainerRef.current) {
      const heading = formContainerRef.current.querySelector<HTMLElement>('h2');
      if (heading) {
        const timer = setTimeout(() => heading.focus(), 100);
        return () => clearTimeout(timer);
      }
    }
  }, [activePrefill?.provider]);

  // Social prefill handler
  const handleSocialPrefill = useCallback((prefill: AuthPrefill) => {
    setSocialPrefill(prefill);
  }, []);

  return (
    <section aria-label="Crear cuenta" ref={formContainerRef}>
      {/* Title */}
      <div className="mb-6" data-auth-animated>
        <h2
          className="text-[1.5rem] tracking-[-0.03em] mb-2"
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
          Comienza gratis y lanza tu negocio online en minutos.
        </p>
      </div>

      {/* Social login buttons (feature flagged) */}
      {features.socialLogin && (
        <>
          <SocialLoginButtons
            mode="register"
            onSwitchToRegister={handleSocialPrefill}
          />
          <FormDivider text="o regístrate con email" />
        </>
      )}

      {/* Social profile confirmation */}
      {activePrefill?.provider && (
        <div
          className="flex items-center gap-3 rounded-[var(--auth-radius-input)] border px-4 py-3 mb-5"
          style={{
            borderColor: 'var(--auth-accent)',
            background: 'var(--accent)',
          }}
          data-auth-animated
        >
          {activePrefill.avatar ? (
            <img
              src={activePrefill.avatar}
              alt=""
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shrink-0"
              style={{ background: 'var(--auth-primary)', color: 'white' }}
            >
              {(activePrefill.first_name?.[0] || activePrefill.email?.[0] || '?').toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p
              className="text-[0.85rem] font-medium truncate"
              style={{ color: 'var(--auth-text)', fontFamily: 'var(--auth-font-body)' }}
            >
              {activePrefill.email}
            </p>
            <p
              className="text-[0.75rem] truncate"
              style={{ color: 'var(--auth-text-muted)', fontFamily: 'var(--auth-font-body)' }}
            >
              Conectado con {activePrefill.provider === 'google' ? 'Google' : activePrefill.provider === 'apple' ? 'Apple' : 'tu cuenta social'}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-5" data-auth-animated>
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
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    disabled={isLoading}
                    aria-required="true"
                    aria-invalid={!!form.formState.errors.email}
                    className="h-[var(--auth-input-height)] rounded-[var(--auth-radius-input)] border-[var(--auth-border)] bg-[var(--auth-bg-input)] text-[var(--auth-text)] placeholder:text-[var(--auth-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 aria-[invalid=true]:border-[var(--auth-border-error)]"
                    style={{ fontFamily: 'var(--auth-font-body)' }}
                    {...field}
                  />
                </FormControl>
                <FormMessage role="alert" aria-live="polite" />
                {emailExists && (
                  <p
                    className="text-[0.75rem] mt-1"
                    role="alert"
                    style={{ color: 'var(--auth-warning)' }}
                  >
                    Ya existe una cuenta con este email.{' '}
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
            placeholder="Crea una contraseña segura"
            control={form.control as unknown as import('react-hook-form').Control<Record<string, string>>}
            disabled={isLoading}
            showStrength
            autoComplete="new-password"
          />

          {/* Legal consent (Ley 1581 — explicit checkbox required) */}
          <FormField
            control={form.control}
            name="data_consent"
            render={({ field }) => (
              <FormItem className="flex items-start gap-2.5 space-y-0 pt-1">
                <FormControl>
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    disabled={isLoading}
                    className="mt-0.5 shrink-0"
                  />
                </FormControl>
                <div>
                  <FormLabel
                    className="text-[0.75rem] leading-[1.6] font-normal cursor-pointer inline"
                    style={{
                      color: 'var(--auth-text-muted)',
                      fontFamily: 'var(--auth-font-body)',
                    }}
                  >
                    Acepto los{' '}
                    <Link
                      href="/legal/terms"
                      target="_blank"
                      className="underline underline-offset-2 hover:text-[var(--auth-text)] inline"
                    >
                      Términos de Servicio
                    </Link>
                    {' '}y autorizo el tratamiento de datos según la{' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="underline underline-offset-2 hover:text-[var(--auth-text)] inline"
                    >
                      Política de Privacidad
                    </Link>
                  </FormLabel>
                  <FormMessage role="alert" aria-live="polite" className="mt-1" />
                </div>
              </FormItem>
            )}
          />

          {/* Submit */}
          <div className="pt-1">
            <SubmitButton
              isLoading={isLoading}
              disabled={emailExists}
              loadingLabel="Creando tu cuenta..."
            >
              Crear cuenta gratis
            </SubmitButton>
          </div>
        </form>
      </Form>

      {/* Toggle link */}
      <div className="mt-6 pt-5 border-t border-[var(--auth-border)] text-center">
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
    </section>
  );
}
