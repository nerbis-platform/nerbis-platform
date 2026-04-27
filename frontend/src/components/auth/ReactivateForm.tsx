// src/components/auth/ReactivateForm.tsx
// Account reactivation form: OTP verification -> success.

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { verifyReactivationOTP } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { reactivateSchema, type ReactivateFormValues } from './schemas';
import { useAuthForm } from './hooks/useAuthForm';
import { OtpInput } from './OtpInput';
import { SubmitButton } from './SubmitButton';
import { LABEL_CLASS, LABEL_STYLE } from './constants';

// ─── Props ──────────────────────────────────────────────────────

// ─── Component ──────────────────────────────────────────────────

export function ReactivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const { setUser } = useAuth();
  const [success, setSuccess] = useState(false);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.push('/login');
    }
  }, [email, router]);

  const handleSubmit = useCallback(
    async (data: ReactivateFormValues) => {
      const response = await verifyReactivationOTP(email, data.code);
      setUser(response.user);
      setSuccess(true);
      toast.success('¡Cuenta reactivada exitosamente!');
    },
    [email, setUser],
  );

  const formHook = useAuthForm<ReactivateFormValues>({
    schema: reactivateSchema,
    defaultValues: { code: '' },
    onSubmit: handleSubmit,
  });

  // ── Success state
  if (success) {
    return (
      <div className="text-center" role="status" data-auth-animated>
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'var(--auth-accent-bg, #E2F3F1)' }}
        >
          <UserCheck
            className="h-7 w-7"
            style={{ color: 'var(--auth-success)' }}
          />
        </div>

        <h2
          className="text-[1.5rem] tracking-[-0.03em] mb-2"
          style={{
            color: 'var(--auth-primary)',
            fontWeight: 600,
            fontFamily: 'var(--auth-font-heading)',
          }}
        >
          ¡Bienvenido de vuelta!
        </h2>

        <p
          className="text-[0.85rem] mb-8"
          style={{
            color: 'var(--auth-text-muted)',
            fontFamily: 'var(--auth-font-body)',
          }}
        >
          Tu cuenta ha sido reactivada exitosamente.
        </p>

        <SubmitButton
          isLoading={false}
          type="button"
          onClick={() => router.push('/')}
        >
          Ir al inicio
        </SubmitButton>
      </div>
    );
  }

  return (
    <section aria-label="Reactivar cuenta">
      <div className="mb-6">
        <h2
          className="text-[1.5rem] tracking-[-0.03em] mb-2"
          style={{
            color: 'var(--auth-primary)',
            fontWeight: 600,
            fontFamily: 'var(--auth-font-heading)',
          }}
        >
          Reactivar cuenta
        </h2>
        <p
          className="text-[0.85rem] leading-relaxed"
          style={{
            color: 'var(--auth-text-muted)',
            fontFamily: 'var(--auth-font-body)',
          }}
        >
          Ingresa el código de 8 dígitos enviado a{' '}
          <span
            className="font-medium"
            style={{ color: 'var(--auth-primary)' }}
          >
            {email}
          </span>
        </p>
      </div>

      <Form {...formHook.form}>
        <form
          onSubmit={formHook.handleSubmit}
          className="space-y-5"
          data-auth-animated
        >
          <FormField
            control={formHook.form.control}
            name="code"
            render={() => (
              <FormItem>
                <FormLabel className={LABEL_CLASS} style={LABEL_STYLE}>
                  Código de verificación
                </FormLabel>
                <FormControl>
                  <OtpInput
                    value={formHook.form.watch('code') || ''}
                    onChange={(code) =>
                      formHook.form.setValue('code', code, {
                        shouldValidate: true,
                      })
                    }
                    disabled={formHook.isLoading}
                  />
                </FormControl>
                <FormMessage role="alert" aria-live="polite" />
              </FormItem>
            )}
          />

          <SubmitButton
            isLoading={formHook.isLoading}
            loadingLabel="Verificando..."
          >
            Reactivar mi cuenta
          </SubmitButton>
        </form>
      </Form>

      <p
        className="mt-4 text-[0.75rem] leading-relaxed text-center"
        style={{
          color: 'var(--auth-text-placeholder)',
          fontFamily: 'var(--auth-font-body)',
        }}
      >
        El código expira en 10 minutos. Si no lo ves en tu bandeja de entrada, revisa la carpeta de spam.
      </p>

      <div className="mt-6 pt-5 border-t border-[var(--auth-border)] text-center">
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="inline-flex items-center text-[0.78rem] transition-colors cursor-pointer hover:text-[var(--auth-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
          style={{
            color: 'var(--auth-text-muted)',
            fontFamily: 'var(--auth-font-body)',
          }}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Volver a iniciar sesión
        </button>
      </div>
    </section>
  );
}
