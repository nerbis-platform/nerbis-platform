'use client';

import { useState, useEffect, useRef } from 'react';
import type { SectionData } from '@/contexts/WebsiteContentContext';

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
