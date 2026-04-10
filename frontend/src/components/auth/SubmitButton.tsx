// src/components/auth/SubmitButton.tsx
// Reusable submit button with loading state, spinner, and auth design tokens.

'use client';

import { Loader2, ArrowRight } from 'lucide-react';
import type { SubmitButtonProps } from './types';

interface ExtendedSubmitButtonProps extends SubmitButtonProps {
  loadingLabel?: string;
}

export function SubmitButton({
  isLoading,
  children,
  disabled = false,
  type = 'submit',
  onClick,
  loadingLabel = 'Enviando...',
}: ExtendedSubmitButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-label={isLoading ? loadingLabel : undefined}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--auth-radius-button)] bg-[var(--auth-primary)] text-white text-[0.9375rem] font-medium transition-[background-color,transform,box-shadow,opacity] duration-150 ease-out hover:bg-[var(--auth-primary-hover)] hover:-translate-y-[1px] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      style={{ fontFamily: 'var(--auth-font-body)' }}
      data-auth-animated
    >
      {isLoading ? (
        <>
          <Loader2
            className="h-4 w-4 animate-spin"
            aria-hidden="true"
          />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </>
      )}
    </button>
  );
}
