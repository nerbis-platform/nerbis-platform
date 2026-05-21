'use client';

import { useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

type Direction = 'up' | 'down' | 'left' | 'right';

interface ScrollRevealProps {
  children: ReactNode;
  /** Direction the element animates FROM. Default: 'up' */
  direction?: Direction;
  /** Delay before animation starts (seconds). Default: 0 */
  delay?: number;
  /** Animation duration (seconds). Default: 0.6 */
  duration?: number;
  /** Distance in px the element travels. Default: 50 */
  distance?: number;
  /** When true, staggers direct children instead of animating as one block. */
  stagger?: number;
  /** Additional className for the wrapper. */
  className?: string;
  /** ScrollTrigger start position. Default: 'top 85%' */
  start?: string;
  /** HTML tag for the wrapper element. Default: 'div' */
  as?: keyof HTMLElementTagNameMap;
}

const directionMap: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 50 },
  down: { y: -50 },
  left: { x: 50 },
  right: { x: -50 },
};

export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  distance = 50,
  stagger,
  className,
  start = 'top 85%',
  as: Tag = 'div',
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduced: '(prefers-reduced-motion: reduce)',
        normal: '(prefers-reduced-motion: no-preference)',
      },
      (context) => {
        const { reduced } = context.conditions as { reduced: boolean; normal: boolean };

        if (reduced) {
          // Make everything visible immediately
          if (stagger) {
            gsap.set(containerRef.current!.children, { autoAlpha: 1 });
          } else {
            gsap.set(containerRef.current!, { autoAlpha: 1 });
          }
          return;
        }

        const dir = directionMap[direction];
        const fromVars: gsap.TweenVars = {
          autoAlpha: 0,
          duration,
          delay,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start,
            toggleActions: 'play none none none',
          },
        };

        // Apply direction with custom distance
        if (dir.x !== undefined) fromVars.x = dir.x > 0 ? distance : -distance;
        if (dir.y !== undefined) fromVars.y = dir.y > 0 ? distance : -distance;

        if (stagger) {
          fromVars.stagger = stagger;
          gsap.from(containerRef.current!.children, fromVars);
        } else {
          gsap.from(containerRef.current!, fromVars);
        }
      }
    );
  }, { scope: containerRef });

  const Component = Tag as React.ElementType;

  return (
    <Component ref={containerRef} className={className}>
      {children}
    </Component>
  );
}
