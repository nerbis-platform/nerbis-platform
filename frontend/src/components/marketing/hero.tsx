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
          gsap.set('.hero-pipe-wrap, .hero-title, .hero-subtitle, .hero-cta', { autoAlpha: 1 });
          return;
        }

        // Hero entrance timeline
        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

        tl.from('.hero-pipe-wrap', { scale: 0.5, autoAlpha: 0, duration: 0.7 })
          .from('.hero-title', { y: 60, autoAlpha: 0, duration: 0.8 }, '-=0.3')
          .from('.hero-subtitle', { y: 40, autoAlpha: 0, duration: 0.6 }, '-=0.4')
          .from('.hero-cta', { y: 30, autoAlpha: 0, duration: 0.5 }, '-=0.3');

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

        {/* Headline */}
        <h1 className="hero-title nerbis-display invisible text-4xl text-foreground sm:text-5xl lg:text-6xl">
          ¡Hazlo real!
          <br />
          <span className="text-primary">Tu sitio web, creado por IA</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle invisible mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Solo cuentale tu idea a <span className="pipe-name">Pipe</span>.
          El se encarga del resto.
        </p>

        {/* Single primary CTA with Pipe */}
        <div className="hero-cta invisible mt-8 flex flex-col items-center gap-3">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3.5 text-base font-medium text-background transition-all hover:opacity-90"
          >
            Empezar gratis
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          <span className="text-xs text-muted-foreground">
            Sin tarjeta de credito · Listo en 30 segundos
          </span>
        </div>

      </div>
    </section>
  );
}
