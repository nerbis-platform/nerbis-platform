// src/components/auth/RegisterForm.tsx
// Orchestrator for multi-step business registration.

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { socialLinkOnly } from '@/lib/api/auth';
import type { SocialProvider } from '@/types';
import {
  registerBusinessSchema,
  type RegisterBusinessFormValues,
} from './schemas';
import { DEFAULT_PHONE_COUNTRY } from './constants';
import { RegisterStep1 } from './RegisterStep1';
import { RegisterStep2 } from './RegisterStep2';
import { RegisterSocialStep } from './RegisterSocialStep';
import type { AuthPrefill, RegisterStep } from './types';

// ─── Props ──────────────────────────────────────────────────────

interface RegisterFormComponentProps {
  onToggleMode: () => void;
  /** Called when step changes (for brand panel content sync). */
  onStepChange?: (step: RegisterStep) => void;
  /** Pre-fill data from social login (USER_NOT_FOUND flow). Includes provider/token to auto-link after registration. */
  initialPrefill?: AuthPrefill | null;
}

// ─── Component ──────────────────────────────────────────────────

export function RegisterForm({
  onToggleMode,
  onStepChange,
  initialPrefill,
}: RegisterFormComponentProps) {
  const { registerTenant } = useAuth();

  const [step, setStep] = useState<RegisterStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [socialPrefill, setSocialPrefill] = useState<AuthPrefill | null>(null);
  const stepContainerRef = useRef<HTMLDivElement>(null);

  // Merge initial prefill from parent (login→register switch) and local social prefill (from Step1 buttons)
  const activePrefill = socialPrefill || initialPrefill;

  const form = useForm<RegisterBusinessFormValues>({
    resolver: zodResolver(registerBusinessSchema),
    defaultValues: {
      business_name: '',
      industry: '',
      country: DEFAULT_PHONE_COUNTRY,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  // ── Pre-fill from social login data (initial or from Step1 social buttons)
  const { setValue } = form;
  useEffect(() => {
    if (activePrefill) {
      if (activePrefill.email) setValue('email', activePrefill.email);
      if (activePrefill.first_name) setValue('first_name', activePrefill.first_name);
      if (activePrefill.last_name) setValue('last_name', activePrefill.last_name);
    }
  }, [activePrefill, setValue]);

  // ── Focus management on step transition
  useEffect(() => {
    if (stepContainerRef.current) {
      const heading = stepContainerRef.current.querySelector<HTMLElement>('h2');
      if (heading) {
        const timer = setTimeout(() => heading.focus(), 100);
        return () => clearTimeout(timer);
      }
    }
  }, [step, activePrefill?.provider]);

  // ── Social prefill handler (from Step1 social buttons — stays on Step 1)
  // Google/social can give us name+email, but NOT business_name, industry, or country.
  // So we prefill what we can and let the user complete Step 1 before advancing.
  const handleSocialPrefill = useCallback((prefill: AuthPrefill) => {
    setSocialPrefill(prefill);
    // Don't jump to Step 2 — user still needs to fill business_name + country
  }, []);

  // ── Step navigation
  const handleNextStep = useCallback(async () => {
    const result = await form.trigger(['business_name', 'country']);
    if (result) {
      setStep(2);
      onStepChange?.(2);
    }
  }, [form, onStepChange]);

  const handlePrevStep = useCallback(() => {
    setStep(1);
    onStepChange?.(1);
  }, [onStepChange]);

  // ── Submit
  const onSubmit = useCallback(
    async (data: RegisterBusinessFormValues) => {
      try {
        setIsLoading(true);
        const result = await registerTenant({
          business_name: data.business_name,
          industry: data.industry || undefined,
          country: data.country,
          email: data.email,
          password: data.password,
          password2: data.password,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
        });

        // Si el registro viene desde social login, vincular sin tocar tokens (no bloquea)
        const VALID_PROVIDERS: SocialProvider[] = ['google', 'apple', 'facebook'];
        const provider = activePrefill?.provider;
        if (
          provider &&
          VALID_PROVIDERS.includes(provider as SocialProvider) &&
          activePrefill?.token
        ) {
          socialLinkOnly(
            provider as SocialProvider,
            activePrefill.token,
          ).catch(() => {
            toast.info('No se pudo vincular tu cuenta social automáticamente. Puedes hacerlo después desde tu perfil.');
          });
        }

        toast.success(result.message);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Error al crear el negocio';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [registerTenant, activePrefill],
  );

  // ── Validation error handler (catches errors on hidden pre-filled fields)
  const onInvalid = useCallback(
    (errors: FieldErrors<RegisterBusinessFormValues>) => {
      const hiddenFields = ['email', 'first_name', 'last_name'] as const;
      const hiddenErrors = hiddenFields
        .map((f) => errors[f]?.message)
        .filter(Boolean);
      if (hiddenErrors.length > 0) {
        toast.error('Hay un problema con tus datos', {
          description: hiddenErrors.join('. '),
        });
      }
    },
    [],
  );

  // Social login gives us name+email → show single combined form instead of 2 steps
  const isSocialFlow = !!activePrefill?.provider;

  return (
    <section aria-label="Registro de negocio">
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isSocialFlow
          ? 'Completa tu registro'
          : step === 1
            ? 'Paso 1 de 2: Tu negocio'
            : 'Paso 2 de 2: Tu cuenta'}
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          <div
            ref={stepContainerRef}
            className="transition-opacity duration-[var(--auth-duration-normal)] ease-out"
            style={{ opacity: 1 }}
            data-auth-animated
          >
            {isSocialFlow ? (
              <RegisterSocialStep
                form={form}
                isLoading={isLoading}
                prefill={activePrefill!}
                onToggleMode={onToggleMode}
              />
            ) : (
              <>
                {step === 1 && (
                  <RegisterStep1
                    form={form}
                    onNextStep={handleNextStep}
                    onToggleMode={onToggleMode}
                    onSocialPrefill={handleSocialPrefill}
                  />
                )}

                {step === 2 && (
                  <RegisterStep2
                    form={form}
                    isLoading={isLoading}
                    onPrevStep={handlePrevStep}
                    onToggleMode={onToggleMode}
                  />
                )}
              </>
            )}
          </div>
        </form>
      </Form>
    </section>
  );
}
