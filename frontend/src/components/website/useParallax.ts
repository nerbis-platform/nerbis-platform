'use client';

import { useEffect, useRef } from 'react';

interface UseParallaxOptions {
  /** Parallax speed factor (0-1). Default: 0.3 */
  speed?: number;
  /** Only apply to elements with this class. Default: 'parallax-bg' */
  className?: string;
}

/**
 * Hook that applies a subtle parallax scroll effect to background elements.
 * Uses requestAnimationFrame-throttled scroll listener for smooth performance.
 *
 * Attach the returned ref to a container, and any child with the target
 * className (default: 'parallax-bg') will receive the parallax transform.
 *
 * Respects `prefers-reduced-motion: reduce` — disables parallax entirely.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(
  options: UseParallaxOptions = {}
) {
  const containerRef = useRef<T>(null);
  const { speed = 0.3, className = 'parallax-bg' } = options;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const elements = container.querySelectorAll<HTMLElement>(`.${className}`);
    if (!elements.length) return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        elements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          // Only apply parallax when element is roughly in viewport
          if (rect.bottom > -200 && rect.top < window.innerHeight + 200) {
            const offset = scrollY * speed;
            el.style.transform = `translateY(${offset}px)`;
          }
        });
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, className]);

  return containerRef;
}
