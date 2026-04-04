// src/components/auth/AuthSplitScreenV2.tsx
// Auth orchestrator: split-screen layout with BrandPanel + modular form components.

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { BrandPanel } from './BrandPanel';
import { TabletBrandPanel } from './TabletBrandPanel';
import { MobileBrandHeader } from './MobileBrandHeader';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { useReducedMotion } from './hooks';
import type { AuthMode, AuthPrefill } from './types';

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
  const [registerPrefill, setRegisterPrefill] = useState<AuthPrefill | null>(null);
  const formPanelRefDesktop = useRef<HTMLDivElement>(null);
  const formPanelRefTablet = useRef<HTMLDivElement>(null);
  const formPanelRefMobile = useRef<HTMLDivElement>(null);
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
  const goToLogin = useCallback(() => { setRegisterPrefill(null); switchMode('login'); }, [switchMode]);
  const goToRegister = useCallback(() => switchMode('register'), [switchMode]);
  const goToForgot = useCallback(() => switchMode('forgot'), [switchMode]);

  const handleSwitchToRegister = useCallback((prefill: AuthPrefill) => {
    setRegisterPrefill(prefill);
    switchMode('register');
  }, [switchMode]);

  // ── Focus first input after mode switch animation
  useEffect(() => {
    if (!contentVisible || isTransitioning) return;

    // Pick the visible ref based on current viewport
    const activeRef =
      formPanelRefDesktop.current?.offsetParent !== null
        ? formPanelRefDesktop
        : formPanelRefTablet.current?.offsetParent !== null
          ? formPanelRefTablet
          : formPanelRefMobile;

    if (!activeRef.current) return;

    const firstInput = activeRef.current.querySelector<HTMLInputElement>(
      'input:not([type="hidden"]):not([disabled])',
    );
    if (firstInput) {
      const timer = setTimeout(() => firstInput.focus(), 50);
      return () => clearTimeout(timer);
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

  // ── Shared form content (avoid duplication across layouts)
  const formContent = (
    <>
      {mode === 'login' && (
        <LoginForm
          onToggleMode={goToRegister}
          onForgotPassword={goToForgot}
          redirectTo={redirectTo}
          onSwitchToRegister={handleSwitchToRegister}
        />
      )}

      {mode === 'register' && (
        <RegisterForm
          onToggleMode={goToLogin}
          initialPrefill={registerPrefill}
        />
      )}

      {mode === 'forgot' && (
        <ForgotPasswordForm onGoToLogin={goToLogin} />
      )}
    </>
  );

  return (
    <div data-auth-animated>
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* ═══════ DESKTOP (lg+) ═══════ */}
      <div className="hidden lg:flex min-h-screen w-full">
        {/* Left: Full brand panel */}
        <aside
          className="w-[45%] xl:w-[42%]"
          aria-hidden="true"
        >
          <BrandPanel />
        </aside>

        {/* Right: Form panel */}
        <main
          className="relative flex w-[55%] flex-1 flex-col items-center justify-center xl:w-[58%]"
          style={{ background: 'var(--auth-bg, #FAFAFA)' }}
        >
          <div
            ref={formPanelRefDesktop}
            className="w-full max-w-md px-12"
            style={formTransitionStyle}
          >
            {formContent}
          </div>
        </main>
      </div>

      {/* ═══════ TABLET (md–lg) ═══════ */}
      <div className="hidden md:flex lg:hidden min-h-screen w-full">
        {/* Left: Condensed brand panel */}
        <aside
          className="w-[38%]"
          aria-hidden="true"
        >
          <TabletBrandPanel />
        </aside>

        {/* Right: Form panel */}
        <main
          className="relative flex w-[62%] flex-1 flex-col items-center justify-center"
          style={{ background: 'var(--auth-bg, #FAFAFA)' }}
        >
          <div
            ref={formPanelRefTablet}
            className="w-full max-w-md px-8"
            style={formTransitionStyle}
          >
            {formContent}
          </div>
        </main>
      </div>

      {/* ═══════ MOBILE (<md) ═══════ */}
      <div className="flex flex-col h-screen md:hidden">
        {/* Branded header — sticky at top */}
        <div className="sticky top-0 z-20 shrink-0">
          <MobileBrandHeader />
        </div>

        {/* Form panel — scrollable */}
        <main
          className="flex flex-1 flex-col items-center overflow-y-auto overscroll-contain"
          style={{
            background: 'linear-gradient(180deg, #F5F7FA 0%, var(--auth-bg, #FAFAFA) 100%)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div
            ref={formPanelRefMobile}
            className="w-full max-w-md px-5 py-6 sm:px-8 sm:py-8"
            style={formTransitionStyle}
          >
            {formContent}
          </div>
        </main>
      </div>
    </div>
  );
}
