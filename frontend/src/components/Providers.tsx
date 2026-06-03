// src/components/Providers.tsx

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TenantProvider, useTenantReady } from '@/contexts/TenantContext';
import { WebsiteContentProvider } from '@/contexts/WebsiteContentContext';
import { ThemeSync } from '@/components/ThemeSync';
import { AuthProvider } from '@/contexts/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CartProvider } from '@/contexts/CartContext';
import { Toaster } from '@/components/ui/sonner';
import { useState } from 'react';

/** Cart only loads when tenant is available (needs tenant for API calls) */
function CartProviderGuard({ children }: { children: React.ReactNode }) {
  const tenantReady = useTenantReady();

  if (!tenantReady) {
    return <>{children}</>;
  }

  return <CartProvider>{children}</CartProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || '';

  const content = (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <WebsiteContentProvider>
          <ThemeSync />
          <AuthProvider>
            <CartProviderGuard>
              {children}
              <Toaster position="top-right" />
            </CartProviderGuard>
          </AuthProvider>
        </WebsiteContentProvider>
      </TenantProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );

  // Only wrap in GoogleOAuthProvider if client ID is configured
  if (googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        {content}
      </GoogleOAuthProvider>
    );
  }

  return content;
}