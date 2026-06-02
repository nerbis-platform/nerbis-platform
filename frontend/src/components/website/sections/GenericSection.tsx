'use client';

import type { SectionData } from '@/contexts/WebsiteContentContext';

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
