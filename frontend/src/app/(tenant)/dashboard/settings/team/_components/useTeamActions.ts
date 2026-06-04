'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getTeamMembers,
  disconnectTeamSocial,
  resetTeam2FA,
  getTeamInvitations,
  createTeamInvitation,
  cancelTeamInvitation,
  resendTeamInvitation,
  updateTeamMember,
  blockTeamMember,
  unblockTeamMember,
  deleteTeamMember,
} from '@/lib/api/team';
import type { TeamFilters, UpdateMemberData } from '@/lib/api/team';
import type { CreateInvitationData } from '@/types';

interface UseTeamActionsParams {
  isAdmin: boolean;
  filters: TeamFilters;
  /** Callbacks que cierran cada diálogo al completarse su mutación. */
  onDisconnectSuccess: () => void;
  onReset2faSuccess: () => void;
  onUpdateMemberSuccess: () => void;
  onBlockSuccess: () => void;
  onUnblockSuccess: () => void;
  onDeleteSuccess: () => void;
  onCreateInvitationSuccess: () => void;
}

/**
 * Encapsula las queries y mutaciones del módulo de equipo.
 * Todas las llamadas pasan por `lib/api/team` (scoped por tenant vía X-Tenant-Slug).
 * Comportamiento idéntico al original: mismos queryKeys, toasts e invalidaciones.
 */
export function useTeamActions({
  isAdmin,
  filters,
  onDisconnectSuccess,
  onReset2faSuccess,
  onUpdateMemberSuccess,
  onBlockSuccess,
  onUnblockSuccess,
  onDeleteSuccess,
  onCreateInvitationSuccess,
}: UseTeamActionsParams) {
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ['team-members', filters],
    queryFn: () => getTeamMembers(filters),
    enabled: isAdmin,
  });

  const disconnectMutation = useMutation({
    mutationFn: ({ userId, provider }: { userId: number; provider: string }) =>
      disconnectTeamSocial(userId, provider),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success(data.message);
      onDisconnectSuccess();
    },
    onError: (error: Error & { data?: { error?: string } }) => {
      toast.error(error.data?.error || error.message || 'Error al desvincular la cuenta');
    },
  });

  const reset2faMutation = useMutation({
    mutationFn: (userId: number) => resetTeam2FA(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success(data.message);
      onReset2faSuccess();
    },
    onError: (error: Error & { data?: { error?: string } }) => {
      toast.error(error.data?.error || error.message || 'Error al resetear 2FA');
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: UpdateMemberData }) =>
      updateTeamMember(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Miembro actualizado');
      onUpdateMemberSuccess();
    },
    onError: (error: Error & { data?: { error?: string } }) => {
      toast.error(error.data?.error || error.message || 'Error al actualizar el miembro');
    },
  });

  const blockMemberMutation = useMutation({
    mutationFn: (userId: number) => blockTeamMember(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success(data.message);
      onBlockSuccess();
    },
    onError: (error: Error & { data?: { error?: string } }) => {
      toast.error(error.data?.error || error.message || 'Error al bloquear el usuario');
    },
  });

  const unblockMemberMutation = useMutation({
    mutationFn: (userId: number) => unblockTeamMember(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success(data.message);
      onUnblockSuccess();
    },
    onError: (error: Error & { data?: { error?: string } }) => {
      toast.error(error.data?.error || error.message || 'Error al desbloquear el usuario');
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (userId: number) => deleteTeamMember(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success(data.message);
      onDeleteSuccess();
    },
    onError: (error: Error & { data?: { error?: string } }) => {
      toast.error(error.data?.error || error.message || 'Error al eliminar el miembro');
    },
  });

  const invitationsQuery = useQuery({
    queryKey: ['team-invitations'],
    queryFn: getTeamInvitations,
    enabled: isAdmin,
  });

  const createInvitationMutation = useMutation({
    mutationFn: (data: CreateInvitationData) => createTeamInvitation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      toast.success('Invitación enviada');
      onCreateInvitationSuccess();
    },
    onError: (error: Error & { response?: { status?: number; data?: { email?: string[]; detail?: string; error?: string } } }) => {
      if (error.response?.status === 403) {
        toast.error(error.response.data?.detail || error.response.data?.error || 'No tienes permiso para enviar invitaciones en este momento.');
        return;
      }
      const msg = error.response?.data?.email?.[0]
        || error.response?.data?.detail
        || error.response?.data?.error
        || error.message
        || 'Error al enviar la invitación';
      toast.error(msg);
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (id: number) => cancelTeamInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      toast.success('Invitación cancelada');
    },
    onError: () => toast.error('Error al cancelar la invitación'),
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (id: number) => resendTeamInvitation(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      toast.success(data.message || 'Invitación reenviada');
    },
    onError: () => toast.error('Error al reenviar la invitación'),
  });

  return {
    membersQuery,
    invitationsQuery,
    disconnectMutation,
    reset2faMutation,
    updateMemberMutation,
    blockMemberMutation,
    unblockMemberMutation,
    deleteMemberMutation,
    createInvitationMutation,
    cancelInvitationMutation,
    resendInvitationMutation,
  };
}
