'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Fingerprint, KeyRound, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { SectionHeader, SettingCard } from '@/components/settings';
import {
  deletePasskey,
  isWebAuthnSupported,
  listPasskeys,
  registerPasskey,
  renamePasskey,
  type PasskeyRecord,
} from '@/lib/api/passkey';

export function PasskeysSection() {
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
    <section>
      <SectionHeader as={3} title="Passkeys" />

      <SettingCard className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Fingerprint
            className="w-4 h-4 text-[var(--color-text-brand)]"
            aria-hidden="true"
          />
          <h4 className="text-base font-medium text-foreground">Llaves de acceso</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Usa tu huella, Face ID o una llave de seguridad para iniciar sesión sin contraseña.
        </p>

        {!supported && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 mb-4">
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
              className="h-10 focus-visible:border-[var(--color-text-brand)] focus-visible:ring-[var(--color-text-brand)]/20"
              maxLength={100}
              aria-label="Nombre del dispositivo"
            />
            <Button
              type="button"
              onClick={handleRegisterPasskey}
              disabled={registering}
              className="rounded-xl text-sm hover:shadow-md active:scale-[0.98] text-white"
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Cargando…
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <KeyRound
              className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60"
              aria-hidden="true"
            />
            Aún no tienes passkeys registrados.
          </div>
        ) : (
          <ul className="divide-y divide-border">
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
                        className="h-8 text-sm md:text-sm flex-1"
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
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        aria-label="Cancelar"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
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
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
                      className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
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
                        className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
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
      </SettingCard>
    </section>
  );
}
