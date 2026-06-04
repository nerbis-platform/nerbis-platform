'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SectionHeader, SettingCard } from '@/components/settings';
import type { User } from '@/types';
import { PasswordResetFlow } from './PasswordResetFlow';
import { ChangePasswordForm } from './ChangePasswordForm';
import { usePasswordResetFlow } from './usePasswordResetFlow';

interface PasswordData {
  current_password: string;
  new_password: string;
  new_password2: string;
}

interface PasswordSectionProps {
  mounted: boolean;
  email?: string;
  profile?: User;
  /** Ejecuta el cambio de contraseña (page owns the mutation). */
  onChangePassword: (data: PasswordData) => void;
  /** El cambio de contraseña está en curso. */
  isChangingPassword: boolean;
  /** Nonce que se incrementa en cada cambio de contraseña exitoso. */
  changePasswordSuccessNonce: number;
  /** Invalida ['user-profile'] tras restablecer por OTP. */
  onResetComplete: () => void;
}

export function PasswordSection({
  mounted,
  email,
  profile,
  onChangePassword,
  isChangingPassword,
  changePasswordSuccessNonce,
  onResetComplete,
}: PasswordSectionProps) {
  // ── Cambio de contraseña ────────────────────────────
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordData>({
    current_password: '',
    new_password: '',
    new_password2: '',
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── Inline password reset (forgot password) ───────
  const {
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
    resetInlineFlow,
    handleSendResetOtp,
    handleResendOtp,
    handleVerifyResetOtp,
  } = usePasswordResetFlow({
    email,
    onClose: useCallback(() => setIsEditingPassword(false), []),
    onResetComplete,
  });

  // Cierra el formulario de cambio cuando la mutación termina OK (nonce > 0).
  useEffect(() => {
    if (changePasswordSuccessNonce > 0) {
      // Reset form after the page-owned mutation reports success. Behavior-preserving.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPasswordData({ current_password: '', new_password: '', new_password2: '' });
      setIsEditingPassword(false);
    }
  }, [changePasswordSuccessNonce]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pw = passwordData.new_password;
    if (pw !== passwordData.new_password2) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (pw.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (/^\d+$/.test(pw)) {
      toast.error('La contraseña no puede ser completamente numérica');
      return;
    }
    onChangePassword(passwordData);
  };

  const onCancelReset = () => {
    resetInlineFlow();
    setIsEditingPassword(false);
  };

  const resetFlow = (variant: 'create' | 'reset') => (
    <PasswordResetFlow
      variant={variant}
      email={email}
      resetStep={resetStep}
      setResetStep={setResetStep}
      resetOtp={resetOtp}
      setResetOtp={setResetOtp}
      resetNewPassword={resetNewPassword}
      setResetNewPassword={setResetNewPassword}
      resetConfirmPassword={resetConfirmPassword}
      setResetConfirmPassword={setResetConfirmPassword}
      showResetNewPassword={showResetNewPassword}
      setShowResetNewPassword={setShowResetNewPassword}
      showResetConfirmPassword={showResetConfirmPassword}
      setShowResetConfirmPassword={setShowResetConfirmPassword}
      resetLoading={resetLoading}
      resetError={resetError}
      setResetError={setResetError}
      resendCooldown={resendCooldown}
      onSendResetOtp={handleSendResetOtp}
      onResendOtp={handleResendOtp}
      onVerifyResetOtp={handleVerifyResetOtp}
      onCancel={onCancelReset}
    />
  );

  return (
    <section>
      <SectionHeader as={3} title="Correo y contraseña" />

      {/* Email (estado) */}
      <SettingCard className="mb-3">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'size-9 rounded-lg flex items-center justify-center shrink-0',
                profile?.has_password ? 'bg-accent' : 'bg-muted',
              )}
            >
              <KeyRound
                className={cn(
                  'size-4',
                  profile?.has_password
                    ? 'text-[var(--color-text-brand)]'
                    : 'text-muted-foreground',
                )}
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Correo electrónico</p>
              <p className="text-xs text-muted-foreground truncate">
                {!mounted ? 'Cargando…' : email}
              </p>
            </div>
          </div>
          {!profile ? null : profile.has_password ? (
            <Badge
              variant="outline"
              className="gap-1 text-xs text-emerald-600 border-emerald-200 bg-emerald-50/80"
            >
              <Check className="size-3" aria-hidden="true" />
              Activo
            </Badge>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setResetStep('confirm');
                setIsEditingPassword(true);
              }}
              className="text-xs font-medium text-[var(--color-text-brand)] hover:bg-accent hover:text-[var(--color-text-brand)] cursor-pointer"
            >
              Crear contraseña
            </Button>
          )}
        </div>
        {profile && !profile.has_password && resetStep === 'idle' && (
          <div className="px-4 pb-3.5 -mt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Crea una contraseña para acceder también por email, sin depender de redes
              sociales.
            </p>
          </div>
        )}
        {profile && !profile.has_password && resetStep !== 'idle' && (
          <div className="px-4 pb-5 pt-1 flex flex-col gap-4 border-t border-border">
            {resetFlow('create')}
          </div>
        )}
      </SettingCard>

      {/* Cambiar contraseña */}
      {profile?.has_password && (
        <SettingCard>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-foreground">Contraseña</p>
              <p className="text-xs text-muted-foreground tracking-wider">••••••••</p>
            </div>
            {!isEditingPassword && (
              <button
                type="button"
                onClick={() => setIsEditingPassword(true)}
                className="text-xs font-medium text-[var(--color-text-brand)] hover:underline cursor-pointer"
              >
                Cambiar
              </button>
            )}
          </div>

          {isEditingPassword && resetStep !== 'idle' && (
            <div className="px-4 pb-5 pt-1 flex flex-col gap-4 border-t border-border">
              {resetFlow('reset')}
            </div>
          )}

          {isEditingPassword && resetStep === 'idle' && (
            <ChangePasswordForm
              passwordData={passwordData}
              setPasswordData={setPasswordData}
              showOldPassword={showOldPassword}
              setShowOldPassword={setShowOldPassword}
              showNewPassword={showNewPassword}
              setShowNewPassword={setShowNewPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              isChangingPassword={isChangingPassword}
              onSubmit={handlePasswordSubmit}
              onForgot={() => setResetStep('confirm')}
              onCancel={() => {
                setIsEditingPassword(false);
                setPasswordData({
                  current_password: '',
                  new_password: '',
                  new_password2: '',
                });
                setShowOldPassword(false);
                setShowNewPassword(false);
                setShowConfirmPassword(false);
              }}
            />
          )}
        </SettingCard>
      )}
    </section>
  );
}

export type { PasswordData };
