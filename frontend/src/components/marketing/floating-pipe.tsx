'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { PipeAvatar } from '@/components/pipe-avatar';

const BUBBLE_DELAY_MS = 4000;
const DISMISS_KEY = 'pipe-bubble-dismissed';

export function FloatingPipe() {
  const [visible, setVisible] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);

  // Check localStorage on mount — reappear after 24h
  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const minutesSince = (Date.now() - Number(dismissedAt)) / (1000 * 60);
      if (minutesSince < 15) setBubbleDismissed(true);
      else localStorage.removeItem(DISMISS_KEY);
    }
  }, []);

  // Show Pipe when hero Pipe scrolls out of view
  useEffect(() => {
    const heroPipe = document.querySelector('.hero-pipe-wrap');
    if (!heroPipe) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(heroPipe);
    return () => observer.disconnect();
  }, []);

  // Show bubble after delay once Pipe is visible
  useEffect(() => {
    if (!visible || bubbleDismissed) return;

    const timer = setTimeout(() => setBubbleVisible(true), BUBBLE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible, bubbleDismissed]);

  // Watch CTA hovers
  useEffect(() => {
    const ctas = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href="/register"]'));
    const onEnter = () => setCtaHovered(true);
    const onLeave = () => setCtaHovered(false);

    ctas.forEach((cta) => {
      cta.addEventListener('mouseenter', onEnter);
      cta.addEventListener('mouseleave', onLeave);
    });

    return () => {
      ctas.forEach((cta) => {
        cta.removeEventListener('mouseenter', onEnter);
        cta.removeEventListener('mouseleave', onLeave);
      });
    };
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBubbleDismissed(true);
    setBubbleVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  return (
    <div
      className={[
        'fixed bottom-6 right-6 z-40 flex items-end gap-3 transition-all duration-300 motion-reduce:transition-none motion-reduce:transform-none',
        visible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-5 scale-90 pointer-events-none',
      ].join(' ')}
    >
      {/* Speech bubble */}
      {bubbleVisible && !bubbleDismissed && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-300 mb-2">
          <div className="relative rounded-2xl rounded-br-sm bg-foreground px-4 py-2.5 shadow-lg">
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted-foreground/20"
              aria-label="Cerrar"
            >
              <X size={10} />
            </button>
            <p className="text-sm font-medium text-background">
              Hola! Tienes dudas?
            </p>
            <p className="mt-0.5 text-xs text-background/60">
              Estamos para ayudarte
            </p>
          </div>
        </div>
      )}

      {/* Pipe with headset — links to contact page */}
      <Link
        href="/contacto"
        aria-label="Contactar a NERBIS"
        className="block transition-transform duration-200 hover:scale-110"
      >
        <PipeAvatar size={50} mood={ctaHovered ? 'pleading' : 'idle'} calm headset />
      </Link>
    </div>
  );
}
