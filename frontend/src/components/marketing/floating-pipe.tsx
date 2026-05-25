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

  // Watch CTA hovers via mouseenter/mouseleave on all register links
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

  return (
    <div
      className={[
        'fixed bottom-6 right-6 z-40 transition-all duration-300 motion-reduce:transition-none motion-reduce:transform-none',
        visible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-5 scale-90 pointer-events-none',
      ].join(' ')}
      aria-hidden="true"
    >
      <PipeAvatar size={50} mood={ctaHovered ? 'pleading' : 'idle'} calm />
    </div>
  );
}
