// src/lib/api/twoFactor.ts
//
// Cliente tipado para los endpoints de 2FA (TOTP) del backend.
// Todos los endpoints (excepto /challenge/) requieren JWT.

import { apiClient } from './client';
import type { AuthResponse } from '@/types';

// ─── Tipos públicos ─────────────────────────────────────────────

export interface TwoFactorStatus {
  enabled: boolean;
}

export interface TwoFactorSetupResponse {
  otpauth_uri: string;
  qr_code_base64: string;
}

export interface TwoFactorVerifyResponse {
  backup_codes: string[];
}

export interface TwoFactorBackupCodesResponse {
  backup_codes: string[];
}

export interface TwoFactorChallengeRequest {
  challenge_token: string;
  code: string;
}

/**
 * Resultado discriminado de un intento de login.
 * - `kind: "tokens"` → credenciales válidas, JWT emitido.
 * - `kind: "2fa_required"` → el servidor requiere un segundo factor.
 */
export type LoginResult =
  | { kind: 'tokens'; response: AuthResponse }
  | { kind: '2fa_required'; challengeToken: string; methods: string[] };

// ─── Endpoints ──────────────────────────────────────────────────

/** GET /auth/2fa/status/ */
export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  const { data } = await apiClient.get<TwoFactorStatus>('/auth/2fa/status/');
  return data;
}

/**
 * POST /auth/2fa/setup/
 * Inicia el enrolamiento: crea un TOTPDevice sin confirmar y devuelve el QR.
 * Devuelve 400 si el usuario ya tiene 2FA confirmado.
 */
export async function setupTwoFactor(): Promise<TwoFactorSetupResponse> {
  const { data } = await apiClient.post<TwoFactorSetupResponse>('/auth/2fa/setup/');
  return data;
}

/**
 * POST /auth/2fa/verify/
 * Confirma el dispositivo con el primer código. Devuelve backup codes
 * (solo se muestran una vez).
 */
export async function verifyTwoFactor(code: string): Promise<TwoFactorVerifyResponse> {
  const { data } = await apiClient.post<TwoFactorVerifyResponse>(
    '/auth/2fa/verify/',
    { code },
  );
  return data;
}

/**
 * POST /auth/2fa/disable/
 * Desactiva 2FA. Requiere TOTP y —si el usuario tiene contraseña utilizable—
 * también la contraseña actual.
 */
export async function disableTwoFactor(payload: {
  code: string;
  password?: string;
}): Promise<{ message: string }> {
  const body: Record<string, string> = { code: payload.code };
  if (payload.password) body.password = payload.password;
  const { data } = await apiClient.post<{ message: string }>(
    '/auth/2fa/disable/',
    body,
  );
  return data;
}

/**
 * POST /auth/2fa/backup-codes/regenerate/
 * Regenera los 8 backup codes. Requiere un TOTP válido actual
 * (no acepta backup codes).
 */
export async function regenerateBackupCodes(
  code: string,
): Promise<TwoFactorBackupCodesResponse> {
  const { data } = await apiClient.post<TwoFactorBackupCodesResponse>(
    '/auth/2fa/backup-codes/regenerate/',
    { code },
  );
  return data;
}

/**
 * POST /auth/2fa/challenge/
 * Completa el login con un challenge_token corto y un código TOTP o backup.
 * Devuelve el mismo shape que el login normal (user + tenant + tokens).
 */
export async function completeTwoFactorChallenge(
  payload: TwoFactorChallengeRequest,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(
    '/auth/2fa/challenge/',
    payload,
  );
  return data;
}

// ─── Passkey como segundo factor ─────────────────────────────────

export interface PasskeyChallengeOptionsResponse {
  challenge: string;
  timeout?: number;
  rpId: string;
  allowCredentials?: Array<{ id: string; type: 'public-key'; transports?: string[] }>;
  userVerification?: string;
  _scope: string;
}

/**
 * POST /auth/2fa/challenge/passkey/options/
 * Genera opciones de autenticación WebAuthn para verificar passkey como 2FA.
 */
export async function getTwoFactorPasskeyOptions(
  challengeToken: string,
): Promise<PasskeyChallengeOptionsResponse> {
  const { data } = await apiClient.post<PasskeyChallengeOptionsResponse>(
    '/auth/2fa/challenge/passkey/options/',
    { challenge_token: challengeToken },
  );
  return data;
}

/**
 * POST /auth/2fa/challenge/passkey/verify/
 * Verifica la assertion WebAuthn como segundo factor y devuelve JWT.
 */
export async function verifyTwoFactorPasskey(payload: {
  challenge_token: string;
  credential: Record<string, unknown>;
  scope: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(
    '/auth/2fa/challenge/passkey/verify/',
    payload,
  );
  return data;
}
