// src/components/layout/BrandHeader.tsx
// NERBIS platform header with optional tenant name indicator.
// Used in dashboard clean layouts: settings, setup, website-builder.

import Image from 'next/image';

interface BrandHeaderProps {
  tenantName?: string;
}

export function BrandHeader({ tenantName }: BrandHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/Isotipo_color_NERBIS.png"
        alt="Nerbis"
        width={36}
        height={36}
      />
      <span
        className="text-[0.85rem] font-semibold tracking-wide"
        style={{ color: '#1C3B57' }}
      >
        NERBIS
      </span>
      {tenantName && (
        <>
          <span className="text-gray-300 text-[0.75rem]" aria-hidden="true">·</span>
          <span className="text-[0.8rem] text-gray-500 font-medium truncate max-w-[160px]">
            {tenantName}
          </span>
        </>
      )}
    </div>
  );
}
