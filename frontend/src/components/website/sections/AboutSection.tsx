'use client';

import type { SectionData } from '@/contexts/WebsiteContentContext';
import { useCountUp, parseStatValue } from '../useCountUp';
import { UnsplashAttribution, AboutHighlights, CHECK_ICON } from './shared';

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
                <span style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{text}</span>
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
