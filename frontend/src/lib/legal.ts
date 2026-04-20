// src/lib/legal.ts
//
// Shared utilities for platform-level legal pages.

export function getContactEmail(): string {
  return process.env.NEXT_PUBLIC_NERBIS_EMAIL || 'hola@nerbis.com';
}
