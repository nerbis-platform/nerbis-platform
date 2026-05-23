'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { IndustriesContent } from '@/types/marketing';

gsap.registerPlugin(ScrollTrigger);

interface IndustriesProps {
  content: IndustriesContent;
}

export function Industries({ content }: IndustriesProps) {
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
    <section ref={sectionRef} id="industries" className="bg-muted/50 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="ind-heading invisible text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {content.badge}
          </p>
          <h2 className="nerbis-display mt-4 text-3xl text-foreground sm:text-4xl lg:text-5xl">
            {content.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            {content.subtitle}
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-2.5">
          {content.industries.map((industry) => (
            <div
              key={industry.name}
              className="ind-pill invisible hover-lift group flex items-center gap-2.5 rounded-full border border-border bg-background px-4 py-2.5 text-sm transition-all"
            >
              <span className="text-base" role="img" aria-label={industry.name}>
                {industry.emoji}
              </span>
              <span className="text-muted-foreground transition-colors">
                {industry.name}
              </span>
            </div>
          ))}
          <div className="ind-pill invisible flex items-center rounded-full border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground/60">
            {content.overflow_text}
          </div>
        </div>
      </div>
    </section>
  );
}
