// src/components/layout/BrandLogo.tsx

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useWebsiteContent } from '@/contexts/WebsiteContentContext';

// Fallbacks from env vars (used only when tenant data isn't available)
const envName = process.env.NEXT_PUBLIC_APP_NAME || 'Mi Negocio';
const envLogo = process.env.NEXT_PUBLIC_APP_LOGO || null;
const envLogoOnly = process.env.NEXT_PUBLIC_LOGO_ONLY === 'true';

interface BrandLogoProps {
  className?: string;
  linkClassName?: string;
  imageClassName?: string;
  textClassName?: string;
  href?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: {
    image: { width: 100, height: 32 },
    text: 'text-lg',
  },
  md: {
    image: { width: 140, height: 40 },
    text: 'text-2xl',
  },
  lg: {
    image: { width: 220, height: 64 },
    text: 'text-4xl',
  },
  xl: {
    image: { width: 260, height: 72 },
    text: 'text-5xl',
  },
};

/**
 * Hook interno para obtener los datos de branding del tenant.
 * Prioriza: website media > tenant context > env vars
 */
function useBrandData() {
  const website = useWebsiteContent();

  // Priority 1: Published website media (logo from the builder)
  if (website?.has_website && website.status === 'published' && website.media?.logo_url) {
    const logoText = website.content?.header?.logo_text;
    return {
      name: logoText || envName,
      logo: website.media.logo_url,
      logoOnly: true, // builder logos are typically image-only
      isExternal: true, // external URL, use <img> instead of next/image
    };
  }

  // Priority 2: Env vars (fallback)
  return {
    name: envName,
    logo: envLogo,
    logoOnly: envLogoOnly,
    isExternal: false,
  };
}

export function BrandLogo({
  className,
  linkClassName,
  imageClassName,
  textClassName,
  href = '/',
  size = 'md',
}: BrandLogoProps) {
  const { name, logo, logoOnly, isExternal } = useBrandData();
  const sizeConfig = sizes[size];

  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      {logo && (
        isExternal ? (
          // External URL (from builder/media) — use plain img
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={name}
            className={cn('h-auto w-auto object-contain', imageClassName)}
            style={{
              maxWidth: sizeConfig.image.width,
              maxHeight: sizeConfig.image.height,
            }}
          />
        ) : (
          // Local asset — use next/image
          <Image
            src={logo}
            alt={name}
            width={sizeConfig.image.width}
            height={sizeConfig.image.height}
            className={cn('h-auto w-auto object-contain', imageClassName)}
            priority
          />
        )
      )}

      {(!logoOnly || !logo) && (
        <span
          className={cn(
            'font-bold text-primary',
            sizeConfig.text,
            textClassName
          )}
        >
          {name}
        </span>
      )}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className={cn('flex items-center', linkClassName)}>
      {content}
    </Link>
  );
}

// Keep backwards compat for other components that import brandConfig
export const brandConfig = {
  name: envName,
  logo: envLogo,
  logoOnly: envLogoOnly,
};
