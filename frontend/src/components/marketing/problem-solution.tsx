'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

const comparisons = [
  {
    before: 'Eliges un template generico',
    after: 'Pipe, nuestra IA, genera tu sitio unico',
  },
  {
    before: 'Pasas horas personalizando',
    after: 'Listo en 30 segundos',
  },
  {
    before: 'Necesitas 3 herramientas distintas',
    after: 'Todo integrado: web + tienda + reservas',
  },
  {
    before: 'Tu sitio se ve como mil otros',
    after: 'Diseno personalizado por industria',
  },
];

export function ProblemSolution() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!sectionRef.current) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduced: '(prefers-reduced-motion: reduce)',
        normal: '(prefers-reduced-motion: no-preference)',
      },
      (context) => {
        const { reduced } = context.conditions as { reduced: boolean; normal: boolean };

        if (reduced) {
          gsap.set('.ps-heading, .ps-before, .ps-after', { autoAlpha: 1 });
          return;
        }

        // Heading
        gsap.from('.ps-heading', {
          y: 40,
          autoAlpha: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.ps-heading',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        // Before column slides in from left
        gsap.from('.ps-before', {
          x: -40,
          autoAlpha: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.ps-columns',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        // After column slides in from right
        gsap.from('.ps-after', {
          x: 40,
          autoAlpha: 0,
          duration: 0.7,
          delay: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.ps-columns',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: 'color-mix(in oklch, var(--color-surface-raised) 30%, transparent)' }}>
      <div className="mx-auto max-w-4xl">
        <div className="ps-heading invisible text-center">
          <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Por que NERBIS
          </p>
          <h2 className="nerbis-display mt-4 text-3xl sm:text-4xl lg:text-5xl" style={{ color: 'var(--color-text-inverse)' }}>
            Deja atras lo generico
          </h2>
        </div>

        <div className="ps-columns mt-16 grid gap-0 sm:grid-cols-2">
          {/* Before column */}
          <div className="ps-before invisible sm:pr-8" style={{ borderRight: '0 solid transparent' }}>
            <p className="mb-6 text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-disabled)' }}>
              Lo que haces hoy
            </p>
            {comparisons.map((item) => (
              <div
                key={item.before}
                className="flex items-start gap-3 py-4"
                style={{ borderTop: `1px solid color-mix(in oklch, var(--color-border-default) 50%, transparent)` }}
              >
                <span className="mt-0.5" style={{ color: 'var(--primitive-gray-700)' }} aria-hidden="true">&times;</span>
                <span className="line-through" style={{ color: 'var(--color-text-muted)', textDecorationColor: 'var(--primitive-gray-700)' }}>
                  {item.before}
                </span>
              </div>
            ))}
          </div>

          {/* After column */}
          <div className="ps-after invisible mt-8 sm:mt-0 sm:border-l sm:pl-8" style={{ borderColor: 'var(--color-border-default)' }}>
            <p className="mb-6 text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              Lo que haces con NERBIS
            </p>
            {comparisons.map((item) => (
              <div
                key={item.after}
                className="flex items-start gap-3 py-4"
                style={{ borderTop: `1px solid color-mix(in oklch, var(--color-border-default) 50%, transparent)` }}
              >
                <span
                  className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]"
                  style={{ background: `linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)` }}
                  aria-hidden="true"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--primitive-gray-950)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span style={{ color: 'var(--color-text-inverse)' }}>{item.after}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
