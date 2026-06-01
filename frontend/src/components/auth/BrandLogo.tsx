// src/components/auth/BrandLogo.tsx
// NERBIS brand logo for the auth brand panel — clickable link to home.

'use client';

import Link from 'next/link';
import { PipeStatic } from '@/components/pipe-avatar';

interface BrandLogoProps {
  /** Pipe avatar size in pixels. Defaults to 34. */
  size?: number;
  /** Additional CSS class names for the container. */
  className?: string;
  /** Whether the logo links to home. Defaults to true. */
  linkToHome?: boolean;
  /** Use dark text (for light backgrounds). Defaults to false (white text). */
  dark?: boolean;
}

export function BrandLogo({ size = 34, className = '', linkToHome = true, dark = false }: BrandLogoProps) {
  const content = (
    <div className={`flex items-center gap-3.5 ${className}`}>
      <PipeStatic size={size} />
      <span
        className={`text-[1.15rem] tracking-[var(--tracking-display)] ${dark ? 'text-[var(--auth-primary)]' : 'text-[var(--auth-text-on-dark)]'}`}
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

  if (!linkToHome) return content;

  return (
    <Link
      href="/"
      className="inline-flex transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
      aria-label="Ir a la página principal de NERBIS"
    >
      {content}
    </Link>
  );
}
