// src/app/(tenant)/layout.tsx
//
// Tenant route group layout. Wraps all tenant-facing routes with the full
// provider stack (TenantContext, AuthContext, CartContext, etc.).

import { Providers } from '@/components/Providers';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GoogleAnalytics />
      <Providers>
        {children}
      </Providers>
    </>
  );
}
