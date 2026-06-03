'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
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
import { OtpInput } from '@/components/auth/OtpInput';
import type { TwoFactorSetupResponse } from '@/lib/api/twoFactor';
import { copyToClipboard, downloadTxt } from './login-helpers';

// ─── Loading ──────────────────────────────────────────────

export function TwoFactorLoadingState() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-10 w-56" />
    </div>
  );
}

// ─── Disabled ─────────────────────────────────────────────

export function TwoFactorDisabledState({
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

// ─── Enabling (QR + OTP input) ────────────────────────────

export function TwoFactorEnablingState({
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

// ─── Show backup codes ────────────────────────────────────

export function TwoFactorShowCodesState({
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

// ─── Enabled ──────────────────────────────────────────────

export function TwoFactorEnabledState({
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

// ─── Regenerate dialog ────────────────────────────────────

export function RegenerateBackupCodesDialog({
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

// ─── Disable dialog ───────────────────────────────────────

export function DisableTwoFactorDialog({
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
