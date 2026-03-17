// src/components/auth/BrandCarousel.tsx
// Auto-rotating carousel for brand value propositions.
// CSS-only transitions, respects prefers-reduced-motion.

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BrandCarouselProps } from './types';

const DEFAULT_INTERVAL = 5000;

export function BrandCarousel({ slides, interval = DEFAULT_INTERVAL }: BrandCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReducedMotion = useRef(false);

  // Detect prefers-reduced-motion on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion.current = mql.matches;
      const handler = (e: MediaQueryListEvent) => {
        prefersReducedMotion.current = e.matches;
      };
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      setActiveIndex(index % slides.length);
    },
    [slides.length],
  );

  // Auto-advance timer
  useEffect(() => {
    if (slides.length <= 1 || isPaused || prefersReducedMotion.current) {
      return;
    }

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [slides.length, interval, isPaused]);

  if (slides.length === 0) return null;

  return (
    <div
      className="relative flex flex-col"
      role="region"
      aria-roledescription="carousel"
      aria-label="Propuestas de valor de NERBIS"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      data-auth-animated
    >
      {/* Slides — each slide is in normal flow but only the active one is visible */}
      <div className="grid" aria-live="polite" aria-atomic="true">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${index + 1} de ${slides.length}`}
            aria-hidden={index !== activeIndex}
            className="transition-[opacity,transform,visibility] duration-500 ease-in-out"
            style={{
              opacity: index === activeIndex ? 1 : 0,
              visibility: index === activeIndex ? 'visible' : 'hidden',
              transform: index === activeIndex ? 'translateY(0)' : 'translateY(8px)',
              pointerEvents: index === activeIndex ? 'auto' : 'none',
              // All slides occupy the same space via grid trick
              gridArea: '1 / 1',
            }}
          >
            {/* Headline */}
            <h2
              className="text-[2rem] lg:text-[2.5rem] xl:text-[3rem] leading-[1.1] tracking-[-0.02em] text-[var(--auth-text-on-dark)] mb-4"
              style={{
                fontFamily: 'var(--auth-font-heading)',
                fontWeight: 600,
              }}
            >
              {slide.headline}
            </h2>

            {/* Subtitle */}
            <p
              className="text-[0.9375rem] leading-[1.7] text-[var(--auth-text-on-dark-muted)] max-w-sm mb-10"
              style={{ fontFamily: 'var(--auth-font-body)' }}
            >
              {slide.subtitle}
            </p>

            {/* Feature chips */}
            <div className="flex flex-wrap items-center gap-3">
              {slide.features.map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[0.75rem] text-[var(--auth-text-on-dark-subtle)] tracking-wide backdrop-blur-sm"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Dot indicators — always below content */}
      {slides.length > 1 && (
        <nav
          className="mt-5 flex items-center gap-2.5"
          aria-label="Indicadores del carousel"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goToSlide(index)}
              aria-label={`Ir a slide ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              className="group relative h-2 rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-bg-dark)]"
              style={{
                width: index === activeIndex ? '2rem' : '0.5rem',
                backgroundColor:
                  index === activeIndex
                    ? 'var(--auth-accent)'
                    : 'rgba(255, 255, 255, 0.25)',
              }}
              data-auth-animated
            />
          ))}
        </nav>
      )}
    </div>
  );
}
