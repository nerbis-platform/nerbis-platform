// src/app/(auth)/forgot-password/page.tsx

'use client';

import AuthSplitScreen from '@/components/auth/AuthSplitScreen';
import AuthSplitScreenV2 from '@/components/auth/AuthSplitScreenV2';
import { features } from '@/lib/features';

export default function ForgotPasswordPage() {
  if (features.useNewAuth) {
    return <AuthSplitScreenV2 initialMode="forgot" />;
  }

  return <AuthSplitScreen initialMode="forgot" />;
}
