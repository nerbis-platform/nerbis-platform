// src/components/auth/TwoFactorChallengeStep.tsx
// Paso de verificación 2FA mostrado tras un login con credenciales válidas
// cuando el backend devuelve `status: "2fa_required"`.
//
// Si el usuario tiene passkeys registrados, muestra verificación biométrica
// como opción principal con TOTP como fallback.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';
import { isWebAuthnSupported } from '@/lib/api/passkey';
import {
  getTwoFactorPasskeyOptions,
  verifyTwoFactorPasskey,
} from '@/lib/api/twoFactor';
import type { AuthResponse } from '@/types';
import { OtpInput } from './OtpInput';
import { SubmitButton } from './SubmitButton';
import { LABEL_CLASS, LABEL_STYLE } from './constants';

interface TwoFactorChallengeStepProps {
  challengeToken: string;
  methods?: string[];
  redirectTo?: string | null;
  onBack: () => void;
}

type Mode = 'passkey' | 'totp' | 'backup';

const TOTP_LENGTH = 6;
const BACKUP_PATTERN = /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/;

// ─── Helpers de codificación base64url <-> ArrayBuffer ──────────

function base64UrlToBuffer(b64url: string): ArrayBuffer {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function TwoFactorChallengeStep({
  challengeToken,
  methods = ['totp', 'backup'],
  redirectTo = null,
  onBack,
}: TwoFactorChallengeStepProps) {
  const router = useRouter();
  const { completeTwoFactorChallenge, setUser, setTenant } = useAuth();

  // Determinar si passkey está disponible como método Y el browser lo soporta
  const passkeyAvailable =
    methods.includes('passkey') &&
    typeof window !== 'undefined' &&
    isWebAuthnSupported();

  const [mode, setMode] = useState<Mode>(passkeyAvailable ? 'passkey' : 'totp');
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  // Focus automatico al cambiar de modo
  useEffect(() => {
    if (mode === 'backup') {
      backupInputRef.current?.focus();
    }
  }, [mode]);

  const clearAndFocus = useCallback(() => {
    if (mode === 'totp') {
      setTotpCode('');
    } else if (mode === 'backup') {
      setBackupCode('');
      backupInputRef.current?.focus();
    }
  }, [mode]);

  // ─── Persistir sesión tras verificación con passkey ──────────

  const handlePasskeyAuthResponse = useCallback(
    (data: AuthResponse) => {
      // Persistir tokens en localStorage (mismo patrón que passkey.ts)
      if (typeof window !== 'undefined' && data.tokens) {
        localStorage.setItem('access_token', data.tokens.access);
        localStorage.setItem('refresh_token', data.tokens.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.tenant) {
          localStorage.setItem('tenant', JSON.stringify(data.tenant));
          const secure = window.location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = `tenant-slug=${data.tenant.slug}; path=/; SameSite=Lax${secure}`;
        }
      }
      // Sincronizar AuthContext
      setUser(data.user);
      setTenant(data.tenant ?? null);
    },
    [setUser, setTenant],
  );

  // ─── Verificar con passkey ───────────────────────────────────

  const handlePasskeyVerify = useCallback(async () => {
    setIsLoading(true);
    setPasskeyError(null);
    try {
      // 1. Obtener opciones de WebAuthn del backend
      const options = await getTwoFactorPasskeyOptions(challengeToken);

      // 2. Preparar opciones para el browser
      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: base64UrlToBuffer(options.challenge),
        timeout: options.timeout,
        rpId: options.rpId,
        userVerification: options.userVerification as UserVerificationRequirement | undefined,
        allowCredentials: options.allowCredentials?.map((c) => ({
          id: base64UrlToBuffer(c.id),
          type: c.type,
          transports: c.transports as AuthenticatorTransport[] | undefined,
        })),
      };

      // 3. Llamar al browser para obtener la assertion
      const cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
      if (!cred) throw new Error('Verificación cancelada');

      const assertion = cred.response as AuthenticatorAssertionResponse;

      // 4. Serializar respuesta al formato que espera py_webauthn
      const credentialJson = {
        id: cred.id,
        rawId: bufferToBase64Url(cred.rawId),
        type: cred.type,
        response: {
          clientDataJSON: bufferToBase64Url(assertion.clientDataJSON),
          authenticatorData: bufferToBase64Url(assertion.authenticatorData),
          signature: bufferToBase64Url(assertion.signature),
          userHandle: assertion.userHandle ? bufferToBase64Url(assertion.userHandle) : null,
        },
        clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
      };

      // 5. Verificar en backend
      const authData = await verifyTwoFactorPasskey({
        challenge_token: challengeToken,
        credential: credentialJson,
        scope: options._scope,
      });

      // 6. Persistir sesión y redirigir
      handlePasskeyAuthResponse(authData);
      toast.success('¡Bienvenido!');

      // Redirigir según estado del tenant
      let target = redirectTo;
      if (!target) {
        if (authData.tenant && !authData.tenant.modules_configured) {
          target = '/dashboard/setup';
        } else if (authData.tenant?.has_website && authData.tenant.website_status !== 'published') {
          target = '/dashboard/website-builder';
        } else {
          target = '/dashboard';
        }
      }
      router.push(target);
    } catch (error) {
      // El usuario canceló el prompt del browser — no es un error real
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setIsLoading(false);
        return;
      }
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'No se pudo verificar con passkey. Intenta con código.';
      setPasskeyError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [challengeToken, redirectTo, handlePasskeyAuthResponse, router]);

  // ─── Submit TOTP/backup ──────────────────────────────────────

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const rawCode = mode === 'totp' ? totpCode : backupCode.trim();

      if (mode === 'totp' && rawCode.length !== TOTP_LENGTH) {
        toast.error('Ingresa los 6 dígitos del código');
        return;
      }
      if (mode === 'backup' && !BACKUP_PATTERN.test(rawCode)) {
        toast.error('El código de respaldo debe tener el formato XXXX-XXXX');
        return;
      }

      setIsLoading(true);
      try {
        await completeTwoFactorChallenge(
          challengeToken,
          rawCode,
          redirectTo || undefined,
        );
        toast.success('¡Bienvenido!');
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'No pudimos verificar tu código. Intenta de nuevo.';
        toast.error(message);
        clearAndFocus();
      } finally {
        setIsLoading(false);
      }
    },
    [mode, totpCode, backupCode, challengeToken, completeTwoFactorChallenge, redirectTo, clearAndFocus],
  );

  const switchMode = (next: Mode) => {
    setMode(next);
    setTotpCode('');
    setBackupCode('');
    setPasskeyError(null);
  };

  // ─── Render: modo passkey ────────────────────────────────────

  if (mode === 'passkey') {
    return (
      <section aria-label="Verificación en dos pasos">
        <div className="mb-6">
          <h2
            className="text-[1.5rem] tracking-[-0.02em] mb-2"
            style={{
              color: 'var(--auth-primary)',
              fontWeight: 600,
              fontFamily: 'var(--auth-font-heading)',
            }}
          >
            Verifica tu identidad
          </h2>
          <p
            className="text-[0.85rem] leading-relaxed"
            style={{
              color: 'var(--auth-text-muted)',
              fontFamily: 'var(--auth-font-body)',
            }}
          >
            Usa tu passkey para verificar tu identidad de forma segura.
          </p>
        </div>

        <div className="space-y-5">
          {passkeyError && (
            <p
              className="text-[0.8rem] text-center"
              style={{ color: 'var(--auth-border-error, #EF4444)' }}
              role="alert"
            >
              {passkeyError}
            </p>
          )}

          <button
            type="button"
            onClick={handlePasskeyVerify}
            disabled={isLoading}
            className="flex h-[var(--auth-input-height,2.75rem)] w-full items-center justify-center gap-2.5 rounded-[var(--auth-radius-button,0.5rem)] border border-[var(--auth-border)] bg-[var(--auth-bg-input,#fff)] text-[0.95rem] font-medium transition-[background-color,border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out hover:bg-[#F9FAFB] hover:border-[var(--auth-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              color: 'var(--auth-text)',
              fontFamily: 'var(--auth-font-body)',
            }}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Fingerprint className="h-5 w-5" aria-hidden="true" />
            )}
            <span>{isLoading ? 'Verificando...' : 'Verificar con passkey'}</span>
          </button>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => switchMode('totp')}
              disabled={isLoading}
              className="text-[0.75rem] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm disabled:opacity-50"
              style={{ color: 'var(--auth-accent, #0D9488)' }}
            >
              Usar código de verificación
            </button>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="text-[0.8rem] font-medium hover:underline underline-offset-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm disabled:opacity-50"
            style={{ color: 'var(--auth-text-muted)' }}
          >
            Volver
          </button>
        </div>
      </section>
    );
  }

  // ─── Render: modo TOTP / backup ──────────────────────────────

  return (
    <section aria-label="Verificación en dos pasos">
      <div className="mb-6">
        <h2
          className="text-[1.5rem] tracking-[-0.02em] mb-2"
          style={{
            color: 'var(--auth-primary)',
            fontWeight: 600,
            fontFamily: 'var(--auth-font-heading)',
          }}
        >
          Verifica tu identidad
        </h2>
        <p
          className="text-[0.85rem] leading-relaxed"
          style={{
            color: 'var(--auth-text-muted)',
            fontFamily: 'var(--auth-font-body)',
          }}
        >
          {mode === 'totp'
            ? 'Ingresa el código de 6 dígitos de tu app de autenticación para continuar.'
            : 'Ingresa uno de tus códigos de respaldo (formato XXXX-XXXX).'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {mode === 'totp' ? (
          <div className="space-y-2">
            <span className={LABEL_CLASS} style={LABEL_STYLE}>
              Código de verificación
            </span>
            <OtpInput
              value={totpCode}
              onChange={setTotpCode}
              disabled={isLoading}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label
              htmlFor="backup-code"
              className={LABEL_CLASS}
              style={LABEL_STYLE}
            >
              Código de respaldo
            </label>
            <input
              id="backup-code"
              ref={backupInputRef}
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              placeholder="XXXX-XXXX"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              maxLength={9}
              aria-required="true"
              className="h-[var(--auth-input-height)] w-full rounded-[var(--auth-radius-input)] border border-[var(--auth-border)] bg-[var(--auth-bg-input)] px-3 text-center text-[0.95rem] tracking-[0.2em] font-mono text-[var(--auth-text)] placeholder:text-[var(--auth-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 focus-visible:outline-none"
            />
          </div>
        )}

        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => switchMode(mode === 'totp' ? 'backup' : 'totp')}
            className="text-[0.75rem] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
            style={{ color: 'var(--auth-accent, #0D9488)' }}
          >
            {mode === 'totp'
              ? 'Usar código de respaldo'
              : 'Usar código de la app'}
          </button>
          {passkeyAvailable && (
            <button
              type="button"
              onClick={() => switchMode('passkey')}
              className="text-[0.75rem] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
              style={{ color: 'var(--auth-accent, #0D9488)' }}
            >
              Verificar con passkey
            </button>
          )}
        </div>

        <div className="pt-2">
          <SubmitButton isLoading={isLoading} loadingLabel="Verificando...">
            Verificar
          </SubmitButton>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="text-[0.8rem] font-medium hover:underline underline-offset-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm disabled:opacity-50"
          style={{ color: 'var(--auth-text-muted)' }}
        >
          Volver
        </button>
      </div>
    </section>
  );
}
