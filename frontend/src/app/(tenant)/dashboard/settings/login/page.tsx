// src/app/dashboard/settings/login/page.tsx
// Centraliza todos los métodos de acceso a la cuenta:
//   - Correo + contraseña (estado y cambio)
//   - Cuentas vinculadas (Google, Apple, Facebook)
//   - Passkeys (WebAuthn)
//   - Autenticación en dos pasos (TOTP)
//
// Futuro (ver issue): sesiones activas, historial de inicios, alertas de seguridad.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { OtpInput } from '@/components/auth/OtpInput';
import { OTP_LENGTH } from '@/components/auth/constants';
import { useAuth } from '@/contexts/AuthContext';
import { requestPasswordResetOTP, verifyPasswordResetOTP } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { SocialProvider } from '@/types';
import {
  PROVIDER_CONFIG,
  PasswordToggle,
  type TwoFactorPhase,
  type PasswordResetStep,
} from './_helpers';
import {
  TwoFactorLoadingState,
  TwoFactorDisabledState,
  TwoFactorEnablingState,
  TwoFactorShowCodesState,
  TwoFactorEnabledState,
  RegenerateBackupCodesDialog,
  DisableTwoFactorDialog,
  extractErrorMessage,
  maskEmail,
} from './_components';
import {
  changePassword,
  disconnectSocialAccount,
  getUserProfile,
} from '@/lib/api/user';
import {
  deletePasskey,
  renamePasskey,
  isWebAuthnSupported,
  listPasskeys,
  registerPasskey,
  type PasskeyRecord,
} from '@/lib/api/passkey';
import {
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateBackupCodes,
  setupTwoFactor,
  verifyTwoFactor,
  type TwoFactorSetupResponse,
} from '@/lib/api/twoFactor';

