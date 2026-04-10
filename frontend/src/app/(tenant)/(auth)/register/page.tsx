// src/app/(auth)/register/page.tsx

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AuthSplitScreenV2 from '@/components/auth/AuthSplitScreenV2';

function RegisterPageInner() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  return <AuthSplitScreenV2 initialMode="register" redirectTo={redirectTo} />;
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1C3B57' }} />
        </div>
      }
    >
      <RegisterPageInner />
    </Suspense>
  );
}
