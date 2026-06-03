'use client';

import type { SectionData } from '@/contexts/WebsiteContentContext';
import { UnsplashAttribution, SectionCTA } from './shared';

const BENTO_SIZES = ['lg', 'md', 'sm', 'sm', 'md', 'sm', 'sm', 'lg'];

export function BentoGrid({ data, sectionId, label, icon }: { data: SectionData; sectionId: string; label: string; icon: React.ReactNode }) {
  const items = data.items || [];

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
