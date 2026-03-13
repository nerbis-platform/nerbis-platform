'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SectionData } from '@/contexts/WebsiteContentContext';
import Link from 'next/link';
import { useCountUp, parseStatValue } from './useCountUp';

// ─── SVG Icons (from Python renderer) ─────────────────────
const SERVICE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const PRODUCT_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
  </svg>
);

const CONTACT_ICONS: Record<string, React.ReactNode> = {
  phone: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  email: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>,
  address: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
  whatsapp: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
  hours: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
};

const CONTACT_LABELS: Record<string, string> = {
  phone: 'Teléfono',
  email: 'Email',
  address: 'Dirección',
  whatsapp: 'WhatsApp',
  hours: 'Horario',
};

const CHECK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

// ─── Shared Components ────────────────────────────────────

function UnsplashAttribution({ image, className = 'hero-attribution' }: { image?: SectionData; className?: string }) {
  if (!image?.photographer) return null;
  return (
    <span className={className}>
      Foto: <a href={`${image.photographer_url}?utm_source=nerbis&utm_medium=referral`} target="_blank" rel="noopener noreferrer">{image.photographer}</a> / <a href="https://unsplash.com?utm_source=nerbis&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a>
    </span>
  );
}

function HeroButtons({ data }: { data: SectionData }) {
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

function SectionCTA({ text, href }: { text: string; href: string }) {
  return (
    <div className="section-cta">
      <Link href={href} className="btn btn-primary">
        {text} &rarr;
      </Link>
    </div>
  );
}

function AboutHighlights({ highlights }: { highlights?: (string | SectionData)[] }) {
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

// ═══════════════════════════════════════════════════════════
// HERO SECTION
// ═══════════════════════════════════════════════════════════

export function HeroSection({ data }: { data: SectionData }) {
  const variant = data._variant || 'centered';
  switch (variant) {
    case 'split-image': return <HeroSplitImage data={data} />;
    case 'fullwidth-image': return <HeroFullwidthImage data={data} />;
    case 'bold-typography': return <HeroBoldTypography data={data} />;
    case 'diagonal-split': return <HeroDiagonalSplit data={data} />;
    case 'glassmorphism': return <HeroGlassmorphism data={data} />;
    default: return <HeroCentered data={data} />;
  }
}

function HeroCentered({ data }: { data: SectionData }) {
  return (
    <section className="hero hero--centered" id="hero">
      <div className="container">
        <h1>{data.title}</h1>
        <p>{data.subtitle}</p>
        <HeroButtons data={data} />
      </div>
    </section>
  );
}

function HeroSplitImage({ data }: { data: SectionData }) {
  const image = data._image || {};
  return (
    <section className="hero hero--split" id="hero">
      <div className="hero-split-inner">
        <div className="hero-split-text">
          <h1>{data.title}</h1>
          <p>{data.subtitle}</p>
          <HeroButtons data={data} />
        </div>
        <div className="hero-split-media">
          {image.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.url} alt={image.alt || ''} loading="eager" className="hero-split-img" />
          ) : (
            <div className="hero-split-placeholder" />
          )}
          <UnsplashAttribution image={image} />
        </div>
      </div>
    </section>
  );
}

function HeroFullwidthImage({ data }: { data: SectionData }) {
  const image = data._image || {};
  return (
    <section className="hero hero--fullwidth" id="hero">
      {image.url && (
        <div
          className="parallax-bg hero-fullwidth-bg"
          style={{ backgroundImage: `url(${image.url})` }}
        />
      )}
      <div className="hero-overlay" />
      <div className="container">
        <h1>{data.title}</h1>
        <p>{data.subtitle}</p>
        <HeroButtons data={data} />
      </div>
      <UnsplashAttribution image={image} />
    </section>
  );
}

function HeroBoldTypography({ data }: { data: SectionData }) {
  return (
    <section className="hero hero--bold" id="hero">
      <div className="container">
        <h1>{data.title}</h1>
        <div className="hero--bold-line" />
        <p>{data.subtitle}</p>
        <HeroButtons data={data} />
      </div>
    </section>
  );
}

function HeroDiagonalSplit({ data }: { data: SectionData }) {
  const image = data._image || {};
  return (
    <section className="hero hero--diagonal" id="hero">
      <div className="hero--diagonal-left">
        <div className="hero--diagonal-content">
          <h1>{data.title}</h1>
          <p>{data.subtitle}</p>
          <HeroButtons data={data} />
        </div>
      </div>
      <div className="hero--diagonal-right">
        {image.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.alt || ''} loading="eager" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : null}
        <UnsplashAttribution image={image} />
      </div>
    </section>
  );
}

