'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export function CtaMid() {
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
          gsap.set('.ctam-content', { autoAlpha: 1 });
          return;
        }

        gsap.from('.ctam-content', {
          y: 30,
          autoAlpha: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="border-y border-border bg-background px-4 py-10 sm:px-6 sm:py-12">
      <div className="ctam-content invisible mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div>
          <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
            Listo para empezar?
          </h3>
          <p className="mt-1 text-base text-muted-foreground">
            Crea tu sitio en segundos. Sin tarjeta de credito.
          </p>
        </div>
        <Link
          href="/register"
          className="group inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: `linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)` }}
        >
          Empezar gratis
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </section>
  );
}
