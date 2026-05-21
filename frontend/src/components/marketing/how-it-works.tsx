'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export function HowItWorks() {
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
    <section ref={sectionRef} id="how-it-works" className="px-4 py-16 sm:px-6 sm:py-20" style={{ borderTop: `1px solid color-mix(in oklch, var(--color-border-default) 30%, transparent)`, background: 'var(--color-surface-inverse)' }}>
      <div className="mx-auto max-w-5xl">
        <div className="hiw-heading invisible text-center">
          <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Asi de simple
          </p>
          <h2 className="nerbis-display mt-4 text-3xl sm:text-4xl lg:text-5xl" style={{ color: 'var(--color-text-inverse)' }}>
            Tres pasos. Cero friccion.
          </h2>
        </div>

        <div className="hiw-steps mt-16 grid gap-6 sm:grid-cols-3">
          {/* Paso 1 */}
          <div className="hiw-step invisible hover-lift relative rounded-2xl border p-6" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-surface-raised)' }}>
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-disabled)' }}>Paso 1</span>
            <h3 className="mt-3 text-lg font-semibold" style={{ color: 'var(--color-text-inverse)' }}>Registrate</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Solo necesitas tu nombre, industria y pais.
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <div className="h-8 rounded-md border flex items-center px-3" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-surface-inverse)' }}>
                <span className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>Mi Salon de Belleza</span>
              </div>
              <div className="h-8 rounded-md border flex items-center justify-between px-3" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-surface-inverse)' }}>
                <span className="text-[11px]" style={{ color: 'var(--color-text-disabled)' }}>Belleza y Bienestar</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--primitive-gray-700)' }}><path d="m6 9 6 6 6-6"/></svg>
              </div>
              <div className="h-8 w-24 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)` }}>
                <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-inverse)' }}>Continuar</span>
              </div>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="hiw-step invisible hover-lift relative rounded-2xl border p-6" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-surface-raised)' }}>
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-disabled)' }}>Paso 2</span>
            <h3 className="mt-3 text-lg font-semibold" style={{ color: 'var(--color-text-inverse)' }}>Pipe crea tu sitio</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Pipe, nuestro asistente de IA, genera todo en segundos.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Analizando tu negocio...</span>
                  <span className="text-[11px]" style={{ color: 'var(--primitive-brand-400)' }}>Listo</span>
                </div>
                <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--primitive-gray-800)' }}>
                  <div className="h-full rounded-full" style={{ width: '100%', background: `linear-gradient(90deg, var(--primitive-navy-700), var(--primitive-brand-600))` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Creando contenido...</span>
                  <span className="text-[11px]" style={{ color: 'var(--primitive-brand-400)' }}>Listo</span>
                </div>
                <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--primitive-gray-800)' }}>
                  <div className="h-full rounded-full" style={{ width: '100%', background: `linear-gradient(90deg, var(--primitive-navy-700), var(--primitive-brand-600))` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Aplicando diseno...</span>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-inverse)' }}>85%</span>
                </div>
                <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--primitive-gray-800)' }}>
                  <div className="h-full rounded-full" style={{ width: '85%', background: `linear-gradient(90deg, var(--primitive-navy-700), var(--primitive-brand-600))` }} />
                </div>
              </div>
              <p className="text-center text-[11px] pt-1" style={{ color: 'var(--color-text-muted)' }}>
                Tiempo estimado: <span className="font-medium" style={{ color: 'var(--primitive-brand-400)' }}>28 segundos</span>
              </p>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="hiw-step invisible hover-lift relative rounded-2xl border p-6" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-surface-raised)' }}>
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-disabled)' }}>Paso 3</span>
            <h3 className="mt-3 text-lg font-semibold" style={{ color: 'var(--color-text-inverse)' }}>Personaliza y publica</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Edita lo que quieras. O dejalo tal cual.
            </p>
            <div className="mt-5 overflow-hidden rounded-md border" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-surface-inverse)' }}>
              <div className="flex items-center gap-1 border-b px-3 py-1.5" style={{ borderColor: 'var(--color-border-default)' }}>
                <div className="h-1.5 w-1.5 rounded-full bg-red-400/60" />
                <div className="h-1.5 w-1.5 rounded-full bg-yellow-400/60" />
                <div className="h-1.5 w-1.5 rounded-full bg-green-400/60" />
              </div>
              <div className="flex">
                <div className="w-10 border-r p-1.5 flex flex-col gap-1.5" style={{ borderColor: 'var(--color-border-default)' }}>
                  <div className="h-2 w-full rounded" style={{ background: 'color-mix(in oklch, var(--primitive-brand-600) 25%, transparent)' }} />
                  <div className="h-2 w-full rounded" style={{ background: 'var(--primitive-gray-800)' }} />
                  <div className="h-2 w-full rounded" style={{ background: 'var(--primitive-gray-800)' }} />
                </div>
                <div className="flex-1 p-2.5 flex flex-col gap-1.5">
                  <div className="h-2 w-16 rounded bg-white/10" />
                  <div className="h-2 w-full rounded" style={{ background: 'color-mix(in oklch, var(--primitive-gray-800) 60%, transparent)' }} />
                  <div className="h-2 w-3/4 rounded" style={{ background: 'color-mix(in oklch, var(--primitive-gray-800) 40%, transparent)' }} />
                  <div className="mt-2 h-5 w-12 rounded flex items-center justify-center" style={{ background: 'color-mix(in oklch, var(--primitive-brand-600) 20%, transparent)' }}>
                    <span className="text-[8px]" style={{ color: 'var(--primitive-brand-400)' }}>Live</span>
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
