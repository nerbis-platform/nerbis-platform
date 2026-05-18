'use client';

import { useRef } from 'react';
import { useScrollAnimation } from '@/components/website/useScrollAnimation';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useScrollAnimation(containerRef);

  return (
    <div ref={containerRef} className="min-h-screen bg-zinc-950">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
