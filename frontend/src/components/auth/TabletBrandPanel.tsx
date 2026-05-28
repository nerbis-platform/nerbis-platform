// src/components/auth/TabletBrandPanel.tsx
// Condensed brand panel for tablet (md–lg) breakpoint.
// Shows video background, logo, single carousel slide, and footer in a narrower column.

'use client';

import { BrandLogo } from './BrandLogo';
import { BrandCarousel } from './BrandCarousel';
import { brandSlides } from './brand-content';
import { AUTH_GRADIENT } from './constants';

export function TabletBrandPanel() {
  return (
    <aside
      className="relative flex h-full flex-col justify-between overflow-hidden px-8 py-8"
      role="complementary"
      aria-label="Información de NERBIS"
    >
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      >
        <source src="/images/auth-brand-bg.mp4" type="video/mp4" />
      </video>

      {/* Gradient overlay for text legibility */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: AUTH_GRADIENT,
          opacity: 0.65,
        }}
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
