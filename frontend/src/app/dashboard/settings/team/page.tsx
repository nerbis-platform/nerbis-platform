// src/app/dashboard/settings/team/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getTeamMembers, disconnectTeamSocial } from '@/lib/api/team';
import type { TeamMember, TeamFilters, SocialAccountDetail } from '@/lib/api/team';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  UserRound,
  Mail,
  KeyRound,
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

      {/* ── Buscar y filtrar ── */}
      <section className="mb-8">
        <h3 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase mb-3">
          Buscar y filtrar
        </h3>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
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
      </section>

      {/* ── Miembros ── */}
      <section className="mb-8">
        <h3 className="text-[0.7rem] text-gray-400 font-medium tracking-wide uppercase mb-3">
          Miembros
        </h3>

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
                    {member.social_accounts.length > 0 && (
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
    </div>
  );
}
