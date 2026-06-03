'use client';

import { useTenantContact } from '@/contexts/TenantContext';

export function TenantContactEmail() {
  const contact = useTenantContact();
  const email = contact?.email;

  if (!email) return null;

  return (
    <a href={`mailto:${email}`} className="text-primary hover:underline">
      {email}
    </a>
  );
}
