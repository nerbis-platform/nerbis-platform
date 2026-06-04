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
import type { TeamMember, SocialAccountDetail } from '@/lib/api/team';
import { PROVIDER_CONFIG, DEFAULT_PROVIDER_CONFIG } from '../_helpers';

interface DisconnectSocialDialogProps {
  open: boolean;
  member: TeamMember | null;
  social: SocialAccountDetail | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DisconnectSocialDialog({
  open,
  member,
  social,
  isPending,
  onOpenChange,
  onConfirm,
}: DisconnectSocialDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desvincular cuenta social</AlertDialogTitle>
          <AlertDialogDescription>
            {member && social && (
              <>
                ¿Desvincular la cuenta de{' '}
                <strong>
                  {(PROVIDER_CONFIG[social.provider] ?? DEFAULT_PROVIDER_CONFIG).label}
                </strong>{' '}
                de <strong>{member.full_name}</strong>?
                <br />
                <br />
                El usuario ya no podrá iniciar sesión con este proveedor.
                {!member.has_password &&
                  member.social_accounts.length <= 1 && (
                    <span className="block mt-2 text-destructive font-medium">
                      Este usuario no tiene contraseña y esta es su única cuenta
                      social. No se podrá desvincular.
                    </span>
                  )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            variant="destructive"
            disabled={
              isPending ||
              (!member?.has_password &&
                (member?.social_accounts.length ?? 0) <= 1)
            }
          >
            {isPending ? 'Desvinculando...' : 'Desvincular'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
