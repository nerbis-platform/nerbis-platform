'use client';

// ─── Pipe Identity — PipeMessage Component ────────────────
// Burbuja de chat para mensajes de Pipe y del usuario.
// Pipe: alineado a la izquierda con avatar y acento teal.
// User: alineado a la derecha con fondo neutro.

import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { PIPE_COLORS } from './constants';
import { PipeAvatar } from './pipe-avatar';

interface PipeMessageProps {
  children: ReactNode;
  variant?: 'pipe' | 'user';
  animate?: boolean;
}

/**
 * Indicador de "escribiendo..." con tres puntos animados.
 */
function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Escribiendo...">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block size-1.5 rounded-full"
          style={{
            backgroundColor: PIPE_COLORS.teal,
            opacity: 0.4,
            animation: `pipe-typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes pipe-typing-dot {
  0%, 60%, 100% { opacity: 0.4; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes pipe-typing-dot {
    0%, 100% { opacity: 0.6; transform: none; }
  }
}`,
        }}
      />
    </span>
  );
}

/**
 * PipeMessage — Burbuja de chat con soporte para mensajes de Pipe y del usuario.
 *
 * - variant='pipe': izquierda, mini avatar, borde teal sutil
 * - variant='user': derecha, fondo neutro, sin avatar
 * - animate: entrada con fade + slide (default true)
 */
export function PipeMessage({ children, variant = 'pipe', animate = true }: PipeMessageProps) {
  const [visible, setVisible] = useState(!animate);

  useEffect(() => {
    if (animate) {
      // Trigger entrance after mount
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [animate]);

  const isPipe = variant === 'pipe';

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[85%]',
        isPipe ? 'self-start' : 'self-end flex-row-reverse',
        animate && 'transition-all duration-300 ease-out',
        animate && !visible && 'opacity-0 translate-y-2',
        animate && visible && 'opacity-100 translate-y-0',
      )}
    >
      {/* Pipe avatar (only for pipe variant) */}
      {isPipe && (
        <div className="flex-shrink-0 mt-1">
          <PipeAvatar mood="idle" size="sm" />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          'rounded-xl px-3 py-2 text-sm leading-relaxed',
          isPipe
            ? 'rounded-tl-sm'
            : 'rounded-tr-sm',
        )}
        style={
          isPipe
            ? {
                backgroundColor: `${PIPE_COLORS.teal}08`,
                borderLeft: `2px solid ${PIPE_COLORS.teal}30`,
                color: PIPE_COLORS.warmGray800,
              }
            : {
                backgroundColor: PIPE_COLORS.warmGray100,
                color: PIPE_COLORS.warmGray800,
              }
        }
      >
        {children}
      </div>
    </div>
  );
}

/**
 * PipeMessageLoading — Burbuja de Pipe mostrando indicador de "escribiendo".
 */
export function PipeMessageLoading() {
  return (
    <PipeMessage variant="pipe">
      <TypingIndicator />
    </PipeMessage>
  );
}

export { TypingIndicator };
