'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
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
          gsap.set('.hero-badge, .hero-title, .hero-subtitle, .hero-cta, .hero-preview', { autoAlpha: 1 });
          return;
        }

        // Hero entrance timeline
        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

        tl.from('.hero-badge', { y: 30, autoAlpha: 0, duration: 0.5 })
          .from('.hero-title', { y: 60, autoAlpha: 0, duration: 0.8 }, '-=0.3')
          .from('.hero-subtitle', { y: 40, autoAlpha: 0, duration: 0.6 }, '-=0.4')
          .from('.hero-cta', { y: 30, autoAlpha: 0, duration: 0.5 }, '-=0.3')
          .from('.hero-preview', { y: 40, autoAlpha: 0, scale: 0.97, duration: 0.8 }, '-=0.3');

        // Parallax on the glow element
        gsap.to('.hero-glow', {
          yPercent: -20,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="nerbis-grain relative overflow-hidden px-4 pb-24 pt-24 sm:px-6 sm:pb-32 sm:pt-32" style={{ background: 'var(--color-surface-inverse)' }}>
      {/* Glow -- brand colors */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div
          className="hero-glow absolute left-1/2 top-1/4 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[100px]"
          style={{ background: `radial-gradient(ellipse, var(--primitive-brand-600) 0%, var(--primitive-navy-700) 50%, transparent 80%)` }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="hero-badge invisible mb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm" style={{ borderColor: 'var(--color-border-default)', background: 'color-mix(in oklch, var(--color-surface-inverse) 90%, transparent)', color: 'var(--color-text-secondary)' }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full opacity-75" style={{ background: 'var(--primitive-brand-400)' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--primitive-brand-400)' }} />
            </span>
            Disponible en Latinoamerica
          </span>
        </div>

        {/* Headline */}
        <h1 className="hero-title nerbis-display invisible text-4xl sm:text-5xl lg:text-6xl" style={{ color: 'var(--color-text-inverse)' }}>
          Crea el sitio web de tu negocio
          <br className="hidden sm:block" />
          <span style={{ color: 'var(--primitive-brand-400)' }}>en segundos</span>, no en semanas.
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle invisible mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--color-text-muted)' }}>
          Dinos que tipo de negocio tienes y Pipe, nuestro asistente de IA,
          genera un sitio profesional listo para publicar.
        </p>

        {/* Single primary CTA */}
        <div className="hero-cta invisible mt-8 flex flex-col items-center gap-3">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-medium transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)`, color: 'var(--color-text-inverse)' }}
          >
            Crear mi tienda gratis
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>Sin tarjeta de credito</span>
        </div>

        {/* Product preview */}
        <div className="hero-preview invisible mx-auto mt-14 max-w-3xl">
          <div className="overflow-hidden rounded-xl shadow-2xl shadow-black/40 ring-1 ring-white/5" style={{ border: `1px solid color-mix(in oklch, var(--color-border-strong) 50%, transparent)` }}>
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid color-mix(in oklch, var(--color-border-strong) 50%, transparent)`, background: 'var(--primitive-gray-800)' }}>
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
              </div>
              <div className="mx-auto flex h-6 w-full max-w-[240px] items-center justify-center rounded px-3" style={{ background: 'color-mix(in oklch, var(--color-border-strong) 50%, transparent)' }}>
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>misalon.nerbis.com</span>
              </div>
            </div>
            {/* Site preview */}
            <div style={{ background: 'var(--primitive-gray-50)' }}>
              {/* Nav */}
              <div className="flex items-center justify-between px-5 py-2.5" style={{ borderBottom: `1px solid var(--color-border-default)` }}>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded" style={{ background: 'var(--primitive-navy-700)' }} />
                  <div className="h-2 w-16 rounded bg-gray-800/70" />
                </div>
                <div className="hidden gap-4 sm:flex">
                  <div className="h-1.5 w-10 rounded bg-gray-400/50" />
                  <div className="h-1.5 w-8 rounded bg-gray-400/50" />
                  <div className="h-1.5 w-12 rounded bg-gray-400/50" />
                </div>
                <div className="h-5 w-14 rounded-full" style={{ background: 'var(--primitive-brand-600)' }} />
              </div>
              {/* Hero of generated site */}
              <div className="px-5 py-8 sm:px-8 sm:py-12">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
                  <div className="flex flex-col gap-2.5 flex-1">
                    <div className="h-1.5 w-16 rounded" style={{ background: 'color-mix(in oklch, var(--primitive-brand-600) 30%, transparent)' }} />
                    <div className="h-4 w-52 max-w-full rounded bg-gray-800/80" />
                    <div className="h-4 w-40 max-w-full rounded bg-gray-800/50" />
                    <div className="mt-3 flex flex-col gap-1.5">
                      <div className="h-2 w-full max-w-[220px] rounded bg-gray-300/60" />
                      <div className="h-2 w-4/5 max-w-[180px] rounded bg-gray-300/40" />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <div className="h-7 w-20 rounded-full" style={{ background: 'var(--primitive-brand-600)' }} />
                      <div className="h-7 w-16 rounded-full border border-gray-300 bg-white" />
                    </div>
                  </div>
                  <div className="hidden aspect-square w-36 rounded-xl bg-gray-200 sm:block" />
                </div>
              </div>
              {/* Services cards */}
              <div className="px-5 pb-5 pt-4 sm:px-8" style={{ borderTop: `1px solid var(--color-border-default)` }}>
                <div className="grid grid-cols-3 gap-2.5">
                  {['Corte y Peinado', 'Color y Mechas', 'Tratamientos'].map((name) => (
                    <div key={name} className="rounded-lg border border-gray-200 bg-white p-2.5">
                      <div className="mb-2 h-10 rounded bg-gray-100" />
                      <div className="h-1.5 w-3/4 rounded bg-gray-700/40" />
                      <div className="mt-1 h-1.5 w-1/2 rounded bg-gray-400/30" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
