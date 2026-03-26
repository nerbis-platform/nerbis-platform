// src/components/auth/SocialLinkDialog.tsx
// Dialog for linking a social account to an existing user with password.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import * as authApi from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import type { SocialProvider } from '@/types';
import { ApiError } from '@/lib/api/client';

interface SocialLinkDialogProps {
  open: boolean;
  email: string;
  provider: SocialProvider;
  token: string;
  extra?: { first_name?: string; last_name?: string };
  onClose: () => void;
}

const providerLabels: Record<SocialProvider, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
};

export function SocialLinkDialog({
  open,
  email,
  provider,
  token,
  extra,
  onClose,
}: SocialLinkDialogProps) {
  const { setUser, setTenant } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    try {
      const response = await authApi.socialLinkAccount(provider, token, password, extra);
      setUser(response.user);
      if (response.tenant) {
        setTenant(response.tenant);
      }
      toast.success(`Cuenta de ${providerLabels[provider]} vinculada exitosamente`);
      setPassword('');
      onClose();
      // Redirigir según estado del tenant (misma lógica que AuthContext)
      if (response.tenant && !response.tenant.modules_configured) {
        router.push('/dashboard/setup');
      } else if (
        response.tenant?.has_website &&
        response.tenant.website_status !== 'published'
      ) {
        router.push('/dashboard/website-builder');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'Error al vincular cuenta';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Vincular cuenta de {providerLabels[provider]}</DialogTitle>
          <DialogDescription>
            Ya existe una cuenta con <strong>{email}</strong>. Ingresa tu contraseña para vincular tu cuenta de {providerLabels[provider]}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="link-password">Contraseña</Label>
              <Input
                id="link-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña actual"
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !password.trim()}>
              {isLoading ? 'Vinculando...' : 'Vincular cuenta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
