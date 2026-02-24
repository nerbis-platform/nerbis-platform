'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseCountUpOptions {
  /** End value to count to */
  end: number;
  /** Duration in ms. Default: 2000 */
  duration?: number;
  /** Start value. Default: 0 */
  start?: number;
  /** Decimal places. Default: 0 */
  decimals?: number;
  /** Prefix string (e.g., "$"). Default: '' */
  prefix?: string;
  /** Suffix string (e.g., "+", "%"). Default: '' */
  suffix?: string;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Hook that animates a number counting up when the element enters the viewport.
 * Uses requestAnimationFrame for smooth 60fps animation with easeOutExpo easing.
 *
 * Returns a ref to attach to the element and the current formatted display value.
 *
 * Respects `prefers-reduced-motion: reduce` — shows final value immediately.
 */
export function useCountUp<T extends HTMLElement = HTMLDivElement>({
  end,
  duration = 2000,
  start = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
}: UseCountUpOptions) {
  const ref = useRef<T>(null);
  const [display, setDisplay] = useState(`${prefix}${start.toFixed(decimals)}${suffix}`);
  const hasAnimated = useRef(false);

  const format = useCallback(
    (val: number) => `${prefix}${val.toFixed(decimals)}${suffix}`,
    [prefix, suffix, decimals]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated.current) return;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(format(end));
      hasAnimated.current = true;
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          io.disconnect();

          let startTime: number | null = null;

          const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutExpo(progress);
            const current = start + (end - start) * easedProgress;

            setDisplay(format(current));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [end, duration, start, format]);

  return { ref, display };
}

/**
 * Parse a stat value string like "500+", "$10M", "99%", "1,200"
 * into a numeric end value, prefix, and suffix.
 */
export function parseStatValue(raw: string): {
  end: number;
  prefix: string;
  suffix: string;
  decimals: number;
} {
  if (!raw || typeof raw !== 'string') {
    return { end: 0, prefix: '', suffix: '', decimals: 0 };
  }

  // Extract leading non-numeric prefix (e.g., "$", "€")
  const prefixMatch = raw.match(/^([^0-9.,]*)/);
  const prefix = prefixMatch?.[1] || '';

  // Extract trailing non-numeric suffix (e.g., "+", "%", "M", "K")
  const suffixMatch = raw.match(/([^0-9.,]*)$/);
  const suffix = suffixMatch?.[1] || '';

  // Extract the numeric part
  const numStr = raw.slice(prefix.length, raw.length - (suffix.length || 0));
  const cleaned = numStr.replace(/,/g, '');
  const num = parseFloat(cleaned);

  // Count decimal places
  const decimalPart = cleaned.split('.')[1];
  const decimals = decimalPart ? decimalPart.length : 0;

  return {
    end: isNaN(num) ? 0 : num,
    prefix,
    suffix,
    decimals,
  };
}
