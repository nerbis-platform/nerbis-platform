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
    <section ref={sectionRef} className="bg-background px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="ps-heading invisible text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {content.badge}
          </p>
          <h2 className="nerbis-display mt-4 text-3xl text-foreground sm:text-4xl lg:text-5xl">
            {content.title}
          </h2>
        </div>

        <div className="ps-columns mt-16 grid gap-0 sm:grid-cols-2">
          {/* Before column */}
          <div className="ps-before invisible sm:pr-8" style={{ borderRight: '0 solid transparent' }}>
            <p className="mb-6 text-sm font-medium uppercase tracking-wide text-muted-foreground/60">
              {content.before_label}
            </p>
            {content.comparisons.map((item) => (
              <div
                key={item.before}
                className="flex items-start gap-3 border-t border-border/50 py-4"
              >
                <span className="mt-0.5 text-muted-foreground/40" aria-hidden="true">&times;</span>
                <span className="text-muted-foreground line-through decoration-muted-foreground/30">
                  {item.before}
                </span>
              </div>
            ))}
          </div>

          {/* After column */}
          <div className="ps-after invisible mt-8 border-border sm:mt-0 sm:border-l sm:pl-8">
            <p className="mb-6 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {content.after_label}
            </p>
            {content.comparisons.map((item) => (
              <div
                key={item.after}
                className="flex items-start gap-3 border-t border-border/50 py-4"
              >
                <span
                  className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]"
                  style={{ background: `linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)` }}
                  aria-hidden="true"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="text-foreground">{item.after}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
