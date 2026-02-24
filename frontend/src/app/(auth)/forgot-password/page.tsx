// src/app/(auth)/forgot-password/page.tsx

'use client';

import AuthSplitScreen from '@/components/auth/AuthSplitScreen';

export default function ForgotPasswordPage() {
  return <AuthSplitScreen initialMode="forgot" />;
}
