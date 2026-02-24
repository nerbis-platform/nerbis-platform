// src/app/(auth)/register-business/layout.tsx

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GRAVITIFY — Crea tu negocio digital',
  description: 'Registra tu negocio en GRAVITIFY y crea tu sitio web profesional con inteligencia artificial.',
  icons: {
    icon: '/Isotipo_color_GRAVITIFY.png',
  },
};

export default function RegisterBusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
