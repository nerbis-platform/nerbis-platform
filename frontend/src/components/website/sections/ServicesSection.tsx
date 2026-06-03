'use client';

import type { SectionData } from '@/contexts/WebsiteContentContext';
import { SERVICE_ICON, UnsplashAttribution, SectionCTA } from './shared';
import { BentoGrid } from './BentoGrid';

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

export function ServicesDefaultCards({ data, sectionId, label, icon }: { data: SectionData; sectionId: string; label: string; icon: React.ReactNode }) {
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

export function ServicesImageCards({ data, sectionId, label, icon }: { data: SectionData; sectionId: string; label: string; icon: React.ReactNode }) {
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
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '.8rem', marginTop: 12 }}>&larr; Desliza para ver más &rarr;</p>
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
