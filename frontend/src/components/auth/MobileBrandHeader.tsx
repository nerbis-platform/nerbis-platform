// src/components/auth/MobileBrandHeader.tsx
// Ultra-compact branded header for mobile auth screens.
// Shows gradient background with logo + tagline only — keeps form accessible fast.

'use client';

import { BrandLogo } from './BrandLogo';
import { AUTH_GRADIENT, AUTH_RADIAL_GLOW } from './constants';

export function MobileBrandHeader() {
  return (
    <div
      className="relative overflow-hidden px-6 py-5 sm:px-8 sm:py-6"
      style={{ background: AUTH_GRADIENT }}
    >
      {/* Radial glow overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: AUTH_RADIAL_GLOW }}
        aria-hidden="true"
      />

      {/* Logo + tagline in one compact block */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <BrandLogo size={28} />
        </div>
        <p
          className="text-[0.65rem] sm:text-[0.7rem] tracking-[0.04em] text-[var(--auth-text-on-dark-subtle)] text-right"
          style={{ fontFamily: 'var(--auth-font-body)' }}
        >
          Tu negocio digital, en minutos
        </p>
      </div>
    </div>
  );
}
