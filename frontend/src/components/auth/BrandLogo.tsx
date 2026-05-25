// src/components/auth/BrandLogo.tsx
// NERBIS brand logo for the auth brand panel.

'use client';

import { PipeStatic } from '@/components/pipe-avatar';

interface BrandLogoProps {
  /** Pipe avatar size in pixels. Defaults to 34. */
  size?: number;
  /** Additional CSS class names for the container. */
  className?: string;
}

export function BrandLogo({ size = 34, className = '' }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      <PipeStatic size={size} />
      <span
        className="text-[1.15rem] tracking-[var(--tracking-display)] text-[var(--auth-text-on-dark)]"
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
