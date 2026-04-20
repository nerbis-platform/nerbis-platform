// src/lib/api/team.ts

import api from './client';
import type {
  TeamInvitation,
  CreateInvitationData,
  AcceptInvitationData,
  InvitationDetail,
  AuthResponse,
} from '@/types';

export interface SocialAccountDetail {
  id: number;
  provider: 'google' | 'apple' | 'facebook';
  email: string;
  provider_name: string;
  avatar_url: string;
  created_at: string;
}

export interface TeamMember {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  avatar: string | null;
  role: 'admin' | 'staff' | 'customer';
  role_display: string;
  is_active: boolean;
  date_joined: string;
  has_password: boolean;
  social_accounts: SocialAccountDetail[];
  auth_method: 'email_only' | 'social_only' | 'both';
  has_2fa: boolean;
}

export interface TeamFilters {
  role?: string;
  auth_method?: string;
  search?: string;
  ordering?: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ===================================
// Team Members (from develop)
// ===================================

export async function getTeamMembers(filters?: TeamFilters): Promise<TeamMember[]> {
  const params = new URLSearchParams();
  if (filters?.role) params.set('role', filters.role);
  if (filters?.auth_method) params.set('auth_method', filters.auth_method);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.ordering) params.set('ordering', filters.ordering);

  const query = params.toString();
  const url = query ? `/team/?${query}` : '/team/';
  const { data } = await api.get<PaginatedResponse<TeamMember>>(url);
  return data.results;
}

export async function disconnectTeamSocial(
  userId: number,
  provider: string
): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(
    `/team/${userId}/social/${provider}/`
  );
  return data;
}

export async function resetTeam2FA(
  userId: number
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(
    `/team/${userId}/2fa/reset/`
  );
  return data;
}

// ===================================
// Team Invitations
// ===================================

export async function getTeamInvitations(): Promise<TeamInvitation[]> {
  const { data } = await api.get<{ results: TeamInvitation[] } | TeamInvitation[]>('/team/invitations/');
  // Handle both paginated and non-paginated responses
  if (Array.isArray(data)) return data;
  return data.results;
}

export async function createTeamInvitation(invitationData: CreateInvitationData): Promise<TeamInvitation> {
  const { data } = await api.post<TeamInvitation>('/team/invitations/', invitationData);
  return data;
}

export async function cancelTeamInvitation(id: number): Promise<void> {
  await api.delete(`/team/invitations/${id}/`);
}

export async function resendTeamInvitation(id: number): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(`/team/invitations/${id}/resend/`);
  return data;
}

export async function getInvitationDetail(token: string): Promise<InvitationDetail> {
  const { data } = await api.get<InvitationDetail>(`/public/invitation/${token}/`);
  return data;
}

export async function acceptInvitation(token: string, acceptData: AcceptInvitationData): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>(`/public/accept-invitation/${token}/`, acceptData);

  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', response.data.tokens.access);
    localStorage.setItem('refresh_token', response.data.tokens.refresh);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    if (response.data.tenant) {
      localStorage.setItem('tenant', JSON.stringify(response.data.tenant));
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `tenant-slug=${response.data.tenant.slug}; path=/; SameSite=Lax${secure}`;
    }
  }

  return response.data;
}
