'use client';

// ─── Pipe Identity — usePipeMood Hook ─────────────────────
// Hook para gestionar el estado de mood de Pipe con transiciones validadas.
// Auto-retorna a idle despues de un timeout configurable.

import { useCallback, useRef, useState } from 'react';

import { DEFAULT_MOOD, MOOD_TRANSITION_MS } from './constants';
import { isValidTransition } from './moods';
import type { PipeMood } from './types';

interface UsePipeMoodOptions {
  /** Mood inicial (default: 'idle') */
  initialMood?: PipeMood;
  /** Ms antes de volver a idle automaticamente (default: 4000, 0 = desactivado) */
  idleTimeoutMs?: number;
}

interface UsePipeMoodReturn {
  /** Mood actual de Pipe */
  mood: PipeMood;
  /** Setter directo (sin validacion de transicion) */
  setMood: (mood: PipeMood) => void;
  /** Transicion validada — respeta MOOD_TRANSITIONS y timing */
  transitionTo: (target: PipeMood) => boolean;
  /** True durante los MOOD_TRANSITION_MS entre moods */
  isTransitioning: boolean;
}

/**
 * usePipeMood — Gestiona el mood de Pipe con transiciones validadas.
 *
 * - transitionTo valida via MOOD_TRANSITIONS antes de cambiar
 * - Auto-retorna a idle despues de idleTimeoutMs (excepto si ya es idle)
 * - isTransitioning permite animaciones de transicion
 */
export function usePipeMood(options: UsePipeMoodOptions = {}): UsePipeMoodReturn {
  const { initialMood = DEFAULT_MOOD, idleTimeoutMs = 4000 } = options;

  const [mood, setMoodState] = useState<PipeMood>(initialMood);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const scheduleIdle = useCallback(
    (currentMood: PipeMood) => {
      if (idleTimeoutMs <= 0 || currentMood === 'idle') return;
      idleTimerRef.current = setTimeout(() => {
        setMoodState('idle');
      }, idleTimeoutMs);
    },
    [idleTimeoutMs],
  );

  const setMood = useCallback(
    (newMood: PipeMood) => {
      clearTimers();
      setMoodState(newMood);
      scheduleIdle(newMood);
    },
    [clearTimers, scheduleIdle],
  );

  const transitionTo = useCallback(
    (target: PipeMood): boolean => {
      // Validate transition
      if (!isValidTransition(mood, target)) {
        return false;
      }

      clearTimers();
      setIsTransitioning(true);

      // Apply transition timing
      transitionTimerRef.current = setTimeout(() => {
        setMoodState(target);
        setIsTransitioning(false);
        scheduleIdle(target);
      }, MOOD_TRANSITION_MS);

      return true;
    },
    [mood, clearTimers, scheduleIdle],
  );

  return { mood, setMood, transitionTo, isTransitioning };
}
