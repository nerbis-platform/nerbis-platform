// src/app/dashboard/settings/login/page.tsx
// Centraliza todos los métodos de acceso a la cuenta:
//   - Correo + contraseña (estado y cambio)
//   - Cuentas vinculadas (Google, Apple, Facebook)
//   - Passkeys (WebAuthn)
//
// Futuro (ver issue): sesiones activas, 2FA, historial de inicios, alertas de seguridad.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Check,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
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
import { useAuth } from '@/contexts/AuthContext';
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

// ─── Página ───────────────────────────────────────────────
export default function LoginSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
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

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="text-[1.25rem] font-semibold text-[#1C3B57]">Inicio de sesión</h1>
        <p className="text-[0.85rem] text-gray-500 mt-1">
          Administra cómo accedes a tu cuenta NERBIS.
        </p>
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
                  profile?.has_password ? 'bg-[rgba(13,148,136,0.08)]' : 'bg-gray-50',
                )}
              >
                <KeyRound
                  className={cn(
                    'size-4',
                    profile?.has_password ? 'text-[#0D9488]' : 'text-gray-400',
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
                onClick={() => router.push('/forgot-password')}
                className="text-[0.75rem] font-medium text-[#0D9488] hover:text-[#0D9488] hover:bg-[rgba(13,148,136,0.08)] cursor-pointer"
              >
                Crear contraseña
              </Button>
            )}
          </div>
          {profile && !profile.has_password && (
            <div className="px-4 pb-3.5 -mt-1">
              <p className="text-[0.75rem] text-gray-400 leading-relaxed">
                Crea una contraseña para acceder también por email, sin depender de redes
                sociales.
              </p>
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
                  className="text-[0.75rem] font-medium text-[#0D9488] hover:underline cursor-pointer"
                >
                  Cambiar
                </button>
              )}
            </div>

            {isEditingPassword && (
              <form
                onSubmit={handlePasswordSubmit}
                className="px-4 pb-5 pt-1 flex flex-col gap-4 border-t border-gray-100"
              >
                <div className="flex flex-col gap-1.5 pt-4">
                  <Label htmlFor="current_password" className="text-[0.75rem] text-gray-500">
                    Contraseña actual
                  </Label>
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
                    className="rounded-xl text-[0.82rem] bg-[#1C3B57] hover:bg-[#15304a] hover:shadow-md active:scale-[0.98]"
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
                    className="text-[0.75rem] font-medium text-[#0D9488] hover:underline transition-colors cursor-pointer"
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
            <Fingerprint className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
            <h4 className="text-[0.9rem] font-medium text-[#1C3B57]">Llaves de acceso</h4>
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
                className="h-10 focus-visible:border-[#0D9488] focus-visible:ring-[#0D9488]/20"
                maxLength={100}
              />
              <Button
                type="button"
                onClick={handleRegisterPasskey}
                disabled={registering}
                className="bg-[#0D9488] hover:bg-[#0B7A70] text-white"
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
                        <p className="text-[0.875rem] font-medium text-[#1C3B57] truncate">
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
                      className="p-2 rounded-md text-gray-400 hover:text-[#1C3B57] hover:bg-gray-50 transition-colors"
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
    </div>
  );
}
