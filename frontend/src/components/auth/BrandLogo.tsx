// src/components/auth/BrandLogo.tsx
// NERBIS brand logo for the auth brand panel.

import Image from 'next/image';

interface BrandLogoProps {
  /** Logo image size in pixels. Defaults to 34. */
  size?: number;
  /** Additional CSS class names for the container. */
  className?: string;
}

export function BrandLogo({ size = 34, className = '' }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      <Image
        src="/Isotipo_color_NERBIS.png"
        alt=""
        width={size}
        height={size}
        className="brightness-0 invert g-pendulum"
        aria-hidden="true"
        priority
      />
      <span
        className="text-[1.15rem] tracking-[0.18em] text-[var(--auth-text-on-dark)]"
        style={{
          fontFamily: 'var(--auth-font-brand)',
          fontWeight: 800,
        }}
        aria-label="NERBIS"
      >
        NERBIS
      </span>
    </div>
  );
}
