// src/components/auth/SocialLoginButtons.tsx
// Google, Apple, Facebook social login buttons behind feature flag.

'use client';

import { useState, useCallback } from 'react';
import { features } from '@/lib/features';
import { toast } from 'sonner';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import type { SocialLoginButtonsProps } from './types';
import type { SocialProvider } from '@/types';
import { SocialLinkDialog } from './SocialLinkDialog';
import { AxiosError } from 'axios';
import { ApiError } from '@/lib/api/client';

// ─── SVG Icons (inline to avoid extra dependencies) ─────────────

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill="#1877F2"
      />
    </svg>
  );
}

// ─── Types ──────────────────────────────────────────────────────

interface LinkingState {
  open: boolean;
  provider: SocialProvider;
  token: string;
  email: string;
  extra?: { first_name?: string; last_name?: string };
}

// ─── Component ──────────────────────────────────────────────────

export function SocialLoginButtons({
  mode,
  onGoogleClick,
  onAppleClick,
  onFacebookClick,
  onSwitchToRegister,
}: SocialLoginButtonsProps) {
  if (!features.socialLogin) return null;

  return <SocialLoginButtonsInner mode={mode} onGoogleClick={onGoogleClick} onAppleClick={onAppleClick} onFacebookClick={onFacebookClick} onSwitchToRegister={onSwitchToRegister} />;
}

