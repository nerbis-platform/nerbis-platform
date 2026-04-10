// src/app/dashboard/profile/page.tsx

import { redirect } from 'next/navigation';

export default function ProfileRedirect() {
  redirect('/dashboard/settings/profile');
}
