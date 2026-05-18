// src/app/(auth)/reactivate/page.tsx

'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import AuthSplitScreenV2 from '@/components/auth/AuthSplitScreenV2';

function ReactivatePageInner() {
  return <AuthSplitScreenV2 initialMode="reactivate" />;
}

export default function ReactivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      }
    >
      <ReactivatePageInner />
    </Suspense>
  );
}
