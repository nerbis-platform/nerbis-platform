'use client';

import type { SectionData } from '@/contexts/WebsiteContentContext';
import { PRODUCT_ICON, UnsplashAttribution, SectionCTA } from './shared';
import { ServicesDefaultCards, ServicesImageCards } from './ServicesSection';
import { BentoGrid } from './BentoGrid';

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
