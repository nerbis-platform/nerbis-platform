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

interface BlockMemberDialogProps {
  /** 'block' bloquea al miembro; 'unblock' lo desbloquea. */
  mode: 'block' | 'unblock';
  open: boolean;
  member: TeamMember | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function BlockMemberDialog({
  mode,
  open,
  member,
  isPending,
  onOpenChange,
  onConfirm,
}: BlockMemberDialogProps) {
  if (mode === 'unblock') {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desbloquear usuario</AlertDialogTitle>
            <AlertDialogDescription>
              {member && (
                <>
                  ¿Desbloquear a <strong>{member.full_name}</strong>?
                  <br /><br />
                  El usuario podrá iniciar sesión nuevamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} disabled={isPending}>
              {isPending ? 'Desbloqueando...' : 'Desbloquear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bloquear usuario</AlertDialogTitle>
          <AlertDialogDescription>
            {member && (
              <>
                ¿Bloquear a <strong>{member.full_name}</strong>?
                <br /><br />
                El usuario no podrá iniciar sesión hasta que lo desbloquees.
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
            {isPending ? 'Bloqueando...' : 'Bloquear'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
