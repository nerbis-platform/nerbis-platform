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
    // Opcionalmente, enviar el error a un servicio de tracking
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container max-w-md text-center px-4">
        {/* Icono */}
        <div className="mb-8 flex justify-center">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        {/* Mensaje */}
        <h1 className="text-2xl font-bold mb-2">Algo salió mal</h1>
        <p className="text-muted-foreground mb-8">
          Ha ocurrido un error inesperado. Por favor, intenta de nuevo o vuelve al inicio.
        </p>

        {/* Opciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Intentar de nuevo
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Ir al inicio
            </Link>
          </Button>
        </div>

        {/* Info adicional para desarrollo */}
        {process.env.NODE_ENV === 'development' && error.message && (
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