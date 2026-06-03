'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Redirect stub — onboarding form wizard removed in #239.
 * All onboarding now happens in the Pipe chat (quick-start).
 */
export default function OnboardingPage() {
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
