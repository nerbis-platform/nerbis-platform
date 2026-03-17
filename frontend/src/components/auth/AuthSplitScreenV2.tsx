// src/components/auth/AuthSplitScreenV2.tsx
// V2 orchestrator: split-screen layout with BrandPanel + modular form components.
// Feature-flagged via NEXT_PUBLIC_USE_NEW_AUTH. Does NOT replace V1 — coexists.

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { BrandPanel } from './BrandPanel';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { useReducedMotion } from './hooks';
import type { AuthMode } from './types';

// ─── Props ──────────────────────────────────────────────────────

interface AuthSplitScreenV2Props {
  initialMode?: AuthMode;
  redirectTo?: string | null;
}

// ─── Component ──────────────────────────────────────────────────

export default function AuthSplitScreenV2({
  initialMode = 'login',
  redirectTo = null,
}: AuthSplitScreenV2Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const formPanelRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Screen-reader live region for mode announcements
  const [announcement, setAnnouncement] = useState('');

  // ── Mode announcement for screen readers
  const announceMode = useCallback((m: AuthMode) => {
    const labels: Record<AuthMode, string> = {
      login: 'Formulario de inicio de sesión',
      register: 'Formulario de registro',
      forgot: 'Recuperar contraseña',
    };
    setAnnouncement(labels[m]);
  }, []);

  // ── Mode switching with animation
  const switchMode = useCallback(
    (newMode: AuthMode) => {
      if (newMode === mode || isTransitioning) return;

      if (prefersReducedMotion) {
        setMode(newMode);
        announceMode(newMode);
        return;
      }

      // Phase 1: fade out current form
      setIsTransitioning(true);
      setContentVisible(false);

      // Phase 2: after fade-out, swap content and fade in
      setTimeout(() => {
        setMode(newMode);
        announceMode(newMode);

        // Small delay to allow React to render the new form before fading in
        requestAnimationFrame(() => {
          setContentVisible(true);
          setTimeout(() => {
            setIsTransitioning(false);
          }, 300);
        });
      }, 200);
    },
    [mode, isTransitioning, prefersReducedMotion, announceMode],
  );

  // ── Navigation callbacks
  const goToLogin = useCallback(() => switchMode('login'), [switchMode]);
  const goToRegister = useCallback(() => switchMode('register'), [switchMode]);
  const goToForgot = useCallback(() => switchMode('forgot'), [switchMode]);

  // ── Focus first input after mode switch animation
  useEffect(() => {
    if (contentVisible && !isTransitioning && formPanelRef.current) {
      const firstInput = formPanelRef.current.querySelector<HTMLInputElement>(
        'input:not([type="hidden"]):not([disabled])',
      );
      if (firstInput) {
        // Slight delay to let CSS transitions settle
        const timer = setTimeout(() => firstInput.focus(), 50);
        return () => clearTimeout(timer);
      }
    }
  }, [mode, contentVisible, isTransitioning]);

  // ── Transition styles
  const formTransitionStyle = prefersReducedMotion
    ? {}
    : {
        opacity: contentVisible ? 1 : 0,
        transform: contentVisible ? 'translateY(0)' : 'translateY(8px)',
        transition: contentVisible
          ? 'opacity 300ms ease-out, transform 300ms ease-out'
          : 'opacity 200ms ease-out, transform 200ms ease-out',
      };

  return (
    <div className="flex min-h-screen w-full" data-auth-animated>
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* ─── Left: Brand Panel (hidden on mobile) ─── */}
      <aside
        className="hidden lg:flex lg:w-[45%] xl:w-[42%]"
        aria-hidden="true"
      >
        <BrandPanel />
      </aside>

      {/* ─── Right: Form Panel ─── */}
      <main
        role="main"
        className="relative flex w-full flex-1 flex-col items-center justify-center lg:w-[55%] xl:w-[58%]"
        style={{ background: 'var(--auth-bg, #FAFAFA)' }}
      >
        {/* Mobile branded header (visible only below lg) */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-2.5 py-6 lg:hidden">
          <Image
            src="/Isotipo_color_NERBIS.png"
            alt=""
            width={28}
            height={28}
            aria-hidden="true"
            priority
          />
          <span
            className="text-[1rem] tracking-[0.16em]"
            style={{
              fontFamily: 'var(--auth-font-brand)',
              fontWeight: 800,
              color: 'var(--auth-primary)',
            }}
          >
            NERBIS
          </span>
        </div>

        {/* Form container */}
        <div
          ref={formPanelRef}
          className="w-full max-w-md px-5 py-8 sm:px-8 lg:px-12 lg:py-0"
          style={formTransitionStyle}
        >
          {mode === 'login' && (
            <LoginForm
              onToggleMode={goToRegister}
              onForgotPassword={goToForgot}
              redirectTo={redirectTo}
            />
          )}

          {mode === 'register' && (
            <RegisterForm
              onToggleMode={goToLogin}
            />
          )}

          {mode === 'forgot' && (
            <ForgotPasswordForm onGoToLogin={goToLogin} />
          )}
        </div>
      </main>
    </div>
  );
}
