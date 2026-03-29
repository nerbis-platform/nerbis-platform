// src/components/auth/hooks/useBusinessNameCheck.ts
// Checks if a business name already exists via the public API (debounced).

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { DEBOUNCE_DELAY_MS } from '../constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useBusinessNameCheck(businessName: string) {
  const [exists, setExists] = useState(false);
  const [checking, setChecking] = useState(false);
  const debouncedName = useDebounce(businessName, DEBOUNCE_DELAY_MS);

  const checkName = useCallback(async (name: string, signal: AbortSignal) => {
    if (!name || name.trim().length < 2) {
      setExists(false);
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(
        `${API_URL}/api/public/check-business-name/?name=${encodeURIComponent(name.trim())}`,
        { signal },
      );
      if (res.ok) {
        const data = await res.json();
        if (!signal.aborted) setExists(data.exists);
      } else if (!signal.aborted) {
        console.error(`Business name check failed: ${res.status}`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    } finally {
      if (!signal.aborted) setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!debouncedName || debouncedName.trim().length < 2) {
      setExists(false);
      setChecking(false);
      return;
    }
    const controller = new AbortController();
    checkName(debouncedName, controller.signal);
    return () => controller.abort();
  }, [debouncedName, checkName]);

  return { exists, checking };
}
