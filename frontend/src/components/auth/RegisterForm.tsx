// src/components/auth/RegisterForm.tsx
// Orchestrator for multi-step business registration.

'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  registerBusinessSchema,
  type RegisterBusinessFormValues,
} from './schemas';
import { DEFAULT_PHONE_COUNTRY } from './constants';
import { RegisterStep1 } from './RegisterStep1';
import { RegisterStep2 } from './RegisterStep2';
import type { RegisterStep } from './types';

// ─── Props ──────────────────────────────────────────────────────

interface RegisterFormComponentProps {
  onToggleMode: () => void;
  /** Called when step changes (for brand panel content sync). */
  onStepChange?: (step: RegisterStep) => void;
}

// ─── Component ──────────────────────────────────────────────────

export function RegisterForm({
  onToggleMode,
  onStepChange,
}: RegisterFormComponentProps) {
  const { registerTenant } = useAuth();

  const [step, setStep] = useState<RegisterStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_PHONE_COUNTRY);

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
      password2: '',
    },
  });

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
          country: data.country,
          email: data.email,
          password: data.password,
          password2: data.password2,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
        });
        toast.success(result.message);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Error al crear el negocio';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [registerTenant],
  );

  const handlePhoneCountryChange = useCallback(
    (country: string) => {
      setPhoneCountry(country);
      // Sync the country field in the form when changed from phone selector
      form.setValue('country', country);
    },
    [form],
  );

  return (
    <section aria-label="Registro de negocio">
      {/* Screen reader announcement for step changes */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {step === 1
          ? 'Paso 1 de 2: Tu negocio'
          : 'Paso 2 de 2: Tu cuenta'}
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div
            className="transition-opacity duration-[var(--auth-duration-normal)] ease-out"
            style={{
              opacity: 1,
            }}
            data-auth-animated
          >
            {step === 1 && (
              <RegisterStep1
                form={form}
                onNextStep={handleNextStep}
                onToggleMode={onToggleMode}
                onPhoneCountryChange={handlePhoneCountryChange}
              />
            )}

            {step === 2 && (
              <RegisterStep2
                form={form}
                isLoading={isLoading}
                phoneCountry={phoneCountry}
                onPhoneCountryChange={handlePhoneCountryChange}
                onPrevStep={handlePrevStep}
                onToggleMode={onToggleMode}
              />
            )}
          </div>
        </form>
      </Form>
    </section>
  );
}
