'use client';

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordToggle } from '../_helpers';
import type { PasswordData } from './PasswordSection';

interface ChangePasswordFormProps {
  passwordData: PasswordData;
  setPasswordData: React.Dispatch<React.SetStateAction<PasswordData>>;
  showOldPassword: boolean;
  setShowOldPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showNewPassword: boolean;
  setShowNewPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showConfirmPassword: boolean;
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>;
  isChangingPassword: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onForgot: () => void;
  onCancel: () => void;
}

export function ChangePasswordForm({
  passwordData,
  setPasswordData,
  showOldPassword,
  setShowOldPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isChangingPassword,
  onSubmit,
  onForgot,
  onCancel,
}: ChangePasswordFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="px-4 pb-5 pt-1 flex flex-col gap-4 border-t border-border"
    >
      <div className="flex flex-col gap-1.5 pt-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="current_password" className="text-xs text-muted-foreground">
            Contraseña actual
          </Label>
          <button
            type="button"
            onClick={onForgot}
            className="text-xs font-medium text-[var(--color-text-brand)] hover:underline cursor-pointer"
          >
            ¿La olvidaste?
          </button>
        </div>
        <div className="relative">
          <Input
            id="current_password"
            name="current_password"
            type={showOldPassword ? 'text' : 'password'}
            value={passwordData.current_password}
            onChange={(e) =>
              setPasswordData((prev) => ({ ...prev, current_password: e.target.value }))
            }
            required
            autoComplete="current-password"
            className="h-9 pr-10 text-sm md:text-sm"
          />
          <PasswordToggle
            show={showOldPassword}
            onToggle={() => setShowOldPassword((v) => !v)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new_password" className="text-xs text-muted-foreground">
          Nueva contraseña
        </Label>
        <div className="relative">
          <Input
            id="new_password"
            name="new_password"
            type={showNewPassword ? 'text' : 'password'}
            value={passwordData.new_password}
            onChange={(e) =>
              setPasswordData((prev) => ({ ...prev, new_password: e.target.value }))
            }
            required
            minLength={8}
            autoComplete="new-password"
            className="h-9 pr-10 text-sm md:text-sm"
          />
          <PasswordToggle
            show={showNewPassword}
            onToggle={() => setShowNewPassword((v) => !v)}
          />
        </div>
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new_password2" className="text-xs text-muted-foreground">
          Confirmar nueva contraseña
        </Label>
        <div className="relative">
          <Input
            id="new_password2"
            name="new_password2"
            type={showConfirmPassword ? 'text' : 'password'}
            value={passwordData.new_password2}
            onChange={(e) =>
              setPasswordData((prev) => ({ ...prev, new_password2: e.target.value }))
            }
            required
            minLength={8}
            autoComplete="new-password"
            className="h-9 pr-10 text-sm md:text-sm"
          />
          <PasswordToggle
            show={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((v) => !v)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="rounded-xl text-sm text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isChangingPassword}
          className="rounded-xl text-sm hover:shadow-md active:scale-[0.98]"
        >
          <Lock className="size-3.5" aria-hidden="true" />
          {isChangingPassword ? 'Actualizando…' : 'Actualizar'}
        </Button>
      </div>
    </form>
  );
}
