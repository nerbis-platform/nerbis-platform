'use client';

import type { SectionData } from '@/contexts/WebsiteContentContext';
import Link from 'next/link';

// ─── SVG Icons ─────────────────────────────────────────────
export const SERVICE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

export const PRODUCT_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
  </svg>
);

export const CONTACT_ICONS: Record<string, React.ReactNode> = {
  phone: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  email: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>,
  address: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
  whatsapp: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
  hours: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
};

export const CONTACT_LABELS: Record<string, string> = {
  phone: 'Teléfono',
  email: 'Email',
  address: 'Dirección',
  whatsapp: 'WhatsApp',
  hours: 'Horario',
};

export const CHECK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const CONTACT_KEYS = ['phone', 'email', 'address', 'whatsapp', 'hours'] as const;

// ─── Shared Components ────────────────────────────────────

export function UnsplashAttribution({ image, className = 'hero-attribution' }: { image?: SectionData; className?: string }) {
  if (!image?.photographer) return null;
  return (
    <span className={className}>
      Foto: <a href={`${image.photographer_url}?utm_source=nerbis&utm_medium=referral`} target="_blank" rel="noopener noreferrer">{image.photographer}</a> / <a href="https://unsplash.com?utm_source=nerbis&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a>
    </span>
  );
}

export function HeroButtons({ data }: { data: SectionData }) {
  const cta = data.cta_text;
  const ctaLink = data.cta_link || '#contact';
  const cta2 = data.cta_secondary_text;
  const cta2Link = data.cta_secondary_link || '#about';

  if (!cta && !cta2) return null;

  return (
    <div className="hero-buttons">
      {cta && <a href={ctaLink} className="btn btn-secondary">{cta}</a>}
      {cta2 && <a href={cta2Link} className="btn btn-outline">{cta2}</a>}
    </div>
  );
}

export function SectionCTA({ text, href }: { text: string; href: string }) {
  return (
    <div className="section-cta">
      <Link href={href} className="btn btn-primary">
        {text} &rarr;
      </Link>
    </div>
  );
}

export function AboutHighlights({ highlights }: { highlights?: (string | SectionData)[] }) {
  if (!highlights?.length) return null;
  return (
    <div className="about-highlights">
      {highlights.map((h, i) => {
        const text = typeof h === 'string' ? h : h.text || String(h);
        return (
          <div key={i} className="highlight">
            <div className="highlight-icon">{CHECK_ICON}</div>
            <span>{text}</span>
          </div>
        );
      })}
    </div>
  );
}

export function getWhatsAppLink(data: SectionData) {
  const raw = data.whatsapp || data.phone || '';
  const digits = raw.replace(/[^\d+]/g, '');
  return digits ? `https://wa.me/${digits.replace(/^\+/, '')}` : null;
}
