// src/app/dashboard/settings/login/page.tsx
// Centraliza todos los métodos de acceso a la cuenta:
//   - Correo + contraseña (estado y cambio)
//   - Cuentas vinculadas (Google, Apple, Facebook)
//   - Passkeys (WebAuthn)
//   - Autenticación en dos pasos (TOTP)
//   - Sesiones activas (próximamente)
//
// Orquestador delgado: las secciones presentacionales viven en ./_components.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { SectionHeader } from '@/components/settings';
import type { SocialProvider } from '@/types';
import { type TwoFactorPhase } from './_helpers';
import {
  TwoFactorLoadingState,
  TwoFactorDisabledState,
  TwoFactorEnablingState,
  TwoFactorShowCodesState,
  TwoFactorEnabledState,
  RegenerateBackupCodesDialog,
  DisableTwoFactorDialog,
  extractErrorMessage,
  PasswordSection,
  type PasswordData,
  SocialConnections,
  PasskeysSection,
  ActiveSessionsSection,
} from './_components';
import {
  changePassword,
  disconnectSocialAccount,
  getUserProfile,
} from '@/lib/api/user';
import {
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateBackupCodes,
  setupTwoFactor,
  verifyTwoFactor,
} from '@/lib/api/twoFactor';

// ─── Página ───────────────────────────────────────────────
export default function LoginSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mount-detection guard (SSR hydration). Pre-existing pattern, behavior-preserving.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // ── Perfil (email/password/social) ─────────────────
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getUserProfile,
    enabled: mounted,
  });

  // ── Cambio de contraseña ────────────────────────────
  const [changePasswordSuccessNonce, setChangePasswordSuccessNonce] = useState(0);

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setChangePasswordSuccessNonce((n) => n + 1);
      toast.success('Contraseña actualizada correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

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
      // Sync phase to loading while status query is in flight. Pre-existing, behavior-preserving.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <h1 className="text-xl font-semibold text-foreground">Inicio de sesión</h1>
      </header>

      {/* SECCIÓN 1 — Correo y contraseña */}
      <PasswordSection
        mounted={mounted}
        email={user?.email}
        profile={profile}
        onChangePassword={(data: PasswordData) => changePasswordMutation.mutate(data)}
        isChangingPassword={changePasswordMutation.isPending}
        changePasswordSuccessNonce={changePasswordSuccessNonce}
        onResetComplete={() =>
          queryClient.invalidateQueries({ queryKey: ['user-profile'] })
        }
      />

      {/* SECCIÓN 2 — Cuentas vinculadas */}
      <SocialConnections
        profile={profile}
        onDisconnect={(provider: SocialProvider) => disconnectMutation.mutate(provider)}
        isDisconnecting={disconnectMutation.isPending}
      />

      {/* SECCIÓN 3 — Passkeys */}
      <PasskeysSection />

      {/* SECCIÓN 4 — Autenticación en dos pasos */}
      <section>
        <SectionHeader as={3} title="Autenticación en dos pasos" />
        {twoFactorContent}
      </section>

      {/* SECCIÓN 5 — Sesiones activas (próximamente) */}
      <ActiveSessionsSection />

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
