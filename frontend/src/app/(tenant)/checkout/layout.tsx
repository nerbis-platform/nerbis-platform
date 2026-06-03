// src/app/checkout/layout.tsx

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | NERBIS',
    default: 'Checkout',
  },
  robots: { index: false },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
