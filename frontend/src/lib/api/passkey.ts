// src/lib/api/passkey.ts
// WebAuthn (passkey) helpers — wraps backend endpoints + browser API.
//
// Flujos:
//   - registerPasskey(name): genera opciones, llama navigator.credentials.create, verifica.
//     Requiere usuario autenticado.
//   - authenticateWithPasskey(email?): genera opciones, llama navigator.credentials.get,
//     verifica. Retorna tokens JWT + user + tenant (backend responde con el mismo shape
//     que /public/platform-login/).

import { apiClient } from './client';
import type { AuthResponse } from '@/types';

// ─── Helpers de codificación base64url <-> ArrayBuffer ──────────

function base64UrlToBuffer(b64url: string): ArrayBuffer {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── Detección de soporte del browser ───────────────────────────

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.credentials !== 'undefined'
  );
}

// ─── REGISTRO ───────────────────────────────────────────────────

interface RegisterOptionsResponse {
  challenge: string;
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>;
  timeout?: number;
  excludeCredentials?: Array<{ id: string; type: 'public-key'; transports?: string[] }>;
  authenticatorSelection?: PublicKeyCredentialCreationOptions['authenticatorSelection'];
  attestation?: PublicKeyCredentialCreationOptions['attestation'];
}

/**
 * Registra un nuevo passkey para el usuario actualmente autenticado.
 * Requiere JWT válido en apiClient.
 */
export async function registerPasskey(name: string = 'Mi passkey'): Promise<void> {
  if (!isWebAuthnSupported()) {
    throw new Error('Tu navegador no soporta passkeys');
  }

  // 1) Pedir opciones al backend
  const { data } = await apiClient.post<RegisterOptionsResponse>(
    '/auth/passkey/register/options/',
    {},
  );

  // 2) Decodificar campos binarios
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: base64UrlToBuffer(data.challenge),
    rp: data.rp,
    user: {
      id: base64UrlToBuffer(data.user.id),
      name: data.user.name,
      displayName: data.user.displayName,
    },
    pubKeyCredParams: data.pubKeyCredParams,
    timeout: data.timeout,
    attestation: data.attestation,
    authenticatorSelection: data.authenticatorSelection,
    excludeCredentials: data.excludeCredentials?.map((c) => ({
      id: base64UrlToBuffer(c.id),
      type: c.type,
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  };

  // 3) Llamar al browser
  const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!cred) throw new Error('Registro cancelado');

  const attestationResponse = cred.response as AuthenticatorAttestationResponse;

  // 4) Serializar respuesta al formato que espera py_webauthn
  const credentialJson = {
    id: cred.id,
    rawId: bufferToBase64Url(cred.rawId),
    type: cred.type,
    response: {
      clientDataJSON: bufferToBase64Url(attestationResponse.clientDataJSON),
      attestationObject: bufferToBase64Url(attestationResponse.attestationObject),
      transports: (attestationResponse.getTransports?.() ?? []) as string[],
    },
    clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
  };

  // 5) Verificar en backend
  await apiClient.post('/auth/passkey/register/verify/', {
    credential: credentialJson,
    name,
  });
}

// ─── AUTENTICACIÓN (login) ──────────────────────────────────────

interface AuthenticateOptionsResponse {
  challenge: string;
  timeout?: number;
  rpId: string;
  allowCredentials?: Array<{ id: string; type: 'public-key'; transports?: string[] }>;
  userVerification?: UserVerificationRequirement;
  _scope: string;
}

/**
 * Autentica al usuario con un passkey existente.
 * Si email es provisto, el backend restringe los credentials permitidos a ese usuario.
 * Si no, usa "discoverable credential" (el browser muestra picker).
 */
export async function authenticateWithPasskey(email?: string): Promise<AuthResponse> {
  if (!isWebAuthnSupported()) {
    throw new Error('Tu navegador no soporta passkeys');
  }

  const { data } = await apiClient.post<AuthenticateOptionsResponse>(
    '/auth/passkey/authenticate/options/',
    email ? { email } : {},
  );

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToBuffer(data.challenge),
    timeout: data.timeout,
    rpId: data.rpId,
    userVerification: data.userVerification,
    allowCredentials: data.allowCredentials?.map((c) => ({
      id: base64UrlToBuffer(c.id),
      type: c.type,
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  };

  const cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
  if (!cred) throw new Error('Autenticación cancelada');

  const assertion = cred.response as AuthenticatorAssertionResponse;

  const credentialJson = {
    id: cred.id,
    rawId: bufferToBase64Url(cred.rawId),
    type: cred.type,
    response: {
      clientDataJSON: bufferToBase64Url(assertion.clientDataJSON),
      authenticatorData: bufferToBase64Url(assertion.authenticatorData),
      signature: bufferToBase64Url(assertion.signature),
      userHandle: assertion.userHandle ? bufferToBase64Url(assertion.userHandle) : null,
    },
    clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
  };

  const { data: authData } = await apiClient.post<AuthResponse>(
    '/auth/passkey/authenticate/verify/',
    {
      credential: credentialJson,
      scope: data._scope,
    },
  );

  // Persistir user/tenant en localStorage (tokens se manejan como httpOnly cookies)
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(authData.user));
    if (authData.tenant) {
      localStorage.setItem('tenant', JSON.stringify(authData.tenant));
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `tenant-slug=${authData.tenant.slug}; path=/; SameSite=Lax${secure}`;
    }
  }

  return authData;
}

// ─── GESTIÓN ────────────────────────────────────────────────────

export interface PasskeyRecord {
  id: number;
  name: string;
  created_at: string;
  last_used_at: string | null;
  transports: string[];
}

export async function listPasskeys(): Promise<PasskeyRecord[]> {
  const { data } = await apiClient.get<PasskeyRecord[]>('/auth/passkey/');
  return data;
}

export async function renamePasskey(id: number, name: string): Promise<void> {
  await apiClient.patch(`/auth/passkey/${id}/`, { name });
}

export async function deletePasskey(id: number): Promise<void> {
  await apiClient.delete(`/auth/passkey/${id}/`);
}
