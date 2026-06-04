'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { PipeAvatar } from '@/components/pipe-avatar';
import type { PipeMood } from '@/components/pipe-avatar';
import { CONVERSATION } from './pipe-demo-helpers';

gsap.registerPlugin(ScrollTrigger);

// ─── Preview Components (realistic miniature site) ──────
function PreviewNav() {
  return (
    <div className="pd-nav pd-el flex items-center justify-between border-b border-border/60 px-4 py-2">
      <span className="text-[10px] font-bold tracking-tight text-foreground">MODA NERBIS</span>
      <nav className="hidden gap-3 sm:flex" aria-label="Navegación demo">
        <span className="text-[8px] text-muted-foreground">Catálogo</span>
        <span className="text-[8px] text-muted-foreground">Nosotros</span>
        <span className="text-[8px] text-muted-foreground">Contacto</span>
      </nav>
      <span role="presentation" className="rounded-md bg-foreground px-2.5 py-0.5 text-[8px] font-medium text-white">
        Comprar
      </span>
    </div>
  );
}

function PreviewHero() {
  return (
    <div className="pd-hero pd-el relative overflow-hidden px-4 py-3 sm:px-6">
      {/* Hero background image */}
      <img
        src="/images/demo/Hero.png"
        alt="Hero de Moda Nerbis"
        className="absolute inset-0 h-full w-full object-cover opacity-20"
      />
      <div className="relative flex items-center gap-4">
        <div className="flex flex-1 flex-col">
          <span className="text-[7px] font-medium uppercase tracking-wider text-muted-foreground">Nueva colección</span>
          <span className="mt-0.5 text-[13px] font-bold leading-tight tracking-tight text-foreground">Estilo urbano</span>
          <span className="text-[12px] font-bold leading-tight tracking-tight text-foreground/70">para cada día</span>
          <p className="mt-1.5 text-[7px] leading-relaxed text-muted-foreground">
            Ropa urbana con personalidad. Envíos a todo el país.
          </p>
          <div className="mt-2.5 flex gap-1.5">
            <div className="rounded-md bg-foreground px-2.5 py-1 text-[7px] font-medium text-white">
              Ver catálogo
            </div>
            <div className="rounded-md border border-border bg-background/80 px-2.5 py-1 text-[7px] font-medium text-foreground/70">
              Ofertas
            </div>
          </div>
        </div>
        <img
          src="/images/demo/Hero.png"
          alt="Producto destacado Moda Nerbis"
          className="hidden h-20 w-20 rounded-lg object-cover sm:block"
        />
      </div>
    </div>
  );
}

