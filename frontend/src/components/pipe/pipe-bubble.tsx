'use client';

// ─── Pipe Identity — PipeBubble Component ─────────────────
// Burbuja flotante y descartable para empty states y tips.
// Avatar pequeno + speech bubble con mensaje.
// El dismiss se guarda en localStorage para no molestar de nuevo.

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { PIPE_COLORS } from './constants';
import { PipeAvatar } from './pipe-avatar';
import type { PipeMood } from './types';

interface PipeBubbleProps {
  message: string;
  mood?: PipeMood;
  onDismiss?: () => void;
  size?: 'sm' | 'md';
  className?: string;
  /** Key para localStorage. Si se pasa, el dismiss persiste entre sesiones. */
  storageKey?: string;
}

/**
 * PipeBubble — Burbuja flotante descartable con avatar de Pipe.
 *
 * Uso tipico: empty states, tips contextuales, nudges suaves.
 * Entrada con fade + slide up. Dismiss via boton X.
 * Si se pasa storageKey, el dismiss se guarda en localStorage.
 */
export function PipeBubble({
  message,
  mood = 'idle',
  onDismiss,
  size = 'md',
  className,
  storageKey,
}: PipeBubbleProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (!storageKey) return false;
    try {
      return localStorage.getItem(`pipe-bubble-${storageKey}`) === 'dismissed';
    } catch {
      return false;
    }
  });
  const [visible, setVisible] = useState(false);

  // Trigger entrance animation on mount
  useEffect(() => {
    if (dismissed) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [dismissed]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    // Wait for exit animation to complete
    setTimeout(() => {
      setDismissed(true);
      if (storageKey) {
        try {
          localStorage.setItem(`pipe-bubble-${storageKey}`, 'dismissed');
        } catch {
          // localStorage not available
        }
      }
      onDismiss?.();
    }, 200);
  }, [storageKey, onDismiss]);

  if (dismissed) return null;

  const avatarSize = size === 'sm' ? 'sm' as const : 'md' as const;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl p-3 transition-all duration-300 ease-out',
        !visible && 'opacity-0 translate-y-2',
        visible && 'opacity-100 translate-y-0',
        className,
      )}
      style={{
        backgroundColor: `${PIPE_COLORS.teal}06`,
        border: `1px solid ${PIPE_COLORS.teal}15`,
      }}
      role="status"
      aria-live="polite"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <PipeAvatar mood={mood} size={avatarSize} />
      </div>

      {/* Message */}
      <p
        className="flex-1 text-sm leading-relaxed pt-1"
        style={{ color: PIPE_COLORS.warmGray600 }}
      >
        {message}
      </p>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="flex-shrink-0 rounded-md p-1 transition-colors duration-150 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          color: PIPE_COLORS.warmGray400,
        }}
        aria-label="Cerrar"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
