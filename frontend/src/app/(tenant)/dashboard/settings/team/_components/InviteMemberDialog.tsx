'use client';

import { UserPlus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { navyText } from '../_helpers';

interface InviteMemberDialogProps {
  open: boolean;
  canInvite: boolean;
  email: string;
  role: 'staff' | 'admin';
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: 'staff' | 'admin') => void;
  onSubmit: () => void;
}

export function InviteMemberDialog({
  open,
  canInvite,
  email,
  role,
  isPending,
  onOpenChange,
  onEmailChange,
  onRoleChange,
  onSubmit,
}: InviteMemberDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs" disabled={!canInvite}>
          <UserPlus className="h-3.5 w-3.5" />
          Invitar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={`text-lg font-semibold ${navyText}`}>Invitar miembro al equipo</DialogTitle>
          <DialogDescription>
            Se enviará un email con un enlace para unirse al equipo.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-muted-foreground">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="ejemplo@email.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role" className="text-muted-foreground">Rol</Label>
              <Select value={role} onValueChange={(v) => onRoleChange(v as 'staff' | 'admin')}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {isPending ? 'Enviando...' : 'Enviar invitación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
