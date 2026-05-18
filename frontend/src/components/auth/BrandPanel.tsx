// src/components/auth/BrandPanel.tsx
// Premium brand storytelling panel for the auth split-screen layout.
// Shown on lg+ breakpoints only. Contains logo, carousel, and subtle footer.

'use client';

import { BrandLogo } from './BrandLogo';
import { BrandCarousel } from './BrandCarousel';
import { brandSlides } from './brand-content';
import { AUTH_GRADIENT, AUTH_RADIAL_GLOW } from './constants';

export function BrandPanel() {
  return (
    <aside
      className="relative flex h-full flex-col justify-between overflow-hidden px-12 py-10 xl:px-16"
      style={{ background: AUTH_GRADIENT }}
      aria-hidden="true"
      data-auth-animated
    >
      {/* Radial glow overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: AUTH_RADIAL_GLOW }}
        aria-hidden="true"
      />

      {/* NERBIS signature: warm grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '182px',
        }}
        aria-hidden="true"
      />

      {/* Top section: Logo */}
      <div className="relative z-10">
        <BrandLogo />
      </div>

      {/* Center section: Carousel */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="w-full">
          <BrandCarousel slides={brandSlides} interval={5000} />
        </div>
      </div>

      {/* Bottom section: Subtle footer */}
      <div className="relative z-10">
        <p
          className="text-[0.7rem] tracking-wider text-[var(--auth-text-on-dark-subtle)]"
          style={{ fontFamily: 'var(--auth-font-body)' }}
        >
          &copy; {new Date().getFullYear()} NERBIS. Todos los derechos reservados.
        </p>
      </div>
    </aside>
  );
}
