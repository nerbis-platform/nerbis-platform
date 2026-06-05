'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { TeamMember } from '@/lib/api/team';

interface Reset2FADialogProps {
  open: boolean;
  member: TeamMember | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function Reset2FADialog({
  open,
  member,
  isPending,
  onOpenChange,
  onConfirm,
}: Reset2FADialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resetear 2FA</AlertDialogTitle>
          <AlertDialogDescription>
            {member && (
              <>
                ¿Resetear la autenticación en dos pasos de{' '}
                <strong>{member.full_name}</strong>?
                <br />
                <br />
                Se eliminarán todos sus métodos de verificación (passkeys y códigos TOTP).
                El usuario podrá iniciar sesión solo con su contraseña o cuenta social
                y configurar 2FA nuevamente si lo desea.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            variant="destructive"
            disabled={isPending}
          >
            {isPending ? 'Reseteando...' : 'Resetear 2FA'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
