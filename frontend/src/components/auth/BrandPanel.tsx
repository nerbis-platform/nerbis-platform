// src/components/auth/BrandPanel.tsx
// Premium brand storytelling panel for the auth split-screen layout.
// Shown on lg+ breakpoints only. Contains logo, carousel, and subtle footer.

'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { BrandLogo } from './BrandLogo';
import { BrandCarousel } from './BrandCarousel';
import { brandSlides } from './brand-content';
import { AUTH_GRADIENT, AUTH_RADIAL_GLOW } from './constants';

export function BrandPanel() {
  const panelRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!panelRef.current) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduced: '(prefers-reduced-motion: reduce)',
        normal: '(prefers-reduced-motion: no-preference)',
      },
      (context) => {
        const { reduced } = context.conditions as { reduced: boolean; normal: boolean };

        if (reduced) {
          gsap.set('.brand-logo, .brand-carousel, .brand-footer', { autoAlpha: 1 });
          return;
        }

        // Subtle staggered entrance for brand panel content
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          delay: 0.2,
        });

        tl.from('.brand-logo', { y: 20, autoAlpha: 0, duration: 0.5 })
          .from('.brand-carousel', { y: 30, autoAlpha: 0, duration: 0.6 }, '-=0.3')
          .from('.brand-footer', { autoAlpha: 0, duration: 0.4 }, '-=0.2');
      }
    );
  }, { scope: panelRef });

  return (
    <aside
      ref={panelRef}
      className="nerbis-grain relative flex h-full flex-col justify-between overflow-hidden px-12 py-10 xl:px-16"
      style={{ background: AUTH_GRADIENT }}
      role="complementary"
      aria-label="Información de NERBIS"
      data-auth-animated
    >
      {/* Radial glow overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: AUTH_RADIAL_GLOW }}
        aria-hidden="true"
      />

      {/* Top section: Logo */}
      <div className="brand-logo invisible relative z-10">
        <BrandLogo />
      </div>

      {/* Center section: Carousel */}
      <div className="brand-carousel invisible relative z-10 flex-1 flex items-center">
        <div className="w-full">
          <BrandCarousel slides={brandSlides} interval={5000} />
        </div>
      </div>

      {/* Bottom section: Subtle footer */}
      <div className="brand-footer invisible relative z-10">
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
