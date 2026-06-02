// src/lib/auth/admin-token.ts
//
// Edge-compatible JWT payload validation for admin middleware.
// Decodes the JWT payload WITHOUT verifying the signature — the backend
// validates the signature on every API call. This is a first-line gate
// to prevent serving admin HTML to unauthenticated users.

const CLOCK_SKEW_TOLERANCE_SECONDS = 30;

interface AdminTokenPayload {
  scope?: string;
  exp?: number;
  is_superuser?: boolean;
  user_id?: number;
}

/**
 * Decode a base64url-encoded string to a UTF-8 string.
 * Works in Edge runtime (no Node.js Buffer needed).
 */
function base64UrlDecode(input: string): string {
  // Replace base64url chars with standard base64
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  // Pad to multiple of 4
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Validate an admin JWT token from the `nerbis_admin_access` cookie.
 *
 * Returns `true` if the token payload has `scope === "admin"` and is not
 * expired (with a 30-second tolerance for clock skew).
 *
 * Returns `false` for missing, malformed, expired, or non-admin tokens.
 * Never throws — all errors are caught and treated as invalid.
 */
export function validateAdminToken(token: string | undefined): boolean {
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload: AdminTokenPayload = JSON.parse(base64UrlDecode(parts[1]));

    // Must have admin scope
    if (payload.scope !== 'admin') return false;

    // Must not be expired (with tolerance)
    if (typeof payload.exp !== 'number') return false;
    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp + CLOCK_SKEW_TOLERANCE_SECONDS) return false;

    return true;
  } catch {
    return false;
  }
}
