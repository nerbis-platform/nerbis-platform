// src/app/error.tsx

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  const isNetworkError =
    error.message?.includes('conectar') ||
    error.message?.includes('NETWORK_ERROR') ||
    error.message?.includes('fetch') ||
    error.message?.includes('network');

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-gray-50 to-white p-6">
      <div className="text-center max-w-sm">
        {/* Icon */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          {isNetworkError ? (
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          ) : (
            <AlertTriangle className="h-10 w-10 text-gray-400" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {isNetworkError ? 'Sin conexión al servidor' : 'Algo salió mal'}
        </h2>

        {/* Message */}
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          {isNetworkError
            ? 'No pudimos conectar con el servidor. Esto puede pasar si hay un mantenimiento o si tu conexión a internet se perdió.'
            : 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo o vuelve al inicio.'}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
          {!isNetworkError && (
            <Button variant="outline" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Ir al inicio
              </Link>
            </Button>
          )}
        </div>

        {/* Help text */}
        <p className="text-xs text-gray-400 mt-4">
          Si el problema persiste, espera unos minutos e intenta de nuevo.
        </p>

        {/* Dev info */}
        {process.env.NODE_ENV === 'development' && error.message && !isNetworkError && (
          <div className="mt-8 p-4 bg-muted rounded-lg text-left">
            <p className="text-xs text-muted-foreground font-mono break-all">
              {error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}