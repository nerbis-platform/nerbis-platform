'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type AutoSaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  onSave: () => Promise<void> | void;
  hasChanges: boolean;
  delay?: number; // debounce delay in ms, default 3000
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  saveNow: () => void;
  retry: () => void;
}

export function useAutoSave({
  onSave,
  hasChanges,
  delay = 3000,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Clear all timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const doSave = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setStatus('saving');
    try {
      await onSaveRef.current();
      isSavingRef.current = false;
      setStatus('saved');
      setLastSavedAt(new Date());
      // Revert to idle after 3s
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setStatus('idle'), 3000);
    } catch {
      isSavingRef.current = false;
      setStatus('error');
    }
  }, []);

  // When hasChanges goes true, start debounce timer
  useEffect(() => {
    if (!hasChanges) return;
    if (isSavingRef.current) return;

    setStatus('unsaved');

    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      doSave();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasChanges, delay, doSave]);

  // When hasChanges goes false (e.g. after manual save), go to idle
  useEffect(() => {
    if (!hasChanges && status === 'unsaved') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus('idle');
    }
  }, [hasChanges, status]);

  // Save immediately (for Ctrl+S)
  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    doSave();
  }, [doSave]);

  // Retry after error
  const retry = useCallback(() => {
    doSave();
  }, [doSave]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges || status === 'unsaved' || status === 'saving') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges, status]);

  return { status, lastSavedAt, saveNow, retry };
}