// ─── Página ───────────────────────────────────────────────
export default function LoginSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Perfil (email/password/social) ─────────────────
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getUserProfile,
    enabled: mounted,
  });

  // ── Cambio de contraseña ────────────────────────────
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password2: '',
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── Inline password reset (forgot password) ───────
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
    if (!user?.email) return;
    setResetLoading(true);
    setResetError('');
    try {
      await requestPasswordResetOTP(user.email);
      setResetStep('otp');
      startResendCooldown();
    } catch (error) {
      setResetError(extractErrorMessage(error, 'Error al enviar el codigo'));
    } finally {
      setResetLoading(false);
    }
  }, [user?.email, startResendCooldown]);

  const handleResendOtp = useCallback(async () => {
    if (!user?.email || resendCooldown > 0) return;
    setResetLoading(true);
    setResetError('');
    try {
      await requestPasswordResetOTP(user.email);
      startResendCooldown();
      toast.success('Codigo reenviado');
    } catch (error) {
      setResetError(extractErrorMessage(error, 'Error al reenviar el codigo'));
    } finally {
      setResetLoading(false);
    }
  }, [user?.email, resendCooldown, startResendCooldown]);

  const handleVerifyResetOtp = useCallback(async () => {
    if (!user?.email) return;
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
      await verifyPasswordResetOTP(user.email, resetOtp, pw);
      toast.success('Contraseña restablecida correctamente');
      resetInlineFlow();
      setIsEditingPassword(false);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
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
  }, [user?.email, resetOtp, resetNewPassword, resetConfirmPassword, resetInlineFlow, queryClient]);

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPasswordData({ current_password: '', new_password: '', new_password2: '' });
      setIsEditingPassword(false);
      toast.success('Contraseña actualizada correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

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
    changePasswordMutation.mutate(passwordData);
  };

  // ── Desvincular redes sociales ──────────────────────
  const disconnectMutation = useMutation({
    mutationFn: disconnectSocialAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // ── Passkeys ────────────────────────────────────────
  const [supported, setSupported] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(true);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [editingPasskeyId, setEditingPasskeyId] = useState<number | null>(null);
  const [editingPasskeyName, setEditingPasskeyName] = useState('');
  const [savingRename, setSavingRename] = useState(false);
  const [registering, setRegistering] = useState(false);

  const loadPasskeys = useCallback(async () => {
    try {
      setPasskeysLoading(true);
      const data = await listPasskeys();
      setPasskeys(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar passkeys';
      toast.error(message);
    } finally {
      setPasskeysLoading(false);
    }
  }, []);

  useEffect(() => {
    setSupported(isWebAuthnSupported());
    void loadPasskeys();
  }, [loadPasskeys]);

  const handleRegisterPasskey = async () => {
    const name = newPasskeyName.trim() || 'Mi passkey';
    try {
      setRegistering(true);
      await registerPasskey(name);
      toast.success('Passkey registrado correctamente');
      setNewPasskeyName('');
      await loadPasskeys();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo registrar el passkey';
      toast.error(message);
    } finally {
      setRegistering(false);
    }
  };

  const startRenamePasskey = (p: PasskeyRecord) => {
    setEditingPasskeyId(p.id);
    setEditingPasskeyName(p.name);
  };

  const cancelRenamePasskey = () => {
    setEditingPasskeyId(null);
    setEditingPasskeyName('');
  };

  const handleRenamePasskey = async (id: number) => {
    const name = editingPasskeyName.trim();
    if (!name) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    const current = passkeys.find((p) => p.id === id);
    if (current && current.name === name) {
      cancelRenamePasskey();
      return;
    }
    try {
      setSavingRename(true);
      await renamePasskey(id, name);
      setPasskeys((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
      toast.success('Passkey renombrado');
      cancelRenamePasskey();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo renombrar';
      toast.error(message);
    } finally {
      setSavingRename(false);
    }
  };

  const handleDeletePasskey = async (id: number, name: string) => {
    try {
      await deletePasskey(id);
      toast.success(`"${name}" eliminado`);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar';
      toast.error(message);
    }
  };

  // ── 2FA (TOTP) ──────────────────────────────────────
  const [twoFactorPhase, setTwoFactorPhase] = useState<TwoFactorPhase>({ name: 'loading' });
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  const { data: twoFactorStatus, isLoading: twoFactorLoading } = useQuery({
    queryKey: ['two-factor', 'status'],
    queryFn: getTwoFactorStatus,
    enabled: mounted,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (twoFactorLoading) {
      setTwoFactorPhase({ name: 'loading' });
      return;
    }
    if (twoFactorStatus?.enabled) {
      setTwoFactorPhase((prev) =>
        prev.name === 'show-codes' ? prev : { name: 'enabled' },
      );
    } else {
      setTwoFactorPhase((prev) =>
        prev.name === 'enabling' ? prev : { name: 'disabled' },
      );
    }
  }, [twoFactorStatus?.enabled, twoFactorLoading]);

  const setupTwoFactorMutation = useMutation({
    mutationFn: setupTwoFactor,
    onSuccess: (data) => {
      setTwoFactorPhase({ name: 'enabling', setup: data, code: '' });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'No pudimos iniciar el enrolamiento'));
    },
  });

  const verifyTwoFactorMutation = useMutation({
    mutationFn: verifyTwoFactor,
    onSuccess: (data) => {
      setTwoFactorPhase({ name: 'show-codes', codes: data.backup_codes });
      queryClient.invalidateQueries({ queryKey: ['two-factor', 'status'] });
      toast.success('2FA activado correctamente');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Código inválido'));
      setTwoFactorPhase((prev) =>
        prev.name === 'enabling' ? { ...prev, code: '' } : prev,
      );
    },
  });

  const regenerateBackupCodesMutation = useMutation({
    mutationFn: regenerateBackupCodes,
    onSuccess: (data) => {
      setRegenDialogOpen(false);
      setTwoFactorPhase({ name: 'show-codes', codes: data.backup_codes });
      toast.success('Nuevos códigos generados');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'No pudimos regenerar los códigos'));
    },
  });

  const disableTwoFactorMutation = useMutation({
    mutationFn: disableTwoFactor,
    onSuccess: () => {
      setDisableDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['two-factor', 'status'] });
      setTwoFactorPhase({ name: 'disabled' });
      toast.success('2FA desactivado');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'No pudimos desactivar 2FA'));
    },
  });

  const twoFactorContent = useMemo(() => {
    switch (twoFactorPhase.name) {
      case 'loading':
        return <TwoFactorLoadingState />;
      case 'disabled':
        return (
          <TwoFactorDisabledState
            isLoading={setupTwoFactorMutation.isPending}
            onActivate={() => setupTwoFactorMutation.mutate()}
          />
        );
      case 'enabling':
        return (
          <TwoFactorEnablingState
            setup={twoFactorPhase.setup}
            code={twoFactorPhase.code}
            onCodeChange={(code) =>
              setTwoFactorPhase((prev) =>
                prev.name === 'enabling' ? { ...prev, code } : prev,
              )
            }
            onCancel={() => setTwoFactorPhase({ name: 'disabled' })}
            onSubmit={() => verifyTwoFactorMutation.mutate(twoFactorPhase.code)}
            isSubmitting={verifyTwoFactorMutation.isPending}
          />
        );
      case 'show-codes':
        return (
          <TwoFactorShowCodesState
            codes={twoFactorPhase.codes}
            onDone={() =>
              setTwoFactorPhase(
                twoFactorStatus?.enabled ? { name: 'enabled' } : { name: 'disabled' },
              )
            }
          />
        );
      case 'enabled':
        return (
          <TwoFactorEnabledState
            onRegenerate={() => setRegenDialogOpen(true)}
            onDisable={() => setDisableDialogOpen(true)}
          />
        );
    }
  }, [
    twoFactorPhase,
    setupTwoFactorMutation,
    verifyTwoFactorMutation,
    twoFactorStatus?.enabled,
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-[1.25rem] font-semibold text-[var(--stg-primary)]">Inicio de sesión</h1>
      </header>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECCIÓN 1 — Correo y contraseña                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section>
        <h3 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase mb-3">
          Correo y contraseña
        </h3>

        {/* Email (estado) */}
        <div className="rounded-xl border border-gray-200 bg-white mb-3">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'size-9 rounded-lg flex items-center justify-center shrink-0',
                  profile?.has_password ? 'bg-[var(--stg-accent-subtle)]' : 'bg-gray-50',
                )}
              >
                <KeyRound
                  className={cn(
                    'size-4',
                    profile?.has_password ? 'text-[var(--stg-accent)]' : 'text-gray-400',
                  )}
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-[0.85rem] font-medium text-gray-700">Correo electrónico</p>
                <p className="text-[0.75rem] text-gray-400 truncate">
                  {!mounted ? 'Cargando…' : user?.email}
                </p>
              </div>
            </div>
            {!profile ? null : profile.has_password ? (
              <Badge
                variant="outline"
                className="gap-1 text-[0.7rem] text-emerald-600 border-emerald-200 bg-emerald-50/80"
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
                className="text-[0.75rem] font-medium text-[var(--stg-accent)] hover:text-[var(--stg-accent)] hover:bg-[var(--stg-accent-subtle)] cursor-pointer"
              >
                Crear contraseña
              </Button>
            )}
          </div>
          {profile && !profile.has_password && resetStep === 'idle' && (
            <div className="px-4 pb-3.5 -mt-1">
              <p className="text-[0.75rem] text-gray-400 leading-relaxed">
                Crea una contraseña para acceder también por email, sin depender de redes
                sociales.
              </p>
            </div>
          )}
          {profile && !profile.has_password && resetStep !== 'idle' && (
            <div className="px-4 pb-5 pt-1 flex flex-col gap-4 border-t border-gray-100">
              {/* Step 1: Confirm & send OTP */}
              {resetStep === 'confirm' && (
                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--stg-accent-subtle)]">
                      <Mail className="size-4 text-[var(--stg-accent)]" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[0.85rem] font-medium text-gray-700">
                        Crear contraseña por correo
                      </p>
                      <p className="text-[0.75rem] text-gray-400 mt-0.5">
                        Te enviaremos un codigo de verificacion a{' '}
                        <span className="font-medium text-gray-500">
                          {user?.email ? maskEmail(user.email) : ''}
                        </span>
                      </p>
                    </div>
                  </div>
                  {resetError && (
                    <p className="text-[0.75rem] text-red-500">{resetError}</p>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        resetInlineFlow();
                        setIsEditingPassword(false);
                      }}
                      className="rounded-xl text-[0.82rem] text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      disabled={resetLoading}
                      onClick={handleSendResetOtp}
                      className="rounded-xl text-[0.82rem] bg-[var(--stg-primary)] hover:bg-[var(--stg-primary-hover)] hover:shadow-md active:scale-[0.98]"
                    >
                      {resetLoading && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                      {resetLoading ? 'Enviando...' : 'Enviar codigo'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Enter OTP */}
              {resetStep === 'otp' && (
                <div className="flex flex-col gap-4 pt-4">
                  <div>
                    <p className="text-[0.85rem] font-medium text-gray-700">
                      Ingresa el codigo de verificacion
                    </p>
                    <p className="text-[0.75rem] text-gray-400 mt-0.5">
                      Enviamos un codigo de {OTP_LENGTH} digitos a{' '}
                      <span className="font-medium text-gray-500">
                        {user?.email ? maskEmail(user.email) : ''}
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
                      <p className="text-[0.72rem] text-gray-400">
                        Reenviar en {resendCooldown}s
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resetLoading}
                        className="text-[0.72rem] font-medium text-[var(--stg-accent)] hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Reenviar codigo
                      </button>
                    )}
                  </div>
                  {resetError && (
                    <p className="text-[0.75rem] text-red-500 text-center">{resetError}</p>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        resetInlineFlow();
                        setIsEditingPassword(false);
                      }}
                      className="rounded-xl text-[0.82rem] text-gray-500 hover:text-gray-700"
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
                      className="rounded-xl text-[0.82rem] bg-[var(--stg-primary)] hover:bg-[var(--stg-primary-hover)] hover:shadow-md active:scale-[0.98]"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: New password */}
              {resetStep === 'new-password' && (
                <div className="flex flex-col gap-4 pt-4">
                  <p className="text-[0.85rem] font-medium text-gray-700">
                    Crea tu nueva contraseña
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reset_new_password_create" className="text-[0.75rem] text-gray-500">
                      Nueva contraseña
                    </Label>
                    <div className="relative">
                      <Input
                        id="reset_new_password_create"
                        type={showResetNewPassword ? 'text' : 'password'}
                        value={resetNewPassword}
                        onChange={(e) => {
                          setResetNewPassword(e.target.value);
                          setResetError('');
                        }}
                        autoComplete="new-password"
                        className="h-9 pr-10 text-[0.85rem] md:text-[0.85rem]"
                      />
                      <PasswordToggle
                        show={showResetNewPassword}
                        onToggle={() => setShowResetNewPassword((v) => !v)}
                      />
                    </div>
                    <p className="text-[0.72rem] text-gray-400">Minimo 8 caracteres</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reset_confirm_password_create" className="text-[0.75rem] text-gray-500">
                      Confirmar nueva contraseña
                    </Label>
                    <div className="relative">
                      <Input
                        id="reset_confirm_password_create"
                        type={showResetConfirmPassword ? 'text' : 'password'}
                        value={resetConfirmPassword}
                        onChange={(e) => {
                          setResetConfirmPassword(e.target.value);
                          setResetError('');
                        }}
                        autoComplete="new-password"
                        className="h-9 pr-10 text-[0.85rem] md:text-[0.85rem]"
                      />
                      <PasswordToggle
                        show={showResetConfirmPassword}
                        onToggle={() => setShowResetConfirmPassword((v) => !v)}
                      />
                    </div>
                  </div>
                  {resetError && (
                    <p className="text-[0.75rem] text-red-500">{resetError}</p>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        resetInlineFlow();
                        setIsEditingPassword(false);
                      }}
                      className="rounded-xl text-[0.82rem] text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      disabled={resetLoading || !resetNewPassword || !resetConfirmPassword}
                      onClick={handleVerifyResetOtp}
                      className="rounded-xl text-[0.82rem] bg-[var(--stg-primary)] hover:bg-[var(--stg-primary-hover)] hover:shadow-md active:scale-[0.98]"
                    >
                      {resetLoading && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                      {resetLoading ? 'Creando...' : 'Crear contraseña'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cambiar contraseña */}
        {profile?.has_password && (
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-[0.85rem] font-medium text-gray-700">Contraseña</p>
                <p className="text-[0.75rem] text-gray-400 tracking-wider">••••••••</p>
              </div>
              {!isEditingPassword && (
                <button
                  type="button"
                  onClick={() => setIsEditingPassword(true)}
                  className="text-[0.75rem] font-medium text-[var(--stg-accent)] hover:underline cursor-pointer"
                >
                  Cambiar
                </button>
              )}
            </div>

            {isEditingPassword && resetStep !== 'idle' && (
              <div className="px-4 pb-5 pt-1 flex flex-col gap-4 border-t border-gray-100">
                {/* Step 1: Confirm & send OTP */}
                {resetStep === 'confirm' && (
                  <div className="flex flex-col gap-3 pt-4">
                    <div className="flex items-start gap-3">
                      <div className="size-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--stg-accent-subtle)]">
                        <Mail className="size-4 text-[var(--stg-accent)]" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[0.85rem] font-medium text-gray-700">
                          Restablecer por correo
                        </p>
                        <p className="text-[0.75rem] text-gray-400 mt-0.5">
                          Te enviaremos un codigo de verificacion a{' '}
                          <span className="font-medium text-gray-500">
                            {user?.email ? maskEmail(user.email) : ''}
                          </span>
                        </p>
                      </div>
                    </div>
                    {resetError && (
                      <p className="text-[0.75rem] text-red-500">{resetError}</p>
                    )}
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          resetInlineFlow();
                          setIsEditingPassword(false);
                        }}
                        className="rounded-xl text-[0.82rem] text-gray-500 hover:text-gray-700"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        disabled={resetLoading}
                        onClick={handleSendResetOtp}
                        className="rounded-xl text-[0.82rem] bg-[var(--stg-primary)] hover:bg-[var(--stg-primary-hover)] hover:shadow-md active:scale-[0.98]"
                      >
                        {resetLoading && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                        {resetLoading ? 'Enviando...' : 'Enviar codigo'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Enter OTP */}
                {resetStep === 'otp' && (
                  <div className="flex flex-col gap-4 pt-4">
                    <div>
                      <p className="text-[0.85rem] font-medium text-gray-700">
                        Ingresa el codigo de verificacion
                      </p>
                      <p className="text-[0.75rem] text-gray-400 mt-0.5">
                        Enviamos un codigo de {OTP_LENGTH} digitos a{' '}
                        <span className="font-medium text-gray-500">
                          {user?.email ? maskEmail(user.email) : ''}
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
                        <p className="text-[0.72rem] text-gray-400">
                          Reenviar en {resendCooldown}s
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={resetLoading}
                          className="text-[0.72rem] font-medium text-[var(--stg-accent)] hover:underline cursor-pointer disabled:opacity-50"
                        >
                          Reenviar codigo
                        </button>
                      )}
                    </div>
                    {resetError && (
                      <p className="text-[0.75rem] text-red-500 text-center">{resetError}</p>
                    )}
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          resetInlineFlow();
                          setIsEditingPassword(false);
                        }}
                        className="rounded-xl text-[0.82rem] text-gray-500 hover:text-gray-700"
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
                        className="rounded-xl text-[0.82rem] bg-[var(--stg-primary)] hover:bg-[var(--stg-primary-hover)] hover:shadow-md active:scale-[0.98]"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: New password */}
                {resetStep === 'new-password' && (
                  <div className="flex flex-col gap-4 pt-4">
                    <p className="text-[0.85rem] font-medium text-gray-700">
                      Crea tu nueva contraseña
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="reset_new_password" className="text-[0.75rem] text-gray-500">
                        Nueva contraseña
                      </Label>
                      <div className="relative">
                        <Input
                          id="reset_new_password"
                          type={showResetNewPassword ? 'text' : 'password'}
                          value={resetNewPassword}
                          onChange={(e) => {
                            setResetNewPassword(e.target.value);
                            setResetError('');
                          }}
                          autoComplete="new-password"
                          className="h-9 pr-10 text-[0.85rem] md:text-[0.85rem]"
                        />
                        <PasswordToggle
                          show={showResetNewPassword}
                          onToggle={() => setShowResetNewPassword((v) => !v)}
                        />
                      </div>
                      <p className="text-[0.72rem] text-gray-400">Minimo 8 caracteres</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="reset_confirm_password" className="text-[0.75rem] text-gray-500">
                        Confirmar nueva contraseña
                      </Label>
                      <div className="relative">
                        <Input
                          id="reset_confirm_password"
                          type={showResetConfirmPassword ? 'text' : 'password'}
                          value={resetConfirmPassword}
                          onChange={(e) => {
                            setResetConfirmPassword(e.target.value);
                            setResetError('');
                          }}
                          autoComplete="new-password"
                          className="h-9 pr-10 text-[0.85rem] md:text-[0.85rem]"
                        />
                        <PasswordToggle
                          show={showResetConfirmPassword}
                          onToggle={() => setShowResetConfirmPassword((v) => !v)}
                        />
                      </div>
                    </div>
                    {resetError && (
                      <p className="text-[0.75rem] text-red-500">{resetError}</p>
                    )}
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          resetInlineFlow();
                          setIsEditingPassword(false);
                        }}
                        className="rounded-xl text-[0.82rem] text-gray-500 hover:text-gray-700"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        disabled={resetLoading || !resetNewPassword || !resetConfirmPassword}
                        onClick={handleVerifyResetOtp}
                        className="rounded-xl text-[0.82rem] bg-[var(--stg-primary)] hover:bg-[var(--stg-primary-hover)] hover:shadow-md active:scale-[0.98]"
                      >
                        {resetLoading && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                        {resetLoading ? 'Restableciendo...' : 'Restablecer contraseña'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isEditingPassword && resetStep === 'idle' && (
              <form
                onSubmit={handlePasswordSubmit}
                className="px-4 pb-5 pt-1 flex flex-col gap-4 border-t border-gray-100"
              >
                <div className="flex flex-col gap-1.5 pt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="current_password" className="text-[0.75rem] text-gray-500">
                      Contraseña actual
                    </Label>
                    <button
                      type="button"
                      onClick={() => setResetStep('confirm')}
                      className="text-[0.7rem] font-medium text-[var(--stg-accent)] hover:underline cursor-pointer"
                    >
                      ¿La olvidaste?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="current_password"
                      name="current_password"
                      type={showOldPassword ? 'text' : 'password'}
                      value={passwordData.current_password}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, current_password: e.target.value }))
                      }
                      required
                      autoComplete="current-password"
                      className="h-9 pr-10 text-[0.85rem] md:text-[0.85rem]"
                    />
                    <PasswordToggle
                      show={showOldPassword}
                      onToggle={() => setShowOldPassword((v) => !v)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new_password" className="text-[0.75rem] text-gray-500">
                    Nueva contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      name="new_password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, new_password: e.target.value }))
                      }
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="h-9 pr-10 text-[0.85rem] md:text-[0.85rem]"
                    />
                    <PasswordToggle
                      show={showNewPassword}
                      onToggle={() => setShowNewPassword((v) => !v)}
                    />
                  </div>
                  <p className="text-[0.72rem] text-gray-400">Mínimo 8 caracteres</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new_password2" className="text-[0.75rem] text-gray-500">
                    Confirmar nueva contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="new_password2"
                      name="new_password2"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.new_password2}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, new_password2: e.target.value }))
                      }
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="h-9 pr-10 text-[0.85rem] md:text-[0.85rem]"
                    />
                    <PasswordToggle
                      show={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((v) => !v)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
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
                    className="rounded-xl text-[0.82rem] text-gray-500 hover:text-gray-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="rounded-xl text-[0.82rem] bg-[var(--stg-primary)] hover:bg-[var(--stg-primary-hover)] hover:shadow-md active:scale-[0.98]"
                  >
                    <Lock className="size-3.5" aria-hidden="true" />
                    {changePasswordMutation.isPending ? 'Actualizando…' : 'Actualizar'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECCIÓN 2 — Cuentas vinculadas                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section>
        <h3 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase mb-3">
          Cuentas vinculadas
        </h3>
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {(['google', 'apple', 'facebook'] as SocialProvider[]).map((provider) => {
            const config = PROVIDER_CONFIG[provider];

            if (!profile) {
              return (
                <div key={provider} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="size-9 rounded-lg flex items-center justify-center shrink-0 bg-gray-100">
                    {config.icon}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-gray-50 rounded animate-pulse" />
                  </div>
                </div>
              );
            }

            const linked = profile.social_accounts?.find((sa) => sa.provider === provider);
            const canDisconnect =
              profile.has_password || (profile.social_accounts?.length ?? 0) > 1;

            return (
              <div
                key={provider}
                className={cn(
                  'flex items-center justify-between px-4 py-3.5 transition-colors',
                  linked ? 'hover:bg-gray-50/50' : 'opacity-50',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'size-9 rounded-lg flex items-center justify-center shrink-0',
                      linked ? config.linkedIconBg : 'bg-gray-100',
                    )}
                  >
                    {config.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.85rem] font-medium text-gray-700">{config.name}</p>
                    <p className="text-[0.75rem] text-gray-400 truncate">
                      {linked ? linked.email : 'No vinculado'}
                    </p>
                  </div>
                </div>

                {linked ? (
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant="outline"
                      className="gap-1 text-[0.7rem] text-emerald-600 border-emerald-200 bg-emerald-50/80"
                    >
                      <Check className="size-3" aria-hidden="true" />
                      Vinculado
                    </Badge>
                    {canDisconnect && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            className="text-[0.75rem] text-gray-400 hover:text-red-500 hover:underline transition-colors cursor-pointer"
                          >
                            Desvincular
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Desvincular {config.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ya no podrás iniciar sesión con <strong>{config.name}</strong>.
                              Puedes volver a vincularla desde la pantalla de login.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => disconnectMutation.mutate(provider)}
                              disabled={disconnectMutation.isPending}
                              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600/30"
                            >
                              {disconnectMutation.isPending ? 'Desvinculando…' : 'Desvincular'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        `Para vincular ${config.name}, inicia sesión con esa cuenta desde la pantalla de login.`
                      )
                    }
                    className="text-[0.75rem] font-medium text-[var(--stg-accent)] hover:underline transition-colors cursor-pointer"
                  >
                    Vincular
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECCIÓN 3 — Passkeys                                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section>
        <h3 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase mb-3">
          Passkeys
        </h3>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-1">
            <Fingerprint className="w-4 h-4 text-[var(--stg-accent)]" aria-hidden="true" />
            <h4 className="text-[0.9rem] font-medium text-[var(--stg-primary)]">Llaves de acceso</h4>
          </div>
          <p className="text-[0.8rem] text-gray-500 mb-5">
            Usa tu huella, Face ID o una llave de seguridad para iniciar sesión sin contraseña.
          </p>

          {!supported && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-[0.8rem] text-amber-800 mb-4">
              Tu navegador no soporta passkeys. Usa Chrome, Safari, Edge o Firefox actualizados.
            </div>
          )}

          {supported && (
            <div className="flex flex-col sm:flex-row gap-2 mb-5">
              <Input
                placeholder="Nombre del dispositivo (ej: iPhone de Felipe)"
                value={newPasskeyName}
                onChange={(e) => setNewPasskeyName(e.target.value)}
                disabled={registering}
                className="h-10 focus-visible:border-[var(--stg-accent)] focus-visible:ring-[var(--stg-accent)]/20"
                maxLength={100}
              />
              <Button
                type="button"
                onClick={handleRegisterPasskey}
                disabled={registering}
                className="rounded-xl text-[0.82rem] bg-[var(--stg-primary)] hover:bg-[var(--stg-primary-hover)] hover:shadow-md active:scale-[0.98] text-white"
              >
                {registering ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                )}
                {registering ? 'Registrando…' : 'Agregar passkey'}
              </Button>
            </div>
          )}

          {passkeysLoading ? (
            <div className="flex items-center gap-2 text-[0.8rem] text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Cargando…
            </div>
          ) : passkeys.length === 0 ? (
            <div className="text-center py-8 text-[0.85rem] text-gray-400">
              <KeyRound className="w-8 h-8 mx-auto mb-2 text-gray-300" aria-hidden="true" />
              Aún no tienes passkeys registrados.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {passkeys.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {editingPasskeyId === p.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingPasskeyName}
                          onChange={(e) => setEditingPasskeyName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleRenamePasskey(p.id);
                            } else if (e.key === 'Escape') {
                              cancelRenamePasskey();
                            }
                          }}
                          maxLength={100}
                          autoFocus
                          disabled={savingRename}
                          className="h-8 text-[0.85rem] md:text-[0.85rem] flex-1"
                          aria-label={`Nuevo nombre para ${p.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => void handleRenamePasskey(p.id)}
                          disabled={savingRename}
                          className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          aria-label="Guardar nombre"
                        >
                          {savingRename ? (
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Check className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelRenamePasskey}
                          disabled={savingRename}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                          aria-label="Cancelar"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-[0.875rem] font-medium text-[var(--stg-primary)] truncate">
                          {p.name}
                        </p>
                        <p className="text-[0.72rem] text-gray-400 mt-0.5">
                          Creado {new Date(p.created_at).toLocaleDateString('es-CO')}
                          {p.last_used_at
                            ? ` · Último uso ${new Date(p.last_used_at).toLocaleDateString('es-CO')}`
                            : ' · Nunca usado'}
                        </p>
                      </>
                    )}
                  </div>
                  {editingPasskeyId !== p.id && (
                    <button
                      type="button"
                      onClick={() => startRenamePasskey(p)}
                      className="p-2 rounded-md text-gray-400 hover:text-[var(--stg-primary)] hover:bg-gray-50 transition-colors"
                      aria-label={`Renombrar ${p.name}`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        disabled={editingPasskeyId === p.id}
                        className="p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        aria-label={`Eliminar ${p.name}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar passkey?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ya no podrás iniciar sesión con <strong>{p.name}</strong>. Recuerda
                          eliminarlo también desde los ajustes de contraseñas de tu dispositivo.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600/30"
                          onClick={() => handleDeletePasskey(p.id, p.name)}
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECCIÓN 4 — Autenticación en dos pasos                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section>
        <h3 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase mb-3">
          Autenticación en dos pasos
        </h3>
        {twoFactorContent}
      </section>

      {/* Dialog: regenerar backup codes */}
      <RegenerateBackupCodesDialog
        open={regenDialogOpen}
        onOpenChange={setRegenDialogOpen}
        isSubmitting={regenerateBackupCodesMutation.isPending}
        onSubmit={(code) => regenerateBackupCodesMutation.mutate(code)}
      />

      {/* Dialog: desactivar 2FA */}
      <DisableTwoFactorDialog
        open={disableDialogOpen}
        onOpenChange={setDisableDialogOpen}
        hasPassword={!!(profile?.has_password ?? user?.has_password)}
        isSubmitting={disableTwoFactorMutation.isPending}
        onSubmit={(payload) => disableTwoFactorMutation.mutate(payload)}
      />
    </div>
  );
}
