// src/app/dashboard/team/page.tsx

import { redirect } from 'next/navigation';

export default function TeamRedirect() {
  redirect('/dashboard/settings/team');
}
