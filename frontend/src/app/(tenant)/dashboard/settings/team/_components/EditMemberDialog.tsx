'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TeamMember } from '@/lib/api/team';
import { navyText, ROLE_CONFIG } from '../_helpers';

interface EditMemberDialogProps {
  open: boolean;
  member: TeamMember | null;
  selectedRole: 'admin' | 'staff';
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectedRoleChange: (role: 'admin' | 'staff') => void;
  onConfirm: () => void;
}

export function EditMemberDialog({
  open,
  member,
  selectedRole,
  isPending,
  onOpenChange,
  onSelectedRoleChange,
  onConfirm,
}: EditMemberDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={`text-lg font-semibold ${navyText}`}>Cambiar rol</DialogTitle>
          <DialogDescription>
            {member && (
              <>
                Cambiar el rol de <strong>{member.full_name}</strong>.
                Rol actual: {ROLE_CONFIG[member.role].label}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <Label htmlFor="role-select" className="text-muted-foreground">Nuevo rol</Label>
            <Select value={selectedRole} onValueChange={(v) => onSelectedRoleChange(v as 'admin' | 'staff')}>
              <SelectTrigger id="role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={onConfirm}
            disabled={isPending || selectedRole === member?.role}
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
