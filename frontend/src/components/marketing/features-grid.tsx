'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  ShoppingBag,
  CalendarCheck,
  BarChart3,
  Star,
  TrendingUp,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    icon: ShoppingBag,
    title: 'Tienda online',
    description: 'Catálogo, carrito y pagos integrados. Vende desde el primer día.',
    visual: 'store',
  },
  {
    icon: CalendarCheck,
    title: 'Reservas',
    description: 'Tus clientes reservan solos. Sin llamadas, sin WhatsApp.',
    visual: 'calendar',
  },
  {
    icon: TrendingUp,
    title: 'Marketing',
    description: 'Campañas y notificaciones automáticas que traen clientes de vuelta.',
    visual: 'chart-bars',
  },
  {
    icon: Star,
    title: 'Reseñas',
    description: 'Reseñas reales que generan confianza y mejoran tu posición en Google.',
    visual: 'reviews',
  },
  {
    icon: BarChart3,
    title: 'Analíticas',
    description: 'Métricas claras de visitas, ventas y rendimiento. Sin complicaciones.',
    visual: 'chart-line',
  },
];

// ─── Mini visuals for each feature card ─────────────────

function StoreVisual() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <div className="aspect-square rounded-lg bg-muted" />
      <div className="aspect-square rounded-lg bg-muted/60" />
      <div className="col-span-2 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
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
        <div key={slot.time} className="flex items-center gap-2">
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
          className="flex-1 rounded-sm bg-foreground/10"
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
          <svg key={s} aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill={s <= 4 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={s <= 4 ? 'text-amber-400' : 'text-muted-foreground/40'}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
        <span className="ml-1 text-xs text-muted-foreground">4.8</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-2 w-full rounded bg-muted" />
        <div className="h-2 w-3/4 rounded bg-muted/60" />
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
        <path d="M0,45 Q20,42 40,38 T80,28 T120,22 T160,15 T200,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-foreground/40" />
        <path d="M0,45 Q20,42 40,38 T80,28 T120,22 T160,15 T200,8 V60 H0 Z" fill="url(#fg-chart-area)" className="text-foreground" />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/60">
        <span>Ene</span>
        <span>Mar</span>
        <span>Jun</span>
        <span>Hoy</span>
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
          gsap.set('.fg-heading, .fg-card', { autoAlpha: 1 });
          return;
        }

        gsap.from('.fg-heading', {
          y: 30, autoAlpha: 0, duration: 0.4, ease: 'power2.out',
          scrollTrigger: { trigger: '.fg-heading', start: 'top 85%', toggleActions: 'play none none none' },
        });

        ScrollTrigger.batch('.fg-card', {
          onEnter: (batch) => {
            gsap.from(batch, {
              y: 20, autoAlpha: 0, stagger: 0.1, duration: 0.4, ease: 'power2.out',
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
        <div className="fg-heading invisible">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
            Módulos
          </p>
          <h2 className="nerbis-display mt-3 text-3xl text-foreground sm:text-4xl lg:text-5xl">
            Todo lo que necesitas.{' '}
            <span className="text-muted-foreground">Nada que sobre.</span>
          </h2>
        </div>

        {/* 3 top + 2 bottom — asymmetric, not bento */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.slice(0, 3).map((feature) => {
            const Visual = VISUAL_MAP[feature.visual];
            return (
              <div
                key={feature.title}
                className="fg-card invisible rounded-2xl border border-border bg-background p-6"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground">
                  <feature.icon size={16} className="text-background" />
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
                className="fg-card invisible rounded-2xl border border-border bg-background p-6"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground">
                  <feature.icon size={16} className="text-background" />
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
