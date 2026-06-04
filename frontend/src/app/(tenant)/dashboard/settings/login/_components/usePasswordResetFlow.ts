'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { requestPasswordResetOTP, verifyPasswordResetOTP } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import type { PasswordResetStep } from '../_helpers';
import { extractErrorMessage } from './login-helpers';

interface UsePasswordResetFlowOptions {
  email?: string;
  /** Cierra el formulario de edición tras restablecer correctamente. */
  onClose: () => void;
  /** Invalida ['user-profile'] tras restablecer por OTP. */
  onResetComplete: () => void;
}

/**
 * Encapsula el flujo inline de restablecimiento de contraseña por OTP
 * (idle → confirm → otp → new-password) sin cambiar su comportamiento.
 */
export function usePasswordResetFlow({
  email,
  onClose,
  onResetComplete,
}: UsePasswordResetFlowOptions) {
  const [resetStep, setResetStep] = useState<PasswordResetStep>('idle');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendCooldown = useCallback(() => {
    setResendCooldown(60);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (resendTimerRef.current) clearInterval(resendTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
  }, []);

  const resetInlineFlow = useCallback(() => {
    setResetStep('idle');
    setResetOtp('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setShowResetNewPassword(false);
    setShowResetConfirmPassword(false);
    setResetLoading(false);
    setResetError('');
    setResendCooldown(0);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
  }, []);

  const handleSendResetOtp = useCallback(async () => {
    if (!email) return;
    setResetLoading(true);
    setResetError('');
    try {
      await requestPasswordResetOTP(email);
      setResetStep('otp');
      startResendCooldown();
    } catch (error) {
      setResetError(extractErrorMessage(error, 'Error al enviar el codigo'));
    } finally {
      setResetLoading(false);
    }
  }, [email, startResendCooldown]);

  const handleResendOtp = useCallback(async () => {
    if (!email || resendCooldown > 0) return;
    setResetLoading(true);
    setResetError('');
    try {
      await requestPasswordResetOTP(email);
      startResendCooldown();
      toast.success('Codigo reenviado');
    } catch (error) {
      setResetError(extractErrorMessage(error, 'Error al reenviar el codigo'));
    } finally {
      setResetLoading(false);
    }
  }, [email, resendCooldown, startResendCooldown]);

  const handleVerifyResetOtp = useCallback(async () => {
    if (!email) return;
    const pw = resetNewPassword;
    if (pw !== resetConfirmPassword) {
      setResetError('Las contraseñas no coinciden');
      return;
    }
    if (pw.length < 8) {
      setResetError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (/^\d+$/.test(pw)) {
      setResetError('La contraseña no puede ser completamente numérica');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      await verifyPasswordResetOTP(email, resetOtp, pw);
      toast.success('Contraseña restablecida correctamente');
      resetInlineFlow();
      onClose();
      onResetComplete();
    } catch (error) {
      const msg = extractErrorMessage(error, 'Error al restablecer la contraseña');
      const errorCode = error instanceof ApiError ? error.code : undefined;
      // Si el OTP expiró, fue usado o se agotaron los intentos, volver al paso de envío
      if (errorCode === 'OTP_EXPIRED' || errorCode === 'OTP_USED' || errorCode === 'OTP_MAX_ATTEMPTS') {
        setResetStep('confirm');
        setResetOtp('');
        setResetNewPassword('');
        setResetConfirmPassword('');
        const otpMessage =
          errorCode === 'OTP_USED'
            ? 'Ese código ya fue usado. Solicitá uno nuevo.'
            : errorCode === 'OTP_MAX_ATTEMPTS'
              ? 'Se alcanzó el límite de intentos. Solicitá un nuevo código.'
              : 'El código expiró. Solicitá uno nuevo.';
        toast.error(otpMessage);
      } else {
        setResetError(msg);
      }
    } finally {
      setResetLoading(false);
    }
  }, [email, resetOtp, resetNewPassword, resetConfirmPassword, resetInlineFlow, onClose, onResetComplete]);

  return {
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
  };
}
