'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy setup page — redirects to Quick Start with Pipe.
 * Kept as a route so old bookmarks/links still work.
 */
export default function SetupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/website-builder/quick-start');
  }, [router]);

  return null;
}
