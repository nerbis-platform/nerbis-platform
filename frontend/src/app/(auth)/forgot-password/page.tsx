// src/app/(auth)/forgot-password/page.tsx

'use client';

import AuthSplitScreenV2 from '@/components/auth/AuthSplitScreenV2';

export default function ForgotPasswordPage() {
  return <AuthSplitScreenV2 initialMode="forgot" />;
}
