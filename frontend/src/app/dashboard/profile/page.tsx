// src/app/dashboard/profile/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile, changePassword, deleteAccount, getUserProfile, disconnectSocialAccount } from '@/lib/api/user';
import { useToast } from '@/hooks/use-toast';
import type { SocialProvider } from '@/types';
import Image from 'next/image';
import {
  ArrowLeft,
  Lock,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Check,
  X,
  KeyRound,
  LogOut,
  UserCircle,
} from 'lucide-react';
import Link from 'next/link';
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

// ─── Estilos hoisted (evita recreación en cada render) ──────────────
const navyBg = { background: '#1C3B57' } as const;
const navyText = { color: '#1C3B57' } as const;
const navyIconBg = { background: 'rgba(28, 59, 87, 0.06)' } as const;
const bodyText = { color: '#374151' } as const;
const tealCta = { color: '#0D9488', background: 'rgba(13, 148, 136, 0.08)' } as const;

// ─── SVG Icons para providers sociales (hoisted como constantes) ────

const googleIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const appleIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const facebookIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2" />
  </svg>
);

const PROVIDER_CONFIG: Record<SocialProvider, { name: string; icon: React.ReactElement }> = {
  google: { name: 'Google', icon: googleIcon },
  apple: { name: 'Apple', icon: appleIcon },
  facebook: { name: 'Facebook', icon: facebookIcon },
};

// ─── Componente reutilizable: toggle de visibilidad de contraseña ───

