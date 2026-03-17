// src/components/auth/OtpInput.tsx
// 6-digit OTP code input with auto-advance, backspace, and paste support.

'use client';

import { useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from 'react';
import { OTP_LENGTH } from './constants';
import type { OtpInputProps } from './types';

export function OtpInput({
  length = OTP_LENGTH,
  value,
  onChange,
  disabled = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into individual digits, pad with empty strings
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  const focusInput = useCallback(
    (index: number) => {
      if (index >= 0 && index < length) {
        inputRefs.current[index]?.focus();
      }
    },
    [length],
  );

  const handleChange = useCallback(
    (index: number, digit: string) => {
      // Only accept single digits
      const sanitized = digit.replace(/\D/g, '').slice(-1);
      if (!sanitized && digit !== '') return;

      const newDigits = digits.slice();
      newDigits[index] = sanitized;
      const newValue = newDigits.join('');
      onChange(newValue);

      // Auto-advance to next input on digit entry
      if (sanitized && index < length - 1) {
        focusInput(index + 1);
      }
    },
    [digits, length, onChange, focusInput],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (digits[index]) {
          // Clear current digit
          handleChange(index, '');
        } else if (index > 0) {
          // Move to previous and clear it
          focusInput(index - 1);
          handleChange(index - 1, '');
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        focusInput(index - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        focusInput(index + 1);
      }
    },
    [digits, focusInput, handleChange],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (pasted.length > 0) {
        onChange(pasted.padEnd(length, '').slice(0, length).replace(/ /g, ''));
        // Focus last filled digit or the next empty one
        focusInput(Math.min(pasted.length, length - 1));
      }
    },
    [length, onChange, focusInput],
  );

  return (
    <div
      role="group"
      aria-label="Código de verificación"
      className="flex gap-2 justify-center"
      data-auth-animated
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[i] || ''}
          disabled={disabled}
          aria-label={`Dígito ${i + 1} de ${length}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          onFocus={(e) => e.target.select()}
          className="h-12 w-11 rounded-[var(--auth-radius-input)] border border-[var(--auth-border)] bg-[var(--auth-bg-input)] text-center text-lg font-semibold text-[var(--auth-text)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out placeholder:text-[var(--auth-text-placeholder)] focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'var(--auth-font-body)' }}
        />
      ))}
    </div>
  );
}
