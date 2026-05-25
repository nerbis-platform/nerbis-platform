'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { PipeStatic } from '@/components/pipe-avatar';
import type { HowItWorksContent } from '@/types/marketing';

gsap.registerPlugin(ScrollTrigger);

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
          gsap.set('.hiw-heading, .hiw-step', { autoAlpha: 1 });
          return;
        }

        // Heading reveal
        gsap.from('.hiw-heading', {
          y: 40,
          autoAlpha: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.hiw-heading',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        // Steps stagger sequentially
        gsap.from('.hiw-step', {
          y: 50,
          autoAlpha: 0,
          duration: 0.6,
          stagger: 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.hiw-steps',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} id="how-it-works" className="border-t border-border bg-muted/50 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="hiw-heading invisible text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {content.badge}
          </p>
          <h2 className="nerbis-display mt-4 text-3xl text-foreground sm:text-4xl lg:text-5xl">
            {content.title}
          </h2>
        </div>

        <div className="hiw-steps mt-16 grid gap-6 sm:grid-cols-3">
          {/* Paso 1 */}
          <div className="hiw-step invisible hover-lift relative rounded-2xl border border-border bg-background p-6">
            <div className="mb-3 flex items-center gap-2">
              <PipeStatic size={36} />
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">{content.steps[0]?.step_label}</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">{content.steps[0]?.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {content.steps[0]?.description}
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <div className="flex h-8 items-center rounded-md border border-border bg-muted/30 px-3">
                <span className="text-[11px] text-muted-foreground/60">Mi Salon de Belleza</span>
              </div>
              <div className="flex h-8 items-center justify-between rounded-md border border-border bg-muted/30 px-3">
                <span className="text-[11px] text-muted-foreground/60">Belleza y Bienestar</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><path d="m6 9 6 6 6-6"/></svg>
              </div>
              <div className="flex h-8 w-24 items-center justify-center rounded-md" style={{ background: `linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)` }}>
                <span className="text-[11px] font-medium text-white">Continuar</span>
              </div>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="hiw-step invisible hover-lift relative rounded-2xl border border-border bg-background p-6">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">{content.steps[1]?.step_label}</span>
            <h3 className="mt-3 text-lg font-semibold text-foreground">{content.steps[1]?.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {content.steps[1]?.description}
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Analizando tu negocio...</span>
                  <span className="text-[11px]" style={{ color: 'var(--primitive-brand-600)' }}>Listo</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: '100%', background: `linear-gradient(90deg, var(--primitive-navy-700), var(--primitive-brand-600))` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Creando contenido...</span>
                  <span className="text-[11px]" style={{ color: 'var(--primitive-brand-600)' }}>Listo</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: '100%', background: `linear-gradient(90deg, var(--primitive-navy-700), var(--primitive-brand-600))` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Aplicando diseno...</span>
                  <span className="text-[11px] font-medium text-foreground">85%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: '85%', background: `linear-gradient(90deg, var(--primitive-navy-700), var(--primitive-brand-600))` }} />
                </div>
              </div>
              <p className="pt-1 text-center text-[11px] text-muted-foreground">
                Tiempo estimado: <span className="font-medium" style={{ color: 'var(--primitive-brand-600)' }}>28 segundos</span>
              </p>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="hiw-step invisible hover-lift relative rounded-2xl border border-border bg-background p-6">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">{content.steps[2]?.step_label}</span>
            <h3 className="mt-3 text-lg font-semibold text-foreground">{content.steps[2]?.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {content.steps[2]?.description}
            </p>
            <div className="mt-5 overflow-hidden rounded-md border border-border bg-muted/30">
              <div className="flex items-center gap-1 border-b border-border px-3 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400/60" />
                <div className="h-1.5 w-1.5 rounded-full bg-yellow-400/60" />
                <div className="h-1.5 w-1.5 rounded-full bg-green-400/60" />
              </div>
              <div className="flex">
                <div className="flex w-10 flex-col gap-1.5 border-r border-border p-1.5">
                  <div className="h-2 w-full rounded" style={{ background: 'color-mix(in oklch, var(--primitive-brand-600) 20%, transparent)' }} />
                  <div className="h-2 w-full rounded bg-muted" />
                  <div className="h-2 w-full rounded bg-muted" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                  <div className="h-2 w-16 rounded bg-muted" />
                  <div className="h-2 w-full rounded bg-muted-foreground/15" />
                  <div className="h-2 w-3/4 rounded bg-muted-foreground/10" />
                  <div className="mt-2 flex h-5 w-12 items-center justify-center rounded" style={{ background: 'color-mix(in oklch, var(--primitive-brand-600) 12%, transparent)' }}>
                    <span className="text-[8px]" style={{ color: 'var(--primitive-brand-600)' }}>Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
