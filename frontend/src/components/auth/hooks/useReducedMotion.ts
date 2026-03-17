// src/components/auth/hooks/useReducedMotion.ts
// Detects user preference for reduced motion (prefers-reduced-motion: reduce).

'use client';

import { useSyncExternalStore, useCallback } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Returns `true` when the user has enabled "reduce motion" in their OS settings.
 * SSR-safe: defaults to `false` on the server.
 * Uses `useSyncExternalStore` to subscribe to media query changes without
 * triggering cascading setState calls inside effects.
 */
export function useReducedMotion(): boolean {
  const subscribe = useCallback((callback: () => void) => {
    const mql = window.matchMedia(QUERY);
    if (mql.addEventListener) {
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    }
    // Fallback for Safari/iOS <=13
    mql.addListener(callback);
    return () => mql.removeListener(callback);
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
