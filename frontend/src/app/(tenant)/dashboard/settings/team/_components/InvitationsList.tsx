'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Send,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type { TeamInvitation } from '@/types';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  accepted: { label: 'Aceptada', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  cancelled: { label: 'Cancelada', icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
  expired: { label: 'Expirada', icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
} as const;

interface InvitationsListProps {
  pendingInvitations: TeamInvitation[];
  pastInvitations: TeamInvitation[];
  isResendPending: boolean;
  isCancelPending: boolean;
  onResend: (id: number) => void;
  onCancel: (id: number) => void;
}

export function InvitationsList({
  pendingInvitations,
  pastInvitations,
  isResendPending,
  isCancelPending,
  onResend,
  onCancel,
}: InvitationsListProps) {
  return (
    <>
      {/* ── Invitaciones pendientes ── */}
      {pendingInvitations.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xs text-muted-foreground font-medium tracking-wide uppercase mb-3">
            Invitaciones pendientes
          </h3>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="px-4 py-3.5 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{inv.email}</p>
                      <Badge variant={inv.role === 'admin' ? 'default' : 'secondary'} className="text-xs py-0 px-1.5">
                        {inv.role_display}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Invitado por {inv.invited_by_name} · {new Date(inv.created_at).toLocaleDateString('es')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => onResend(inv.id)}
                      disabled={isResendPending}
                    >
                      <Send className="h-3 w-3" />
                      Reenviar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive gap-1"
                      onClick={() => onCancel(inv.id)}
                      disabled={isCancelPending}
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

      {/* ── Historial de invitaciones ── */}
      {pastInvitations.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xs text-muted-foreground font-medium tracking-wide uppercase mb-3">
            Historial de invitaciones
          </h3>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {pastInvitations.map((inv) => {
              const statusConf = STATUS_CONFIG[inv.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.expired;
              return (
                <div key={inv.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
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
    </>
  );
}
