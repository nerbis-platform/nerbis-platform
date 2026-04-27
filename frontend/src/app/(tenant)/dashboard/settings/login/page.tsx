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
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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

// ─── SVG icons de providers sociales ──────────────────────
const googleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const appleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const facebookIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2" />
  </svg>
);

interface ProviderStyle {
  name: string;
  icon: React.ReactElement;
  linkedIconBg: string;
}

const PROVIDER_CONFIG: Record<SocialProvider, ProviderStyle> = {
  google: {
    name: 'Google',
    icon: googleIcon,
    linkedIconBg: 'bg-white ring-1 ring-blue-100',
  },
  apple: {
    name: 'Apple',
    icon: appleIcon,
    linkedIconBg: 'bg-white ring-1 ring-gray-200',
  },
  facebook: {
    name: 'Facebook',
    icon: facebookIcon,
    linkedIconBg: 'bg-white ring-1 ring-indigo-100',
  },
};

// ─── Toggle de visibilidad de contraseña ──────────────────
function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </Button>
  );
}

// ─── Helpers 2FA ──────────────────────────────────────────
type TwoFactorPhase =
  | { name: 'loading' }
  | { name: 'disabled' }
  | { name: 'enabling'; setup: TwoFactorSetupResponse; code: string }
  | { name: 'show-codes'; codes: string[] }
  | { name: 'enabled' };

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function downloadTxt(filename: string, content: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const masked =
    local.length <= 2
      ? local
      : local.slice(0, 2) + '\u2022'.repeat(Math.min(local.length - 2, 6));
  return `${masked}@${domain}`;
}

type PasswordResetStep = 'idle' | 'confirm' | 'otp' | 'new-password';

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
        toast.error('El código expiró. Solicitá uno nuevo.');
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

// ─── Sub-componentes 2FA ──────────────────────────────────

function TwoFactorLoadingState() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-10 w-56" />
    </div>
  );
}

function TwoFactorDisabledState({
  isLoading,
  onActivate,
}: {
  isLoading: boolean;
  onActivate: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="w-4 h-4 text-gray-400" aria-hidden="true" />
        <h4 className="text-[0.9rem] font-medium text-[var(--stg-primary)]">Verificación en dos pasos</h4>
      </div>
      <p className="text-[0.8rem] text-gray-500 mb-5">
        Protege tu cuenta con un segundo paso de verificación usando una app
        autenticadora (Google Authenticator, 1Password, Authy).
      </p>
      <Button
        type="button"
        onClick={onActivate}
        disabled={isLoading}
        className="rounded-xl text-[0.82rem] bg-[var(--stg-primary)] hover:bg-[var(--stg-primary-hover)] hover:shadow-md active:scale-[0.98]"
      >
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        {isLoading ? 'Preparando\u2026' : 'Activar autenticación de dos pasos'}
      </Button>
    </div>
  );
}

