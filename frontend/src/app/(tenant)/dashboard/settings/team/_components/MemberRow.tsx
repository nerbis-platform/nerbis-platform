'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Unlink,
  ShieldCheck,
  ShieldOff,
  Ban,
  UserCheck,
  UserX,
  RefreshCw,
} from 'lucide-react';
import type { TeamMember, SocialAccountDetail } from '@/lib/api/team';
import {
  PROVIDER_CONFIG,
  ROLE_CONFIG,
  DEFAULT_PROVIDER_CONFIG,
  getInitials,
  ProviderBadge,
  AuthMethodBadge,
} from '../_helpers';

interface MemberRowProps {
  member: TeamMember;
  /** Id del usuario en sesión (oculta el menú de acciones para sí mismo). */
  currentUserId?: number;
  onEdit: (member: TeamMember) => void;
  onBlock: (member: TeamMember) => void;
  onUnblock: (member: TeamMember) => void;
  onRemove: (member: TeamMember) => void;
  onReset2FA: (member: TeamMember) => void;
  onDisconnectSocial: (member: TeamMember, social: SocialAccountDetail) => void;
}

export function MemberRow({
  member,
  currentUserId,
  onEdit,
  onBlock,
  onUnblock,
  onRemove,
  onReset2FA,
  onDisconnectSocial,
}: MemberRowProps) {
  return (
    <div className="px-4 py-3.5 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between gap-3">
        {/* Info del miembro */}
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0">
            {member.avatar && (
              <AvatarImage src={member.avatar} alt={member.full_name} />
            )}
            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
              {getInitials(member)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate">
                {member.full_name}
              </p>
              <Badge variant={ROLE_CONFIG[member.role].variant} className="text-xs py-0 px-1.5">
                {ROLE_CONFIG[member.role].label}
              </Badge>
              {!member.is_active && (
                <Badge variant="destructive" className="text-xs py-0 px-1.5">
                  Bloqueado
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 shrink-0">
          <AuthMethodBadge method={member.auth_method} />
          {member.has_2fa && (
            <Badge variant="outline" className="text-xs py-0 px-1.5 gap-1 text-emerald-600 border-emerald-200">
              <ShieldCheck className="h-3 w-3" />
              2FA
            </Badge>
          )}
          {member.id !== currentUserId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" aria-label="Acciones del miembro">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {member.role !== 'customer' && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(member)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Cambiar rol
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {member.is_active ? (
                  <DropdownMenuItem
                    onClick={() => onBlock(member)}
                    variant="destructive"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Bloquear usuario
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onUnblock(member)}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Desbloquear usuario
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onRemove(member)}
                  variant="destructive"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Eliminar del equipo
                </DropdownMenuItem>
                {(member.social_accounts.length > 0 || member.has_2fa) && (
                  <>
                    <DropdownMenuSeparator />
                    {member.social_accounts.map((sa) => (
                      <DropdownMenuItem
                        key={sa.id}
                        onClick={() => onDisconnectSocial(member, sa)}
                        variant="destructive"
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        Desvincular {(PROVIDER_CONFIG[sa.provider] ?? DEFAULT_PROVIDER_CONFIG).label}
                      </DropdownMenuItem>
                    ))}
                    {member.has_2fa && (
                      <DropdownMenuItem
                        onClick={() => onReset2FA(member)}
                        variant="destructive"
                      >
                        <ShieldOff className="h-4 w-4 mr-2" />
                        Resetear 2FA
                      </DropdownMenuItem>
                    )}
                  </>
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
  );
}
