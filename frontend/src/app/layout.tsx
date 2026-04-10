// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://nerbis.com'),
  title: {
    default: 'NERBIS — Plataforma para tu negocio',
    template: '%s | NERBIS',
  },
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    'Plataforma SaaS para gestionar tu negocio: productos, servicios, reservas y más.',
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    siteName: 'NERBIS',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'NERBIS — Plataforma para tu negocio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}