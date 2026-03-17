// src/components/auth/hooks/useDebounce.ts
// Generic debounce hook for delaying value updates (e.g. form validation).

'use client';

import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of `value` that only updates after `delay` ms
 * of inactivity. Cleans up pending timers on unmount.
 *
 * @param value - The value to debounce.
 * @param delay - Debounce delay in milliseconds (default 300).
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
