'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useCountUp } from '@/components/website/useCountUp';

gsap.registerPlugin(ScrollTrigger);

interface StatItemProps {
  end: number;
  suffix: string;
  label: string;
}

function StatItem({ end, suffix, label }: StatItemProps) {
  const { ref, display } = useCountUp<HTMLDivElement>({ end, suffix, duration: 2000 });

  return (
    <div ref={ref} className="flex flex-col items-center gap-1 px-6 py-2 sm:px-8">
      <span className="text-2xl font-semibold tabular-nums sm:text-3xl" style={{ color: 'var(--color-text-inverse)' }}>{display}</span>
      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  );
}

const stats = [
  { end: 25, suffix: '+', label: 'industrias' },
  { end: 30, suffix: 's', label: 'para tu sitio' },
  { end: 100, suffix: '%', label: 'en espanol' },
  { end: 0, suffix: '', label: 'comisiones' },
];

export function SocialProof() {
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
          gsap.set('.sp-trust, .sp-stats', { autoAlpha: 1 });
          return;
        }

        // Trust line fade in
        gsap.from('.sp-trust', {
          autoAlpha: 0,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        // Stats fade up
        gsap.from('.sp-stats', {
          y: 30,
          autoAlpha: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.sp-stats',
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} style={{ borderTop: `1px solid color-mix(in oklch, var(--color-border-default) 50%, transparent)`, borderBottom: `1px solid color-mix(in oklch, var(--color-border-default) 50%, transparent)`, background: 'var(--color-surface-inverse)' }}>
      {/* Trust line */}
      <div className="sp-trust invisible py-6" style={{ borderBottom: `1px solid color-mix(in oklch, var(--color-border-default) 30%, transparent)` }}>
        <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
          La plataforma todo-en-uno para negocios en Latinoamerica
        </p>
      </div>
      {/* Stats */}
      <div className="sp-stats invisible py-10">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center" style={{ columnGap: 0 }}>
          {stats.map((stat, i) => (
            <div key={stat.label} className="flex items-center">
              {i > 0 && <div className="hidden sm:block h-8 w-px" style={{ background: 'var(--color-border-default)' }} />}
              <StatItem {...stat} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
