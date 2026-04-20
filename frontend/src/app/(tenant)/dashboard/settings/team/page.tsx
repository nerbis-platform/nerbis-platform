// src/app/dashboard/settings/team/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTeamMembers,
  disconnectTeamSocial,
  resetTeam2FA,
  getTeamInvitations,
  createTeamInvitation,
  cancelTeamInvitation,
  resendTeamInvitation,
} from '@/lib/api/team';
import type { TeamMember, TeamFilters, SocialAccountDetail } from '@/lib/api/team';
import type { CreateInvitationData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Users,
  MoreVertical,
  Unlink,
  Shield,
  ShieldCheck,
  ShieldOff,
  UserRound,
  Mail,
  KeyRound,
  UserPlus,
  Clock,
  Send,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ─── Estilos hoisted (consistentes con profile) ──────────
const navyText = { color: '#1C3B57' } as const;
const navyIconBg = { background: 'rgba(28, 59, 87, 0.06)' } as const;

const PROVIDER_CONFIG = {
  google: { label: 'Google', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  apple: { label: 'Apple', textColor: 'text-neutral-900', bgLight: 'bg-neutral-100' },
  facebook: { label: 'Facebook', textColor: 'text-indigo-700', bgLight: 'bg-indigo-50' },
} as const;

const ROLE_CONFIG = {
  admin: { label: 'Admin', variant: 'default' as const, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  staff: { label: 'Staff', variant: 'secondary' as const, icon: Shield, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  customer: { label: 'Cliente', variant: 'outline' as const, icon: UserRound, color: 'text-blue-600', bg: 'bg-blue-500/10' },
} as const;

function getInitials(member: TeamMember): string {
  if (member.first_name && member.last_name) {
    return `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();
  }
  return member.email[0].toUpperCase();
}

const DEFAULT_PROVIDER_CONFIG = { label: 'Otro', textColor: 'text-gray-700', bgLight: 'bg-gray-100' };

function isValidAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function ProviderBadge({ social }: { social: SocialAccountDetail }) {
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

function AuthMethodBadge({ method }: { method: TeamMember['auth_method'] }) {
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

// ─── Página de equipo ─────────────────────────────────────
export default function SettingsTeamPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

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

  // Invitation state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'staff' | 'admin'>('staff');

  const { data: members, isLoading } = useQuery({
    queryKey: ['team-members', filters],
    queryFn: () => getTeamMembers(filters),
    enabled: user?.role === 'admin',
  });

  const disconnectMutation = useMutation({
    mutationFn: ({ userId, provider }: { userId: number; provider: string }) =>
      disconnectTeamSocial(userId, provider),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success(data.message);
      setDisconnectDialog({ open: false, member: null, social: null });
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
      setReset2faDialog({ open: false, member: null });
    },
    onError: (error: Error & { data?: { error?: string } }) => {
      toast.error(error.data?.error || error.message || 'Error al resetear 2FA');
    },
  });

  // Invitations
  const { data: invitations } = useQuery({
    queryKey: ['team-invitations'],
    queryFn: getTeamInvitations,
    enabled: user?.role === 'admin',
  });

  const createInvitationMutation = useMutation({
    mutationFn: (data: CreateInvitationData) => createTeamInvitation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      toast.success('Invitación enviada');
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('staff');
    },
    onError: (error: Error & { response?: { data?: { email?: string[]; detail?: string } } }) => {
      const msg = error.response?.data?.email?.[0] || error.response?.data?.detail || 'Error al enviar la invitación';
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

  const STATUS_CONFIG = {
    pending: { label: 'Pendiente', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    accepted: { label: 'Aceptada', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    cancelled: { label: 'Cancelada', icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-100' },
    expired: { label: 'Expirada', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  } as const;

  return (
    <div className="max-w-2xl">
      {/* ── Resumen ── */}
      <section className="mb-8">
        <h3 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase mb-3">
          Resumen
        </h3>
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {[
            { label: 'Total de miembros', value: counts.total, icon: Users, color: 'text-[#0D9488]', bg: 'bg-[rgba(13,148,136,0.08)]' },
            { ...ROLE_CONFIG.admin, label: 'Administradores', value: counts.admins },
            { ...ROLE_CONFIG.staff, label: 'Staff', value: counts.staff },
            { ...ROLE_CONFIG.customer, label: 'Clientes', value: counts.customers },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stat.bg}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} aria-hidden="true" />
                </div>
                <p className="text-[0.85rem] font-medium text-gray-600">{stat.label}</p>
              </div>
              <span className="text-lg font-semibold" style={navyText}>{stat.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Miembros ── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase">
            Miembros
          </h3>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs">
                <UserPlus className="h-3.5 w-3.5" />
                Invitar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold" style={navyText}>Invitar miembro al equipo</DialogTitle>
                <DialogDescription>
                  Se enviará un email con un enlace para unirse al equipo.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createInvitationMutation.mutate({ email: inviteEmail, role: inviteRole });
                }}
              >
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email" className="text-gray-600">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="ejemplo@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role" className="text-gray-600">Rol</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'staff' | 'admin')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createInvitationMutation.isPending}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {createInvitationMutation.isPending ? 'Enviando...' : 'Enviar invitación'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Buscar y filtrar */}
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={filters.search || ''}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="pl-9 h-10"
              />
            </div>

            <Select
              value={filters.role || 'all'}
              onValueChange={(v) =>
                setFilters({ ...filters, role: v === 'all' ? undefined : v })
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.auth_method || 'all'}
              onValueChange={(v) =>
                setFilters({ ...filters, auth_method: v === 'all' ? undefined : v })
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Método de acceso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los métodos</SelectItem>
                <SelectItem value="email_only">Solo email</SelectItem>
                <SelectItem value="social_only">Solo social</SelectItem>
                <SelectItem value="both">Email + Social</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ) : teamList.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={navyIconBg}>
              <Users className="w-6 h-6 text-gray-300" aria-hidden="true" />
            </div>
            <p className="text-[0.85rem] font-medium text-gray-600 mb-1">No hay miembros</p>
            <p className="text-xs text-gray-400">
              {filters.search || filters.role || filters.auth_method
                ? 'No se encontraron resultados con los filtros aplicados'
                : 'Tu equipo aparecerá aquí cuando se registren usuarios'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {teamList.map((member) => (
              <div key={member.id} className="px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  {/* Info del miembro */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      {member.avatar && (
                        <AvatarImage src={member.avatar} alt={member.full_name} />
                      )}
                      <AvatarFallback className="text-xs bg-gray-100 text-gray-500">
                        {getInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[0.85rem] font-medium text-gray-700 truncate">
                          {member.full_name}
                        </p>
                        <Badge variant={ROLE_CONFIG[member.role].variant} className="text-[0.65rem] py-0 px-1.5">
                          {ROLE_CONFIG[member.role].label}
                        </Badge>
                        {!member.is_active && (
                          <Badge variant="destructive" className="text-[0.65rem] py-0 px-1.5">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    <AuthMethodBadge method={member.auth_method} />
                    {member.has_2fa && (
                      <Badge variant="outline" className="text-[0.6rem] py-0 px-1.5 gap-1 text-emerald-600 border-emerald-200">
                        <ShieldCheck className="h-3 w-3" />
                        2FA
                      </Badge>
                    )}
                    {(member.social_accounts.length > 0 || (member.has_2fa && member.id !== user?.id)) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-gray-300 hover:text-gray-500">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.social_accounts.map((sa) => (
                            <DropdownMenuItem
                              key={sa.id}
                              onClick={() =>
                                setDisconnectDialog({
                                  open: true,
                                  member,
                                  social: sa,
                                })
                              }
                              className="text-destructive"
                            >
                              <Unlink className="h-4 w-4 mr-2" />
                              Desvincular {(PROVIDER_CONFIG[sa.provider] ?? DEFAULT_PROVIDER_CONFIG).label}
                            </DropdownMenuItem>
                          ))}
                          {member.has_2fa && member.id !== user?.id && (
                            <DropdownMenuItem
                              onClick={() => setReset2faDialog({ open: true, member })}
                              className="text-destructive"
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Resetear 2FA
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Social accounts */}
                {member.social_accounts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-12">
                    {member.social_accounts.map((sa) => (
                      <ProviderBadge key={sa.id} social={sa} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contador */}
        {!isLoading && teamList.length > 0 && (
          <p className="text-xs text-gray-400 mt-2 px-1">
            {teamList.length} {teamList.length === 1 ? 'miembro' : 'miembros'}
            {(filters.search || filters.role || filters.auth_method) && ' encontrados con los filtros aplicados'}
          </p>
        )}
      </section>

      {/* ── Invitaciones pendientes ── */}
      {pendingInvitations.length > 0 && (
        <section className="mb-8">
          <h3 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase mb-3">
            Invitaciones pendientes
          </h3>
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[0.85rem] font-medium text-gray-700 truncate">{inv.email}</p>
                      <Badge variant={inv.role === 'admin' ? 'default' : 'secondary'} className="text-[0.65rem] py-0 px-1.5">
                        {inv.role_display}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      Invitado por {inv.invited_by_name} · {new Date(inv.created_at).toLocaleDateString('es')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => resendInvitationMutation.mutate(inv.id)}
                      disabled={resendInvitationMutation.isPending}
                    >
                      <Send className="h-3 w-3" />
                      Reenviar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive gap-1"
                      onClick={() => cancelInvitationMutation.mutate(inv.id)}
                      disabled={cancelInvitationMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dialog de confirmación para desvincular */}
      <AlertDialog
        open={disconnectDialog.open}
        onOpenChange={(open) => {
          if (!open) setDisconnectDialog({ open: false, member: null, social: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular cuenta social</AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectDialog.member && disconnectDialog.social && (
                <>
                  ¿Desvincular la cuenta de{' '}
                  <strong>
                    {(PROVIDER_CONFIG[disconnectDialog.social.provider] ?? DEFAULT_PROVIDER_CONFIG).label}
                  </strong>{' '}
                  de <strong>{disconnectDialog.member.full_name}</strong>?
                  <br />
                  <br />
                  El usuario ya no podrá iniciar sesión con este proveedor.
                  {!disconnectDialog.member.has_password &&
                    disconnectDialog.member.social_accounts.length <= 1 && (
                      <span className="block mt-2 text-destructive font-medium">
                        Este usuario no tiene contraseña y esta es su única cuenta
                        social. No se podrá desvincular.
                      </span>
                    )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (disconnectDialog.member && disconnectDialog.social) {
                  disconnectMutation.mutate({
                    userId: disconnectDialog.member.id,
                    provider: disconnectDialog.social.provider,
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                disconnectMutation.isPending ||
                (!disconnectDialog.member?.has_password &&
                  (disconnectDialog.member?.social_accounts.length ?? 0) <= 1)
              }
            >
              {disconnectMutation.isPending ? 'Desvinculando...' : 'Desvincular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Historial de invitaciones ── */}
      {pastInvitations.length > 0 && (
        <section className="mb-8">
          <h3 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase mb-3">
            Historial de invitaciones
          </h3>
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {pastInvitations.map((inv) => {
              const statusConf = STATUS_CONFIG[inv.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.expired;
              return (
                <div key={inv.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.85rem] text-gray-600 truncate">{inv.email}</p>
                      <p className="text-xs text-gray-400">
                        {inv.role_display} · {new Date(inv.created_at).toLocaleDateString('es')}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusConf.bg} ${statusConf.color}`}>
                      <statusConf.icon className="h-3 w-3" />
                      {statusConf.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Dialog de confirmación para resetear 2FA */}
      <AlertDialog
        open={reset2faDialog.open}
        onOpenChange={(open) => {
          if (!open) setReset2faDialog({ open: false, member: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetear 2FA</AlertDialogTitle>
            <AlertDialogDescription>
              {reset2faDialog.member && (
                <>
                  ¿Resetear la autenticación en dos pasos de{' '}
                  <strong>{reset2faDialog.member.full_name}</strong>?
                  <br />
                  <br />
                  Se eliminarán todos sus métodos de verificación (passkeys y códigos TOTP).
                  El usuario podrá iniciar sesión solo con su contraseña o cuenta social
                  y configurar 2FA nuevamente si lo desea.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (reset2faDialog.member) {
                  reset2faMutation.mutate(reset2faDialog.member.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={reset2faMutation.isPending}
            >
              {reset2faMutation.isPending ? 'Reseteando...' : 'Resetear 2FA'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
