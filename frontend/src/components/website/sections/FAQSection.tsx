'use client';

import { useState } from 'react';
import type { SectionData } from '@/contexts/WebsiteContentContext';

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
