'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { FEATURES } from './features-grid-helpers';

gsap.registerPlugin(ScrollTrigger);

// ─── Mini visuals for each feature card ─────────────────

function StoreVisual() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <div className="sv-item aspect-square rounded-lg bg-muted" />
      <div className="sv-item aspect-square rounded-lg bg-muted/60" />
      <div className="sv-item col-span-2 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
        <div className="h-2 w-12 rounded bg-primary/30" />
        <div className="ml-auto h-2 w-8 rounded bg-muted-foreground/30" />
      </div>
    </div>
  );
}

function CalendarVisual() {
  const slots = [
    { time: '10:00', w: 'w-3/4' },
    { time: '11:30', w: 'w-1/2' },
    { time: '14:00', w: 'w-2/3' },
  ];
  return (
    <div className="mt-4 flex flex-col gap-1.5">
      {slots.map((slot) => (
        <div key={slot.time} className="cv-slot flex items-center gap-2">
          <span className="w-10 text-[11px] tabular-nums text-muted-foreground/60">{slot.time}</span>
          <div className={`h-7 ${slot.w} rounded-md border border-border bg-muted/30`} />
        </div>
      ))}
    </div>
  );
}

function ChartBarsVisual() {
  const bars = [40, 55, 35, 65, 50, 72, 60, 80, 68, 90, 75, 95];
  return (
    <div className="mt-4 flex items-end gap-1">
      {bars.map((h, i) => (
        <div
          key={i}
          className="cb-bar flex-1 rounded-sm bg-foreground/10"
          style={{ height: `${h * 0.6}px` }}
        />
      ))}
    </div>
  );
}

function ReviewsVisual() {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill={s <= 4 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={`rv-star ${s <= 4 ? 'text-amber-400' : 'text-muted-foreground/40'}`}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
        <span className="rv-text ml-1 text-xs text-muted-foreground">4.8</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="rv-text h-2 w-full rounded bg-muted" />
        <div className="rv-text h-2 w-3/4 rounded bg-muted/60" />
      </div>
    </div>
  );
}

function ChartLineVisual() {
  return (
    <div className="mt-4">
      <svg viewBox="0 0 200 60" className="w-full" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="fg-chart-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="cl-line text-foreground/40" d="M0,45 Q20,42 40,38 T80,28 T120,22 T160,15 T200,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path className="cl-area text-foreground" d="M0,45 Q20,42 40,38 T80,28 T120,22 T160,15 T200,8 V60 H0 Z" fill="url(#fg-chart-area)" />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/60">
        <span className="cl-label">Ene</span>
        <span className="cl-label">Mar</span>
        <span className="cl-label">Jun</span>
        <span className="cl-label">Hoy</span>
      </div>
    </div>
  );
}

const VISUAL_MAP: Record<string, React.FC> = {
  'store': StoreVisual,
  'calendar': CalendarVisual,
  'chart-bars': ChartBarsVisual,
  'reviews': ReviewsVisual,
  'chart-line': ChartLineVisual,
};

// ─── Per-visual GSAP animations ─────────────────────────

