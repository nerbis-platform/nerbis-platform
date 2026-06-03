'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Redirect stub — generation polling page removed in #239.
 * Generation progress now shows in the Pipe chat (quick-start).
 */
export default function GeneratePage() {
  const router = useRouter();
  const { tenant } = useAuth();

  useEffect(() => {
    if (!tenant) return;
    if (tenant.website_status === 'review' || tenant.website_status === 'published') {
      router.replace('/dashboard/website-builder/editor');
    } else {
      router.replace('/dashboard/website-builder/quick-start');
    }
  }, [tenant, router]);

  return null;
}