/** Inner component — hooks are safe here because parent already checked feature flag. */
function SocialLoginButtonsInner({
  mode,
  onGoogleClick,
  onAppleClick,
  onFacebookClick,
  onSwitchToRegister,
}: SocialLoginButtonsProps) {
  const { socialLogin } = useAuth();
  const [isLoading, setIsLoading] = useState<SocialProvider | null>(null);
  const [linkingState, setLinkingState] = useState<LinkingState>({
    open: false,
    provider: 'google',
    token: '',
    email: '',
  });

  const handleSocialError = useCallback((error: unknown, provider: string, token?: string) => {
    // Extract code and data — works for both AxiosError and ApiError (from interceptor)
    let code: string | undefined;
    let data: Record<string, unknown> | undefined;
    let message: string | undefined;

    if (error instanceof AxiosError) {
      code = error.response?.data?.code;
      data = error.response?.data;
      message = error.response?.data?.error || error.response?.data?.message;
    } else if (error instanceof ApiError) {
      const errorData = error.data as Record<string, unknown> | undefined;
      code = errorData?.code as string | undefined;
      data = errorData;
      message = error.message;
    }

    if (code) {
      // Linking dialog handles this
      if (code === 'LINKING_REQUIRED') return;
      // No account found — switch to register with pre-filled data + social token
      if (code === 'USER_NOT_FOUND') {
        const suggested = data?.suggested_user as { email?: string; first_name?: string; last_name?: string } | undefined;
        if (onSwitchToRegister && suggested) {
          toast.info('No encontramos una cuenta con este email', {
            description: 'Te llevamos al registro con tus datos pre-llenados.',
          });
          onSwitchToRegister({
            email: suggested.email || '',
            first_name: suggested.first_name || '',
            last_name: suggested.last_name || '',
            provider,
            token,
          });
        } else {
          toast.info('No encontramos una cuenta con este email', {
            description: 'Regístrate primero para poder acceder con tu cuenta social.',
          });
        }
        return;
      }
    }

    toast.error(message || `Error al iniciar sesión con ${provider}`);
  }, [onSwitchToRegister]);

  const handleSocialSuccess = useCallback(async (
    provider: SocialProvider,
    token: string,
    extra?: { first_name?: string; last_name?: string }
  ) => {
    setIsLoading(provider);
    try {
      await socialLogin(provider, token, extra);
    } catch (error) {
      // Handle linking required — check both AxiosError and ApiError
      const errorData = error instanceof AxiosError
        ? error.response?.data
        : error instanceof ApiError
          ? error.data as Record<string, unknown>
          : undefined;

      if (errorData && (errorData as Record<string, unknown>).code === 'LINKING_REQUIRED') {
        setLinkingState({
          open: true,
          provider,
          token,
          email: (errorData as Record<string, unknown>).email as string || '',
          extra,
        });
        return;
      }
      handleSocialError(error, provider, token);
    } finally {
      setIsLoading(null);
    }
  }, [socialLogin, handleSocialError]);

  // ─── Google ───────────────────────────────────────────────
  const googleLogin = useGoogleLogin({
    onSuccess: (response) => {
      // useGoogleLogin with implicit flow returns access_token
      // We need id_token, so we use the 'code' flow or credential response
      // Actually, for id_token we should use the One Tap / credential flow
      // Let's use the access_token and exchange on server side
      handleSocialSuccess('google', response.access_token);
    },
    onError: () => {
      toast.error('Error al conectar con Google');
    },
    flow: 'implicit',
  });

  const handleGoogle = () => {
    if (onGoogleClick) return onGoogleClick();
    if (!process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID) {
      toast.info('Google login no está configurado');
      return;
    }
    googleLogin();
  };

  // ─── Apple ────────────────────────────────────────────────
  const handleApple = () => {
    if (onAppleClick) return onAppleClick();
    if (!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID) {
      toast.info('Apple login no está configurado');
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/apple/callback`;

    // Load Apple JS SDK dynamically
    if (!(window as unknown as Record<string, unknown>).AppleID) {
      const script = document.createElement('script');
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.onload = () => initAppleLogin(clientId, redirectUri);
      document.head.appendChild(script);
    } else {
      initAppleLogin(clientId, redirectUri);
    }
  };

  const initAppleLogin = (clientId: string, redirectUri: string) => {
    const AppleID = (window as unknown as Record<string, unknown>).AppleID as {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => Promise<{ authorization: { id_token: string; code: string }; user?: { name?: { firstName?: string; lastName?: string } } }>;
      };
    };

    AppleID.auth.init({
      clientId,
      scope: 'name email',
      redirectURI: redirectUri,
      usePopup: true,
    });

    AppleID.auth.signIn().then((response) => {
      const idToken = response.authorization.id_token;
      const firstName = response.user?.name?.firstName || '';
      const lastName = response.user?.name?.lastName || '';
      handleSocialSuccess('apple', idToken, { first_name: firstName, last_name: lastName });
    }).catch(() => {
      // User cancelled or error — don't show error for cancellation
    });
  };

  // ─── Facebook ─────────────────────────────────────────────
  const handleFacebook = () => {
    if (onFacebookClick) return onFacebookClick();
    if (!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
      toast.info('Facebook login no está configurado');
      return;
    }

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

    type FBSdk = {
      init: (config: Record<string, unknown>) => void;
      login: (
        callback: (response: { authResponse?: { accessToken: string } }) => void,
        options: Record<string, unknown>
      ) => void;
    };

    const loginWithFB = () => {
      const FB = (window as unknown as Record<string, unknown>).FB as FBSdk;
      FB.login(
        (response) => {
          if (response.authResponse?.accessToken) {
            handleSocialSuccess('facebook', response.authResponse.accessToken);
          }
        },
        { scope: 'email,public_profile' }
      );
    };

    const initAndLoginFB = () => {
      const FB = (window as unknown as Record<string, unknown>).FB as FBSdk;
      FB.init({ appId, version: 'v19.0', cookie: true, xfbml: false });
      loginWithFB();
    };

    if (!(window as unknown as Record<string, unknown>).FB) {
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.onload = initAndLoginFB;
      document.head.appendChild(script);
    } else {
      loginWithFB();
    }
  };

  const actionLabel = mode === 'login' ? 'Iniciar sesión' : 'Registrarse';
  const appleAvailable = !!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;

  const btnClass =
    'flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--auth-radius-button)] border border-[var(--auth-border)] bg-white text-[0.75rem] font-medium transition-[background-color,border-color] duration-[var(--auth-duration-fast)] ease-out hover:bg-[#F9FAFB] hover:border-[var(--auth-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <>
      <section
        aria-label={`${actionLabel} con redes sociales`}
        className="flex gap-2.5"
        data-auth-animated
      >
        <button
          type="button"
          onClick={handleGoogle}
          disabled={isLoading !== null}
          aria-label={`${actionLabel} con Google`}
          className={btnClass}
          style={{ color: 'var(--auth-text)', fontFamily: 'var(--auth-font-body)' }}
        >
          <GoogleIcon />
          <span>{isLoading === 'google' ? '...' : 'Google'}</span>
        </button>
        <button
          type="button"
          onClick={appleAvailable ? handleApple : undefined}
          disabled={!appleAvailable || isLoading !== null}
          aria-label={appleAvailable ? `${actionLabel} con Apple` : 'Apple — Próximamente'}
          title={!appleAvailable ? 'Próximamente' : undefined}
          className={`${btnClass} relative`}
          style={{
            color: 'var(--auth-text)',
            fontFamily: 'var(--auth-font-body)',
            ...(!appleAvailable ? { opacity: 0.45, cursor: 'default' } : {}),
          }}
        >
          <AppleIcon />
          <span>{isLoading === 'apple' ? '...' : 'Apple'}</span>
          {!appleAvailable && (
            <span className="absolute -top-2.5 -right-2 rounded-full bg-[var(--auth-accent,#3B82F6)] px-1.5 py-0.5 text-[0.55rem] font-semibold leading-none text-white shadow-sm">
              Pronto
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={handleFacebook}
          disabled={isLoading !== null}
          aria-label={`${actionLabel} con Facebook`}
          className={btnClass}
          style={{ color: 'var(--auth-text)', fontFamily: 'var(--auth-font-body)' }}
        >
          <FacebookIcon />
          <span>{isLoading === 'facebook' ? '...' : 'Facebook'}</span>
        </button>
      </section>

      <SocialLinkDialog
        open={linkingState.open}
        email={linkingState.email}
        provider={linkingState.provider}
        token={linkingState.token}
        extra={linkingState.extra}
        onClose={() => setLinkingState((s) => ({ ...s, open: false }))}
      />
    </>
  );
}
