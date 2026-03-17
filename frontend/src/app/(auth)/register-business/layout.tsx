// src/app/(auth)/register-business/layout.tsx

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registrar negocio',
  description: 'Registra tu negocio en NERBIS y crea tu sitio web profesional con inteligencia artificial.',
};

export default function RegisterBusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
