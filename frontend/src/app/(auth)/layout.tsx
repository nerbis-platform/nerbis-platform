// src/app/(auth)/layout.tsx

import { Nunito } from 'next/font/google';
import { PlatformCookieConsent } from '@/components/auth/PlatformCookieConsent';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['900'],
  display: 'swap',
  variable: '--font-nunito',
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={nunito.variable}>
      {children}
      <PlatformCookieConsent />
    </div>
  );
}
