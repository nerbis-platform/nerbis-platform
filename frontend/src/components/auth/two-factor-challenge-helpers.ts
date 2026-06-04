import type { AuthResponse } from '@/types';

// ─── Types ───────────────────────────────────────────────

export interface TwoFactorChallengeStepProps {
  challengeToken: string;
  methods?: string[];
  redirectTo?: string | null;
  onBack: () => void;
}

export type Mode = 'passkey' | 'totp' | 'backup';

// ─── Constants ───────────────────────────────────────────

export const TOTP_LENGTH = 6;
export const BACKUP_PATTERN = /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/;

// ─── Base64url encoding helpers ──────────────────────────

export function base64UrlToBuffer(b64url: string): ArrayBuffer {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
