// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTenantFromHost } from '@/lib/tenant';
import { validateAdminToken } from '@/lib/auth/admin-token';

// Cookie name must match the backend (core/cookies.py + core/authentication.py).
const ADMIN_ACCESS_COOKIE = 'nerbis_admin_access';

/**
 * Middleware de Next.js.
 *
 * 1. Admin auth guard: verifica cookie JWT para rutas /admin (excepto /admin/login).
 * 2. Tenant detection: extrae subdominio y lo propaga via header + cookie.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin auth guard (early-return) ──
  // Protects /admin routes server-side before serving any HTML.
  // /admin/login is always accessible.
  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && pathname !== '/admin/login') {
    const token = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
    if (!validateAdminToken(token)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl, 302);
    }
  }

  // ── Tenant detection ──
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
