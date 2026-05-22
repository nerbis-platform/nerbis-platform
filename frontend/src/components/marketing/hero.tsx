'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { PipeAvatar } from '@/components/pipe-avatar';
import type { PipeMood } from '@/components/pipe-avatar';

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [pipeMood, setPipeMood] = useState<PipeMood>('idle');

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
          gsap.set('.hero-pipe-wrap, .hero-badge, .hero-title, .hero-subtitle, .hero-cta, .hero-preview', { autoAlpha: 1 });
          return;
        }

        // Hero entrance timeline
        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

        tl.from('.hero-pipe-wrap', { scale: 0.5, autoAlpha: 0, duration: 0.7 })
          .from('.hero-badge', { y: 30, autoAlpha: 0, duration: 0.5 }, '-=0.3')
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

        // Scroll-triggered mood change: when hero exits viewport, Pipe goes happy
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'bottom 60%',
          onEnter: () => setPipeMood('happy'),
          onLeaveBack: () => setPipeMood('idle'),
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-muted/30 px-4 pb-24 pt-24 sm:px-6 sm:pb-32 sm:pt-32">
      {/* Glow -- brand colors (subtle on light bg) */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div
          className="hero-glow absolute left-1/2 top-1/4 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07] blur-[100px]"
          style={{ background: `radial-gradient(ellipse, var(--primitive-brand-600) 0%, var(--primitive-navy-700) 50%, transparent 80%)` }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Pipe -- hero visual centerpiece */}
        <div className="hero-pipe-wrap invisible mb-8 flex justify-center">
          <div className="pipe-hero-glow relative">
            {/* Ambient glow behind Pipe (very subtle on light) */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: '200px',
                height: '200px',
                background: `radial-gradient(circle, var(--primitive-brand-500) 0%, transparent 70%)`,
                opacity: 0.06,
                filter: 'blur(30px)',
              }}
              aria-hidden="true"
            />
            <PipeAvatar mood={pipeMood} size={140} />
          </div>
        </div>

        {/* Badge */}
        <div className="hero-badge invisible mb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping" style={{ background: 'var(--primitive-brand-400)' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--primitive-brand-400)' }} />
            </span>
            Disponible en Latinoamerica
          </span>
        </div>

        {/* Headline */}
        <h1 className="hero-title nerbis-display invisible text-4xl text-foreground sm:text-5xl lg:text-6xl">
          Tu negocio digital,
          <br />
          <span className="text-primary">creado por IA</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle invisible mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          <span className="pipe-name">Pipe</span>, tu asistente de IA, disena tu tienda completa en segundos.
          Solo cuentale tu idea.
        </p>

        {/* Single primary CTA with Pipe */}
        <div className="hero-cta invisible mt-8 flex flex-col items-center gap-3">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-medium text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)` }}
          >
            Crear mi tienda gratis
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          <span className="text-xs text-muted-foreground">
            Sin tarjeta de credito · <Link href="/login" className="underline underline-offset-2 transition-colors hover:text-foreground">¿Ya tienes cuenta?</Link>
          </span>
        </div>

        {/* Product preview */}
        <div className="hero-preview invisible mx-auto mt-14 max-w-3xl">
          <div className="overflow-hidden rounded-xl shadow-2xl shadow-black/10 ring-1 ring-border">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
              </div>
              <div className="mx-auto flex h-6 w-full max-w-[240px] items-center justify-center rounded bg-background px-3">
                <span className="text-[11px] text-muted-foreground">misalon.nerbis.com</span>
              </div>
            </div>
            {/* Site preview */}
            <div className="bg-background">
              {/* Nav */}
              <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded" style={{ background: 'var(--primitive-navy-700)' }} />
                  <div className="h-2 w-16 rounded bg-foreground/70" />
                </div>
                <div className="hidden gap-4 sm:flex">
                  <div className="h-1.5 w-10 rounded bg-muted-foreground/30" />
                  <div className="h-1.5 w-8 rounded bg-muted-foreground/30" />
                  <div className="h-1.5 w-12 rounded bg-muted-foreground/30" />
                </div>
                <div className="h-5 w-14 rounded-full" style={{ background: 'var(--primitive-brand-600)' }} />
              </div>
              {/* Hero of generated site */}
              <div className="px-5 py-8 sm:px-8 sm:py-12">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
                  <div className="flex flex-1 flex-col gap-2.5">
                    <div className="h-1.5 w-16 rounded" style={{ background: 'color-mix(in oklch, var(--primitive-brand-600) 30%, transparent)' }} />
                    <div className="h-4 w-52 max-w-full rounded bg-foreground/80" />
                    <div className="h-4 w-40 max-w-full rounded bg-foreground/50" />
                    <div className="mt-3 flex flex-col gap-1.5">
                      <div className="h-2 w-full max-w-[220px] rounded bg-muted-foreground/20" />
                      <div className="h-2 w-4/5 max-w-[180px] rounded bg-muted-foreground/15" />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <div className="h-7 w-20 rounded-full" style={{ background: 'var(--primitive-brand-600)' }} />
                      <div className="h-7 w-16 rounded-full border border-border bg-background" />
                    </div>
                  </div>
                  <div className="hidden aspect-square w-36 rounded-xl bg-muted sm:block" />
                </div>
              </div>
              {/* Services cards */}
              <div className="border-t border-border px-5 pb-5 pt-4 sm:px-8">
                <div className="grid grid-cols-3 gap-2.5">
                  {['Corte y Peinado', 'Color y Mechas', 'Tratamientos'].map((name) => (
                    <div key={name} className="rounded-lg border border-border bg-background p-2.5">
                      <div className="mb-2 h-10 rounded bg-muted" />
                      <div className="h-1.5 w-3/4 rounded bg-foreground/40" />
                      <div className="mt-1 h-1.5 w-1/2 rounded bg-muted-foreground/30" />
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
