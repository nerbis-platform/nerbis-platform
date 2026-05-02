'use client';

// ─── Pipe Identity — PipePill Component ───────────────────
// Pill flotante minimalista para estado colapsado del sidebar.
// Muestra solo el avatar en tamano sm con pulso opcional.

import { cn } from '@/lib/utils';

import { PIPE_COLORS } from './constants';
import { PipeAvatar } from './pipe-avatar';
import type { PipeMood } from './types';

interface PipePillProps {
  mood?: PipeMood;
  onClick?: () => void;
  pulse?: boolean;
  className?: string;
}

/**
 * PipePill — Boton flotante minimo con avatar de Pipe.
 *
 * Uso: sidebar colapsado, FAB de asistente, indicador de presencia.
 * El pulso indica que Pipe tiene algo que decir.
 */
export function PipePill({ mood = 'idle', onClick, pulse = false, className }: PipePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full p-1.5',
        'transition-transform duration-150 ease-out',
        'hover:-translate-y-0.5 active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        className,
      )}
      style={{
        backgroundColor: `${PIPE_COLORS.teal}10`,
        '--tw-ring-color': PIPE_COLORS.teal,
      } as React.CSSProperties}
      aria-label="Abrir asistente Pipe"
    >
      {/* Pulse ring */}
      {pulse && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${PIPE_COLORS.teal}40`,
            animation: 'pipe-pill-pulse 2s ease-in-out infinite',
          }}
        />
      )}

      <PipeAvatar mood={mood} size="sm" />

      {pulse && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
@keyframes pipe-pill-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes pipe-pill-pulse {
    0%, 100% { opacity: 0.5; transform: none; }
  }
}`,
          }}
        />
      )}
    </button>
  );
}
