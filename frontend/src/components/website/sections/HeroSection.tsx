'use client';

import type { SectionData } from '@/contexts/WebsiteContentContext';
import { UnsplashAttribution, HeroButtons } from './shared';

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
