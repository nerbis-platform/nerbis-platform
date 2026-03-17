// src/app/(auth)/login/page.tsx

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AuthSplitScreen from '@/components/auth/AuthSplitScreen';
import AuthSplitScreenV2 from '@/components/auth/AuthSplitScreenV2';
import { features } from '@/lib/features';

function LoginPageInner() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  if (features.useNewAuth) {
    return <AuthSplitScreenV2 initialMode="login" redirectTo={redirectTo} />;
  }

  return <AuthSplitScreen initialMode="login" redirectTo={redirectTo} />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1C3B57' }} />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
