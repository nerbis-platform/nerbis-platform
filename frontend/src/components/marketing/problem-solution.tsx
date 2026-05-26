'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { ProblemSolutionContent } from '@/types/marketing';

gsap.registerPlugin(ScrollTrigger);

interface ProblemSolutionProps {
  content: ProblemSolutionContent;
}

export function ProblemSolution({ content }: ProblemSolutionProps) {
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
          gsap.set('.ps-heading, .ps-before, .ps-after, .ps-row', { autoAlpha: 1 });
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

        // Column labels
        gsap.from('.ps-before', {
          x: -30,
          autoAlpha: 0,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.ps-columns',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        gsap.from('.ps-after', {
          x: 30,
          autoAlpha: 0,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.ps-columns',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        // Rows stagger in
        gsap.from('.ps-row', {
          y: 20,
          autoAlpha: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.ps-columns',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="bg-muted/30 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="ps-heading invisible">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground/60">
            {content.badge}
          </p>
          <h2 className="nerbis-display mt-3 max-w-2xl text-3xl text-foreground sm:text-4xl lg:text-5xl">
            {content.title.includes('merece mas')
              ? <>
                  {content.title.split('merece mas')[0]}
                  <span className="text-primary">merece más</span>
                </>
              : content.title}
          </h2>
        </div>

        <div className="ps-columns relative mt-16">
          {/* Column headers */}
          <div className="grid sm:grid-cols-[5fr_7fr]">
            <p className="ps-before invisible order-2 mb-6 text-sm font-medium uppercase tracking-widest text-muted-foreground/40 sm:order-1 sm:pr-10">
              {content.before_label}
            </p>
            <p className="ps-after invisible order-1 mb-6 text-sm font-medium uppercase tracking-widest text-muted-foreground sm:order-2 sm:pl-10">
              {content.after_label}
            </p>
          </div>

          {/* Comparison rows — aligned across columns */}
          {content.comparisons.map((item, index) => (
            <div key={index} className="ps-row invisible relative grid sm:grid-cols-[5fr_7fr]">
              {/* Vertical separator per row */}
              <div
                className="pointer-events-none absolute inset-y-0 left-[calc(5/12*100%)] hidden w-px sm:block"
                style={{ backgroundColor: 'var(--border)', opacity: 0.4 }}
                aria-hidden="true"
              />

              {/* Before */}
              <div className="order-2 border-t border-border/40 py-4 sm:order-1 sm:pr-10">
                <span className="text-muted-foreground/50 line-through decoration-muted-foreground/20">
                  {item.before}
                </span>
              </div>

              {/* After */}
              <div className="order-1 flex items-start gap-3 border-t border-border/40 py-4 sm:order-2 sm:pl-10">
                <span
                  className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'var(--primitive-brand-600)' }}
                  aria-hidden="true"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className={index === 0 ? 'font-medium text-foreground' : 'text-foreground/80'}>
                  {item.after}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
