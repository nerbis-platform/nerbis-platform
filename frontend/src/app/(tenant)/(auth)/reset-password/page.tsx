// src/app/(auth)/reset-password/page.tsx
// Redirect to unified forgot-password flow

import { redirect } from 'next/navigation';

export default function ResetPasswordPage() {
  redirect('/forgot-password');
}
