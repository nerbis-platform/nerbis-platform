'use client';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Users, Info } from 'lucide-react';
import type { TeamMember, TeamFilters, SocialAccountDetail } from '@/lib/api/team';
import { navyIconBg } from '../_helpers';
import { MemberRow } from './MemberRow';

interface MembersListProps {
  members: TeamMember[];
  isLoading: boolean;
  filters: TeamFilters;
  canInvite: boolean;
  currentUserId?: number;
  onFiltersChange: (filters: TeamFilters) => void;
  onEdit: (member: TeamMember) => void;
  onBlock: (member: TeamMember) => void;
  onUnblock: (member: TeamMember) => void;
  onRemove: (member: TeamMember) => void;
  onReset2FA: (member: TeamMember) => void;
  onDisconnectSocial: (member: TeamMember, social: SocialAccountDetail) => void;
}

export function MembersList({
  members,
  isLoading,
  filters,
  canInvite,
  currentUserId,
  onFiltersChange,
  onEdit,
  onBlock,
  onUnblock,
  onRemove,
  onReset2FA,
  onDisconnectSocial,
}: MembersListProps) {
  const hasFilters = Boolean(filters.search || filters.role || filters.auth_method);

  return (
    <>
      {/* Buscar, filtrar y banner */}
      <div className="rounded-xl border border-border bg-card mb-3 overflow-hidden">
        {!canInvite && (
          <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-3">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${navyIconBg}`}>
              <Info className="h-3 w-3 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Tu equipo estará listo pronto</span>
              {' — '}podrás invitar miembros una vez que tu sitio web esté publicado o en revisión.
            </p>
          </div>
        )}

        <div className="px-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                aria-label="Buscar por nombre o email"
                value={filters.search || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, search: e.target.value })
                }
                className="pl-9 h-10"
              />
            </div>

            <Select
              value={filters.role || 'all'}
              onValueChange={(v) =>
                onFiltersChange({ ...filters, role: v === 'all' ? undefined : v })
              }
            >
              <SelectTrigger className="h-10" aria-label="Filtrar por rol">
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
                onFiltersChange({ ...filters, auth_method: v === 'all' ? undefined : v })
              }
            >
              <SelectTrigger className="h-10" aria-label="Filtrar por método de acceso">
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
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
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
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-12 text-center">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${navyIconBg}`}>
            <Users className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">No hay miembros</p>
          <p className="text-xs text-muted-foreground">
            {hasFilters
              ? 'No se encontraron resultados con los filtros aplicados'
              : 'Tu equipo aparecerá aquí cuando se registren usuarios'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              currentUserId={currentUserId}
              onEdit={onEdit}
              onBlock={onBlock}
              onUnblock={onUnblock}
              onRemove={onRemove}
              onReset2FA={onReset2FA}
              onDisconnectSocial={onDisconnectSocial}
            />
          ))}
        </div>
      )}

      {/* Contador */}
      {!isLoading && members.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2 px-1">
          {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          {hasFilters && ' encontrados con los filtros aplicados'}
        </p>
      )}
    </>
  );
}
