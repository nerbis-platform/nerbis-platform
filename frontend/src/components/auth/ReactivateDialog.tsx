// src/components/auth/ReactivateDialog.tsx
// Account reactivation dialog extracted from AuthSplitScreen.tsx.

'use client';

import { Loader2 } from 'lucide-react';
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
import type { ReactivateDialogProps } from './types';

export function ReactivateDialog({
  open,
  onClose,
  onReactivate,
  isLoading,
}: ReactivateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle style={{ color: 'var(--auth-primary)' }}>
            Cuenta desactivada
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tu cuenta fue desactivada previamente. ¿Deseas reactivarla?
            <br /><br />
            Al reactivar tu cuenta, recuperarás el acceso a todo tu historial de
            ordenes, citas y datos personales.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onReactivate}
            disabled={isLoading}
            aria-busy={isLoading}
            className="text-white"
            style={{ background: 'var(--auth-primary)' }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Reactivando...
              </>
            ) : (
              'Sí, reactivar mi cuenta'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
