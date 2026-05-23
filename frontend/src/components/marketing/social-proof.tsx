'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

interface VerticalCard {
  name: string;
  /** Atmospheric gradient placeholder — replace with real photo path later */
  gradient: string;
}

const row1: VerticalCard[] = [
  { name: 'Tiendas online', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
  { name: 'Restaurantes', gradient: 'linear-gradient(135deg, #4a1942 0%, #6b2d5b 50%, #d63031 100%)' },
  { name: 'Salones de belleza', gradient: 'linear-gradient(135deg, #c6a0a0 0%, #e8c4c4 50%, #f5e6cc 100%)' },
  { name: 'Gimnasios', gradient: 'linear-gradient(135deg, #0d2137 0%, #1b4332 50%, #2d6a4f 100%)' },
  { name: 'Coaches', gradient: 'linear-gradient(135deg, #2c3e50 0%, #3498db 50%, #2980b9 100%)' },
  { name: 'Cafeterias', gradient: 'linear-gradient(135deg, #3e2723 0%, #5d4037 50%, #8d6e63 100%)' },
];

const row2: VerticalCard[] = [
  { name: 'Portafolios', gradient: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2d2d2d 100%)' },
  { name: 'Blogs', gradient: 'linear-gradient(135deg, #1d3557 0%, #457b9d 50%, #a8dadc 100%)' },
  { name: 'Consultorios', gradient: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)' },
  { name: 'Estudios creativos', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)' },
  { name: 'Agencias', gradient: 'linear-gradient(135deg, #141e30 0%, #243b55 50%, #141e30 100%)' },
  { name: 'Fotografos', gradient: 'linear-gradient(135deg, #2c2c2c 0%, #3d3d3d 50%, #1a1a1a 100%)' },
];

function VerticalCardItem({ card }: { card: VerticalCard }) {
  return (
    <div className="group relative h-[130px] w-[200px] shrink-0 overflow-hidden rounded-xl sm:h-[140px] sm:w-[220px]">
      {/* Background — gradient placeholder (replace with next/image later) */}
      <div
        className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
        style={{ background: card.gradient }}
      />
      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {/* Label */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <span className="text-sm font-medium text-white">{card.name}</span>
      </div>
    </div>
  );
}

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
          gsap.set('.sp-row-1, .sp-row-2', { autoAlpha: 1 });
          return;
        }

        const tl = gsap.timeline({
          delay: 0.3,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 95%',
            toggleActions: 'play none none none',
          },
        });

        tl.from('.sp-title', { autoAlpha: 0, y: 20, duration: 0.5, ease: 'power2.out' })
          .from('.sp-row-1', { autoAlpha: 0, y: 30, duration: 0.6, ease: 'power2.out' }, '-=0.2')
          .from('.sp-row-2', { autoAlpha: 0, y: 30, duration: 0.6, ease: 'power2.out' }, '-=0.3');
      }
    );
  }, { scope: sectionRef });

  const items1 = [...row1, ...row1];
  const items2 = [...row2, ...row2];

  return (
    <section ref={sectionRef} className="overflow-hidden bg-background py-12 sm:py-16">
      <p className="sp-title invisible mb-8 text-center text-sm font-medium uppercase tracking-widest text-muted-foreground/60">
        Pipe crea sitios para
      </p>

      {/* Row 1 — moves left */}
      <div className="sp-row-1 invisible marquee-container relative mb-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-32" />
        <div className="marquee-track flex w-max items-center gap-4">
          {items1.map((card, i) => (
            <VerticalCardItem key={`r1-${card.name}-${i}`} card={card} />
          ))}
        </div>
      </div>

      {/* Row 2 — moves right */}
      <div className="sp-row-2 invisible marquee-container relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-32" />
        <div className="marquee-track-reverse flex w-max items-center gap-4">
          {items2.map((card, i) => (
            <VerticalCardItem key={`r2-${card.name}-${i}`} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
