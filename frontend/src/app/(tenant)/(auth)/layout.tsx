// src/app/(tenant)/(auth)/layout.tsx

import type { Metadata } from 'next';
import { PlatformCookieConsent } from '@/components/auth/PlatformCookieConsent';

export const metadata: Metadata = {
  title: {
    template: '%s | NERBIS',
    default: 'Cuenta',
  },
  robots: { index: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <PlatformCookieConsent />
    </div>
  );
}
