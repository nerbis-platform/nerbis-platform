// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTenantFromHost } from '@/lib/tenant';

/**
 * Middleware de Next.js para detectar el tenant por subdominio.
 *
 * Este middleware:
 * 1. Extrae el subdominio del host
 * 2. Lo almacena en un header personalizado para que el cliente lo use
 * 3. Permite que la app funcione con múltiples tenants
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const tenantSlug = getTenantFromHost(host);

  // Crear respuesta con el header del tenant
  const response = NextResponse.next();

  // Agregar el tenant slug como header para que el cliente lo pueda leer
  response.headers.set('x-tenant-slug', tenantSlug);

  // También agregarlo a los cookies para acceso fácil en el cliente
  response.cookies.set('tenant-slug', tenantSlug, {
    httpOnly: false, // Permitir acceso desde JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return response;
}

/**
 * Configuración del middleware.
 * Excluir rutas estáticas y de API internas de Next.js.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
