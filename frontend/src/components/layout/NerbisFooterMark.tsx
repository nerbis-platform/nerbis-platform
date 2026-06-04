// src/components/layout/NerbisFooterMark.tsx
// Discreet NERBIS platform signature for construction-phase clean layouts.
// Just the Pipe isotype, centered at the bottom — no bar, no wordmark, no text.
// The tenant's own brand lives at the top (see BrandHeader); NERBIS only signs
// quietly here so the workspace still feels like the tenant's business.

'use client';

import { PipeStatic } from '@/components/pipe-avatar';
import { cn } from '@/lib/utils';

interface NerbisFooterMarkProps {
  className?: string;
  size?: number;
}

export function NerbisFooterMark({ className, size = 40 }: NerbisFooterMarkProps) {
  return (
    <div className={cn('flex justify-center py-8', className)}>
      <span
        className="opacity-50 transition-opacity duration-[var(--duration-fast)] hover:opacity-100"
        aria-label="NERBIS"
      >
        <PipeStatic size={size} />
      </span>
    </div>
  );
}
