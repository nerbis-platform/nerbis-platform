'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

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
          gsap.set('.features-heading, .features-card', { autoAlpha: 1 });
          return;
        }

        // Section heading reveal
        gsap.from('.features-heading', {
          y: 40,
          autoAlpha: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.features-heading',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        // Cards batch stagger
        ScrollTrigger.batch('.features-card', {
          onEnter: (batch) => {
            gsap.from(batch, {
              y: 40,
              autoAlpha: 0,
              scale: 0.95,
              stagger: 0.12,
              duration: 0.6,
              ease: 'power2.out',
            });
          },
          start: 'top 85%',
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} id="features" className="px-4 py-16 sm:px-6 sm:py-20" style={{ background: 'var(--color-surface-inverse)' }}>
      <div className="mx-auto max-w-5xl">
        <div className="features-heading invisible text-center">
          <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Modulos
          </p>
          <h2 className="nerbis-display mt-4 text-3xl sm:text-4xl lg:text-5xl" style={{ color: 'var(--color-text-inverse)' }}>
            Todo lo que necesitas.
            <br />
            <span style={{ color: 'var(--color-text-muted)' }}>Nada que no necesites.</span>
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="mt-16 grid grid-cols-1 gap-3 sm:grid-cols-6">

          {/* Sitio web con IA -- hero card */}
          <div className="features-card invisible hover-lift group relative overflow-hidden rounded-2xl border p-6 sm:col-span-4 sm:row-span-2 sm:p-8 transition-colors" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-surface-raised)' }}>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ color: 'var(--primitive-brand-400)', background: 'color-mix(in oklch, var(--primitive-brand-600) 12%, transparent)' }}>
                <span className="h-1 w-1 rounded-full" style={{ background: 'var(--primitive-brand-400)' }} />
                Diferenciador
              </span>
              <h3 className="mt-4 text-xl font-semibold sm:text-2xl" style={{ color: 'var(--color-text-inverse)' }}>
                Sitio web generado por IA
              </h3>
              <p className="mt-2 max-w-sm text-base leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Pipe, nuestro asistente de IA, analiza tu industria y genera un sitio unico. No un template mas.
              </p>
            </div>
            {/* Mini browser mockup */}
            <div className="mt-6 overflow-hidden rounded-lg shadow-lg" style={{ border: `1px solid color-mix(in oklch, var(--color-border-strong) 50%, transparent)` }}>
              <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: `1px solid color-mix(in oklch, var(--color-border-strong) 50%, transparent)`, background: 'var(--primitive-gray-800)' }}>
                <div className="h-2 w-2 rounded-full bg-red-400/60" />
                <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
                <div className="h-2 w-2 rounded-full bg-green-400/60" />
                <div className="ml-3 flex h-4 w-32 items-center justify-center rounded" style={{ background: 'color-mix(in oklch, var(--color-border-strong) 50%, transparent)' }}>
                  <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>tunegocio.nerbis.com</span>
                </div>
              </div>
              <div className="p-4" style={{ background: 'var(--primitive-gray-50)' }}>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 flex flex-col gap-2">
                    <div className="h-2.5 w-20 rounded" style={{ background: 'color-mix(in oklch, var(--primitive-brand-600) 30%, transparent)' }} />
                    <div className="h-4 w-44 rounded bg-gray-800/80" />
                    <div className="h-4 w-36 rounded bg-gray-800/50" />
                    <div className="mt-3 h-2.5 w-full rounded bg-gray-300/60" />
                    <div className="h-2.5 w-4/5 rounded bg-gray-300/40" />
                    <div className="mt-3 flex gap-2">
                      <div className="h-8 w-20 rounded-md" style={{ background: 'var(--primitive-brand-600)' }} />
                      <div className="h-8 w-16 rounded-md border border-gray-300 bg-white" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="aspect-square rounded-md bg-gray-200" />
                    <div className="h-2 w-full rounded bg-gray-300/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tienda online */}
          <div className="features-card invisible hover-lift group relative overflow-hidden rounded-2xl border p-6 sm:col-span-2 transition-colors" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-surface-raised)' }}>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-inverse)' }}>Tienda online</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Catalogo, carrito y pagos integrados.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="aspect-square rounded-lg" style={{ background: 'color-mix(in oklch, var(--primitive-gray-800) 60%, transparent)' }} />
              <div className="aspect-square rounded-lg" style={{ background: 'color-mix(in oklch, var(--primitive-gray-800) 40%, transparent)' }} />
              <div className="col-span-2 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'color-mix(in oklch, var(--primitive-gray-800) 30%, transparent)' }}>
                <div className="h-2 w-12 rounded" style={{ background: 'color-mix(in oklch, var(--primitive-brand-600) 40%, transparent)' }} />
                <div className="ml-auto h-2 w-8 rounded" style={{ background: 'var(--primitive-gray-700)' }} />
              </div>
            </div>
          </div>

          {/* Reservas */}
          <div className="features-card invisible hover-lift group relative overflow-hidden rounded-2xl border p-6 sm:col-span-2 transition-colors" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-surface-raised)' }}>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-inverse)' }}>Reservas</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Agenda de citas para servicios.
            </p>
            <div className="mt-4 flex flex-col gap-1.5">
              {[
                { time: '10:00', w: 'w-3/4', bg: 'color-mix(in oklch, var(--primitive-brand-600) 12%, transparent)', border: 'color-mix(in oklch, var(--primitive-brand-400) 20%, transparent)' },
                { time: '11:30', w: 'w-1/2', bg: 'color-mix(in oklch, var(--primitive-gray-600) 30%, transparent)', border: 'color-mix(in oklch, var(--primitive-gray-700) 30%, transparent)' },
                { time: '14:00', w: 'w-2/3', bg: 'color-mix(in oklch, var(--primitive-navy-700) 15%, transparent)', border: 'color-mix(in oklch, var(--primitive-navy-700) 30%, transparent)' },
              ].map((slot) => (
                <div key={slot.time} className="flex items-center gap-2">
                  <span className="w-10 text-[11px] tabular-nums" style={{ color: 'var(--color-text-disabled)' }}>{slot.time}</span>
                  <div className={`h-7 ${slot.w} rounded-md`} style={{ background: slot.bg, border: `1px solid ${slot.border}` }} />
                </div>
              ))}
            </div>
          </div>

          {/* Marketing */}
          <div className="features-card invisible hover-lift group relative overflow-hidden rounded-2xl border p-6 sm:col-span-2 transition-colors" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-surface-raised)' }}>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-inverse)' }}>Marketing</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Campanas y notificaciones automaticas.
            </p>
            <div className="mt-4 flex items-end gap-1">
              {[40, 55, 35, 65, 50, 72, 60, 80, 68, 90, 75, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${h * 0.6}px`,
                    background: `linear-gradient(to top, color-mix(in oklch, var(--primitive-brand-600) 25%, transparent), color-mix(in oklch, var(--primitive-navy-700) 15%, transparent))`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Resenas */}
          <div className="features-card invisible hover-lift group relative overflow-hidden rounded-2xl border p-6 sm:col-span-2 transition-colors" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-surface-raised)' }}>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-inverse)' }}>Resenas</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Opiniones que generan confianza.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex gap-1">
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= 4 ? '#facc15' : 'none'} stroke={s <= 4 ? '#facc15' : 'var(--primitive-gray-700)'} strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
                <span className="ml-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>4.8</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-2 w-full rounded" style={{ background: 'color-mix(in oklch, var(--primitive-gray-800) 60%, transparent)' }} />
                <div className="h-2 w-3/4 rounded" style={{ background: 'color-mix(in oklch, var(--primitive-gray-800) 40%, transparent)' }} />
              </div>
            </div>
          </div>

          {/* Analiticas */}
          <div className="features-card invisible hover-lift group relative overflow-hidden rounded-2xl border p-6 sm:col-span-2 transition-colors" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-surface-raised)' }}>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-inverse)' }}>Analiticas</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Metricas de visitas y rendimiento.
            </p>
            <div className="mt-4">
              <svg viewBox="0 0 200 60" className="w-full" fill="none">
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primitive-brand-600)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="var(--primitive-brand-600)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,45 Q20,42 40,38 T80,28 T120,22 T160,15 T200,8" stroke="var(--primitive-brand-600)" strokeWidth="2" strokeLinecap="round" />
                <path d="M0,45 Q20,42 40,38 T80,28 T120,22 T160,15 T200,8 V60 H0 Z" fill="url(#chart-grad)" />
              </svg>
              <div className="mt-2 flex justify-between text-[10px]" style={{ color: 'var(--color-text-disabled)' }}>
                <span>Ene</span>
                <span>Mar</span>
                <span>Jun</span>
                <span>Hoy</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
