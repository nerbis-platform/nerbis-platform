// src/components/auth/PasskeyButton.tsx
// Passkey (WebAuthn) login button — behind feature flag NEXT_PUBLIC_FEATURE_PASSKEYS.
// Al hacer click: ejecuta autenticación WebAuthn → recibe JWT → redirige al dashboard.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { features } from '@/lib/features';
import { useAuth } from '@/contexts/AuthContext';
import { authenticateWithPasskey, isWebAuthnSupported } from '@/lib/api/passkey';

interface PasskeyButtonProps {
  /** Email pre-llenado del form (opcional) — si se pasa, restringe las credenciales permitidas. */
  email?: string;
  /** Redirect tras login exitoso. */
  redirectTo?: string;
  /** Callback opcional después de login exitoso. */
  onSuccess?: () => void;
}

export function PasskeyButton({ email, redirectTo, onSuccess }: PasskeyButtonProps) {
  const router = useRouter();
  const { setUser, setTenant } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!features.passkeys) return null;
  if (typeof window !== 'undefined' && !isWebAuthnSupported()) return null;

  const handleClick = async () => {
    try {
      setLoading(true);
      const auth = await authenticateWithPasskey(email || undefined);

      // Sincronizar estado de AuthContext para que el DashboardShell
      // no rebote al login al hacer router.push('/dashboard')
      setUser(auth.user);
      setTenant(auth.tenant ?? null);

      toast.success('¡Bienvenido!');

      if (onSuccess) {
        onSuccess();
        return;
      }

      // Redirigir respetando el estado del tenant (setup, website-builder, dashboard)
      let target = redirectTo;
      if (!target) {
        if (auth.tenant && !auth.tenant.modules_configured) {
          target = '/dashboard/website-builder/quick-start';
        } else if (auth.tenant?.has_website && auth.tenant.website_status !== 'published') {
          target = '/dashboard/website-builder';
        } else {
          target = '/dashboard';
        }
      }
      router.push(target);
    } catch (error) {
      // El usuario canceló el prompt del browser — no es un error real
      if (error instanceof Error && error.name === 'NotAllowedError') {
        return;
      }
      const message =
        error instanceof Error ? error.message : 'No se pudo iniciar sesión con passkey';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 text-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label="Iniciar sesión con passkey biométrico"
        className="inline-flex items-center gap-1.5 text-[0.8rem] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm hover:text-[var(--auth-primary)]"
        style={{
          color: 'var(--auth-text-muted)',
          fontFamily: 'var(--auth-font-body)',
        }}
        data-auth-animated
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>{loading ? 'Verificando...' : 'Iniciar con passkey'}</span>
      </button>
    </div>
  );
}