function PasswordToggle({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
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

// ─── Página principal ───────────────────────────────────────────────

export default function ProfilePage() {
  const { user, logout, setUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // theme-color para navegadores mobile
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#fafbfc';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  // Estado para el formulario de perfil
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- usamos primitives para evitar re-renders innecesarios
  }, [user?.first_name, user?.last_name, user?.phone]);

  // Estado para el formulario de cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password2: '',
  });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // Query para obtener perfil completo (incluye social_accounts y has_password)
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getUserProfile,
    enabled: mounted,
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (data) => {
      setUser(data);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({ title: 'Perfil actualizado', description: 'Tus datos han sido actualizados correctamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPasswordData({ current_password: '', new_password: '', new_password2: '' });
      toast({ title: 'Contraseña actualizada', description: 'Tu contraseña ha sido cambiada correctamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast({ title: 'Cuenta eliminada', description: 'Tu cuenta ha sido eliminada correctamente' });
      logout();
      router.push('/');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectSocialAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: 'Cuenta desvinculada', description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.new_password2) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }
    if (passwordData.new_password.length < 8) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 8 caracteres', variant: 'destructive' });
      return;
    }
    changePasswordMutation.mutate(passwordData);
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      toast({ title: 'Error', description: 'Debes ingresar tu contraseña para confirmar', variant: 'destructive' });
      return;
    }
    deleteAccountMutation.mutate(deletePassword);
  };

  const firstName = user?.first_name || '';

  return (
    <>
      <style jsx global>{`
        html, body { background: #fafbfc !important; }
      `}</style>

      <div className="min-h-screen bg-[#fafbfc]">
        {/* Skip link — accesibilidad */}
        <a
          href="#profile-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-white focus:text-[#1C3B57] focus:rounded-md focus:shadow-md focus:text-sm focus:font-medium"
        >
          Ir al contenido
        </a>

        {/* Header — identidad NERBIS */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/Isotipo_color_NERBIS.png"
                alt="Nerbis"
                width={36}
                height={36}
              />
              <span
                className="text-[0.85rem] font-semibold tracking-wide"
                style={navyText}
              >
                NERBIS
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-xs text-gray-500 hover:text-[#1C3B57]"
              >
                <Link href="/dashboard">
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Volver</span>
                </Link>
              </Button>
              <div className="w-px h-4 bg-gray-200" aria-hidden="true" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                Salir
              </Button>
            </div>
          </div>
        </div>

        <main id="profile-content" className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
          {/* Page header */}
          <div className="mb-10 profile-fade-up text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={navyIconBg}>
              <UserCircle className="w-8 h-8" style={navyText} aria-hidden="true" />
            </div>
            <h1
              className="text-[2rem] sm:text-[2.4rem] leading-[1.15] tracking-[-0.025em] mb-2 text-pretty"
              style={navyText}
            >
              <span style={{ fontWeight: 300 }}>
                {firstName ? `${firstName}, ` : ''}tu
              </span>{' '}
              <span style={{ fontWeight: 600 }}>cuenta</span>
            </h1>
            <p className="text-sm text-gray-400">
              Administra tu información personal y seguridad
            </p>
          </div>

          {/* ── Métodos de acceso ── */}
          <section className="mb-8 profile-fade-up profile-delay-1">
            <h2 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase mb-3">
              Métodos de acceso
            </h2>
            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
              {/* Email + Contraseña */}
              <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gray-50">
                    <KeyRound className="w-4.5 h-4.5 text-gray-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[0.85rem] font-medium" style={bodyText}>Email y contraseña</p>
                    <p className="text-xs text-gray-400 truncate">{!mounted ? 'Cargando\u2026' : user?.email}</p>
                  </div>
                </div>
                {profile?.has_password ? (
                  <Badge variant="outline" className="gap-1 text-[0.68rem] text-emerald-600 border-emerald-200 bg-emerald-50">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Activo
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/forgot-password')}
                    className="text-xs font-medium"
                    style={tealCta}
                  >
                    Crear contraseña
                  </Button>
                )}
              </div>

              {/* Providers sociales */}
              {(['google', 'apple', 'facebook'] as SocialProvider[]).map((provider) => {
                const config = PROVIDER_CONFIG[provider];
                const linked = profile?.social_accounts?.find((sa) => sa.provider === provider);
                const canDisconnect = (profile?.has_password) || ((profile?.social_accounts?.length ?? 0) > 1);

                return (
                  <div key={provider} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gray-50">
                        {config.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.85rem] font-medium" style={bodyText}>{config.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {linked ? linked.email : 'Disponible para vincular'}
                        </p>
                      </div>
                    </div>
                    {linked ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="gap-1 text-[0.68rem] text-emerald-600 border-emerald-200 bg-emerald-50">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          Vinculado
                        </Badge>
                        {canDisconnect && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-gray-300 hover:text-red-500 hover:bg-red-50"
                                aria-label={`Desvincular ${config.name}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Desvincular {config.name}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Ya no podrás iniciar sesión con {config.name}. Puedes volver a vincularla iniciando sesión con esa cuenta.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => disconnectMutation.mutate(provider)}
                                  disabled={disconnectMutation.isPending}
                                >
                                  {disconnectMutation.isPending ? 'Desvinculando\u2026' : 'Desvincular'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Vincula desde el login</span>
                    )}
                  </div>
                );
              })}
            </div>
            {!profile?.has_password && (
              <p className="text-xs text-gray-400 mt-2 px-1">
                Crea una contraseña para acceder también por email, sin depender de redes sociales.
              </p>
            )}
          </section>

          {/* ── Información personal ── */}
          <section className="mb-8 profile-fade-up profile-delay-2">
            <h2 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase mb-3">
              Información personal
            </h2>
            <div className="rounded-xl border border-gray-200 bg-white">
              <form onSubmit={handleProfileSubmit} className="px-4 py-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="first_name" className="text-xs text-gray-500">Nombre</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                      required
                      autoComplete="given-name"
                      spellCheck={false}
                      className="h-10"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="last_name" className="text-xs text-gray-500">Apellido</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                      required
                      autoComplete="family-name"
                      spellCheck={false}
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="phone" className="text-xs text-gray-500">Teléfono</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    autoComplete="tel"
                    className="h-10"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="rounded-lg text-[0.82rem] hover:shadow-md active:scale-[0.98]"
                    style={navyBg}
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    {updateProfileMutation.isPending ? 'Guardando\u2026' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </div>
          </section>

          {/* ── Cambiar contraseña (solo si tiene password) ── */}
          {profile?.has_password && (
            <section className="mb-8 profile-fade-up profile-delay-3">
              <h2 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase mb-3">
                Cambiar contraseña
              </h2>
              <div className="rounded-xl border border-gray-200 bg-white">
                <form onSubmit={handlePasswordSubmit} className="px-4 py-5 space-y-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="current_password" className="text-xs text-gray-500">Contraseña actual</Label>
                    <div className="relative">
                      <Input
                        id="current_password"
                        name="current_password"
                        type={showOldPassword ? 'text' : 'password'}
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                        required
                        autoComplete="current-password"
                        className="h-10 pr-10"
                      />
                      <PasswordToggle show={showOldPassword} onToggle={() => setShowOldPassword(v => !v)} />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="new_password" className="text-xs text-gray-500">Nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        id="new_password"
                        name="new_password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        className="h-10 pr-10"
                      />
                      <PasswordToggle show={showNewPassword} onToggle={() => setShowNewPassword(v => !v)} />
                    </div>
                    <p className="text-[0.7rem] text-gray-400">Mínimo 8 caracteres</p>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="new_password2" className="text-xs text-gray-500">Confirmar nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        id="new_password2"
                        name="new_password2"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.new_password2}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, new_password2: e.target.value }))}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        className="h-10 pr-10"
                      />
                      <PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="rounded-lg text-[0.82rem] hover:shadow-md active:scale-[0.98]"
                      style={navyBg}
                    >
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      {changePasswordMutation.isPending ? 'Actualizando\u2026' : 'Cambiar contraseña'}
                    </Button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {/* ── Zona de peligro ── */}
          <section className="mb-16 profile-fade-up profile-delay-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[0.7rem] text-red-400/70 font-medium tracking-wide uppercase">
                Zona de peligro
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="rounded-xl border border-red-100 bg-white">
              <div className="px-4 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-[0.85rem] font-medium text-gray-700 mb-1">Eliminar cuenta</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Se eliminarán todos tus datos de forma irreversible.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 text-[0.82rem] shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Eliminar mi cuenta
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Esto eliminará permanentemente tu
                          cuenta y todos tus datos de nuestros servidores.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-4">
                        <Label htmlFor="delete_password" className="mb-2 block text-[0.82rem]">
                          Ingresa tu contraseña para confirmar
                        </Label>
                        <div className="relative">
                          <Input
                            id="delete_password"
                            name="delete_password"
                            type={showDeletePassword ? 'text' : 'password'}
                            placeholder="Tu contraseña\u2026"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            autoComplete="current-password"
                            className="pr-10"
                          />
                          <PasswordToggle show={showDeletePassword} onToggle={() => setShowDeletePassword(v => !v)} />
                        </div>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletePassword('')}>
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={deleteAccountMutation.isPending}
                        >
                          {deleteAccountMutation.isPending ? 'Eliminando\u2026' : 'Sí, eliminar mi cuenta'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