function HeroGlassmorphism({ data }: { data: SectionData }) {
  return (
    <section className="hero hero--glass" id="hero">
      <div className="hero--glass-blob hero--glass-blob1" />
      <div className="hero--glass-blob hero--glass-blob2" />
      <div className="hero--glass-blob hero--glass-blob3" />
      <div className="hero--glass-card">
        <h1>{data.title}</h1>
        <p>{data.subtitle}</p>
        <HeroButtons data={data} />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// ABOUT SECTION
// ═══════════════════════════════════════════════════════════

export function AboutSection({ data }: { data: SectionData }) {
  const variant = data._variant || 'text-only';
  switch (variant) {
    case 'split-image': return <AboutSplitImage data={data} />;
    case 'stats-banner': return <AboutStatsBanner data={data} />;
    case 'timeline': return <AboutTimeline data={data} />;
    case 'overlapping-cards': return <AboutOverlappingCards data={data} />;
    case 'fullwidth-banner': return <AboutFullwidthBanner data={data} />;
    case 'asymmetric': return <AboutAsymmetric data={data} />;
    default: return <AboutTextOnly data={data} />;
  }
}

function AboutTextOnly({ data }: { data: SectionData }) {
  return (
    <section className="section" data-section="about">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Conócenos</span>
          <h2 className="section-title">{data.title || 'Sobre Nosotros'}</h2>
        </div>
        <p className="about-content">{data.content}</p>
        <AboutHighlights highlights={data.highlights} />
      </div>
    </section>
  );
}

function AboutSplitImage({ data }: { data: SectionData }) {
  const image = data._image || {};
  return (
    <section className="section" data-section="about">
      <div className="container">
        <div className="about-split-layout">
          <div className="about-split-media">
            {image.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.url} alt={image.alt || ''} loading="lazy" className="about-split-img" />
            ) : (
              <div className="about-split-placeholder">Imagen</div>
            )}
            <UnsplashAttribution image={image} className="img-attribution" />
          </div>
          <div className="about-split-content">
            <div className="section-header">
              <span className="section-label">Conócenos</span>
              <h2 className="section-title">{data.title || 'Sobre Nosotros'}</h2>
            </div>
            <p className="about-content">{data.content}</p>
            <AboutHighlights highlights={data.highlights} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CountUpStat({ value, label }: { value: string; label: string }) {
  const parsed = parseStatValue(value);
  const { ref, display } = useCountUp(parsed);
  return (
    <div className="stat-item">
      <div className="stat-number" ref={ref}>{display}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function AboutStatsBanner({ data }: { data: SectionData }) {
  const stats = data.stats || [];
  return (
    <section className="section" data-section="about">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Conócenos</span>
          <h2 className="section-title">{data.title || 'Sobre Nosotros'}</h2>
        </div>
        <p className="about-content" style={{ textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>{data.content}</p>
        <div className="stats-grid anim-fade-up stagger">
          {stats.map((stat: SectionData, i: number) => (
            <CountUpStat key={i} value={String(stat.value || stat.number || '0')} label={String(stat.label || '')} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutTimeline({ data }: { data: SectionData }) {
  const items = data.timeline || data.items || [];
  return (
    <section className="section" data-section="about">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Conócenos</span>
          <h2 className="section-title">{data.title || 'Nuestra Historia'}</h2>
        </div>
        <p className="about-content">{data.content}</p>
        <div className="timeline-wrap">
          {items.map((item: SectionData, i: number) => (
            <div key={i} className="timeline-item">
              <h4>{item.year || item.title}</h4>
              <p>{item.description || item.content}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutOverlappingCards({ data }: { data: SectionData }) {
  const highlights = data.highlights || [];
  return (
    <section className="section" data-section="about">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Conócenos</span>
          <h2 className="section-title">{data.title || 'Sobre Nosotros'}</h2>
        </div>
        <p className="about-content" style={{ textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>{data.content}</p>
        <div className="overlap-cards">
          {highlights.slice(0, 3).map((h: string | SectionData, i: number) => {
            const text = typeof h === 'string' ? h : h.text || String(h);
            return (
              <div key={i} className="overlap-card">
                <div className="highlight-icon">{CHECK_ICON}</div>
                <span style={{ fontSize: '0.92rem', fontWeight: 500, color: '#374151' }}>{text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AboutFullwidthBanner({ data }: { data: SectionData }) {
  return (
    <section className="about-banner" data-section="about">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Conócenos</span>
          <h2 className="section-title">{data.title || 'Sobre Nosotros'}</h2>
        </div>
        <p className="about-content">{data.content}</p>
        <AboutHighlights highlights={data.highlights} />
      </div>
    </section>
  );
}

function AboutAsymmetric({ data }: { data: SectionData }) {
  const image = data._image || {};
  const highlights = data.highlights || [];
  return (
    <section className="section" data-section="about">
      <div className="container">
        <div className="about-asymmetric">
          <div className="about-asym-content anim-fade-up">
            <div className="section-header">
              <span className="section-label">Conócenos</span>
              <h2 className="section-title">{data.title || 'Sobre Nosotros'}</h2>
            </div>
            <p className="about-content">{data.content}</p>
            <AboutHighlights highlights={highlights} />
          </div>
          <div className="about-asym-media anim-fade-up" style={{ animationDelay: '150ms' }}>
            {image.url ? (
              <div className="about-asym-img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt || ''} loading="lazy" className="about-asym-img" />
                <UnsplashAttribution image={image} className="img-attribution" />
              </div>
            ) : (
              <div className="about-asym-placeholder">
                <div className="about-asym-placeholder-inner" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// SERVICES SECTION
// ═══════════════════════════════════════════════════════════

export function ServicesSection({ data }: { data: SectionData }) {
  const variant = data._variant || 'grid-cards';
  switch (variant) {
    case 'grid-cards-image': return <ServicesImageCards data={data} sectionId="services" label="Lo que hacemos" icon={SERVICE_ICON} />;
    case 'list-detailed': return <ServicesListDetailed data={data} />;
    case 'featured-highlight': return <ServicesFeaturedHighlight data={data} />;
    case 'horizontal-scroll': return <ServicesHorizontalScroll data={data} />;
    case 'icon-minimal': return <ServicesIconMinimal data={data} />;
    case 'bento-grid': return <BentoGrid data={data} sectionId="services" label="Lo que hacemos" icon={SERVICE_ICON} />;
    default: return <ServicesDefaultCards data={data} sectionId="services" label="Lo que hacemos" icon={SERVICE_ICON} />;
  }
}

function ServicesDefaultCards({ data, sectionId, label, icon }: { data: SectionData; sectionId: string; label: string; icon: React.ReactNode }) {
  const items = data.items || [];
  return (
    <section className="section" data-section={sectionId}>
      <div className="container">
        <div className="section-header center">
          <span className="section-label">{label}</span>
          <h2 className="section-title">{data.title || sectionId}</h2>
          <p className="section-subtitle">{data.subtitle}</p>
        </div>
        <div className="grid-3">
          {items.map((item: SectionData, i: number) => (
            <div key={i} className="card">
              <div className="card-icon">{icon}</div>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              {item.price && <span className="card-price">{item.price}</span>}
            </div>
          ))}
        </div>
        {sectionId === 'services' && <SectionCTA text="Ver todos los servicios" href="/services" />}
      </div>
    </section>
  );
}

function ServicesImageCards({ data, sectionId, label, icon }: { data: SectionData; sectionId: string; label: string; icon: React.ReactNode }) {
  const items = data.items || [];
  return (
    <section className="section" data-section={sectionId}>
      <div className="container">
        <div className="section-header center">
          <span className="section-label">{label}</span>
          <h2 className="section-title">{data.title || sectionId}</h2>
          <p className="section-subtitle">{data.subtitle}</p>
        </div>
        <div className="grid-3">
          {items.map((item: SectionData, i: number) => {
            const image = item._image || {};
            return (
              <div key={i} className="card card--has-image">
                {image.url ? (
                  <div className="card-image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.alt || item.name} loading="lazy" />
                    <UnsplashAttribution image={image} className="img-attribution" />
                  </div>
                ) : (
                  <div className="card-image card-image--placeholder">
                    <div className="card-icon">{icon}</div>
                  </div>
                )}
                <div className="card-body">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  {item.price && <span className="card-price">{item.price}</span>}
                </div>
              </div>
            );
          })}
        </div>
        {sectionId === 'services' && <SectionCTA text="Ver todos los servicios" href="/services" />}
      </div>
    </section>
  );
}

function ServicesListDetailed({ data }: { data: SectionData }) {
  const items = data.items || [];
  return (
    <section className="section" data-section="services">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Lo que hacemos</span>
          <h2 className="section-title">{data.title || 'Servicios'}</h2>
          <p className="section-subtitle">{data.subtitle}</p>
        </div>
        <div className="svc-list">
          {items.map((item: SectionData, i: number) => (
            <div key={i} className="svc-list-item">
              <span className="svc-list-num">{String(i + 1).padStart(2, '0')}</span>
              <div className="svc-list-text">
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
              {item.price && <span className="svc-list-price">{item.price}</span>}
            </div>
          ))}
        </div>
        <SectionCTA text="Ver todos los servicios" href="/services" />
      </div>
    </section>
  );
}

function ServicesFeaturedHighlight({ data }: { data: SectionData }) {
  const items = data.items || [];
  if (items.length === 0) return <ServicesDefaultCards data={data} sectionId="services" label="Lo que hacemos" icon={SERVICE_ICON} />;

  const feat = items[0];
  const featImage = feat._image || {};
  const rest = items.slice(1);

  return (
    <section className="section" data-section="services">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Lo que hacemos</span>
          <h2 className="section-title">{data.title || 'Servicios'}</h2>
          <p className="section-subtitle">{data.subtitle}</p>
        </div>
        <div className="svc-featured">
          <div className="svc-featured-main">
            {featImage.url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featImage.url} alt={feat.name} loading="lazy" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />
                <UnsplashAttribution image={featImage} className="img-attribution" />
              </>
            ) : (
              <div className="card-icon" style={{ marginBottom: 16 }}>{SERVICE_ICON}</div>
            )}
            <h3>{feat.name}</h3>
            <p>{feat.description}</p>
          </div>
          <div className="svc-featured-grid">
            {rest.map((item: SectionData, i: number) => (
              <div key={i} className="svc-featured-small">
                <div className="card-icon">{SERVICE_ICON}</div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                {item.price && <span className="card-price">{item.price}</span>}
              </div>
            ))}
          </div>
        </div>
        <SectionCTA text="Ver todos los servicios" href="/services" />
      </div>
    </section>
  );
}

function ServicesHorizontalScroll({ data }: { data: SectionData }) {
  const items = data.items || [];
  return (
    <section className="section" data-section="services">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Lo que hacemos</span>
          <h2 className="section-title">{data.title || 'Servicios'}</h2>
          <p className="section-subtitle">{data.subtitle}</p>
        </div>
        <div className="svc-scroll">
          {items.map((item: SectionData, i: number) => (
            <div key={i} className="card">
              <div className="card-icon">{SERVICE_ICON}</div>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              {item.price && <span className="card-price">{item.price}</span>}
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '.8rem', marginTop: 12 }}>&larr; Desliza para ver más &rarr;</p>
        <SectionCTA text="Ver todos los servicios" href="/services" />
      </div>
    </section>
  );
}

function ServicesIconMinimal({ data }: { data: SectionData }) {
  const items = data.items || [];
  return (
    <section className="section" data-section="services">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Lo que hacemos</span>
          <h2 className="section-title">{data.title || 'Servicios'}</h2>
          <p className="section-subtitle">{data.subtitle}</p>
        </div>
        <div className="svc-icon-grid">
          {items.map((item: SectionData, i: number) => (
            <div key={i} className="svc-icon-item">
              <div className="svc-icon-box">{SERVICE_ICON}</div>
              <div className="svc-icon-text">
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                {item.price && <span className="card-price">{item.price}</span>}
              </div>
            </div>
          ))}
        </div>
        <SectionCTA text="Ver todos los servicios" href="/services" />
      </div>
    </section>
  );
}

function BentoGrid({ data, sectionId, label, icon }: { data: SectionData; sectionId: string; label: string; icon: React.ReactNode }) {
  const items = data.items || [];
  const BENTO_SIZES = ['lg', 'md', 'sm', 'sm', 'md', 'sm', 'sm', 'lg'];

  return (
    <section className="section" data-section={sectionId}>
      <div className="container">
        <div className="section-header center anim-fade-up">
          <span className="section-label">{label}</span>
          <h2 className="section-title">{data.title || sectionId}</h2>
          <p className="section-subtitle">{data.subtitle}</p>
        </div>
        <div className="bento-grid stagger">
          {items.map((item: SectionData, i: number) => {
            const size = BENTO_SIZES[i % BENTO_SIZES.length];
            const image = item._image || {};
            const hasImage = !!image.url;

            return (
              <div key={i} className={`bento-item bento-${size}${hasImage ? ' bento-item--has-image' : ''}`}>
                {hasImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.alt || item.name} loading="lazy" className="bento-img" />
                    <div className="bento-overlay">
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      {item.price && <span className="card-price">{item.price}</span>}
                    </div>
                    <UnsplashAttribution image={image} className="img-attribution" />
                  </>
                ) : (
                  <>
                    <div className="card-icon">{icon}</div>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    {item.price && <span className="card-price">{item.price}</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>
        {sectionId === 'services' && <SectionCTA text="Ver todos los servicios" href="/services" />}
        {sectionId === 'products' && <SectionCTA text="Ver catálogo completo" href="/products" />}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// PRODUCTS SECTION
// ═══════════════════════════════════════════════════════════

export function ProductsSection({ data }: { data: SectionData }) {
  const variant = data._variant || 'grid-cards';
  switch (variant) {
    case 'grid-cards-image': return <ServicesImageCards data={data} sectionId="products" label="Nuestros productos" icon={PRODUCT_ICON} />;
    case 'showcase-large': return <ProductsShowcaseLarge data={data} />;
    case 'catalog-compact': return <ProductsCatalogCompact data={data} />;
    case 'masonry-staggered': return <ProductsMasonryStaggered data={data} />;
    case 'price-table': return <ProductsPriceTable data={data} />;
    case 'bento-grid': return <BentoGrid data={data} sectionId="products" label="Nuestros productos" icon={PRODUCT_ICON} />;
    default: return <ServicesDefaultCards data={data} sectionId="products" label="Nuestros productos" icon={PRODUCT_ICON} />;
  }
}

function ProductsShowcaseLarge({ data }: { data: SectionData }) {
  const items = data.items || [];
  return (
    <section className="section" data-section="products">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Nuestros productos</span>
          <h2 className="section-title">{data.title || 'Productos'}</h2>
          <p className="section-subtitle">{data.subtitle}</p>
        </div>
        <div className="prod-showcase">
          {items.map((item: SectionData, i: number) => {
            const image = item._image || {};
            const bgStyle = image.url
              ? { backgroundImage: `url(${image.url})` }
              : { background: 'linear-gradient(135deg, var(--primary), var(--secondary))' };
            return (
              <div key={i} className="showcase-card" style={bgStyle}>
                {item.price && <span className="showcase-price">{item.price}</span>}
                <div className="showcase-overlay">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
                <UnsplashAttribution image={image} className="img-attribution" />
              </div>
            );
          })}
        </div>
        <SectionCTA text="Ver catálogo completo" href="/products" />
      </div>
    </section>
  );
}

function ProductsCatalogCompact({ data }: { data: SectionData }) {
  const items = data.items || [];
  return (
    <section className="section" data-section="products">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Nuestros productos</span>
          <h2 className="section-title">{data.title || 'Productos'}</h2>
          <p className="section-subtitle">{data.subtitle}</p>
        </div>
        <div className="prod-catalog">
          {items.map((item: SectionData, i: number) => {
            const image = item._image || {};
            return (
              <div key={i} className="catalog-item">
                <div className="catalog-img">
                  {image.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.url} alt={item.name} loading="lazy" />
                  ) : (
                    <div className="catalog-placeholder">{PRODUCT_ICON}</div>
                  )}
                </div>
                <h3>{item.name}</h3>
                {item.price && <span className="catalog-price">{item.price}</span>}
              </div>
            );
          })}
        </div>
        <SectionCTA text="Ver catálogo completo" href="/products" />
      </div>
    </section>
  );
}

function ProductsMasonryStaggered({ data }: { data: SectionData }) {
  const items = data.items || [];
  return (
    <section className="section" data-section="products">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Nuestros productos</span>
          <h2 className="section-title">{data.title || 'Productos'}</h2>
          <p className="section-subtitle">{data.subtitle}</p>
        </div>
        <div className="prod-masonry">
          {items.map((item: SectionData, i: number) => {
            const image = item._image || {};
            return (
              <div key={i} className="masonry-item">
                {image.url && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={item.name} loading="lazy" />
                    <UnsplashAttribution image={image} className="img-attribution" />
                  </>
                )}
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                {item.price && <span className="card-price">{item.price}</span>}
              </div>
            );
          })}
        </div>
        <SectionCTA text="Ver catálogo completo" href="/products" />
      </div>
    </section>
  );
}

function ProductsPriceTable({ data }: { data: SectionData }) {
  const items = data.items || [];
  return (
    <section className="section" data-section="products">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Nuestros productos</span>
          <h2 className="section-title">{data.title || 'Productos'}</h2>
          <p className="section-subtitle">{data.subtitle}</p>
        </div>
        <div className="prod-price-table">
          {items.map((item: SectionData, i: number) => (
            <div key={i}>
              <div className="price-table-row">
                <span className="price-table-name">{item.name}</span>
                <span className="price-table-dots" />
                <span className="price-table-price">{item.price}</span>
              </div>
              {item.description && <p className="price-table-desc">{item.description}</p>}
            </div>
          ))}
        </div>
        <SectionCTA text="Ver catálogo completo" href="/products" />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// TESTIMONIALS SECTION
// ═══════════════════════════════════════════════════════════

export function TestimonialsSection({ data }: { data: SectionData }) {
  const variant = data._variant || 'cards-grid';
  switch (variant) {
    case 'carousel': return <TestimonialsCarousel data={data} />;
    case 'single-highlight': return <TestimonialsSingleHighlight data={data} />;
    default: return <TestimonialsCardsGrid data={data} />;
  }
}

function TestimonialStars({ rating }: { rating?: number }) {
  const stars = rating || 5;
  return (
    <div className="testimonial-stars">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={i < stars ? 'star-filled' : 'star-empty'}>&#9733;</span>
      ))}
    </div>
  );
}

function TestimonialInitials({ name }: { name?: string }) {
  const initials = name
    ? name.split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('')
    : '?';
  return <div className="avatar">{initials}</div>;
}

function TestimonialsCardsGrid({ data }: { data: SectionData }) {
  const items = data.items || [];
  return (
    <section className="section" data-section="testimonials">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Lo que dicen</span>
          <h2 className="section-title">{data.title || 'Testimonios'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="grid-3 anim-fade-up stagger">
          {items.map((item: SectionData, i: number) => (
            <div key={i} className="testimonial-card">
              <TestimonialStars rating={item.rating} />
              <div className="quote-mark">&ldquo;</div>
              <p className="content">{item.content}</p>
              <div className="author">
                <TestimonialInitials name={item.name} />
                <div>
                  <div className="name">{item.name}</div>
                  <div className="role">{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsCarousel({ data }: { data: SectionData }) {
  const items = data.items || [];
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length;
        const el = carouselRef.current?.children[next] as HTMLElement | undefined;
        el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length]);

  const goTo = (i: number) => {
    setActiveIndex(i);
    const el = carouselRef.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  return (
    <section className="section" data-section="testimonials">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Lo que dicen</span>
          <h2 className="section-title">{data.title || 'Testimonios'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="testimonial-carousel-wrap anim-fade-up">
          <div ref={carouselRef} className="testimonial-carousel">
            {items.map((item: SectionData, i: number) => (
              <div key={i} className="testimonial-carousel-item">
                <div className="testimonial-card testimonial-card--large">
                  <TestimonialStars rating={item.rating} />
                  <div className="quote-mark">&ldquo;</div>
                  <p className="content">{item.content}</p>
                  <div className="author">
                    <TestimonialInitials name={item.name} />
                    <div>
                      <div className="name">{item.name}</div>
                      <div className="role">{item.role}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {items.length > 1 && (
            <div className="testimonial-dots">
              {items.map((_: SectionData, i: number) => (
                <button key={i} type="button" className={`testimonial-dot${i === activeIndex ? ' active' : ''}`} onClick={() => goTo(i)} aria-label={`Testimonio ${i + 1}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSingleHighlight({ data }: { data: SectionData }) {
  const items = data.items || [];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length]);

  const current = items[activeIndex];
  if (!current) return null;

  return (
    <section className="section" data-section="testimonials">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Lo que dicen</span>
          <h2 className="section-title">{data.title || 'Testimonios'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="testimonial-highlight anim-fade-up">
          <div key={activeIndex} className="testimonial-highlight-card">
            <TestimonialStars rating={current.rating} />
            <div className="quote-mark quote-mark--large">&ldquo;</div>
            <p className="testimonial-highlight-content">{current.content}</p>
            <div className="author">
              <TestimonialInitials name={current.name} />
              <div>
                <div className="name">{current.name}</div>
                <div className="role">{current.role}</div>
              </div>
            </div>
          </div>
          {items.length > 1 && (
            <div className="testimonial-dots">
              {items.map((_: SectionData, i: number) => (
                <button key={i} type="button" className={`testimonial-dot${i === activeIndex ? ' active' : ''}`} onClick={() => setActiveIndex(i)} aria-label={`Testimonio ${i + 1}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// PRICING SECTION
// ═══════════════════════════════════════════════════════════

export function PricingSection({ data }: { data: SectionData }) {
  const variant = data._variant || 'cards';
  switch (variant) {
    case 'comparison-table': return <PricingComparisonTable data={data} />;
    case 'minimal-list': return <PricingMinimalList data={data} />;
    default: return <PricingCards data={data} />;
  }
}

function PricingCards({ data }: { data: SectionData }) {
  const items = data.items || [];
  return (
    <section className="section" data-section="pricing">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Nuestros precios</span>
          <h2 className="section-title">{data.title || 'Precios'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="pricing-grid anim-fade-up stagger">
          {items.map((item: SectionData, i: number) => {
            const isRecommended = item.recommended || item.featured || item.popular;
            const features: string[] = item.features || [];
            const ctaText = item.cta_text || item.button_text || 'Elegir plan';
            const ctaLink = item.cta_link || item.button_link || '#contact';
            return (
              <div key={i} className={`pricing-card${isRecommended ? ' pricing-card--recommended' : ''}`}>
                {isRecommended && <span className="pricing-badge">Recomendado</span>}
                <h3>{item.name}</h3>
                <div className="price">
                  {item.price}
                  {item.period && <span className="pricing-period">/{item.period}</span>}
                </div>
                <p>{item.description}</p>
                {features.length > 0 && (
                  <ul className="pricing-features">
                    {features.map((f: string, fi: number) => (
                      <li key={fi}>
                        <span className="pricing-check">{CHECK_ICON}</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                <a href={ctaLink} className={`btn ${isRecommended ? 'btn-primary' : 'btn-outline'} pricing-cta`}>
                  {ctaText}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingComparisonTable({ data }: { data: SectionData }) {
  const items = data.items || [];
  // Collect all unique features across plans
  const allFeatures = Array.from(
    new Set(items.flatMap((item: SectionData) => (item.features || []) as string[]))
  );

  return (
    <section className="section" data-section="pricing">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Nuestros precios</span>
          <h2 className="section-title">{data.title || 'Comparar Planes'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="pricing-table-wrap anim-fade-up">
          <table className="pricing-table">
            <thead>
              <tr>
                <th className="pricing-table-feature-col">Característica</th>
                {items.map((item: SectionData, i: number) => {
                  const isRecommended = item.recommended || item.featured || item.popular;
                  return (
                    <th key={i} className={isRecommended ? 'pricing-table-recommended' : ''}>
                      <div className="pricing-table-plan">
                        <span className="pricing-table-name">{item.name}</span>
                        <span className="pricing-table-price">{item.price}</span>
                        {item.period && <span className="pricing-table-period">/{item.period}</span>}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((feature, fi) => (
                <tr key={fi}>
                  <td>{String(feature)}</td>
                  {items.map((item: SectionData, ii: number) => {
                    const hasFeature = (item.features || []).includes(feature);
                    return (
                      <td key={ii} className="pricing-table-check">
                        {hasFeature ? (
                          <span className="pricing-check pricing-check--yes">{CHECK_ICON}</span>
                        ) : (
                          <span className="pricing-check--no">&mdash;</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td />
                {items.map((item: SectionData, i: number) => {
                  const isRecommended = item.recommended || item.featured || item.popular;
                  const ctaText = item.cta_text || item.button_text || 'Elegir';
                  const ctaLink = item.cta_link || item.button_link || '#contact';
                  return (
                    <td key={i}>
                      <a href={ctaLink} className={`btn ${isRecommended ? 'btn-primary' : 'btn-outline'} pricing-table-cta`}>
                        {ctaText}
                      </a>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

function PricingMinimalList({ data }: { data: SectionData }) {
  const items = data.items || [];
  return (
    <section className="section" data-section="pricing">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Nuestros precios</span>
          <h2 className="section-title">{data.title || 'Precios'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="pricing-minimal anim-fade-up" style={{ maxWidth: 640, margin: '0 auto' }}>
          {items.map((item: SectionData, i: number) => {
            const isRecommended = item.recommended || item.featured || item.popular;
            return (
              <div key={i} className={`pricing-minimal-item${isRecommended ? ' pricing-minimal-item--featured' : ''}`}>
                <div className="pricing-minimal-header">
                  <div>
                    <h3 className="pricing-minimal-name">{item.name}</h3>
                    {item.description && <p className="pricing-minimal-desc">{item.description}</p>}
                  </div>
                  <span className="pricing-minimal-dots" />
                  <div className="pricing-minimal-price">
                    {item.price}
                    {item.period && <span className="pricing-period">/{item.period}</span>}
                  </div>
                </div>
                {(item.features || []).length > 0 && (
                  <div className="pricing-minimal-features">
                    {(item.features as string[]).map((f: string, fi: number) => (
                      <span key={fi} className="pricing-minimal-tag">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// GALLERY SECTION
// ═══════════════════════════════════════════════════════════

export function GallerySection({ data }: { data: SectionData }) {
  const variant = data._variant || 'masonry';
  switch (variant) {
    case 'grid-uniform': return <GalleryGridUniform data={data} />;
    case 'slider': return <GallerySlider data={data} />;
    default: return <GalleryMasonry data={data} />;
  }
}

function GalleryLightbox({ images, currentIndex, onClose, onPrev, onNext }: {
  images: SectionData[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="gallery-lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="gallery-lightbox-close" onClick={onClose} aria-label="Cerrar">&times;</button>
      {images.length > 1 && (
        <>
          <button className="gallery-lightbox-nav gallery-lightbox-prev" onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Anterior">&lsaquo;</button>
          <button className="gallery-lightbox-nav gallery-lightbox-next" onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Siguiente">&rsaquo;</button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[currentIndex]?._image?.url || images[currentIndex]?.url || ''}
        alt={images[currentIndex]?._image?.alt || images[currentIndex]?.alt || `Imagen ${currentIndex + 1}`}
        onClick={(e) => e.stopPropagation()}
      />
      <UnsplashAttribution image={images[currentIndex]?._image || images[currentIndex]} className="hero-attribution" />
    </div>
  );
}

function useGalleryLightbox(images: SectionData[]) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') setLightboxIndex((prev) => prev !== null ? (prev - 1 + images.length) % images.length : null);
      if (e.key === 'ArrowRight') setLightboxIndex((prev) => prev !== null ? (prev + 1) % images.length : null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, images.length]);

  return {
    lightboxIndex,
    openLightbox: (i: number) => setLightboxIndex(i),
    closeLightbox: () => setLightboxIndex(null),
    prevImage: () => setLightboxIndex((prev) => prev !== null ? (prev - 1 + images.length) % images.length : null),
    nextImage: () => setLightboxIndex((prev) => prev !== null ? (prev + 1) % images.length : null),
  };
}

function getGalleryImages(data: SectionData): SectionData[] {
  return data.items || [];
}

function GalleryPlaceholder() {
  return (
    <div className="gallery-placeholder anim-fade-up">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="ph">Imagen {i + 1}</div>
      ))}
    </div>
  );
}

function GalleryMasonry({ data }: { data: SectionData }) {
  const images = getGalleryImages(data);
  const { lightboxIndex, openLightbox, closeLightbox, prevImage, nextImage } = useGalleryLightbox(images);
  const hasRealImages = images.some((img) => img._image?.url || img.url);

  return (
    <section className="section" data-section="gallery">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Galería</span>
          <h2 className="section-title">{data.title || 'Galería'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        {hasRealImages ? (
          <div className="gallery-masonry anim-fade-up stagger">
            {images.map((img, i) => {
              const url = img._image?.url || img.url;
              if (!url) return null;
              return (
                <button key={i} className="gallery-masonry-item" onClick={() => openLightbox(i)} type="button">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={img._image?.alt || img.alt || `Imagen ${i + 1}`} loading="lazy" />
                  <div className="gallery-item-overlay">
                    <span className="gallery-item-zoom">&#x2922;</span>
                  </div>
                  <UnsplashAttribution image={img._image || img} className="img-attribution" />
                </button>
              );
            })}
          </div>
        ) : (
          <GalleryPlaceholder />
        )}
      </div>
      {lightboxIndex !== null && (
        <GalleryLightbox images={images} currentIndex={lightboxIndex} onClose={closeLightbox} onPrev={prevImage} onNext={nextImage} />
      )}
    </section>
  );
}

function GalleryGridUniform({ data }: { data: SectionData }) {
  const images = getGalleryImages(data);
  const { lightboxIndex, openLightbox, closeLightbox, prevImage, nextImage } = useGalleryLightbox(images);
  const hasRealImages = images.some((img) => img._image?.url || img.url);

  return (
    <section className="section" data-section="gallery">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Galería</span>
          <h2 className="section-title">{data.title || 'Galería'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        {hasRealImages ? (
          <div className="gallery-grid anim-fade-up stagger">
            {images.map((img, i) => {
              const url = img._image?.url || img.url;
              if (!url) return null;
              return (
                <button key={i} className="gallery-item" onClick={() => openLightbox(i)} type="button">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={img._image?.alt || img.alt || `Imagen ${i + 1}`} loading="lazy" />
                  <div className="gallery-item-overlay">
                    <span className="gallery-item-zoom">&#x2922;</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <GalleryPlaceholder />
        )}
      </div>
      {lightboxIndex !== null && (
        <GalleryLightbox images={images} currentIndex={lightboxIndex} onClose={closeLightbox} onPrev={prevImage} onNext={nextImage} />
      )}
    </section>
  );
}

function GallerySlider({ data }: { data: SectionData }) {
  const images = getGalleryImages(data);
  const { lightboxIndex, openLightbox, closeLightbox, prevImage, nextImage } = useGalleryLightbox(images);
  const sliderRef = useRef<HTMLDivElement>(null);
  const hasRealImages = images.some((img) => img._image?.url || img.url);

  const scrollTo = useCallback((direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const amount = sliderRef.current.clientWidth * 0.8;
    sliderRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }, []);

  return (
    <section className="section" data-section="gallery">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Galería</span>
          <h2 className="section-title">{data.title || 'Galería'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        {hasRealImages ? (
          <div className="gallery-slider-wrap anim-fade-up">
            <button className="gallery-slider-nav gallery-slider-prev" onClick={() => scrollTo('left')} type="button" aria-label="Anterior">&lsaquo;</button>
            <div ref={sliderRef} className="gallery-slider">
              {images.map((img, i) => {
                const url = img._image?.url || img.url;
                if (!url) return null;
                return (
                  <button key={i} className="gallery-slider-item" onClick={() => openLightbox(i)} type="button">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={img._image?.alt || img.alt || `Imagen ${i + 1}`} loading="lazy" />
                  </button>
                );
              })}
            </div>
            <button className="gallery-slider-nav gallery-slider-next" onClick={() => scrollTo('right')} type="button" aria-label="Siguiente">&rsaquo;</button>
          </div>
        ) : (
          <GalleryPlaceholder />
        )}
      </div>
      {lightboxIndex !== null && (
        <GalleryLightbox images={images} currentIndex={lightboxIndex} onClose={closeLightbox} onPrev={prevImage} onNext={nextImage} />
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// FAQ SECTION
// ═══════════════════════════════════════════════════════════

export function FAQSection({ data }: { data: SectionData }) {
  const variant = data._variant || 'classic';
  switch (variant) {
    case 'side-by-side': return <FAQSideBySide data={data} />;
    case 'cards': return <FAQCards data={data} />;
    default: return <FAQClassic data={data} />;
  }
}

function FAQClassic({ data }: { data: SectionData }) {
  const items = data.items || [];
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="section" data-section="faq">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">FAQ</span>
          <h2 className="section-title">{data.title || 'Preguntas Frecuentes'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="faq-list anim-fade-up" style={{ maxWidth: 720, margin: '0 auto' }}>
          {items.map((item: SectionData, i: number) => (
            <div key={i} className={`faq-item${openIndex === i ? ' faq-item--open' : ''}`}>
              <button type="button" className="faq-trigger" onClick={() => setOpenIndex(openIndex === i ? -1 : i)}>
                <span>{item.question}</span>
                <span className="faq-icon" />
              </button>
              <div className="faq-answer">
                <div className="answer">{item.answer}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSideBySide({ data }: { data: SectionData }) {
  const items = data.items || [];
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="section" data-section="faq">
      <div className="container">
        <div className="section-header">
          <span className="section-label">FAQ</span>
          <h2 className="section-title">{data.title || 'Preguntas Frecuentes'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="faq-side-layout anim-fade-up">
          <div className="faq-side-questions">
            {items.map((item: SectionData, i: number) => (
              <button
                key={i}
                type="button"
                className={`faq-side-q${openIndex === i ? ' faq-side-q--active' : ''}`}
                onClick={() => setOpenIndex(i)}
              >
                <span className="faq-side-num">{String(i + 1).padStart(2, '0')}</span>
                {item.question}
              </button>
            ))}
          </div>
          <div className="faq-side-answer">
            {items[openIndex] && (
              <div key={openIndex} className="faq-side-answer-content">
                <h3>{items[openIndex].question}</h3>
                <p>{items[openIndex].answer}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQCards({ data }: { data: SectionData }) {
  const items = data.items || [];
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="section" data-section="faq">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">FAQ</span>
          <h2 className="section-title">{data.title || 'Preguntas Frecuentes'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="faq-cards-grid anim-fade-up stagger">
          {items.map((item: SectionData, i: number) => (
            <div key={i} className={`faq-card${openIndex === i ? ' faq-card--open' : ''}`} onClick={() => setOpenIndex(openIndex === i ? -1 : i)}>
              <div className="faq-card-q">
                <span>{item.question}</span>
                <span className="faq-icon" />
              </div>
              <div className="faq-card-a">
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// CONTACT SECTION
// ═══════════════════════════════════════════════════════════

const CONTACT_KEYS = ['phone', 'email', 'address', 'whatsapp', 'hours'] as const;

function getWhatsAppLink(data: SectionData) {
  const raw = data.whatsapp || data.phone || '';
  const digits = raw.replace(/[^\d+]/g, '');
  return digits ? `https://wa.me/${digits.replace(/^\+/, '')}` : null;
}

export function ContactSection({ data }: { data: SectionData }) {
  const variant = data._variant || 'cards-grid';
  switch (variant) {
    case 'split-form': return <ContactSplitForm data={data} />;
    case 'centered-minimal': return <ContactCenteredMinimal data={data} />;
    default: return <ContactCardsGrid data={data} />;
  }
}

function ContactCardsGrid({ data }: { data: SectionData }) {
  const waLink = getWhatsAppLink(data);

  return (
    <section className="section" data-section="contact">
      <div className="container">
        <div className="section-header center">
          <span className="section-label">Contacto</span>
          <h2 className="section-title">{data.title || 'Contacto'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="contact-grid anim-fade-up stagger">
          {CONTACT_KEYS.map((key) => {
            const val = data[key];
            if (!val) return null;
            return (
              <div key={key} className="contact-item">
                <div className="ci-icon">{CONTACT_ICONS[key]}</div>
                <div>
                  <div className="ci-label">{CONTACT_LABELS[key]}</div>
                  <div className="ci-value">{val}</div>
                </div>
              </div>
            );
          })}
        </div>
        {waLink && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary whatsapp-cta">
              {CONTACT_ICONS.whatsapp} Escríbenos por WhatsApp
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function ContactSplitForm({ data }: { data: SectionData }) {
  const waLink = getWhatsAppLink(data);

  return (
    <section className="section" data-section="contact">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Contacto</span>
          <h2 className="section-title">{data.title || 'Contáctanos'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
        </div>
        <div className="contact-split anim-fade-up">
          <div className="contact-split-info">
            {CONTACT_KEYS.map((key) => {
              const val = data[key];
              if (!val) return null;
              return (
                <div key={key} className="contact-split-item">
                  <div className="ci-icon">{CONTACT_ICONS[key]}</div>
                  <div>
                    <div className="ci-label">{CONTACT_LABELS[key]}</div>
                    <div className="ci-value">{val}</div>
                  </div>
                </div>
              );
            })}
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary whatsapp-cta" style={{ marginTop: 16 }}>
                {CONTACT_ICONS.whatsapp} WhatsApp
              </a>
            )}
          </div>
          <div className="contact-split-form">
            <div className="contact-form-placeholder">
              <div className="contact-form-field">
                <label>Nombre</label>
                <div className="contact-form-input" />
              </div>
              <div className="contact-form-field">
                <label>Email</label>
                <div className="contact-form-input" />
              </div>
              <div className="contact-form-field">
                <label>Mensaje</label>
                <div className="contact-form-input contact-form-textarea" />
              </div>
              <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
                Enviar mensaje
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactCenteredMinimal({ data }: { data: SectionData }) {
  const waLink = getWhatsAppLink(data);

  return (
    <section className="section" data-section="contact">
      <div className="container">
        <div className="contact-centered anim-fade-up">
          <span className="section-label">Contacto</span>
          <h2 className="section-title">{data.title || 'Hablemos'}</h2>
          {data.subtitle && <p className="section-subtitle">{data.subtitle}</p>}
          <div className="contact-centered-items">
            {CONTACT_KEYS.map((key) => {
              const val = data[key];
              if (!val) return null;
              const isLink = key === 'phone' || key === 'email' || key === 'whatsapp';
              const href = key === 'phone' ? `tel:${val}` : key === 'email' ? `mailto:${val}` : key === 'whatsapp' ? waLink : undefined;
              return (
                <div key={key} className="contact-centered-item">
                  <span className="ci-icon">{CONTACT_ICONS[key]}</span>
                  {isLink && href ? (
                    <a href={href} target={key === 'whatsapp' ? '_blank' : undefined} rel={key === 'whatsapp' ? 'noopener noreferrer' : undefined} className="contact-centered-link">{val}</a>
                  ) : (
                    <span className="ci-value">{val}</span>
                  )}
                </div>
              );
            })}
          </div>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary whatsapp-cta" style={{ marginTop: 28 }}>
              {CONTACT_ICONS.whatsapp} Escríbenos por WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// GENERIC SECTION (fallback)
// ═══════════════════════════════════════════════════════════

export function GenericSection({ sectionId, data }: { sectionId: string; data: SectionData }) {
  const items = data.items || [];
  return (
    <section className="section" data-section={sectionId}>
      <div className="container">
        <div className="section-header center">
          <span className="section-label">{sectionId.replace(/_/g, ' ')}</span>
          <h2 className="section-title">{data.title || sectionId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h2>
          <p className="section-subtitle">{data.subtitle}</p>
        </div>
        {data.content && <p className="about-content">{data.content}</p>}
        {items.length > 0 && (
          <div className="grid-3">
            {items.map((item: SectionData, i: number) => (
              <div key={i} className="card">
                <h3>{item.name || item.title}</h3>
                <p>{item.description || item.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
