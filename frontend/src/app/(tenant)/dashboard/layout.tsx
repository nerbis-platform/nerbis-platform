// src/app/dashboard/layout.tsx

import type { Metadata } from 'next';
import { DashboardShell } from './DashboardShell';

export const metadata: Metadata = {
  title: {
    template: '%s | Panel | NERBIS',
    default: 'Panel de control',
  },
  robots: { index: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
