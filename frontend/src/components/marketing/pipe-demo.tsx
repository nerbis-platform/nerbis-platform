'use client';

import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { PipeAvatar } from '@/components/pipe-avatar';
import type { PipeMood } from '@/components/pipe-avatar';

gsap.registerPlugin(ScrollTrigger);

// ─── Chat data ──────────────────────────────────────────
const USER_MESSAGE =
  'Tengo un salon de belleza llamado GC Belleza. Ofrecemos cortes, color, tratamientos capilares y manicure.';

const PIPE_RESPONSE_ITEMS = [
  'Pagina principal con tu marca',
  'Catalogo de servicios',
  'Sistema de reservas',
  'Seccion de resenas',
];

// ─── Preview site mock elements ─────────────────────────
function PreviewNav({ visible }: { visible: boolean }) {
  return (
    <div
      className="pd-preview-nav flex items-center justify-between border-b border-border px-4 py-2"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded" style={{ background: 'var(--primitive-navy-700)' }} />
        <div className="h-1.5 w-14 rounded bg-foreground/60" />
      </div>
      <div className="hidden gap-3 sm:flex">
        <div className="h-1 w-8 rounded bg-muted-foreground/30" />
        <div className="h-1 w-6 rounded bg-muted-foreground/30" />
        <div className="h-1 w-10 rounded bg-muted-foreground/30" />
      </div>
      <div className="h-4 w-12 rounded-full" style={{ background: 'var(--primitive-brand-600)' }} />
    </div>
  );
}

function PreviewHero({ visible }: { visible: boolean }) {
  return (
    <div
      className="pd-preview-hero px-4 py-6 sm:px-6 sm:py-8"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-1 w-12 rounded" style={{ background: 'color-mix(in oklch, var(--primitive-brand-600) 30%, transparent)' }} />
          <div className="h-3 w-40 max-w-full rounded bg-foreground/70" />
          <div className="h-3 w-32 max-w-full rounded bg-foreground/40" />
          <div className="mt-2 flex flex-col gap-1">
            <div className="h-1.5 w-full max-w-[180px] rounded bg-muted-foreground/20" />
            <div className="h-1.5 w-4/5 max-w-[140px] rounded bg-muted-foreground/15" />
          </div>
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-16 rounded-full" style={{ background: 'var(--primitive-brand-600)' }} />
            <div className="h-6 w-14 rounded-full border border-border bg-background" />
          </div>
        </div>
        <div className="hidden aspect-square w-28 rounded-lg bg-muted sm:block" />
      </div>
    </div>
  );
}

