// src/components/Providers.tsx

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TenantProvider, useTenantReady } from '@/contexts/TenantContext';
import { WebsiteContentProvider } from '@/contexts/WebsiteContentContext';
import { ThemeSync } from '@/components/ThemeSync';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { Toaster } from 'sonner';
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

  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <WebsiteContentProvider>
          <ThemeSync />
          <AuthProvider>
            <CartProviderGuard>
              {children}
              <Toaster position="top-right" richColors />
            </CartProviderGuard>
          </AuthProvider>
        </WebsiteContentProvider>
      </TenantProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}