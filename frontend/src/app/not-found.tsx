// src/app/not-found.tsx

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container max-w-md text-center px-4">
        {/* Ilustración 404 */}
        <div className="mb-8">
          <span className="text-9xl font-bold text-primary/20">404</span>
        </div>

        {/* Mensaje */}
        <h1 className="text-2xl font-bold mb-2">Página no encontrada</h1>
        <p className="text-muted-foreground mb-8">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>

        {/* Opciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Ir al inicio
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/products">
              <Search className="h-4 w-4 mr-2" />
              Ver productos
            </Link>
          </Button>
        </div>

        {/* Links adicionales */}
        <div className="mt-8 pt-8 border-t">
          <p className="text-sm text-muted-foreground mb-4">
            También puedes visitar:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/services" className="text-primary hover:underline">
              Servicios
            </Link>
            <Link href="/about" className="text-primary hover:underline">
              Nosotros
            </Link>
            <Link href="/contact" className="text-primary hover:underline">
              Contacto
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
