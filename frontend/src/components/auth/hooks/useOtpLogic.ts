// src/components/auth/hooks/useOtpLogic.ts
// Manages OTP digit state, refs, auto-advance, backspace, and paste logic.

'use client';

import {
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
  type ClipboardEvent,
  type RefObject,
} from 'react';
import { OTP_LENGTH } from '../constants';

export interface UseOtpLogicOptions {
  /** Number of digits (default: OTP_LENGTH from constants). */
  length?: number;
  /** Called whenever the combined code string changes. */
  onChange?: (code: string) => void;
}

export interface UseOtpLogicReturn {
  /** Individual digit values (array of single-char strings). */
  values: string[];
  /** Refs array to attach to each input element. */
  refs: RefObject<(HTMLInputElement | null)[]>;
  /** Handler for input change events — call with (index, newValue). */
  handleChange: (index: number, digit: string) => void;
  /** Handler for keydown events — call with (index, event). */
  handleKeyDown: (index: number, e: KeyboardEvent<HTMLInputElement>) => void;
  /** Handler for paste events — attach to the first input. */
  handlePaste: (e: ClipboardEvent<HTMLInputElement>) => void;
  /** The combined code string (e.g. "123456"). */
  code: string;
  /** Whether all digits have been entered. */
  isComplete: boolean;
  /** Reset all digits to empty. */
  reset: () => void;
}

/**
 * Encapsulates OTP input logic: digit state, ref management, auto-advance,
 * backspace navigation, paste support, and completion detection.
 */
export function useOtpLogic({
  length = OTP_LENGTH,
  onChange,
}: UseOtpLogicOptions = {}): UseOtpLogicReturn {
  const [values, setValues] = useState<string[]>(() => Array(length).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = useCallback(
    (index: number) => {
      if (index >= 0 && index < length) {
        refs.current[index]?.focus();
      }
    },
    [length],
  );

  const updateValues = useCallback(
    (next: string[]) => {
      setValues(next);
      const code = next.join('');
      onChange?.(code);
    },
    [onChange],
  );

  const handleChange = useCallback(
    (index: number, digit: string) => {
      const sanitized = digit.replace(/\D/g, '').slice(-1);
      if (!sanitized && digit !== '') return;

      setValues((prev) => {
        const next = [...prev];
        next[index] = sanitized;
        const code = next.join('');
        onChange?.(code);
        return next;
      });

      // Auto-advance to next input on digit entry
      if (sanitized && index < length - 1) {
        focusInput(index + 1);
      }
    },
    [length, onChange, focusInput],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        setValues((prev) => {
          const next = [...prev];
          if (prev[index]) {
            // Clear current digit
            next[index] = '';
            onChange?.(next.join(''));
            return next;
          }
          if (index > 0) {
            // Move to previous and clear it
            next[index - 1] = '';
            onChange?.(next.join(''));
            focusInput(index - 1);
            return next;
          }
          return prev;
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        focusInput(index - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusInput(index + 1);
      }
    },
    [onChange, focusInput],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (pasted.length > 0) {
        const next = pasted.split('').concat(Array(length).fill('')).slice(0, length);
        updateValues(next);
        focusInput(Math.min(pasted.length, length - 1));
      }
    },
    [length, updateValues, focusInput],
  );

  const reset = useCallback(() => {
    const empty = Array(length).fill('') as string[];
    updateValues(empty);
    focusInput(0);
  }, [length, updateValues, focusInput]);

  const code = values.join('');
  const isComplete = code.length === length && values.every((v) => v !== '');

  return {
    values,
    refs,
    handleChange,
    handleKeyDown,
    handlePaste,
    code,
    isComplete,
    reset,
  };
}
