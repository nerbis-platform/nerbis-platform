// src/app/(auth)/layout.tsx

import { Inter, Nunito } from 'next/font/google';
import { PlatformCookieConsent } from '@/components/auth/PlatformCookieConsent';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

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
    <div className={`${inter.variable} ${nunito.variable}`}>
      {children}
      <PlatformCookieConsent />
    </div>
  );
}
