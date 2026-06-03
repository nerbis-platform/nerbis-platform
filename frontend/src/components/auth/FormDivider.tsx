// src/components/auth/FormDivider.tsx
// Horizontal divider with centered text for separating social login from email form.

import type { FormDividerProps } from './types';

export function FormDivider({ text = 'o continua con' }: FormDividerProps) {
  return (
    <div className="relative flex items-center py-4" role="separator" data-auth-animated>
      <div className="flex-1 border-t border-[var(--auth-border)]" />
      <span
        className="mx-3 text-[0.8125rem] text-[var(--auth-text-muted)] select-none"
        style={{ fontFamily: 'var(--auth-font-body)' }}
      >
        {text}
      </span>
      <div className="flex-1 border-t border-[var(--auth-border)]" />
    </div>
  );
}
