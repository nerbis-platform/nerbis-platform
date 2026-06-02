// src/lib/tenant.ts

/**
 * Configuración de dominios base.
 * El subdominio se extrae de cualquier host que NO esté en esta lista.
 */
const BASE_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'nerbis.com',      // Dominio de producción
  'vercel.app',      // Preview deployments
];

/**
 * Tenant por defecto para desarrollo local.
 * Se usa cuando no se puede detectar un subdominio.
 */
const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || 'demo';

/**
 * Detecta el slug del tenant desde el hostname.
 *
 * Ejemplos:
 * - gc-belleza.nerbis.com → "gc-belleza"
 * - otro-negocio.nerbis.com → "otro-negocio"
 * - localhost:3000 → DEFAULT_TENANT_SLUG
 * - gc-belleza.localhost:3000 → "gc-belleza" (para desarrollo)
 *
 * @param host - El hostname (ej: "gc-belleza.nerbis.com" o "localhost:3000")
 * @returns El slug del tenant
 */
export function getTenantFromHost(host: string | null): string {
  if (!host) {
    return DEFAULT_TENANT_SLUG;
  }

  // Remover puerto si existe
  const hostname = host.split(':')[0];

  // Si es un dominio base directo, usar default
  if (BASE_DOMAINS.includes(hostname)) {
    return DEFAULT_TENANT_SLUG;
  }

  // Extraer partes del dominio
  const parts = hostname.split('.');

  // Si tiene al menos 2 partes (subdominio.dominio)
  if (parts.length >= 2) {
    const potentialSubdomain = parts[0];

    // Verificar que no sea www
    if (potentialSubdomain !== 'www') {
      return potentialSubdomain;
    }

    // Si es www, verificar si hay otro subdominio
    if (parts.length >= 3 && parts[1] !== 'www') {
      return parts[1];
    }
  }

  return DEFAULT_TENANT_SLUG;
}

/**
 * Obtiene el tenant slug en el cliente (browser).
 * Usa window.location.host para detectar el subdominio.
 */
export function getClientTenantSlug(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_TENANT_SLUG;
  }
  return getTenantFromHost(window.location.host);
}

/**
 * Variable global para almacenar el tenant slug detectado.
 * Se establece en el middleware y se usa en el cliente.
 */
let currentTenantSlug: string | null = null;

export function setCurrentTenantSlug(slug: string): void {
  currentTenantSlug = slug;
}

export function getCurrentTenantSlug(): string {
  // Primero intentar el valor establecido por el middleware
  if (currentTenantSlug) {
    return currentTenantSlug;
  }

  // Luego intentar detectar del cliente
  return getClientTenantSlug();
}
