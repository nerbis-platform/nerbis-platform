'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { PipeAvatar } from '@/components/pipe-avatar';

gsap.registerPlugin(ScrollTrigger);

export function CtaFinal() {
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
          gsap.set('.cta-content', { autoAlpha: 1 });
          return;
        }

        gsap.from('.cta-content', {
          y: 40,
          autoAlpha: 0,
          scale: 0.97,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="nerbis-grain relative overflow-hidden bg-foreground px-4 py-24 sm:px-6 sm:py-32">
      {/* Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <div
          className="h-[400px] w-[400px] rounded-full opacity-15 blur-[100px]"
          style={{ background: `radial-gradient(ellipse, var(--primitive-brand-600) 0%, var(--primitive-navy-700) 60%, transparent 80%)` }}
        />
      </div>

      <div className="cta-content invisible relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="nerbis-display text-3xl text-background sm:text-4xl lg:text-5xl">
          Tu negocio merece mas
          <br />
          que un template.
        </h2>

        <div className="mt-10 flex items-center justify-center gap-4">
          <PipeAvatar mood="happy" size={64} />
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
        </div>

        <p className="mt-6 text-sm text-background/60">
          Sin tarjeta de credito. Sin compromisos.
        </p>
      </div>
    </section>
  );
}
