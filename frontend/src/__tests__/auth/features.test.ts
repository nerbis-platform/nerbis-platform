import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('features', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('defaults all flags to false when env vars are unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_SOCIAL_LOGIN', '');
    vi.stubEnv('NEXT_PUBLIC_FEATURE_PASSKEYS', '');
    vi.stubEnv('NEXT_PUBLIC_FEATURE_REMEMBER_ME', '');
    vi.stubEnv('NEXT_PUBLIC_USE_NEW_AUTH', '');

    const { features } = await import('@/lib/features');

    expect(features.socialLogin).toBe(false);
    expect(features.passkeys).toBe(false);
    expect(features.rememberMe).toBe(false);
    expect(features.useNewAuth).toBe(false);
  });

  it('enables socialLogin when env var is "true"', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_SOCIAL_LOGIN', 'true');

    const { features } = await import('@/lib/features');

    expect(features.socialLogin).toBe(true);
  });

  it('keeps socialLogin false for non-"true" values', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_SOCIAL_LOGIN', 'yes');

    const { features } = await import('@/lib/features');

    expect(features.socialLogin).toBe(false);
  });

  it('enables passkeys when env var is "true"', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_PASSKEYS', 'true');

    const { features } = await import('@/lib/features');

    expect(features.passkeys).toBe(true);
  });

  it('enables useNewAuth when env var is "true"', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_NEW_AUTH', 'true');

    const { features } = await import('@/lib/features');

    expect(features.useNewAuth).toBe(true);
  });
});
