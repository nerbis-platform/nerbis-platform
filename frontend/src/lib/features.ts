// src/lib/features.ts
// Feature flag configuration — reads NEXT_PUBLIC_FEATURE_* env vars.
// Next.js replaces these at build time. When false, dead code elimination
// removes unused branches — zero runtime cost.

export const features = {
  /** Show Google/Apple/Facebook login buttons */
  socialLogin: process.env.NEXT_PUBLIC_FEATURE_SOCIAL_LOGIN === 'true',

  /** Show passkey (WebAuthn) registration/login option */
  passkeys: process.env.NEXT_PUBLIC_FEATURE_PASSKEYS === 'true',

  /** Show "remember me" checkbox on login form */
  rememberMe: process.env.NEXT_PUBLIC_FEATURE_REMEMBER_ME === 'true',

  /** Use new V2 auth components instead of the monolithic V1 */
  useNewAuth: process.env.NEXT_PUBLIC_USE_NEW_AUTH === 'true',
} as const;

export type FeatureFlags = typeof features;
