// src/app/(platform)/admin/login/page.tsx
//
// Platform superadmin login. Dark teal branded design, security-focused.
// NO tenant input, NO social buttons, NO register link.
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PipeAdmin } from '@/components/pipe-avatar';
import { AlertTriangle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export default function AdminLoginPage() {
  const { login, isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockInfo, setBlockInfo] = useState<{
    reason: string;
    blocked_until: string | null;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Iniciar sesión — NERBIS Admin';
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBlockInfo(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      let message = 'Credenciales invalidas. Verifica tu correo y contrasena.';

      // Check for block_reason in the error response data
      const errData = (err && typeof err === 'object' && 'data' in err)
        ? (err as { data?: { block_reason?: string; blocked_until?: string | null; detail?: string } }).data
        : undefined;

      if (errData?.block_reason) {
        setBlockInfo({
          reason: errData.block_reason,
          blocked_until: errData.blocked_until ?? null,
        });
        // Don't set a generic error — the block info alert handles the display
        setSubmitting(false);
        return;
      }

      if (errData?.detail) {
        message = errData.detail;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background — warm dark graphite */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #1C1917 0%, #1C1917 40%, #231F1E 70%, #1C1917 100%)',
        }}
      />

      {/* Subtle grain texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '182px',
        }}
      />

      {/* Subtle warm glow */}
      <div
        className="absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: 'radial-gradient(circle, #4A7DA8, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-48 -left-32 h-[30rem] w-[30rem] rounded-full opacity-[0.05] blur-3xl"
        style={{ background: 'radial-gradient(circle, #4A7DA8, transparent 70%)' }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-6 sm:py-12">
        {/* Logo / brand mark */}
        <div className="fade-up-auth mb-4 flex flex-col items-center gap-3 sm:mb-8">
          <PipeAdmin size={56} />
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-[-0.02em] text-white">
              NERBIS <span className="text-base font-medium tracking-normal text-teal-300/80">Admin</span>
            </h1>
          </div>
        </div>

        {/* Login card */}
        <div className="fade-up-auth w-full max-w-sm" style={{ animationDelay: '80ms' }}>
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              noValidate
              aria-describedby={error ? 'admin-login-error' : undefined}
            >
              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="admin-email"
                  className="block text-xs font-medium uppercase tracking-wider text-white/60"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    id="admin-email"
                    type="email"
                    name="email"
                    autoComplete="username"
                    required
                    disabled={submitting}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@nerbis.com"
                    className="admin-login-input h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-10 pr-4 text-sm text-white placeholder:text-white/25 transition-colors duration-200 focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-medium uppercase tracking-wider text-white/60"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    disabled={submitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="admin-login-input h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-10 pr-11 text-sm text-white placeholder:text-white/25 transition-colors duration-200 focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 transition-colors hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Block info */}
              {blockInfo && (
                <div
                  role="alert"
                  className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <div className="flex flex-col gap-1">
                      <p>Tu cuenta esta bloqueada. Motivo: {blockInfo.reason}</p>
                      {blockInfo.blocked_until && (
                        <p className="text-xs text-amber-300/80">
                          Se desbloqueara el:{' '}
                          {new Date(blockInfo.blocked_until).toLocaleString('es-CO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  id="admin-login-error"
                  role="alert"
                  className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !email || !password}
                className="relative flex h-11 w-full items-center justify-center rounded-xl bg-teal-500 text-sm font-medium text-white shadow-lg shadow-teal-500/25 transition-all duration-200 hover:bg-teal-400 hover:shadow-teal-400/30 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:ring-offset-2 focus:ring-offset-[#1C1917] disabled:opacity-40 disabled:shadow-none disabled:hover:bg-teal-500"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-white/50">
            Acceso exclusivo para administradores de la plataforma.
          </p>
        </div>
      </div>
    </div>
  );
}
