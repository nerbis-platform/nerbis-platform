// src/components/auth/TabletBrandPanel.tsx
// Condensed brand panel for tablet (md–lg) breakpoint.
// Animated mesh gradient background + logo, carousel slide, footer.

'use client';

import { BrandCarousel } from './BrandCarousel';
import { brandSlides } from './brand-content';

export function TabletBrandPanel() {
  return (
    <aside
      className="auth-mesh-gradient nerbis-grain relative flex h-full flex-col justify-between overflow-hidden px-8 py-8"
      role="complementary"
      aria-label="Información de NERBIS"
    >
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
