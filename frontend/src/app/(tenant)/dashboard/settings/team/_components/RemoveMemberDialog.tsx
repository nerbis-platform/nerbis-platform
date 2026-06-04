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

interface RemoveMemberDialogProps {
  open: boolean;
  member: TeamMember | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function RemoveMemberDialog({
  open,
  member,
  isPending,
  onOpenChange,
  onConfirm,
}: RemoveMemberDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar del equipo</AlertDialogTitle>
          <AlertDialogDescription>
            {member && (
              <>
                ¿Eliminar a <strong>{member.full_name}</strong> del equipo?
                <br /><br />
                Se desactivará su cuenta y su rol cambiará a cliente.
                Puedes reactivarlo más tarde desde esta misma sección.
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
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
