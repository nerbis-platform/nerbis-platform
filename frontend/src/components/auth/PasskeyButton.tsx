// src/components/auth/PasskeyButton.tsx
// Passkey (WebAuthn) login button behind feature flag.

'use client';

import { Fingerprint } from 'lucide-react';
import { features } from '@/lib/features';
import { toast } from 'sonner';

interface PasskeyButtonProps {
  onClick?: () => void;
}

export function PasskeyButton({ onClick }: PasskeyButtonProps) {
  if (!features.passkeys) return null;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      toast('Estamos trabajando en esto', {
        description: 'Pronto podrás iniciar sesión con huella o Face ID. Por ahora, usa tu email y contraseña.',
      });
    }
  };

  return (
    <div className="mt-4 text-center">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Iniciar sesión con passkey biométrico"
        className="inline-flex items-center gap-1.5 text-[0.8rem] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm hover:text-[var(--auth-primary)]"
        style={{
          color: 'var(--auth-text-muted)',
          fontFamily: 'var(--auth-font-body)',
        }}
        data-auth-animated
      >
        <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Iniciar con passkey</span>
      </button>
    </div>
  );
}
