// src/components/auth/LoginForm.tsx
// Complete login form with email/password, social login, passkey, and reactivation support.

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
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
import { ApiError } from '@/lib/api/client';
import { requestReactivationOTP } from '@/lib/api/auth';
import { features } from '@/lib/features';
import { loginSchema, type LoginFormValues } from './schemas';
import { useAuthForm } from './hooks/useAuthForm';
import { PasswordField } from './PasswordField';
import { SubmitButton } from './SubmitButton';
import { SocialLoginButtons } from './SocialLoginButtons';
import { FormDivider } from './FormDivider';
import { PasskeyButton } from './PasskeyButton';
import { ReactivateDialog } from './ReactivateDialog';

// ─── Props ──────────────────────────────────────────────────────

interface LoginFormComponentProps {
  onToggleMode: () => void;
  onForgotPassword: () => void;
  redirectTo?: string | null;
}

// ─── Component ──────────────────────────────────────────────────

export function LoginForm({
  onToggleMode,
  onForgotPassword,
  redirectTo = null,
}: LoginFormComponentProps) {
  const router = useRouter();
  const { platformLogin } = useAuth();

  // Reactivation state
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [inactiveAccountData, setInactiveAccountData] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [reactivateLoading, setReactivateLoading] = useState(false);

  const handleLogin = useCallback(
    async (data: LoginFormValues) => {
      try {
        await platformLogin(data, redirectTo || undefined);
        toast.success('¡Bienvenido!');
      } catch (error) {
        if (error instanceof ApiError && error.code === 'ACCOUNT_INACTIVE') {
          setInactiveAccountData({ email: data.email, password: data.password });
          setShowReactivateDialog(true);
          return;
        }
        throw error; // re-throw so useAuthForm catches and toasts it
      }
    },
    [platformLogin, redirectTo],
  );

  const { form, isLoading, handleSubmit } = useAuthForm<LoginFormValues>({
    schema: loginSchema,
    defaultValues: { email: '', password: '' },
    onSubmit: handleLogin,
  });

  const handleReactivate = useCallback(async () => {
    if (!inactiveAccountData) return;
    try {
      setReactivateLoading(true);
      setShowReactivateDialog(false);
      await requestReactivationOTP({
        ...inactiveAccountData,
        tenant_slug: process.env.NEXT_PUBLIC_TENANT_SLUG || 'gc-belleza',
      });
      toast.success('Te hemos enviado un código de verificación a tu email');
      router.push(
        `/reactivate?email=${encodeURIComponent(inactiveAccountData.email)}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al solicitar reactivación';
      toast.error(message);
    } finally {
      setReactivateLoading(false);
      setInactiveAccountData(null);
    }
  }, [inactiveAccountData, router]);

  return (
    <>
      <section aria-label="Iniciar sesión">
        {/* Title */}
        <div className="mb-6">
          <h2
            className="text-[1.5rem] tracking-[-0.02em] mb-2"
            style={{
              color: 'var(--auth-primary)',
              fontWeight: 600,
              fontFamily: 'var(--auth-font-heading)',
            }}
          >
            Bienvenido de nuevo
          </h2>
          <p
            className="text-[0.85rem] leading-relaxed"
            style={{
              color: 'var(--auth-text-muted)',
              fontFamily: 'var(--auth-font-body)',
            }}
          >
            Accede a tu cuenta para continuar.
          </p>
        </div>

        {/* Social login buttons (feature flagged) */}
        {features.socialLogin && (
          <>
            <SocialLoginButtons mode="login" />
            <FormDivider text="o continúa con email" />
          </>
        )}

        {/* Email/Password Form */}
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-5" data-auth-animated>
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
                </FormItem>
              )}
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <FormLabel
                  className="text-[0.8125rem] font-normal"
                  style={{
                    color: 'var(--auth-text-muted)',
                    fontFamily: 'var(--auth-font-body)',
                  }}
                >
                  Contraseña
                </FormLabel>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-[0.75rem] leading-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
                  style={{ color: 'var(--auth-accent, #0D9488)' }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <PasswordField
                name="password"
                label=""
                placeholder="••••••••"
                control={form.control as unknown as import('react-hook-form').Control<Record<string, string>>}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <div className="pt-2">
              <SubmitButton isLoading={isLoading} loadingLabel="Iniciando sesión...">
                Iniciar sesión
              </SubmitButton>
            </div>
          </form>
        </Form>

        {/* Passkey option (feature flagged) — subtle, below form */}
        <PasskeyButton />

        {/* Toggle link */}
        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p
            className="text-[0.8rem]"
            style={{
              color: 'var(--auth-text-muted)',
              fontFamily: 'var(--auth-font-body)',
            }}
          >
            ¿No tienes cuenta?{' '}
            <button
              type="button"
              onClick={onToggleMode}
              className="font-medium hover:underline underline-offset-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
              style={{ color: 'var(--auth-primary)' }}
            >
              Registra tu negocio
            </button>
          </p>
        </div>

        {/* Help link */}
        <div className="mt-3 text-center">
          <p
            className="text-[0.8rem]"
            style={{
              color: 'var(--auth-text-muted)',
              fontFamily: 'var(--auth-font-body)',
            }}
          >
            <a
              href="mailto:soporte@nerbis.com"
              className="font-medium hover:underline underline-offset-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
              style={{ color: 'var(--auth-text-muted)' }}
            >
              ¿Necesitas ayuda?
            </a>
          </p>
        </div>
      </section>

      {/* Reactivation dialog */}
      <ReactivateDialog
        open={showReactivateDialog}
        onClose={() => setShowReactivateDialog(false)}
        onReactivate={handleReactivate}
        isLoading={reactivateLoading}
      />
    </>
  );
}
