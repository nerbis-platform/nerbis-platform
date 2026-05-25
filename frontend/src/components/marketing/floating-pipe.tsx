'use client';

import { useState, useEffect } from 'react';
import { PipeAvatar } from '@/components/pipe-avatar';

export function FloatingPipe() {
  const [visible, setVisible] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);

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

  // Watch ALL "Empezar gratis" CTA hovers via :hover check
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

  return (
    <div
      className="fixed bottom-6 right-6 z-40 transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      aria-hidden="true"
    >
      <PipeAvatar size={50} mood={ctaHovered ? 'pleading' : 'idle'} calm />
    </div>
  );
}
