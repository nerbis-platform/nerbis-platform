'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { IndustryGalleryCard } from '@/types/marketing';

gsap.registerPlugin(ScrollTrigger);

function GalleryCardItem({ card }: { card: IndustryGalleryCard }) {
  return (
    <div className="group relative h-[130px] w-[200px] shrink-0 overflow-hidden rounded-xl sm:h-[140px] sm:w-[220px]">
      {/* Background — image or gradient */}
      {card.image ? (
        <img
          src={card.image}
          alt={card.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
          style={{ background: card.gradient }}
        />
      )}
      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {/* Label */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <span className="text-sm font-medium text-white">{card.name}</span>
      </div>
    </div>
  );
}

export function SocialProof({ cards }: { cards: IndustryGalleryCard[] }) {
  const sectionRef = useRef<HTMLElement>(null);

  const visibleCards = cards.filter((c) => c.is_visible);
  const row1 = visibleCards
    .filter((c) => c.row === 1)
    .sort((a, b) => a.sort_order - b.sort_order);
  const row2 = visibleCards
    .filter((c) => c.row === 2)
    .sort((a, b) => a.sort_order - b.sort_order);

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
            <GalleryCardItem key={`r1-${card.id}-${i}`} card={card} />
          ))}
        </div>
      </div>

      {/* Row 2 — moves right */}
      <div className="sp-row-2 invisible marquee-container relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-32" />
        <div className="marquee-track-reverse flex w-max items-center gap-4">
          {items2.map((card, i) => (
            <GalleryCardItem key={`r2-${card.id}-${i}`} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
