// src/components/auth/TabletBrandPanel.tsx
// Condensed brand panel for tablet (md–lg) breakpoint.
// Shows logo, single carousel slide, and footer in a narrower column.

'use client';

import { BrandLogo } from './BrandLogo';
import { BrandCarousel } from './BrandCarousel';
import { brandSlides } from './brand-content';
import { AUTH_GRADIENT, AUTH_RADIAL_GLOW } from './constants';

export function TabletBrandPanel() {
  return (
    <aside
      className="nerbis-grain relative flex h-full flex-col justify-between overflow-hidden px-8 py-8"
      style={{ background: AUTH_GRADIENT }}
      role="complementary"
      aria-label="Información de NERBIS"
    >
      {/* Radial glow overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: AUTH_RADIAL_GLOW }}
        aria-hidden="true"
      />

      {/* Top: Logo */}
      <div className="relative z-10">
        <BrandLogo size={28} />
      </div>

      {/* Center: Carousel (compact) */}
      <div className="relative z-10 flex flex-1 items-center">
        <div className="w-full">
          <BrandCarousel slides={brandSlides} interval={5000} />
        </div>
      </div>

      {/* Bottom: Footer */}
      <div className="relative z-10">
        <p
          className="text-[0.65rem] tracking-wider text-[var(--auth-text-on-dark-subtle)]"
          style={{ fontFamily: 'var(--auth-font-body)' }}
        >
          &copy; {new Date().getFullYear()} NERBIS
        </p>
      </div>
    </aside>
  );
}
