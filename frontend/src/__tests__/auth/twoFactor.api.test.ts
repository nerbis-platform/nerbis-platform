import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock del apiClient antes de importar el módulo bajo prueba.
// Usamos vi.hoisted porque vi.mock se eleva al tope del archivo.
const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
  },
  ApiError: class ApiError extends Error {},
}));

import {
  completeTwoFactorChallenge,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateBackupCodes,
  setupTwoFactor,
  verifyTwoFactor,
} from '@/lib/api/twoFactor';

describe('twoFactor API client', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('getTwoFactorStatus → GET /auth/2fa/status/', async () => {
    mockGet.mockResolvedValue({ data: { enabled: true } });
    const result = await getTwoFactorStatus();
    expect(mockGet).toHaveBeenCalledWith('/auth/2fa/status/');
    expect(result).toEqual({ enabled: true });
  });

  it('setupTwoFactor → POST /auth/2fa/setup/', async () => {
    mockPost.mockResolvedValue({
      data: { otpauth_uri: 'otpauth://totp/…', qr_code_base64: 'data:image/png;base64,AAA' },
    });
    const result = await setupTwoFactor();
    expect(mockPost).toHaveBeenCalledWith('/auth/2fa/setup/');
    expect(result.otpauth_uri).toBe('otpauth://totp/…');
    expect(result.qr_code_base64).toContain('data:image/png;base64,');
  });

  it('verifyTwoFactor → POST /auth/2fa/verify/ con el código', async () => {
    mockPost.mockResolvedValue({
      data: { backup_codes: ['AAAA-BBBB', 'CCCC-DDDD'] },
    });
    const result = await verifyTwoFactor('123456');
    expect(mockPost).toHaveBeenCalledWith('/auth/2fa/verify/', { code: '123456' });
    expect(result.backup_codes).toHaveLength(2);
  });

  it('disableTwoFactor envía password solo si se provee', async () => {
    mockPost.mockResolvedValue({ data: { message: 'ok' } });

    await disableTwoFactor({ code: '111222' });
    expect(mockPost).toHaveBeenLastCalledWith('/auth/2fa/disable/', { code: '111222' });

    await disableTwoFactor({ code: '111222', password: 'secret' });
    expect(mockPost).toHaveBeenLastCalledWith('/auth/2fa/disable/', {
      code: '111222',
      password: 'secret',
    });
  });

  it('regenerateBackupCodes → POST con TOTP', async () => {
    mockPost.mockResolvedValue({ data: { backup_codes: ['EEEE-FFFF'] } });
    const result = await regenerateBackupCodes('654321');
    expect(mockPost).toHaveBeenCalledWith('/auth/2fa/backup-codes/regenerate/', {
      code: '654321',
    });
    expect(result.backup_codes).toEqual(['EEEE-FFFF']);
  });

  it('completeTwoFactorChallenge → POST /auth/2fa/challenge/', async () => {
    mockPost.mockResolvedValue({
      data: {
        user: { id: 1 },
        tenant: null,
        tokens: { access: 'a', refresh: 'r' },
      },
    });
    const result = await completeTwoFactorChallenge({
      challenge_token: 'ch-token',
      code: '123456',
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/2fa/challenge/', {
      challenge_token: 'ch-token',
      code: '123456',
    });
    expect(result.tokens.access).toBe('a');
  });
});
