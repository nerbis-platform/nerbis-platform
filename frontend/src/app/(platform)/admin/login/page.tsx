// src/app/(platform)/admin/login/page.tsx
//
// Platform superadmin login. Dark teal branded design, security-focused.
// NO tenant input, NO social buttons, NO register link.
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export default function AdminLoginPage() {
  const { login, isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      let message = 'Credenciales inválidas.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { data?: { detail?: string } };
        };
        message = axiosErr.response?.data?.detail ?? message;
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
      {/* Background — dark teal gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #0f2233 0%, #1C3B57 35%, #1a4a5e 65%, #1C3B57 100%)',
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Radial glow accents */}
      <div
        className="absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #0D9488, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-48 -left-32 h-[30rem] w-[30rem] rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #0D9488, transparent 70%)' }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Logo / brand mark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-lg shadow-black/10 ring-1 ring-white/20 backdrop-blur-sm">
            <Image
              src="/Isotipo_color_NERBIS.png"
              alt=""
              width={32}
              height={32}
              className="brightness-0 invert"
              aria-hidden="true"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-[0.15em] text-white">
              NERBIS
            </h1>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-white/40">
              Panel de plataforma
            </p>
          </div>
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-8 shadow-2xl shadow-black/20 backdrop-blur-xl">
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
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
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
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-10 pr-4 text-sm text-white placeholder:text-white/25 transition-colors duration-200 focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20 disabled:opacity-50"
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
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    disabled={submitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-10 pr-11 text-sm text-white placeholder:text-white/25 transition-colors duration-200 focus:border-teal-400/50 focus:outline-none focus:ring-2 focus:ring-teal-400/20 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
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
                className="relative flex h-11 w-full items-center justify-center rounded-xl bg-teal-500 text-sm font-medium text-white shadow-lg shadow-teal-500/25 transition-all duration-200 hover:bg-teal-400 hover:shadow-teal-400/30 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:ring-offset-2 focus:ring-offset-[#1C3B57] disabled:opacity-40 disabled:shadow-none disabled:hover:bg-teal-500"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-white/30">
            Acceso exclusivo para superadministradores de la plataforma.
          </p>
        </div>
      </div>
    </div>
  );
}
