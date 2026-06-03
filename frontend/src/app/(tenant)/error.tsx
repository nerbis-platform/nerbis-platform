// src/app/(tenant)/error.tsx

'use client';

import { useEffect } from 'react';
import { ApiError } from '@/lib/api/client';
import { ErrorState } from '@/components/feedback/ErrorState';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function isNetworkApiError(error: Error): boolean {
  if (error instanceof ApiError && error.code === 'NETWORK_ERROR') return true;
  return error.message?.includes('NETWORK_ERROR') || error.message?.includes('fetch failed');
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  const variant = isNetworkApiError(error) ? 'network' : 'generic';

  return (
    <>
      <ErrorState
        variant={variant}
        onRetry={reset}
        genericMessage="Ha ocurrido un error inesperado. Por favor, intenta de nuevo o vuelve al inicio."
      />
      {process.env.NODE_ENV === 'development' && error.message && variant === 'generic' && (
        <div className="fixed bottom-4 left-4 right-4 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground font-mono break-all">
            {error.message}
          </p>
        </div>
      )}
    </>
  );
}
