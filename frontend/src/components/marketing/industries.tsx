'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

const industries = [
  { name: 'Belleza', emoji: '\u2728' },
  { name: 'Restaurantes', emoji: '\uD83C\uDF7D\uFE0F' },
  { name: 'Salud', emoji: '\uD83E\uDE7A' },
  { name: 'Fitness', emoji: '\uD83C\uDFCB\uFE0F' },
  { name: 'Retail', emoji: '\uD83D\uDECD\uFE0F' },
  { name: 'Educacion', emoji: '\uD83C\uDF93' },
  { name: 'Fotografia', emoji: '\uD83D\uDCF7' },
  { name: 'Servicios', emoji: '\uD83D\uDD27' },
  { name: 'Automotriz', emoji: '\uD83D\uDE97' },
  { name: 'Inmobiliaria', emoji: '\uD83C\uDFE0' },
  { name: 'Arte', emoji: '\uD83C\uDFA8' },
  { name: 'Musica', emoji: '\uD83C\uDFB5' },
  { name: 'Clinicas', emoji: '\uD83E\uDE7A' },
  { name: 'Veterinaria', emoji: '\uD83D\uDC3E' },
  { name: 'Floristeria', emoji: '\uD83C\uDF3A' },
  { name: 'Legal', emoji: '\u2696\uFE0F' },
  { name: 'Turismo', emoji: '\u2708\uFE0F' },
  { name: 'Tecnologia', emoji: '\uD83D\uDCBB' },
];

export function Industries() {
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
          gsap.set('.ind-heading, .ind-pill', { autoAlpha: 1 });
          return;
        }

        // Heading
        gsap.from('.ind-heading', {
          y: 40,
          autoAlpha: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.ind-heading',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        // Pills batch stagger
        ScrollTrigger.batch('.ind-pill', {
          onEnter: (batch) => {
            gsap.from(batch, {
              y: 20,
              autoAlpha: 0,
              scale: 0.95,
              stagger: 0.05,
              duration: 0.4,
              ease: 'power2.out',
            });
          },
          start: 'top 90%',
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} id="industries" className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: 'var(--color-surface-inverse)' }}>
      <div className="mx-auto max-w-5xl">
        <div className="ind-heading invisible text-center">
          <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Verticales
          </p>
          <h2 className="nerbis-display mt-4 text-3xl sm:text-4xl lg:text-5xl" style={{ color: 'var(--color-text-inverse)' }}>
            Hecho para tu industria.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg" style={{ color: 'var(--color-text-muted)' }}>
            Cada sitio se genera con el contenido, estructura y diseno optimo para tu tipo de negocio.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-2.5">
          {industries.map((industry) => (
            <div
              key={industry.name}
              className="ind-pill invisible hover-lift group flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm transition-all"
              style={{ borderColor: 'var(--color-border-default)', background: 'color-mix(in oklch, var(--color-surface-raised) 80%, transparent)' }}
            >
              <span className="text-base" role="img" aria-label={industry.name}>
                {industry.emoji}
              </span>
              <span className="transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                {industry.name}
              </span>
            </div>
          ))}
          <div className="ind-pill invisible flex items-center rounded-full border border-dashed px-4 py-2.5 text-sm" style={{ borderColor: 'var(--primitive-gray-700)', color: 'var(--color-text-disabled)' }}>
            +7 mas
          </div>
        </div>
      </div>
    </section>
  );
}
