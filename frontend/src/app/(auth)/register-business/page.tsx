// src/app/(auth)/register-business/page.tsx

'use client';

import AuthSplitScreen from '@/components/auth/AuthSplitScreen';
import AuthSplitScreenV2 from '@/components/auth/AuthSplitScreenV2';
import { features } from '@/lib/features';

export default function RegisterBusinessPage() {
  if (features.useNewAuth) {
    return <AuthSplitScreenV2 initialMode="register" />;
  }

  return <AuthSplitScreen initialMode="register" />;
}