function PreviewServices({ visible }: { visible: boolean }) {
  const services = ['Corte y Peinado', 'Color y Mechas', 'Tratamientos'];
  return (
    <div
      className="pd-preview-services border-t border-border px-4 pb-4 pt-3 sm:px-6"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="grid grid-cols-3 gap-2">
        {services.map((name) => (
          <div key={name} className="pd-preview-card rounded-lg border border-border bg-background p-2">
            <div className="mb-1.5 h-8 rounded bg-muted" />
            <div className="h-1 w-3/4 rounded bg-foreground/40" />
            <div className="mt-0.5 h-1 w-1/2 rounded bg-muted-foreground/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewPublish({ visible }: { visible: boolean }) {
  return (
    <div
      className="pd-preview-publish flex items-center justify-center border-t border-border px-4 py-3"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 items-center gap-1.5 rounded-full px-4"
          style={{ background: `linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)` }}
        >
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-[11px] font-medium text-white">Publicado</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────
export function PipeDemo() {
  const sectionRef = useRef<HTMLElement>(null);
  const [pipeMood, setPipeMood] = useState<PipeMood>('idle');
  const [showUserMsg, setShowUserMsg] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [showPreviewNav, setShowPreviewNav] = useState(false);
  const [showPreviewHero, setShowPreviewHero] = useState(false);
  const [showPreviewServices, setShowPreviewServices] = useState(false);
  const [showPreviewPublish, setShowPreviewPublish] = useState(false);

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
          // Show everything immediately
          gsap.set('.pd-heading, .pd-chat-area, .pd-preview-area', { autoAlpha: 1 });
          setShowUserMsg(true);
          setShowThinking(false);
          setShowResponse(true);
          setPipeMood('happy');
          setShowPreviewNav(true);
          setShowPreviewHero(true);
          setShowPreviewServices(true);
          setShowPreviewPublish(true);
          return;
        }

        // Heading reveal
        gsap.from('.pd-heading', {
          y: 40,
          autoAlpha: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.pd-heading',
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });

        // Main demo timeline — triggered on scroll
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          scrollTrigger: {
            trigger: '.pd-demo-container',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        });

        // Fade in the two columns
        tl.from('.pd-chat-area', { autoAlpha: 0, y: 30, duration: 0.5 })
          .from('.pd-preview-area', { autoAlpha: 0, y: 30, duration: 0.5 }, '-=0.3');

        // Step 1: User message slides in
        tl.call(() => setShowUserMsg(true), [], '+=0.2')
          .from('.pd-user-msg', { x: 30, autoAlpha: 0, duration: 0.4 });

        // Step 2: Pipe thinking
        tl.call(() => {
          setShowThinking(true);
          setPipeMood('thinking');
        }, [], '+=0.3')
          .from('.pd-thinking', { autoAlpha: 0, y: 10, duration: 0.3 });

        // Step 3: Preview nav appears
        tl.call(() => setShowPreviewNav(true), [], '+=0.3')
          .from('.pd-preview-nav', { autoAlpha: 0, y: -10, duration: 0.3 });

        // Step 4: Pipe response slides in, thinking disappears
        tl.call(() => {
          setShowThinking(false);
          setShowResponse(true);
          setPipeMood('happy');
        }, [], '+=0.4')
          .from('.pd-response', { x: -30, autoAlpha: 0, duration: 0.5 });

        // Step 5: Preview hero appears
        tl.call(() => setShowPreviewHero(true), [], '+=0.2')
          .from('.pd-preview-hero', { autoAlpha: 0, y: 15, duration: 0.3 });

        // Step 6: Preview services appear with stagger
        tl.call(() => setShowPreviewServices(true), [], '+=0.15')
          .from('.pd-preview-card', {
            autoAlpha: 0,
            y: 15,
            scale: 0.95,
            duration: 0.3,
            stagger: 0.1,
          });

        // Step 7: Publish button with success
        tl.call(() => setShowPreviewPublish(true), [], '+=0.2')
          .from('.pd-preview-publish', { autoAlpha: 0, scale: 0.9, duration: 0.4 });
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="border-t border-border bg-muted/50 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        {/* Heading */}
        <div className="pd-heading invisible text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Tu asistente de IA
          </p>
          <h2 className="nerbis-display mt-4 text-3xl text-foreground sm:text-4xl lg:text-5xl">
            Conoce a Pipe
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Cuentale sobre tu negocio y Pipe crea tu sitio web completo en segundos.
          </p>
        </div>

        {/* Demo container: chat + preview */}
        <div className="pd-demo-container mt-14 grid gap-6 lg:grid-cols-2">
          {/* Left column — Chat */}
          <div className="pd-chat-area invisible flex flex-col gap-3 rounded-2xl border border-border bg-background p-5">
            {/* Chat header */}
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <PipeAvatar mood={pipeMood} size={28} />
              <span className="text-sm font-medium text-foreground">Pipe</span>
              <span className="ml-auto text-[11px] text-muted-foreground">Asistente IA</span>
            </div>

            {/* Chat messages area */}
            <div className="flex min-h-[280px] flex-col gap-3 sm:min-h-[300px]">
              {/* User message */}
              {showUserMsg && (
                <div className="pd-user-msg invisible flex flex-col items-end gap-1">
                  <span className="text-[11px] text-muted-foreground">Tu</span>
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-4 py-3 text-sm leading-relaxed text-background">
                    {USER_MESSAGE}
                  </div>
                </div>
              )}

              {/* Pipe thinking */}
              {showThinking && (
                <div className="pd-thinking invisible flex items-center gap-2">
                  <PipeAvatar mood="thinking" size={28} />
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>Pipe esta analizando</span>
                    <span className="inline-flex gap-0.5">
                      <span className="motion-safe:animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                      <span className="motion-safe:animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                      <span className="motion-safe:animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Pipe response */}
              {showResponse && (
                <div className="pd-response invisible flex items-start gap-2">
                  <div className="mt-1 shrink-0">
                    <PipeAvatar mood="happy" size={28} />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      Ya cree tu sitio con:
                    </p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {PIPE_RESPONSE_ITEMS.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                            style={{ background: `linear-gradient(135deg, var(--primitive-navy-700) 0%, var(--primitive-brand-600) 100%)` }}
                          >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column — Browser preview */}
          <div className="pd-preview-area invisible">
            <div className="overflow-hidden rounded-xl shadow-lg shadow-black/5 ring-1 ring-border">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-400/60" />
                  <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
                  <div className="h-2 w-2 rounded-full bg-green-400/60" />
                </div>
                <div className="mx-auto flex h-5 w-full max-w-[200px] items-center justify-center rounded bg-background px-3">
                  <span className="text-[10px] text-muted-foreground">gcbelleza.nerbis.com</span>
                </div>
              </div>

              {/* Site content — builds progressively */}
              <div className="bg-background">
                <PreviewNav visible={showPreviewNav} />
                <PreviewHero visible={showPreviewHero} />
                <PreviewServices visible={showPreviewServices} />
                <PreviewPublish visible={showPreviewPublish} />

                {/* Skeleton placeholder when nothing is shown yet */}
                {!showPreviewNav && !showPreviewHero && !showPreviewServices && (
                  <div className="flex flex-col gap-3 px-4 py-6 sm:px-6">
                    <div className="h-2 w-24 rounded bg-muted" />
                    <div className="h-3 w-48 rounded bg-muted" />
                    <div className="h-3 w-36 rounded bg-muted" />
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="h-16 rounded-lg bg-muted" />
                      <div className="h-16 rounded-lg bg-muted" />
                      <div className="h-16 rounded-lg bg-muted" />
                    </div>
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
