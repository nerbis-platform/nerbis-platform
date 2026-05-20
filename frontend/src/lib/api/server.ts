// src/lib/api/server.ts
// Utilidad para fetching server-side en Server Components (ISR/SSG).
// NO usa axios ni localStorage — usa fetch nativo con Next.js revalidation.

import { headers } from 'next/headers';
import { getTenantFromHost } from '@/lib/tenant';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Obtener el tenant slug desde los headers del request (server-side).
 */
export async function getServerTenantSlug(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get('host');
  return getTenantFromHost(host);
}

/**
 * Fetch server-side con tenant slug y revalidación ISR.
 *
 * @param path - Ruta relativa del API (ej: "/products/")
 * @param options - Opciones adicionales
 * @param options.revalidate - Segundos para ISR (default: 60)
 * @param options.tenantSlug - Override del tenant slug
 */
export async function fetchServer<T>(
  path: string,
  options: {
    revalidate?: number | false;
    tenantSlug?: string;
    params?: Record<string, string | number | boolean | undefined>;
  } = {},
): Promise<T> {
  const { revalidate = 60, tenantSlug, params } = options;

  const slug = tenantSlug || await getServerTenantSlug();

  // Construir URL con query params
  let url = `${API_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': slug,
    },
    next: revalidate === false ? { revalidate: false } : { revalidate },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText} — ${url}`);
  }

  return res.json();
}
