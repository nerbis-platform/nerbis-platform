'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { MessageSquareText, PenLine, Rocket } from 'lucide-react';
import type { HowItWorksContent } from '@/types/marketing';

gsap.registerPlugin(ScrollTrigger);

const ICONS = [MessageSquareText, PenLine, Rocket];

interface HowItWorksProps {
  content: HowItWorksContent;
}

export function HowItWorks({ content }: HowItWorksProps) {
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
          gsap.set('.hiw-heading, .hiw-primary, .hiw-secondary', { autoAlpha: 1 });
          return;
        }

        gsap.from('.hiw-heading', {
          y: 30, autoAlpha: 0, duration: 0.4, ease: 'power2.out',
          scrollTrigger: { trigger: '.hiw-heading', start: 'top 85%', toggleActions: 'play none none none' },
        });

        const gridTrigger = {
          trigger: '.hiw-heading',
          start: 'top 85%',
          toggleActions: 'play none none none' as const,
        };

        gsap.from('.hiw-primary', {
          y: 20, autoAlpha: 0, duration: 0.4, delay: 0.2, ease: 'power2.out',
          scrollTrigger: gridTrigger,
        });

        gsap.from('.hiw-secondary', {
          y: 20, autoAlpha: 0, duration: 0.4, stagger: 0.12, delay: 0.35, ease: 'power2.out',
          scrollTrigger: gridTrigger,
        });
      }
    );
  }, { scope: sectionRef });

  const primary = content.steps[0];
  const secondaries = content.steps.slice(1);

  return (
    <section ref={sectionRef} id="how-it-works" className="px-4 pt-24 pb-20 sm:px-6 sm:pt-32 sm:pb-24">
      <div className="mx-auto max-w-4xl">
        <div className="hiw-heading invisible text-center">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
            {content.badge}
          </p>
          <h2 className="nerbis-display mt-3 text-3xl text-foreground sm:text-4xl lg:text-5xl">
            {content.title}
          </h2>
        </div>

        {/* Asymmetric grid: primary left (large) + secondaries right (stacked) */}
        <div className="hiw-grid mt-12 grid gap-4 lg:grid-cols-[7fr_5fr]">
          {/* Primary block — large */}
          {primary && (
            <div className="hiw-primary invisible flex flex-col justify-center rounded-2xl border border-border bg-background p-8 sm:p-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
                <MessageSquareText size={20} className="text-background" />
              </div>
              <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                {primary.step_label}
              </p>
              <h3 className="mt-3 text-xl font-semibold text-foreground sm:text-2xl">
                {primary.title}
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {primary.description}
              </p>
            </div>
          )}

          {/* Secondary blocks — stacked */}
          <div className="flex flex-col gap-4">
            {secondaries.map((step, i) => {
              const Icon = ICONS[i + 1] || MessageSquareText;
              return (
                <div
                  key={step.step_label}
                  className="hiw-secondary invisible flex flex-1 items-start gap-4 rounded-2xl border border-border bg-background p-6"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground">
                    <Icon size={16} className="text-background" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                      {step.step_label}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