const VISUAL_ANIMATIONS: Record<string, (card: Element) => void> = {
  'store': (card) => {
    gsap.to(card.querySelectorAll('.sv-item'), {
      scale: 1, autoAlpha: 1, duration: 0.35, stagger: 0.1, ease: 'power2.out', delay: 0.2,
    });
  },
  'calendar': (card) => {
    gsap.to(card.querySelectorAll('.cv-slot'), {
      x: 0, autoAlpha: 1, duration: 0.3, stagger: 0.08, ease: 'power2.out', delay: 0.2,
    });
  },
  'chart-bars': (card) => {
    gsap.to(card.querySelectorAll('.cb-bar'), {
      scaleY: 1, duration: 0.3, stagger: 0.03, ease: 'power2.out', delay: 0.2,
    });
  },
  'reviews': (card) => {
    gsap.to(card.querySelectorAll('.rv-star'), {
      scale: 1, autoAlpha: 1, duration: 0.2, stagger: 0.06, ease: 'power2.out', delay: 0.2,
    });
    gsap.to(card.querySelectorAll('.rv-text'), {
      autoAlpha: 1, duration: 0.3, stagger: 0.05, ease: 'power2.out', delay: 0.55,
    });
  },
  'chart-line': (card) => {
    const line = card.querySelector('.cl-line') as SVGPathElement | null;
    if (line) {
      const length = line.getTotalLength();
      gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
      gsap.to(line, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out', delay: 0.2 });
    }
    gsap.to(card.querySelectorAll('.cl-area'), {
      autoAlpha: 1, duration: 0.3, ease: 'power2.out', delay: 0.5,
    });
    gsap.to(card.querySelectorAll('.cl-label'), {
      autoAlpha: 1, duration: 0.3, stagger: 0.05, ease: 'power2.out', delay: 0.5,
    });
  },
};

// ─── Main Component ─────────────────────────────────────

export function FeaturesGrid() {
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
          gsap.set('.fg-heading, .fg-card, .sv-item, .cv-slot, .cb-bar, .rv-star, .rv-text, .cl-area, .cl-label', { autoAlpha: 1 });
          gsap.set('.cb-bar', { scaleY: 1 });
          return;
        }

        // Heading entrance
        gsap.set('.fg-heading', { autoAlpha: 0, y: 30 });
        gsap.to('.fg-heading', {
          y: 0, autoAlpha: 1, duration: 0.4, ease: 'power2.out',
          scrollTrigger: { trigger: '.fg-heading', start: 'top 85%', toggleActions: 'play none none none' },
        });

        // Set initial states
        gsap.set('.fg-card', { autoAlpha: 0, y: 20 });
        gsap.set('.sv-item', { scale: 0, autoAlpha: 0 });
        gsap.set('.cv-slot', { x: -20, autoAlpha: 0 });
        gsap.set('.cb-bar', { scaleY: 0, transformOrigin: 'center bottom' });
        gsap.set('.rv-star', { scale: 0, autoAlpha: 0 });
        gsap.set('.rv-text', { autoAlpha: 0 });
        gsap.set('.cl-area', { autoAlpha: 0 });
        gsap.set('.cl-label', { autoAlpha: 0 });

        // Cards entrance + trigger visual animations
        ScrollTrigger.batch('.fg-card', {
          onEnter: (batch) => {
            gsap.to(batch, {
              y: 0, autoAlpha: 1, stagger: 0.1, duration: 0.4, ease: 'power2.out',
            });
            batch.forEach((card) => {
              const visualType = card.getAttribute('data-visual');
              if (visualType && VISUAL_ANIMATIONS[visualType]) {
                VISUAL_ANIMATIONS[visualType](card);
              }
            });
          },
          start: 'top 88%',
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} id="features" className="bg-muted/30 px-4 pt-24 pb-20 sm:px-6 sm:pt-32 sm:pb-24">
      <div className="mx-auto max-w-4xl">
        <div className="fg-heading">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
            Módulos
          </p>
          <h2 className="nerbis-display mt-3 text-3xl text-foreground sm:text-4xl lg:text-5xl">
            Todo lo que necesitas.{' '}
            <span className="text-muted-foreground">Nada que sobre.</span>
          </h2>
        </div>

        {/* 3 top + 2 bottom */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.slice(0, 3).map((feature) => {
            const Visual = VISUAL_MAP[feature.visual];
            return (
              <div
                key={feature.title}
                data-visual={feature.visual}
                className="fg-card rounded-2xl border border-border bg-background p-6"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${feature.iconBg}`}>
                  <feature.icon size={16} className={feature.iconText} />
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                {Visual && <Visual />}
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.slice(3).map((feature) => {
            const Visual = VISUAL_MAP[feature.visual];
            return (
              <div
                key={feature.title}
                data-visual={feature.visual}
                className="fg-card rounded-2xl border border-border bg-background p-6"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${feature.iconBg}`}>
                  <feature.icon size={16} className={feature.iconText} />
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                {Visual && <Visual />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
