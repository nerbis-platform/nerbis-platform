'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { PipeAvatar } from '@/components/pipe-avatar';
import type { PipeMood } from '@/components/pipe-avatar';
import type { HeroContent } from '@/types/marketing';

gsap.registerPlugin(ScrollTrigger);

// ─── Floating particles (fireflies around Pipe) ─────────
function PipeParticles() {
  const particles = [
    { size: 2, x: -55, y: -45, duration: 8, delay: 0 },
    { size: 2.5, x: 50, y: -35, duration: 10, delay: 2 },
    { size: 2, x: -40, y: 40, duration: 9, delay: 1.5 },
    { size: 2, x: 45, y: 50, duration: 11, delay: 3 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: '50%',
            top: '50%',
            background: 'var(--primitive-brand-400)',
            boxShadow: '0 0 3px var(--primitive-brand-400)',
            opacity: 0,
            transform: `translate(${p.x}px, ${p.y}px)`,
            animation: `pipe-firefly ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

interface HeroProps {
  content: HeroContent;
}

export function Hero({ content }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [pipeMood, setPipeMood] = useState<PipeMood>('idle');
  const [pipeHovered, setPipeHovered] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);

  // Detect hover on ANY "Empezar gratis" CTA (hero + header)
  useEffect(() => {
    let wasHovered = false;
    function onMove() {
      const ctas = document.querySelectorAll('a[href="/register"]');
      let hovering = false;
      ctas.forEach((cta) => {
        if (cta.matches(':hover')) hovering = true;
      });
      if (hovering !== wasHovered) {
        wasHovered = hovering;
        setCtaHovered(hovering);
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

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

        // Hero entrance: Pipe drops from above with elastic bounce + squash
        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

        tl.from('.hero-pipe-wrap', {
            y: -120,
            scale: 0.6,
            autoAlpha: 0,
            duration: 0.8,
            ease: 'bounce.out',
          })
          .to('.hero-pipe-wrap', {
            scaleX: 1.15,
            scaleY: 0.85,
            duration: 0.12,
            ease: 'power2.in',
          })
          .to('.hero-pipe-wrap', {
            scaleX: 1,
            scaleY: 1,
            duration: 0.4,
            ease: 'elastic.out(1, 0.4)',
          })
          .from('.hero-title', { y: 60, autoAlpha: 0, duration: 0.8 }, '-=0.5')
          .from('.hero-subtitle', { y: 40, autoAlpha: 0, duration: 0.6 }, '-=0.4')
          .from('.hero-cta', { y: 30, autoAlpha: 0, duration: 0.5 }, '-=0.3');

        // Glow breathes in sync with Pipe
        gsap.to('.pipe-glow-ambient', {
          scale: 1.15,
          opacity: 0.1,
          duration: 3,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });

        // Shadow stretches with breathing
        gsap.to('.pipe-hero-shadow', {
          scaleX: 1.1,
          opacity: 0.04,
          duration: 3,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });

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

        // Pipe parallax — moves slower than content for depth
        gsap.to('.hero-pipe-wrap', {
          yPercent: -15,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });

        // Scroll-triggered mood change
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'bottom 60%',
          onEnter: () => setPipeMood('happy'),
          onLeaveBack: () => setPipeMood('idle'),
        });
      }
    );
  }, { scope: sectionRef });

  // CTA hover → pleading (Puss in Boots eyes), Pipe hover → listening, else scroll mood
  const effectiveMood: PipeMood = ctaHovered ? 'pleading' : pipeHovered ? 'listening' : pipeMood;

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
          <div
            className="pipe-hero-glow relative"
            onMouseEnter={() => setPipeHovered(true)}
            onMouseLeave={() => setPipeHovered(false)}
          >
            {/* Ambient glow — breathes in sync */}
            <div
              className="pipe-glow-ambient pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: '200px',
                height: '200px',
                background: `radial-gradient(circle, var(--primitive-brand-500) 0%, transparent 70%)`,
                opacity: 0.06,
                filter: 'blur(30px)',
              }}
              aria-hidden="true"
            />

            {/* Floating particles */}
            <PipeParticles />

            {/* Living shadow below Pipe */}
            <div
              className="pipe-hero-shadow pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{
                width: '60px',
                height: '12px',
                borderRadius: '50%',
                background: 'var(--primitive-navy-700)',
                opacity: 0.06,
                filter: 'blur(4px)',
              }}
              aria-hidden="true"
            />

            <PipeAvatar mood={effectiveMood} size={140} />
          </div>
        </div>

        {/* Headline */}
        <h1 className="hero-title nerbis-display invisible text-4xl text-foreground sm:text-5xl lg:text-6xl">
          {content.title_line1}
          <br />
          <span className="text-primary">{content.title_line2}</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle invisible mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {content.subtitle}
        </p>

        {/* Single primary CTA */}
        <div className="hero-cta invisible mt-8 flex flex-col items-center gap-3">
          <Link
            href={content.cta_href}
            className="group inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3.5 text-base font-medium text-background transition-all hover:opacity-90"
          >
            {content.cta_text}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          <span className="text-xs text-muted-foreground">
            {content.cta_subtext}
          </span>
        </div>

      </div>
    </section>
  );
}
