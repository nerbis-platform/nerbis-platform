'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { type VerticalPreview, verticals } from './showcase-helpers';

gsap.registerPlugin(ScrollTrigger);

function BrowserMockup({ vertical }: { vertical: VerticalPreview }) {
  return (
    <div className="showcase-card invisible hover-lift overflow-hidden rounded-xl border border-border bg-background shadow-lg shadow-black/5 transition-shadow">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-muted px-3 py-2">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-red-400/60" />
          <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
          <div className="h-2 w-2 rounded-full bg-green-400/60" />
        </div>
        <div className="mx-auto flex h-5 w-full max-w-[180px] items-center justify-center rounded bg-background px-2">
          <span className="truncate text-[10px] text-muted-foreground">
            {vertical.slug}.nerbis.com
          </span>
        </div>
      </div>

      {/* Site preview content */}
      <div className="bg-background">
        {/* Nav bar */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1.5">
            <div
              className="h-4 w-4 rounded"
              style={{ background: vertical.accent }}
            />
            <div className="h-1.5 w-12 rounded bg-foreground/60" />
          </div>
          <div className="hidden gap-3 sm:flex">
            {vertical.navItems.map((item) => (
              <span
                key={item}
                className="text-[9px] text-muted-foreground/50"
              >
                {item}
              </span>
            ))}
          </div>
          <div
            className="h-4 w-10 rounded-full"
            style={{ background: vertical.accent }}
          />
        </div>

        {/* Hero section */}
        <div
          className="px-3 py-5 sm:px-4 sm:py-6"
          style={{ background: vertical.accentLight }}
        >
          <div className="h-1 w-10 rounded" style={{ background: vertical.accent, opacity: 0.4 }} />
          <div className="mt-2 h-3 w-3/4 rounded bg-foreground/70" />
          <div className="mt-1.5 h-2 w-1/2 rounded bg-muted-foreground/30" />
          <div
            className="mt-3 h-5 w-16 rounded-full"
            style={{ background: vertical.accent }}
          />
        </div>

        {/* Product/service cards */}
        <div className="grid grid-cols-3 gap-1.5 p-3">
          {vertical.cards.map((card) => (
            <div
              key={card.label}
              className="rounded-md border border-border bg-background p-1.5"
            >
              <div className="mb-1.5 aspect-[4/3] rounded bg-muted" />
              <div className="h-1 w-3/4 rounded bg-foreground/40" />
              <div className="mt-0.5 h-1 w-1/2 rounded bg-muted-foreground/25" />
            </div>
          ))}
        </div>
      </div>

      {/* Industry label */}
      <div className="border-t border-border px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-foreground">{vertical.name}</p>
            <p className="text-[10px] text-muted-foreground">{vertical.industry}</p>
          </div>
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: vertical.accent }}
          />
        </div>
      </div>
    </div>
  );
}

export function Showcase() {
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
          gsap.set('.showcase-heading, .showcase-card', { autoAlpha: 1 });
          return;
        }

        // Heading reveal
        gsap.from('.showcase-heading', {
          y: 40,
          autoAlpha: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.showcase-heading',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        // Cards batch stagger
        ScrollTrigger.batch('.showcase-card', {
          onEnter: (batch) => {
            gsap.from(batch, {
              y: 50,
              autoAlpha: 0,
              scale: 0.96,
              stagger: 0.15,
              duration: 0.7,
              ease: 'power2.out',
            });
          },
          start: 'top 88%',
        });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="bg-background px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="showcase-heading invisible text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Capacidades
          </p>
          <h2 className="nerbis-display mt-4 text-3xl text-foreground sm:text-4xl lg:text-5xl">
            Generado por Pipe en 30 segundos
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Solo cuentale tu idea. Pipe disena, escribe y publica tu sitio.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {verticals.map((vertical) => (
            <BrowserMockup key={vertical.slug} vertical={vertical} />
          ))}
        </div>
      </div>
    </section>
  );
}
