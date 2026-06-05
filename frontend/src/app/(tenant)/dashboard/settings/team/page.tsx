// src/app/dashboard/settings/team/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { TeamMember, TeamFilters, SocialAccountDetail } from '@/lib/api/team';
import { useRouter } from 'next/navigation';
import {
  TeamSummary,
  MembersList,
  InvitationsList,
  InviteMemberDialog,
  EditMemberDialog,
  BlockMemberDialog,
  RemoveMemberDialog,
  Reset2FADialog,
  DisconnectSocialDialog,
  useTeamActions,
} from './_components';

// ─── Página de equipo ─────────────────────────────────────
export default function SettingsTeamPage() {
  const { user, tenant } = useAuth();
  const router = useRouter();

  const canInvite = tenant?.website_status === 'published' || tenant?.website_status === 'review';

  const [filters, setFilters] = useState<TeamFilters>({
    ordering: '-date_joined',
  });
  const [disconnectDialog, setDisconnectDialog] = useState<{
    open: boolean;
    member: TeamMember | null;
    social: SocialAccountDetail | null;
  }>({ open: false, member: null, social: null });
  const [reset2faDialog, setReset2faDialog] = useState<{
    open: boolean;
    member: TeamMember | null;
  }>({ open: false, member: null });
  const [roleDialog, setRoleDialog] = useState<{
    open: boolean;
    member: TeamMember | null;
  }>({ open: false, member: null });
  const [blockDialog, setBlockDialog] = useState<{
    open: boolean;
    member: TeamMember | null;
  }>({ open: false, member: null });
  const [unblockDialog, setUnblockDialog] = useState<{
    open: boolean;
    member: TeamMember | null;
  }>({ open: false, member: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    member: TeamMember | null;
  }>({ open: false, member: null });
  const [selectedRole, setSelectedRole] = useState<'admin' | 'staff'>('staff');

  // Invitation state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'staff' | 'admin'>('staff');

  const {
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
  } = useTeamActions({
    isAdmin: user?.role === 'admin',
    filters,
    onDisconnectSuccess: () => setDisconnectDialog({ open: false, member: null, social: null }),
    onReset2faSuccess: () => setReset2faDialog({ open: false, member: null }),
    onUpdateMemberSuccess: () => setRoleDialog({ open: false, member: null }),
    onBlockSuccess: () => setBlockDialog({ open: false, member: null }),
    onUnblockSuccess: () => setUnblockDialog({ open: false, member: null }),
    onDeleteSuccess: () => setDeleteDialog({ open: false, member: null }),
    onCreateInvitationSuccess: () => {
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('staff');
    },
  });

  const { data: members, isLoading } = membersQuery;
  const { data: invitations } = invitationsQuery;

  // Role guard — solo admins (en useEffect para evitar navegación durante render)
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (user?.role !== 'admin') {
    return null;
  }

  const teamList = members || [];

  const counts = {
    total: teamList.length,
    admins: teamList.filter((m) => m.role === 'admin').length,
    staff: teamList.filter((m) => m.role === 'staff').length,
    customers: teamList.filter((m) => m.role === 'customer').length,
  };

  const pendingInvitations = (invitations || []).filter((inv) => inv.status === 'pending');
  const pastInvitations = (invitations || []).filter((inv) => inv.status !== 'pending');

  return (
    <div className="max-w-2xl">
      {/* ── Resumen ── */}
      <TeamSummary counts={counts} />

      {/* ── Miembros ── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
            Miembros
          </h3>
          <InviteMemberDialog
            open={inviteDialogOpen}
            canInvite={canInvite}
            email={inviteEmail}
            role={inviteRole}
            isPending={createInvitationMutation.isPending}
            onOpenChange={setInviteDialogOpen}
            onEmailChange={setInviteEmail}
            onRoleChange={setInviteRole}
            onSubmit={() => createInvitationMutation.mutate({ email: inviteEmail, role: inviteRole })}
          />
        </div>

        <MembersList
          members={teamList}
          isLoading={isLoading}
          filters={filters}
          canInvite={canInvite}
          currentUserId={user?.id}
          onFiltersChange={setFilters}
          onEdit={(member) => {
            setSelectedRole(member.role === 'admin' ? 'admin' : 'staff');
            setRoleDialog({ open: true, member });
          }}
          onBlock={(member) => setBlockDialog({ open: true, member })}
          onUnblock={(member) => setUnblockDialog({ open: true, member })}
          onRemove={(member) => setDeleteDialog({ open: true, member })}
          onReset2FA={(member) => setReset2faDialog({ open: true, member })}
          onDisconnectSocial={(member, social) =>
            setDisconnectDialog({ open: true, member, social })
          }
        />
      </section>

      {/* ── Invitaciones ── */}
      <InvitationsList
        pendingInvitations={pendingInvitations}
        pastInvitations={pastInvitations}
        isResendPending={resendInvitationMutation.isPending}
        isCancelPending={cancelInvitationMutation.isPending}
        onResend={(id) => resendInvitationMutation.mutate(id)}
        onCancel={(id) => cancelInvitationMutation.mutate(id)}
      />

      {/* ── Diálogos ── */}
      <DisconnectSocialDialog
        open={disconnectDialog.open}
        member={disconnectDialog.member}
        social={disconnectDialog.social}
        isPending={disconnectMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setDisconnectDialog({ open: false, member: null, social: null });
        }}
        onConfirm={() => {
          if (disconnectDialog.member && disconnectDialog.social) {
            disconnectMutation.mutate({
              userId: disconnectDialog.member.id,
              provider: disconnectDialog.social.provider,
            });
          }
        }}
      />

      <Reset2FADialog
        open={reset2faDialog.open}
        member={reset2faDialog.member}
        isPending={reset2faMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setReset2faDialog({ open: false, member: null });
        }}
        onConfirm={() => {
          if (reset2faDialog.member) {
            reset2faMutation.mutate(reset2faDialog.member.id);
          }
        }}
      />

      <EditMemberDialog
        open={roleDialog.open}
        member={roleDialog.member}
        selectedRole={selectedRole}
        isPending={updateMemberMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setRoleDialog({ open: false, member: null });
        }}
        onSelectedRoleChange={setSelectedRole}
        onConfirm={() => {
          if (roleDialog.member) {
            updateMemberMutation.mutate({
              userId: roleDialog.member.id,
              data: { role: selectedRole },
            });
          }
        }}
      />

      <BlockMemberDialog
        mode="unblock"
        open={unblockDialog.open}
        member={unblockDialog.member}
        isPending={unblockMemberMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setUnblockDialog({ open: false, member: null });
        }}
        onConfirm={() => {
          if (unblockDialog.member) {
            unblockMemberMutation.mutate(unblockDialog.member.id);
          }
        }}
      />

      <BlockMemberDialog
        mode="block"
        open={blockDialog.open}
        member={blockDialog.member}
        isPending={blockMemberMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setBlockDialog({ open: false, member: null });
        }}
        onConfirm={() => {
          if (blockDialog.member) {
            blockMemberMutation.mutate(blockDialog.member.id);
          }
        }}
      />

      <RemoveMemberDialog
        open={deleteDialog.open}
        member={deleteDialog.member}
        isPending={deleteMemberMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, member: null });
        }}
        onConfirm={() => {
          if (deleteDialog.member) {
            deleteMemberMutation.mutate(deleteDialog.member.id);
          }
        }}
      />
    </div>
  );
}
