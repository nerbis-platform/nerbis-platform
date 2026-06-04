'use client';

import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from '@/components/auth/OtpInput';
import { OTP_LENGTH } from '@/components/auth/constants';
import { PasswordToggle, type PasswordResetStep } from '../_helpers';
import { maskEmail } from './login-helpers';

type ResetVariant = 'create' | 'reset';

interface PasswordResetFlowProps {
  variant: ResetVariant;
  email?: string;
  resetStep: PasswordResetStep;
  setResetStep: (step: PasswordResetStep) => void;
  resetOtp: string;
  setResetOtp: (value: string) => void;
  resetNewPassword: string;
  setResetNewPassword: (value: string) => void;
  resetConfirmPassword: string;
  setResetConfirmPassword: (value: string) => void;
  showResetNewPassword: boolean;
  setShowResetNewPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showResetConfirmPassword: boolean;
  setShowResetConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>;
  resetLoading: boolean;
  resetError: string;
  setResetError: (value: string) => void;
  resendCooldown: number;
  onSendResetOtp: () => void;
  onResendOtp: () => void;
  onVerifyResetOtp: () => void;
  onCancel: () => void;
}

export function PasswordResetFlow({
  variant,
  email,
  resetStep,
  setResetStep,
  resetOtp,
  setResetOtp,
  resetNewPassword,
  setResetNewPassword,
  resetConfirmPassword,
  setResetConfirmPassword,
  showResetNewPassword,
  setShowResetNewPassword,
  showResetConfirmPassword,
  setShowResetConfirmPassword,
  resetLoading,
  resetError,
  setResetError,
  resendCooldown,
  onSendResetOtp,
  onResendOtp,
  onVerifyResetOtp,
  onCancel,
}: PasswordResetFlowProps) {
  const isCreate = variant === 'create';
  const confirmTitle = isCreate ? 'Crear contraseña por correo' : 'Restablecer por correo';
  const newPasswordId = isCreate ? 'reset_new_password_create' : 'reset_new_password';
  const confirmPasswordId = isCreate
    ? 'reset_confirm_password_create'
    : 'reset_confirm_password';
  const submitLabel = isCreate
    ? resetLoading
      ? 'Creando...'
      : 'Crear contraseña'
    : resetLoading
      ? 'Restableciendo...'
      : 'Restablecer contraseña';

  return (
    <>
      {/* Step 1: Confirm & send OTP */}
      {resetStep === 'confirm' && (
        <div className="flex flex-col gap-3 pt-4">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-lg flex items-center justify-center shrink-0 bg-accent">
              <Mail className="size-4 text-[var(--color-text-brand)]" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{confirmTitle}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Te enviaremos un codigo de verificacion a{' '}
                <span className="font-medium text-foreground">
                  {email ? maskEmail(email) : ''}
                </span>
              </p>
            </div>
          </div>
          {resetError && <p className="text-xs text-destructive">{resetError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="rounded-xl text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={resetLoading}
              onClick={onSendResetOtp}
              className="rounded-xl text-sm hover:shadow-md active:scale-[0.98]"
            >
              {resetLoading && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              {resetLoading ? 'Enviando...' : 'Enviar codigo'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Enter OTP */}
      {resetStep === 'otp' && (
        <div className="flex flex-col gap-4 pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Ingresa el codigo de verificacion
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enviamos un codigo de {OTP_LENGTH} digitos a{' '}
              <span className="font-medium text-foreground">
                {email ? maskEmail(email) : ''}
              </span>
            </p>
          </div>
          <div className="py-1">
            <OtpInput
              value={resetOtp}
              onChange={(val) => {
                setResetOtp(val);
                setResetError('');
              }}
              disabled={resetLoading}
            />
          </div>
          <div className="flex items-center justify-center">
            {resendCooldown > 0 ? (
              <p className="text-xs text-muted-foreground">Reenviar en {resendCooldown}s</p>
            ) : (
              <button
                type="button"
                onClick={onResendOtp}
                disabled={resetLoading}
                className="text-xs font-medium text-[var(--color-text-brand)] hover:underline cursor-pointer disabled:opacity-50"
              >
                Reenviar codigo
              </button>
            )}
          </div>
          {resetError && (
            <p className="text-xs text-destructive text-center">{resetError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="rounded-xl text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={resetOtp.length < OTP_LENGTH}
              onClick={() => {
                setResetStep('new-password');
                setResetError('');
              }}
              className="rounded-xl text-sm hover:shadow-md active:scale-[0.98]"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: New password */}
      {resetStep === 'new-password' && (
        <div className="flex flex-col gap-4 pt-4">
          <p className="text-sm font-medium text-foreground">Crea tu nueva contraseña</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={newPasswordId} className="text-xs text-muted-foreground">
              Nueva contraseña
            </Label>
            <div className="relative">
              <Input
                id={newPasswordId}
                type={showResetNewPassword ? 'text' : 'password'}
                value={resetNewPassword}
                onChange={(e) => {
                  setResetNewPassword(e.target.value);
                  setResetError('');
                }}
                autoComplete="new-password"
                className="h-9 pr-10 text-sm md:text-sm"
              />
              <PasswordToggle
                show={showResetNewPassword}
                onToggle={() => setShowResetNewPassword((v) => !v)}
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimo 8 caracteres</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={confirmPasswordId} className="text-xs text-muted-foreground">
              Confirmar nueva contraseña
            </Label>
            <div className="relative">
              <Input
                id={confirmPasswordId}
                type={showResetConfirmPassword ? 'text' : 'password'}
                value={resetConfirmPassword}
                onChange={(e) => {
                  setResetConfirmPassword(e.target.value);
                  setResetError('');
                }}
                autoComplete="new-password"
                className="h-9 pr-10 text-sm md:text-sm"
              />
              <PasswordToggle
                show={showResetConfirmPassword}
                onToggle={() => setShowResetConfirmPassword((v) => !v)}
              />
            </div>
          </div>
          {resetError && <p className="text-xs text-destructive">{resetError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="rounded-xl text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={resetLoading || !resetNewPassword || !resetConfirmPassword}
              onClick={onVerifyResetOtp}
              className="rounded-xl text-sm hover:shadow-md active:scale-[0.98]"
            >
              {resetLoading && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              {submitLabel}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
