'use client';

import type { ReactNode } from 'react';
import type { AnimationType } from './useScrollAnimation';

interface AnimatedSectionProps {
  /** Animation type to apply */
  animation?: AnimationType;
  /** Whether children should stagger in */
  stagger?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** HTML tag to render. Default: 'div' */
  as?: keyof React.JSX.IntrinsicElements;
  /** Child elements */
  children: ReactNode;
  /** HTML id */
  id?: string;
  /** data-section attribute */
  dataSection?: string;
}

/**
 * Wrapper component that applies scroll-triggered animation classes.
 *
 * Elements start hidden and animate into view when they enter the viewport.
 * The actual animation is triggered by the IntersectionObserver in WebsiteShell
 * (via useScrollAnimation), which adds the `.anim-visible` class.
 *
 * Usage:
 *   <AnimatedSection animation="fade-up" stagger>
 *     <Card />
 *     <Card />  // staggers with 80ms delay each
 *   </AnimatedSection>
 */
export function AnimatedSection({
  animation = 'fade-up',
  stagger = false,
  className = '',
  as: Tag = 'div',
  children,
  id,
  dataSection,
}: AnimatedSectionProps) {
  const animClass = `anim-${animation}`;
  const staggerClass = stagger ? ' stagger' : '';
  const fullClass = `${animClass}${staggerClass}${className ? ` ${className}` : ''}`;

  const props: Record<string, unknown> = { className: fullClass };
  if (id) props.id = id;
  if (dataSection) props['data-section'] = dataSection;

  return <Tag {...props}>{children}</Tag>;
}
