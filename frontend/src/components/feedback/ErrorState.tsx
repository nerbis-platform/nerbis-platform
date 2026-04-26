// src/components/feedback/ErrorState.tsx

'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  variant: 'network' | 'generic';
  onRetry: () => void;
  genericMessage?: string;
}

const NETWORK_ICON_PATH =
  'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z';

const copy = {
  network: {
    title: 'Sin conexión al servidor',
    message:
      'No pudimos conectar con el servidor. Esto puede pasar si hay un mantenimiento o si tu conexión a internet se perdió.',
  },
  generic: {
    title: 'Algo salió mal',
    message: 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.',
  },
};

export function ErrorState({ variant, onRetry, genericMessage }: ErrorStateProps) {
  const { title, message } = copy[variant];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          {variant === 'network' ? (
            <svg
              className="w-10 h-10 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={NETWORK_ICON_PATH} />
            </svg>
          ) : (
            <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>

        {/* Message */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {variant === 'generic' && genericMessage ? genericMessage : message}
        </p>

        {/* Retry */}
        <Button onClick={onRetry}>
          <RefreshCw />
          Reintentar
        </Button>

        {/* Help text */}
        <p className="text-xs text-muted-foreground/70">
          Si el problema persiste, espera unos minutos e intenta de nuevo.
        </p>
      </div>
    </div>
  );
}
