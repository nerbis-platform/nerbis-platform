// src/app/(shop)/layout.tsx

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | NERBIS',
    default: 'NERBIS',
  },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
