'use client';

import type { SectionData } from '@/contexts/WebsiteContentContext';
import { CHECK_ICON } from './shared';

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