function PreviewServices() {
  const products = [
    { name: 'Camisetas', price: '$29.990', img: '/images/demo/Camisetas.png' },
    { name: 'Jeans', price: '$49.990', img: '/images/demo/Jeans.png' },
    { name: 'Accesorios', price: '$14.990', img: '/images/demo/Accesorios.png' },
    { name: 'Zapatos', price: '$69.990', img: '/images/demo/Zapatos.png' },
  ];
  return (
    <div className="pd-services pd-el border-t border-border/60 px-4 pb-2 pt-2 sm:px-6">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[9px] font-semibold text-foreground">Categorías</span>
        <span className="text-[7px] text-muted-foreground">Ver todo →</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {products.map((p) => (
          <div key={p.name} className="pd-card overflow-hidden rounded-lg border border-border bg-background">
            <img src={p.img} alt={p.name} className="h-10 w-full object-cover" />
            <div className="px-1.5 py-1">
              <span className="block text-[7px] font-medium text-foreground">{p.name}</span>
              <span className="text-[6px] text-muted-foreground">{p.price}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewGallery() {
  const images = ['/images/demo/gallery-1.png', '/images/demo/gallery-2.png', '/images/demo/gallery-3.png'];
  return (
    <div className="pd-gallery pd-el border-t border-border/60 px-4 py-2 sm:px-6">
      <span className="mb-1.5 block text-[9px] font-semibold text-foreground">Nuestros productos</span>
      <div className="grid grid-cols-3 gap-1">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Producto de galería ${i + 1}`}
            className="pd-gallery-item aspect-square rounded-md object-cover"
          />
        ))}
      </div>
    </div>
  );
}

function PreviewReviews() {
  const reviews = [
    { name: 'María L.', text: '¡Excelente calidad y envío rápido!' },
    { name: 'Carlos R.', text: 'Me encantó, la ropa es tal cual se ve.' },
  ];
  return (
    <div className="pd-reviews pd-el border-t border-border/60 px-4 py-2 sm:px-6">
      <span className="mb-1.5 block text-[9px] font-semibold text-foreground">Reseñas</span>
      <div className="flex gap-1.5">
        {reviews.map((r) => (
          <div key={r.name} className="pd-review flex-1 rounded-lg border border-border bg-background p-2">
            <div className="mb-0.5 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} aria-hidden="true" width="6" height="6" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-amber-400">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
                </svg>
              ))}
            </div>
            <p className="text-[6px] leading-relaxed text-muted-foreground">{r.text}</p>
            <div className="mt-1 flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-muted" />
              <span className="text-[6px] font-medium text-foreground/60">{r.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewContact() {
  return (
    <div className="pd-contact pd-el border-t border-border/60 px-4 py-2 sm:px-6">
      <div className="flex gap-3">
        <div className="flex-1">
          <span className="block text-[9px] font-semibold text-foreground">Contacto</span>
          <p className="mt-0.5 text-[6px] leading-relaxed text-muted-foreground">
            Calle 85 #12-34, Bogotá<br />
            +57 300 123 4567<br />
            hola@modanerbis.com
          </p>
          <div className="mt-1.5 flex gap-1" aria-label="Redes sociales">
            <a href="#" aria-label="Twitter" className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground/10">
              <svg aria-hidden="true" width="6" height="6" viewBox="0 0 24 24" fill="currentColor" className="text-foreground/50">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
            </a>
            <a href="#" aria-label="Instagram" className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground/10">
              <svg aria-hidden="true" width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground/50">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
              </svg>
            </a>
            <a href="#" aria-label="Facebook" className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground/10">
              <svg aria-hidden="true" width="6" height="6" viewBox="0 0 24 24" fill="currentColor" className="text-foreground/50">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
          </div>
        </div>
        <div
          className="h-16 w-24 rounded-md"
          style={{ background: 'linear-gradient(135deg, #e8e6e3 0%, #d4d0cc 100%)' }}
        >
          <div className="flex h-full items-center justify-center">
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewPublish() {
  return (
    <div className="pd-publish pd-el flex items-center justify-center border-t border-border/60 px-4 py-2.5">
      <div className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5">
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-[11px] font-medium text-white">Publicado</span>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────
export function PipeDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [pipeMood, setPipeMood] = useState<PipeMood>('idle');
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [messages, setMessages] = useState<{ from: 'pipe' | 'user'; text: string }[]>([]);
  const [thinkingText, setThinkingText] = useState<string | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  const hasTriggered = useRef(false);
  const runDemoRef = useRef<(() => void) | null>(null);

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
          gsap.set('.pd-heading, .pd-demo-container', { autoAlpha: 1 });
          return;
        }

        gsap.from('.pd-heading', {
          y: 30, autoAlpha: 0, duration: 0.4, ease: 'power2.out',
          scrollTrigger: { trigger: '.pd-heading', start: 'top 85%', toggleActions: 'play none none none' },
        });

        gsap.from('.pd-demo-container', {
          y: 20, autoAlpha: 0, duration: 0.4, ease: 'power2.out',
          scrollTrigger: { trigger: '.pd-demo-container', start: 'top 85%', toggleActions: 'play none none none' },
        });

        // Auto-trigger demo on scroll
        ScrollTrigger.create({
          trigger: '.pd-demo-container',
          start: 'top 75%',
          once: true,
          onEnter: () => {
            if (!hasTriggered.current) {
              hasTriggered.current = true;
              // Small delay after container fades in
              setTimeout(() => runDemoRef.current?.(), 600);
            }
          },
        });
      }
    );
  }, { scope: sectionRef });

  const scrollChat = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  const revealPreview = useCallback((key: string) => {
    setVisibleSections((prev) => new Set([...prev, key]));

    // Animate newly visible elements after render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!previewRef.current) return;

        const selectorMap: Record<string, string> = {
          'nav-hero': '.pd-nav, .pd-hero',
          'services': '.pd-services',
          'gallery-reviews': '.pd-gallery, .pd-reviews',
          'contact': '.pd-contact',
          'publish': '.pd-publish',
        };

        const selector = selectorMap[key];
        if (!selector) return;

        const els = previewRef.current.querySelectorAll(selector);
        gsap.fromTo(els,
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.15, ease: 'power2.out' },
        );

        // Stagger cards inside services
        if (key === 'services') {
          const cards = previewRef.current.querySelectorAll('.pd-card');
          gsap.fromTo(cards,
            { autoAlpha: 0, scale: 0.9 },
            { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.08, delay: 0.3, ease: 'power2.out' },
          );
        }

        // Stagger gallery items
        if (key === 'gallery-reviews') {
          const items = previewRef.current.querySelectorAll('.pd-gallery-item');
          gsap.fromTo(items,
            { autoAlpha: 0, scale: 0.85 },
            { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.06, delay: 0.2, ease: 'power2.out' },
          );
          const reviews = previewRef.current.querySelectorAll('.pd-review');
          gsap.fromTo(reviews,
            { autoAlpha: 0, x: -8 },
            { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.12, delay: 0.5, ease: 'power2.out' },
          );
        }

        // Publish bounce
        if (key === 'publish') {
          const pub = previewRef.current.querySelector('.pd-publish');
          if (pub) {
            gsap.fromTo(pub,
              { autoAlpha: 0, scale: 0.8 },
              { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' },
            );
          }
        }
      });
    });
  }, []);

  const runDemo = useCallback(() => {
    if (phase === 'running') return;

    setPhase('running');
    setMessages([]);
    setVisibleSections(new Set());
    setPipeMood('listening');

    let totalDelay = 0;

    CONVERSATION.forEach((step) => {
      totalDelay += step.delay;

      // Show thinking before pipe messages (except the first greeting)
      if (step.from === 'pipe' && totalDelay > 500) {
        const thinkDelay = totalDelay - 400;
        setTimeout(() => {
          setThinkingText(step.thinking || 'Pipe está creando...');
          setPipeMood('thinking');
          scrollChat();
        }, thinkDelay);
      }

      setTimeout(() => {
        setThinkingText(null);
        setMessages((prev) => [...prev, { from: step.from, text: step.text }]);

        if (step.from === 'pipe') {
          setPipeMood('happy');
        } else {
          setPipeMood('listening');
        }

        if (step.preview) {
          revealPreview(step.preview);
        }

        scrollChat();
      }, totalDelay);
    });

    // Done
    setTimeout(() => {
      setPhase('done');
      setPipeMood('happy');
    }, totalDelay + 500);
  }, [phase, revealPreview, scrollChat]);

  // Keep ref in sync so ScrollTrigger always calls the latest runDemo
  useEffect(() => {
    runDemoRef.current = runDemo;
  }, [runDemo]);

  const replay = useCallback(() => {
    setPhase('idle');
    setPipeMood('idle');
    setMessages([]);
    setThinkingText(null);
    setVisibleSections(new Set());
    // Small delay then re-run
    setTimeout(() => runDemoRef.current?.(), 400);
  }, []);

  return (
    <section ref={sectionRef} className="bg-muted/30 px-4 pt-24 pb-20 sm:px-6 sm:pt-32 sm:pb-24">
      <div className="mx-auto max-w-5xl">
        {/* Heading */}
        <div className="pd-heading invisible text-center">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
            Así de fácil
          </p>
          <h2 className="nerbis-display mt-3 text-3xl text-foreground sm:text-4xl lg:text-5xl">
            Conoce a <span className="text-primary">Pipe</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Cuéntale sobre tu negocio y Pipe crea tu sitio web completo en segundos.
          </p>
        </div>

        {/* Demo container */}
        <div className="pd-demo-container invisible mt-12 grid items-stretch gap-6 lg:grid-cols-2">
          {/* Left column — Chat */}
          <div className="flex flex-col rounded-2xl border border-border bg-background shadow-sm">
            {/* Chat header */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-foreground">Pipe</span>
              <span className="ml-auto text-[10px] text-muted-foreground">en línea</span>
            </div>

            {/* Chat messages */}
            <div
              ref={chatRef}
              className="flex flex-1 flex-col gap-2.5 px-4 py-3"
              style={{ minHeight: 320 }}
              role="log"
              aria-live="polite"
              aria-label="Conversación con Pipe"
            >
              {/* Messages */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-1 animate-in fade-in duration-300 ${
                    msg.from === 'user' ? 'items-end slide-in-from-right-3' : 'items-start slide-in-from-left-3'
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground">
                    {msg.from === 'user' ? 'Tú' : 'Pipe'}
                  </span>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.from === 'user'
                        ? 'rounded-br-md bg-foreground text-background'
                        : 'rounded-bl-md border border-border bg-background text-foreground'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Thinking indicator */}
              {thinkingText && (
                <div className="flex items-center gap-2 animate-in fade-in duration-200">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground">
                    {thinkingText}
                  </span>
                </div>
              )}

              {/* Waiting state — before scroll triggers the demo */}
              {messages.length === 0 && !thinkingText && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                  <PipeAvatar mood="idle" size={48} />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Mira como Pipe crea un sitio web completo
                  </p>
                </div>
              )}
            </div>

            {/* Action area */}
            <div className="border-t border-border px-4 py-2.5">
              {(phase === 'idle' || phase === 'running') && (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 py-2 text-xs text-muted-foreground">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  Creando sitio web...
                </div>
              )}
              {phase === 'done' && (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/register"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
                  >
                    Crea tu sitio gratis
                    <ArrowRight size={12} />
                  </Link>
                  <button
                    type="button"
                    onClick={replay}
                    className="flex w-full items-center justify-center gap-1.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <RotateCcw size={10} />
                    Ver de nuevo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right column — Browser preview */}
          <div className="flex flex-col">
            <div className="flex flex-1 flex-col overflow-hidden rounded-xl ring-1 ring-border">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-400/60" />
                  <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
                  <div className="h-2 w-2 rounded-full bg-green-400/60" />
                </div>
                <div className="mx-auto flex h-5 w-full max-w-[200px] items-center justify-center rounded bg-background px-3">
                  <span className="text-[10px] text-muted-foreground transition-all duration-300">
                    {visibleSections.has('publish')
                      ? 'modanerbis.nerbis.com'
                      : visibleSections.size > 0
                        ? 'nerbis.com/crear...'
                        : 'nerbis.com'}
                  </span>
                </div>
              </div>

              {/* Site content */}
              <div ref={previewRef} className="flex-1 bg-background">
                {visibleSections.has('nav-hero') && (
                  <>
                    <PreviewNav />
                    <PreviewHero />
                  </>
                )}
                {visibleSections.has('services') && <PreviewServices />}
                {visibleSections.has('gallery-reviews') && (
                  <>
                    <PreviewGallery />
                    <PreviewReviews />
                  </>
                )}
                {visibleSections.has('contact') && <PreviewContact />}
                {visibleSections.has('publish') && <PreviewPublish />}

                {/* Skeleton when empty */}
                {visibleSections.size === 0 && (
                  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <div className="h-8 w-8 rounded-lg bg-muted" />
                    <div className="mt-3 h-2 w-32 rounded bg-muted" />
                    <div className="mt-1.5 h-1.5 w-24 rounded bg-muted/70" />
                    <p className="mt-4 text-xs text-muted-foreground/40">
                      El sitio aparecerá aquí
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
