// src/components/auth/ForgotPasswordForm.tsx
// Password recovery form: email step -> OTP + new password step -> success.

'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, CheckCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  platformRequestPasswordResetOTP,
  platformVerifyPasswordResetOTP,
} from '@/lib/api/auth';
import {
  forgotEmailSchema,
  forgotResetSchema,
  type ForgotEmailFormValues,
  type ForgotResetFormValues,
} from './schemas';
import { useAuthForm } from './hooks/useAuthForm';
import { OtpInput } from './OtpInput';
import { PasswordField } from './PasswordField';
import { SubmitButton } from './SubmitButton';
import type { ForgotStep } from './types';
import { LABEL_CLASS, LABEL_STYLE } from './constants';

// ─── Props ──────────────────────────────────────────────────────

interface ForgotPasswordFormComponentProps {
  onGoToLogin: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export function ForgotPasswordForm({
  onGoToLogin,
}: ForgotPasswordFormComponentProps) {
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  // ── Email step form
  const handleEmailSubmit = useCallback(
    async (data: ForgotEmailFormValues) => {
      await platformRequestPasswordResetOTP(data.email);
      setForgotEmail(data.email);
      toast.success('Si el email existe, recibirás un código de verificación');
      setForgotStep('reset');
    },
    [],
  );

  const emailFormHook = useAuthForm<ForgotEmailFormValues>({
    schema: forgotEmailSchema,
    defaultValues: { email: '' },
    onSubmit: handleEmailSubmit,
  });

  // ── Reset step form
  const handleResetSubmit = useCallback(
    async (data: ForgotResetFormValues) => {
      await platformVerifyPasswordResetOTP(
        forgotEmail,
        data.code,
        data.newPassword,
      );
      toast.success('Contraseña restablecida exitosamente');
      setForgotStep('success');
    },
    [forgotEmail],
  );

  const resetFormHook = useAuthForm<ForgotResetFormValues>({
    schema: forgotResetSchema,
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
    onSubmit: handleResetSubmit,
  });

  // ── Resend OTP
  const handleResendCode = useCallback(async () => {
    try {
      setIsResending(true);
      await platformRequestPasswordResetOTP(forgotEmail);
      resetFormHook.form.setValue('code', '');
      toast.success('Nuevo código enviado a tu email');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al reenviar código';
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  }, [forgotEmail, resetFormHook.form]);

  // Watch new password for strength rules
  const watchNewPassword = resetFormHook.form.watch('newPassword') || '';
  const pwRules = [
    { label: '8+ caracteres', met: watchNewPassword.length >= 8 },
    { label: 'Mayúscula', met: /[A-Z]/.test(watchNewPassword) },
    { label: 'Minúscula', met: /[a-z]/.test(watchNewPassword) },
    { label: 'Número', met: /[0-9]/.test(watchNewPassword) },
  ];

  return (
    <section aria-label="Recuperar contraseña">
      {/* ── Step: Email ── */}
      {forgotStep === 'email' && (
        <>
          <div className="mb-6">
            <h2
              className="text-[1.5rem] tracking-[-0.03em] mb-2"
              style={{
                color: 'var(--auth-primary)',
                fontWeight: 600,
                fontFamily: 'var(--auth-font-heading)',
              }}
            >
              No te preocupes
            </h2>
            <p
              className="text-[0.85rem] leading-relaxed"
              style={{
                color: 'var(--auth-text-muted)',
                fontFamily: 'var(--auth-font-body)',
              }}
            >
              Ingresa tu correo y te enviaremos un código para restablecer tu contraseña.
            </p>
          </div>

          <Form {...emailFormHook.form}>
            <form
              onSubmit={emailFormHook.handleSubmit}
              className="space-y-5"
              data-auth-animated
            >
              <FormField
                control={emailFormHook.form.control}
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
                        disabled={emailFormHook.isLoading}
                        aria-required="true"
                        aria-invalid={!!emailFormHook.form.formState.errors.email}
                        className="h-[var(--auth-input-height)] rounded-[var(--auth-radius-input)] border-[var(--auth-border)] bg-[var(--auth-bg-input)] text-[var(--auth-text)] placeholder:text-[var(--auth-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 aria-[invalid=true]:border-[var(--auth-border-error)]"
                        style={{ fontFamily: 'var(--auth-font-body)' }}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage role="alert" aria-live="polite" />
                  </FormItem>
                )}
              />

              <SubmitButton
                isLoading={emailFormHook.isLoading}
                loadingLabel="Enviando..."
              >
                Enviar código
              </SubmitButton>
            </form>
          </Form>

          <div className="mt-6 pt-5 border-t border-[var(--auth-border)] text-center">
            <button
              type="button"
              onClick={onGoToLogin}
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
        </>
      )}

      {/* ── Step: Reset (OTP + New Password) ── */}
      {forgotStep === 'reset' && (
        <>
          <div className="mb-6">
            <h2
              className="text-[1.5rem] tracking-[-0.03em] mb-2"
              style={{
                color: 'var(--auth-primary)',
                fontWeight: 600,
                fontFamily: 'var(--auth-font-heading)',
              }}
            >
              Elige tu nueva contraseña
            </h2>
            <p
              className="text-[0.85rem] leading-relaxed"
              style={{
                color: 'var(--auth-text-muted)',
                fontFamily: 'var(--auth-font-body)',
              }}
            >
              Código enviado a{' '}
              <span
                className="font-medium"
                style={{ color: 'var(--auth-primary)' }}
              >
                {forgotEmail}
              </span>
            </p>
            <p
              className="text-[0.75rem] leading-relaxed mt-2"
              style={{
                color: 'var(--auth-text-placeholder)',
                fontFamily: 'var(--auth-font-body)',
              }}
            >
              ¿No llega? Revisa tu carpeta de spam o verifica que el correo sea correcto.
            </p>
          </div>

          <Form {...resetFormHook.form}>
            <form
              onSubmit={resetFormHook.handleSubmit}
              className="space-y-5"
              data-auth-animated
            >
              {/* OTP Input */}
              <FormField
                control={resetFormHook.form.control}
                name="code"
                render={() => (
                  <FormItem>
                    <FormLabel className={LABEL_CLASS} style={LABEL_STYLE}>
                      Código de verificación
                    </FormLabel>
                    <FormControl>
                      <OtpInput
                        value={resetFormHook.form.watch('code') || ''}
                        onChange={(code) =>
                          resetFormHook.form.setValue('code', code, {
                            shouldValidate: true,
                          })
                        }
                        disabled={resetFormHook.isLoading}
                      />
                    </FormControl>
                    <FormMessage role="alert" aria-live="polite" />
                  </FormItem>
                )}
              />

              {/* New password */}
              <PasswordField
                name="newPassword"
                label="Nueva contraseña"
                placeholder="••••••••"
                control={resetFormHook.form.control as unknown as import('react-hook-form').Control<Record<string, string>>}
                disabled={resetFormHook.isLoading}
                autoComplete="new-password"
              />

              {/* Password strength rules (inline, matching original) */}
              {watchNewPassword.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1" role="status" aria-label="Requisitos de contraseña">
                  {pwRules.map((rule) => (
                    <span
                      key={rule.label}
                      className="text-[0.75rem] flex items-center gap-1 transition-colors"
                      style={{
                        color: rule.met
                          ? 'var(--auth-success)'
                          : 'var(--auth-text-placeholder)',
                        fontFamily: 'var(--auth-font-body)',
                      }}
                    >
                      {rule.met ? (
                        <Check className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <span
                          className="h-3 w-3 inline-block rounded-full border"
                          style={{ borderColor: 'var(--auth-text-placeholder)' }}
                          aria-hidden="true"
                        />
                      )}
                      {rule.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Confirm password */}
              <PasswordField
                name="confirmPassword"
                label="Confirmar contraseña"
                placeholder="••••••••"
                control={resetFormHook.form.control as unknown as import('react-hook-form').Control<Record<string, string>>}
                disabled={resetFormHook.isLoading}
                autoComplete="new-password"
              />

              <SubmitButton
                isLoading={resetFormHook.isLoading}
                loadingLabel="Restableciendo..."
              >
                Restablecer contraseña
              </SubmitButton>
            </form>
          </Form>

          {/* Resend + back links */}
          <div className="mt-6 pt-5 border-t border-[var(--auth-border)] text-center space-y-3">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResending}
              className="text-[0.78rem] transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
              style={{
                color: 'var(--auth-accent)',
                fontFamily: 'var(--auth-font-body)',
              }}
            >
              {isResending
                ? 'Reenviando...'
                : '¿No recibiste el código? Reenviar'}
            </button>

            <div>
              <button
                type="button"
                onClick={onGoToLogin}
                className="inline-flex items-center text-[0.78rem] transition-colors cursor-pointer hover:text-[var(--auth-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
                style={{
                  color: 'var(--auth-text-muted)',
                  fontFamily: 'var(--auth-font-body)',
                }}
              >
                <ArrowLeft
                  className="mr-1.5 h-3.5 w-3.5"
                  aria-hidden="true"
                />
                Volver a iniciar sesión
              </button>
            </div>
            <p>
              <a
                href="/ayuda"
                className="text-[0.78rem] font-medium hover:underline underline-offset-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
                style={{ color: 'var(--auth-text-muted)' }}
              >
                ¿Necesitas ayuda?
              </a>
            </p>
          </div>
        </>
      )}

      {/* ── Step: Success ── */}
      {forgotStep === 'success' && (
        <div className="text-center" role="status" data-auth-animated>
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'var(--accent)' }}
          >
            <CheckCircle
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
            ¡Listo, todo en orden!
          </h2>

          <p
            className="text-[0.85rem] mb-8"
            style={{
              color: 'var(--auth-text-muted)',
              fontFamily: 'var(--auth-font-body)',
            }}
          >
            Tu contraseña ha sido actualizada. Ya puedes iniciar sesión.
          </p>

          <SubmitButton
            isLoading={false}
            type="button"
            onClick={onGoToLogin}
          >
            Iniciar sesión
          </SubmitButton>

          <p className="mt-6">
            <a
              href="/ayuda"
              className="text-[0.78rem] font-medium hover:underline underline-offset-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
              style={{ color: 'var(--auth-text-muted)' }}
            >
              ¿Necesitas ayuda?
            </a>
          </p>
        </div>
      )}
    </section>
  );
}
