// src/app/(tenant)/dashboard/settings/profile/page.tsx
// Datos personales del usuario + zona de peligro (eliminar cuenta).
// Los métodos de acceso (email/password/social/passkeys) viven en /settings/login.

'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile, updateUserAvatar, deleteAccount, getUserProfile } from '@/lib/api/user';
import { Trash2, Save, Eye, EyeOff } from 'lucide-react';
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
import {
  SectionHeader,
  SettingCard,
  SettingsField,
  ViewEditRow,
  ViewEditList,
  DangerZone,
  DangerAction,
  AvatarUploader,
} from '@/components/settings';

// ─── Toggle de visibilidad de contraseña ──────────────────
function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    >
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </Button>
  );
}

// ─── Página de perfil ─────────────────────────────────────
export default function SettingsProfilePage() {
  const { user, logout, setUser } = useAuth();
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
      toast.success('Perfil actualizado', {
        description: 'Tus datos han sido actualizados correctamente',
      });
    },
    onError: (error: Error) => {
      toast.error('No se pudo actualizar el perfil', {
        description: error.message,
      });
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: updateUserAvatar,
    onSuccess: (data) => {
      setUser(data);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast.success('Cuenta eliminada', {
        description: 'Tu cuenta ha sido eliminada correctamente',
      });
      logout();
    },
    onError: (error: Error) => {
      toast.error('No se pudo eliminar la cuenta', {
        description: error.message,
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      toast.error('Falta la contraseña', {
        description: 'Debes ingresar tu contraseña para confirmar',
      });
      return;
    }
    deleteAccountMutation.mutate(deletePassword);
  };

  const cancelEdit = () => {
    setIsEditingProfile(false);
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
      });
    }
  };

  return (
    <div className="max-w-2xl">
      {/* ── Foto de perfil ── */}
      <section className="mb-8" aria-labelledby="profile-avatar">
        <SectionHeader
          id="profile-avatar"
          title="Foto de perfil"
          description="Se mostrará en tu cuenta y en el equipo."
        />
        <SettingCard>
          <div className="px-4 py-5">
            <AvatarUploader
              user={user}
              onUpload={updateAvatarMutation.mutateAsync}
              isUploading={updateAvatarMutation.isPending}
            />
          </div>
        </SettingCard>
      </section>

      {/* ── Datos personales ── */}
      <section className="mb-8" aria-labelledby="profile-personal-data">
        <SectionHeader
          id="profile-personal-data"
          title="Datos personales"
          description="Tu nombre y datos de contacto."
          action={
            !isEditingProfile ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
                className="text-[var(--color-text-brand)] hover:bg-accent hover:text-[var(--color-text-brand)]"
              >
                Editar
              </Button>
            ) : undefined
          }
        />

        <SettingCard>
          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4 px-4 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsField id="first_name" label="Nombre" required>
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      name="first_name"
                      placeholder="Tu nombre"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                      required
                      autoComplete="given-name"
                      spellCheck={false}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                    />
                  )}
                </SettingsField>
                <SettingsField id="last_name" label="Apellido" required>
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      name="last_name"
                      placeholder="Tu apellido"
                      value={profileData.last_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                      required
                      autoComplete="family-name"
                      spellCheck={false}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                    />
                  )}
                </SettingsField>
              </div>
              <SettingsField id="phone" label="Teléfono">
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="+57 300 123 4567"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    autoComplete="tel"
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                  />
                )}
              </SettingsField>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={cancelEdit}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="active:scale-[0.98]"
                >
                  <Save className="size-3.5" aria-hidden="true" />
                  {updateProfileMutation.isPending ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
            </form>
          ) : (
            <ViewEditList>
              <ViewEditRow label="Correo" value={!mounted ? '…' : user?.email} />
              <ViewEditRow label="Nombre" value={user?.first_name} emptyLabel="—" />
              <ViewEditRow label="Apellido" value={user?.last_name} emptyLabel="—" />
              <ViewEditRow label="Teléfono" value={user?.phone} />
            </ViewEditList>
          )}
        </SettingCard>
      </section>

      {/* ── Zona de peligro ── */}
      <DangerZone>
        <DangerAction
          title="Eliminar cuenta"
          description="Se eliminarán todos tus datos de forma irreversible."
          action={
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
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
                    <Label htmlFor="delete_password" className="mb-1.5 block text-sm text-muted-foreground">
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
                        className="pr-10"
                      />
                      <PasswordToggle show={showDeletePassword} onToggle={() => setShowDeletePassword(v => !v)} />
                    </div>
                  </div>
                ) : (
                  <p className="py-3 text-sm leading-relaxed text-muted-foreground">
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
                    className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30 disabled:opacity-50"
                  >
                    {deleteAccountMutation.isPending ? 'Eliminando…' : 'Eliminar cuenta'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          }
        />
      </DangerZone>
    </div>
  );
}