function TwoFactorEnablingState({
  setup,
  code,
  onCodeChange,
  onCancel,
  onSubmit,
  isSubmitting,
}: {
  setup: TwoFactorSetupResponse;
  code: string;
  onCodeChange: (code: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const [uriCopied, setUriCopied] = useState(false);

  const manualSecret = (() => {
    try {
      return new URL(setup.otpauth_uri).searchParams.get('secret') || setup.otpauth_uri;
    } catch {
      return setup.otpauth_uri;
    }
  })();

  const handleCopyUri = async () => {
    const ok = await copyToClipboard(manualSecret);
    if (ok) {
      setUriCopied(true);
      toast.success('Clave copiada');
      setTimeout(() => setUriCopied(false), 2000);
    } else {
      toast.error('No pudimos copiar la clave');
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-lg bg-[var(--stg-accent-subtle)] flex items-center justify-center shrink-0">
          <Smartphone className="size-4 text-[var(--stg-accent)]" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[0.9rem] font-medium text-gray-800">
            Escanea el QR con tu app autenticadora
          </p>
          <p className="text-[0.78rem] text-gray-500 leading-relaxed mt-1">
            Abre Google Authenticator, 1Password o Authy y escanea el código. Luego
            ingresa el código de 6 dígitos que te aparece.
          </p>
        </div>
      </div>

      <div className="flex justify-center py-2">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <Image
            src={setup.qr_code_base64}
            alt="Código QR de 2FA"
            width={200}
            height={200}
            unoptimized
            className="size-48 object-contain"
          />
        </div>
      </div>

      <details className="group rounded-lg border border-gray-100 bg-gray-50/60 p-3">
        <summary className="cursor-pointer text-[0.75rem] text-gray-500 font-medium select-none">
          ¿No puedes escanear? Copia la clave manualmente
        </summary>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[0.7rem] font-mono text-gray-700 whitespace-nowrap">
            {manualSecret}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyUri}
            className="shrink-0 rounded-lg text-[0.72rem] h-8"
          >
            {uriCopied ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
            {uriCopied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </details>

      <div className="space-y-2">
        <Label className="text-[0.75rem] text-gray-500">
          Código de verificación
        </Label>
        <OtpInput value={code} onChange={onCodeChange} disabled={isSubmitting} />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl text-[0.82rem] text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || code.length !== 6}
          className="rounded-xl text-[0.82rem] bg-[var(--stg-primary)] hover:bg-[var(--stg-primary-hover)] hover:shadow-md active:scale-[0.98]"
        >
          {isSubmitting ? 'Verificando\u2026' : 'Verificar y activar'}
        </Button>
      </div>
    </div>
  );
}

function TwoFactorShowCodesState({
  codes,
  onDone,
}: {
  codes: string[];
  onDone: () => void;
}) {
  const allCodes = codes.join('\n');

  const handleCopyAll = async () => {
    const ok = await copyToClipboard(allCodes);
    toast[ok ? 'success' : 'error'](
      ok ? 'Códigos copiados al portapapeles' : 'No pudimos copiar los códigos',
    );
  };

  const handleDownload = () => {
    const header =
      'NERBIS — Códigos de respaldo para 2FA\n' +
      'Guárdalos en un lugar seguro. Cada uno se puede usar una sola vez.\n\n';
    downloadTxt('nerbis-backup-codes.txt', header + allCodes + '\n');
    toast.success('Archivo descargado');
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 space-y-4">
      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <AlertTriangle className="size-4" aria-hidden="true" />
        <AlertTitle className="text-[0.85rem] font-semibold">
          Guarda estos códigos ahora
        </AlertTitle>
        <AlertDescription className="text-[0.78rem] leading-relaxed">
          Estos códigos de respaldo te permiten entrar si pierdes el acceso a tu app
          autenticadora. No volverán a mostrarse. Cada código se puede usar una sola
          vez.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-amber-200 bg-white p-4">
        {codes.map((code) => (
          <code
            key={code}
            className="rounded-md bg-gray-50 px-3 py-2 text-center text-[0.82rem] font-mono tracking-[0.1em] text-gray-800"
          >
            {code}
          </code>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCopyAll}
          className="rounded-xl text-[0.8rem]"
        >
          <Copy className="size-3.5" aria-hidden="true" />
          Copiar todos
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownload}
          className="rounded-xl text-[0.8rem]"
        >
          <Download className="size-3.5" aria-hidden="true" />
          Descargar .txt
        </Button>
        <Button
          type="button"
          onClick={onDone}
          className="ml-auto rounded-xl text-[0.82rem] bg-[var(--stg-primary)] hover:bg-[var(--stg-primary-hover)] hover:shadow-md active:scale-[0.98]"
        >
          Listo, ya los guardé
        </Button>
      </div>
    </div>
  );
}

function TwoFactorEnabledState({
  onRegenerate,
  onDisable,
}: {
  onRegenerate: () => void;
  onDisable: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-[var(--stg-accent)]" aria-hidden="true" />
        <h4 className="text-[0.9rem] font-medium text-[var(--stg-primary)]">Verificación en dos pasos</h4>
        <Badge
          variant="outline"
          className="gap-1 text-[0.68rem] text-emerald-600 border-emerald-200 bg-emerald-50/80"
        >
          <Check className="size-3" aria-hidden="true" />
          Activo
        </Badge>
      </div>
      <p className="text-[0.8rem] text-gray-500 mb-5">
        Cada vez que inicies sesión te pediremos un código de 6 dígitos de tu app
        autenticadora. Guarda tus códigos de respaldo por si pierdes el acceso.
      </p>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        <Button
          type="button"
          variant="outline"
          onClick={onRegenerate}
          className="rounded-xl text-[0.8rem]"
        >
          <KeyRound className="size-3.5" aria-hidden="true" />
          Regenerar códigos de respaldo
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDisable}
          className="rounded-xl text-[0.8rem] border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        >
          <ShieldAlert className="size-3.5" aria-hidden="true" />
          Desactivar 2FA
        </Button>
      </div>
    </div>
  );
}

function RegenerateBackupCodesDialog({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (code: string) => void;
}) {
  const [code, setCode] = useState('');

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setCode('');
      onOpenChange(next);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm rounded-xl p-5 gap-0 bg-white">
        <DialogHeader className="space-y-1.5 pb-3">
          <DialogTitle className="text-[0.92rem] font-semibold text-gray-800">
            Regenerar códigos de respaldo
          </DialogTitle>
          <DialogDescription className="text-[0.78rem] text-gray-500 leading-relaxed">
            Se invalidarán los códigos anteriores. Ingresa el código actual de tu app
            para confirmar.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3 space-y-2">
          <Label className="text-[0.75rem] text-gray-500">Código TOTP</Label>
          <OtpInput value={code} onChange={setCode} disabled={isSubmitting} />
        </div>
        <DialogFooter className="flex-row gap-2 pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 rounded-lg text-[0.8rem] h-9"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(code)}
            disabled={isSubmitting || code.length !== 6}
            className="flex-1 rounded-lg text-[0.8rem] h-9 bg-[var(--stg-primary)] hover:bg-[var(--stg-primary-hover)] text-white"
          >
            {isSubmitting ? 'Generando\u2026' : 'Regenerar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisableTwoFactorDialog({
  open,
  onOpenChange,
  hasPassword,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPassword: boolean;
  isSubmitting: boolean;
  onSubmit: (payload: { code: string; password?: string }) => void;
}) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setCode('');
        setPassword('');
        setUseBackup(false);
        setBackupCode('');
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const activeCode = useBackup ? backupCode.replace(/-/g, '').trim() : code;
  const canSubmit =
    (useBackup ? activeCode.length === 8 : code.length === 6) &&
    (!hasPassword || password.length > 0) &&
    !isSubmitting;

  const handleSubmit = useCallback(() => {
    onSubmit(hasPassword ? { code: activeCode, password } : { code: activeCode });
  }, [activeCode, password, hasPassword, onSubmit]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm rounded-xl p-5 gap-0 bg-white">
        <DialogHeader className="space-y-1.5 pb-3">
          <DialogTitle className="text-[0.92rem] font-semibold text-gray-800">
            Desactivar 2FA
          </DialogTitle>
          <DialogDescription className="text-[0.78rem] text-gray-500 leading-relaxed">
            Tu cuenta quedará protegida únicamente por tu contraseña. Puedes volver a
            activar 2FA cuando quieras.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3 space-y-4">
          {hasPassword && (
            <div className="space-y-1.5">
              <Label
                htmlFor="disable-2fa-password"
                className="text-[0.75rem] text-gray-500"
              >
                Contraseña actual
              </Label>
              <Input
                id="disable-2fa-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="h-9 text-[0.85rem] md:text-[0.85rem]"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-[0.75rem] text-gray-500">
              {useBackup ? 'Código de respaldo' : 'Código actual de tu app'}
            </Label>
            {useBackup ? (
              <Input
                type="text"
                placeholder="XXXX-XXXX"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                disabled={isSubmitting}
                autoComplete="off"
                className="h-9 text-[0.85rem] md:text-[0.85rem] font-mono tracking-wider"
              />
            ) : (
              <OtpInput value={code} onChange={setCode} disabled={isSubmitting} />
            )}
            <button
              type="button"
              onClick={() => setUseBackup(!useBackup)}
              className="text-[0.72rem] text-gray-400 hover:text-gray-600 transition-colors"
            >
              {useBackup ? 'Usar código de la app' : '¿No tienes acceso? Usa un código de respaldo'}
            </button>
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 rounded-lg text-[0.8rem] h-9"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 rounded-lg text-[0.8rem] h-9 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Desactivando\u2026' : 'Desactivar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
