// src/components/layout/BrandHeader.tsx
// Tenant store brand shown at the TOP of the dashboard construction layouts
// (settings, setup, website-builder). During the build phase we surface the
// tenant's own store name so the workspace feels like *their* business.
// NERBIS signs discreetly in the footer (see NerbisFooterMark) — never here.

import { Store } from 'lucide-react';

interface BrandHeaderProps {
  tenantName?: string;
}

export function BrandHeader({ tenantName }: BrandHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <Store className="size-4" />
      </span>
      <span className="max-w-[200px] truncate text-sm font-semibold text-foreground">
        {tenantName || 'Mi negocio'}
      </span>
    </div>
  );
}
