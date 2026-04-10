// src/app/dashboard/settings/profile/page.tsx
// Datos personales del usuario + zona de peligro (eliminar cuenta).
// Los métodos de acceso (email/password/social/passkeys) viven en /settings/login.

'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile, deleteAccount, getUserProfile } from '@/lib/api/user';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Trash2, Save, Eye, EyeOff, Pencil } from 'lucide-react';
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

// ─── Página de perfil ─────────────────────────────────────
export default function SettingsProfilePage() {
  const { user, logout, setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.first_name, user?.last_name, user?.phone]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // Necesitamos has_password para saber si se puede pedir contraseña al eliminar cuenta.
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getUserProfile,
    enabled: mounted,
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (data) => {
      setUser(data);
      setIsEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: 'Perfil actualizado', description: 'Tus datos han sido actualizados correctamente' });
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
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      toast({ title: 'Error', description: 'Debes ingresar tu contraseña para confirmar', variant: 'destructive' });
      return;
    }
    deleteAccountMutation.mutate(deletePassword);
  };

  return (
    <div className="max-w-2xl">
      {/* ── Datos personales ── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase">
            Datos personales
          </h3>
          {!isEditingProfile && (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center gap-1 text-[0.75rem] font-medium text-[#0D9488] hover:underline transition-colors cursor-pointer"
            >
              <Pencil className="size-3" aria-hidden="true" />
              Editar
            </button>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit} className="px-4 py-5 flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="first_name" className="text-[0.75rem] text-gray-500">Nombre</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    placeholder="Tu nombre"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                    required
                    autoComplete="given-name"
                    spellCheck={false}
                    className="h-9 text-[0.85rem] md:text-[0.85rem]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="last_name" className="text-[0.75rem] text-gray-500">Apellido</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    placeholder="Tu apellido"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                    required
                    autoComplete="family-name"
                    spellCheck={false}
                    className="h-9 text-[0.85rem] md:text-[0.85rem]"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone" className="text-[0.75rem] text-gray-500">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+57 300 123 4567"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  autoComplete="tel"
                  className="h-9 text-[0.85rem] md:text-[0.85rem]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingProfile(false);
                    if (user) {
                      setProfileData({
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        phone: user.phone || '',
                      });
                    }
                  }}
                  className="rounded-xl text-[0.82rem] text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="rounded-xl text-[0.82rem] bg-[#1C3B57] hover:bg-[#15304a] hover:shadow-md active:scale-[0.98]"
                >
                  <Save className="size-3.5" aria-hidden="true" />
                  {updateProfileMutation.isPending ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="divide-y divide-gray-100">
              {[
                { label: 'Correo', value: !mounted ? '…' : (user?.email || '—') },
                { label: 'Nombre', value: user?.first_name || '—' },
                { label: 'Apellido', value: user?.last_name || '—' },
                { label: 'Teléfono', value: user?.phone || 'Sin registrar' },
              ].map((field) => (
                <div key={field.label} className="flex items-center px-4 py-3.5">
                  <span className="text-[0.75rem] text-gray-400 w-24 shrink-0">{field.label}</span>
                  <span className={cn(
                    'text-[0.85rem]',
                    field.value === '—' || field.value === 'Sin registrar'
                      ? 'text-gray-400'
                      : 'text-gray-600'
                  )}>{field.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Zona de peligro ── */}
      <section className="mb-16">
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
                <p className="text-[0.82rem] font-medium text-gray-700 mb-1">Eliminar cuenta</p>
                <p className="text-[0.75rem] text-gray-400 leading-relaxed">
                  Se eliminarán todos tus datos de forma irreversible.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 text-[0.82rem] shrink-0"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Eliminar mi cuenta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar cuenta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción es irreversible. Se eliminarán todos tus datos de nuestros servidores.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {profile?.has_password ? (
                    <div className="py-3">
                      <Label htmlFor="delete_password" className="mb-1.5 block text-[0.75rem] text-gray-500">
                        Ingresa tu contraseña para confirmar
                      </Label>
                      <div className="relative">
                        <Input
                          id="delete_password"
                          name="delete_password"
                          type={showDeletePassword ? 'text' : 'password'}
                          placeholder="Tu contraseña…"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          autoComplete="current-password"
                          className="h-9 pr-10 text-[0.85rem] md:text-[0.85rem]"
                        />
                        <PasswordToggle show={showDeletePassword} onToggle={() => setShowDeletePassword(v => !v)} />
                      </div>
                    </div>
                  ) : (
                    <p className="py-3 text-[0.78rem] text-gray-500 leading-relaxed">
                      Para eliminar tu cuenta, primero debes crear una contraseña desde <strong>Inicio de sesión</strong>.
                    </p>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeletePassword('')}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleteAccountMutation.isPending || !profile?.has_password}
                      className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600/30 disabled:opacity-50"
                    >
                      {deleteAccountMutation.isPending ? 'Eliminando…' : 'Eliminar cuenta'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
