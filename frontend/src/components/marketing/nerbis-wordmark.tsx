'use client';

import { useRef, useEffect } from 'react';

interface NerbisWordmarkProps {
  size?: number;
  className?: string;
  dark?: boolean;
}

export function NerbisWordmark({ size = 18, className = '' }: NerbisWordmarkProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const iRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const dot = dotRef.current;
    const iSpan = iRef.current;
    if (!container || !dot || !iSpan) return;

    const position = () => {
      const parentRect = container.getBoundingClientRect();
      const iRect = iSpan.getBoundingClientRect();
      const fontSize = size;
      const dotSize = fontSize * 0.22;
      const lsOffset = fontSize * 0.05 / 2;
      const iCenterX = (iRect.left + iRect.right) / 2 - parentRect.left + lsOffset;

      dot.style.width = `${dotSize}px`;
      dot.style.height = `${dotSize}px`;
      dot.style.left = `${iCenterX - dotSize / 2}px`;
      dot.style.top = '0px';
    };

    // Position after fonts load
    if (document.fonts?.ready) {
      document.fonts.ready.then(position);
    } else {
      position();
    }

    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [size]);

  return (
    <span
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        fontWeight: 800,
        fontSize: `${size}px`,
        letterSpacing: '-0.05em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        paddingTop: '0.14em',
      }}
    >
      NERB<i ref={iRef} style={{ fontStyle: 'normal' }}>I</i>S
      <span
        ref={dotRef}
        style={{
          position: 'absolute',
          background: '#0D9488',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
    </span>
  );
}
