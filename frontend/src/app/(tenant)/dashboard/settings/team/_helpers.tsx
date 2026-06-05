'use client';

import Image from 'next/image';
import { Mail, KeyRound, ShieldCheck, Shield, UserRound } from 'lucide-react';
import type { TeamMember, SocialAccountDetail } from '@/lib/api/team';

// ─── Style constants (tokenized) ──────────────────────────
// Mapeo a tokens del design system:
//   navy text → text-foreground
//   navy 6% bg → bg-primary/[0.06]
export const navyText = 'text-foreground';
export const navyIconBg = 'bg-primary/[0.06]';

// ─── Config objects ───────────────────────────────────────

export const PROVIDER_CONFIG = {
  google: { label: 'Google', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  apple: { label: 'Apple', textColor: 'text-neutral-900', bgLight: 'bg-neutral-100' },
  facebook: { label: 'Facebook', textColor: 'text-indigo-700', bgLight: 'bg-indigo-50' },
} as const;

export const ROLE_CONFIG = {
  admin: { label: 'Admin', variant: 'default' as const, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  staff: { label: 'Staff', variant: 'secondary' as const, icon: Shield, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  customer: { label: 'Cliente', variant: 'outline' as const, icon: UserRound, color: 'text-blue-600', bg: 'bg-blue-500/10' },
} as const;

export const DEFAULT_PROVIDER_CONFIG = { label: 'Otro', textColor: 'text-gray-700', bgLight: 'bg-gray-100' };

// ─── Utility functions ────────────────────────────────────

export function getInitials(member: TeamMember): string {
  if (member.first_name && member.last_name) {
    return `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();
  }
  return member.email[0].toUpperCase();
}

export function isValidAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// ─── Sub-components ───────────────────────────────────────

export function ProviderBadge({ social }: { social: SocialAccountDetail }) {
  const config = PROVIDER_CONFIG[social.provider] ?? DEFAULT_PROVIDER_CONFIG;
  const showAvatar = social.avatar_url && isValidAvatarUrl(social.avatar_url);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgLight} ${config.textColor}`}
    >
      {showAvatar && (
        <Image
          src={social.avatar_url}
          alt=""
          width={14}
          height={14}
          className="w-3.5 h-3.5 rounded-full"
          unoptimized
        />
      )}
      {config.label}
    </span>
  );
}

export function AuthMethodBadge({ method }: { method: TeamMember['auth_method'] }) {
  if (method === 'email_only') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Mail className="w-3 h-3" />
        Email
      </span>
    );
  }
  if (method === 'social_only') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <KeyRound className="w-3 h-3" />
        Social
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Mail className="w-3 h-3" />
      +
      <KeyRound className="w-3 h-3" />
    </span>
  );
}
