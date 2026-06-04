'use client';

import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { SectionHeader, SettingCard } from '@/components/settings';
import type { SocialProvider, User } from '@/types';
import { PROVIDER_CONFIG } from '../_helpers';

interface SocialConnectionsProps {
  profile?: User;
  onDisconnect: (provider: SocialProvider) => void;
  isDisconnecting: boolean;
}

export function SocialConnections({
  profile,
  onDisconnect,
  isDisconnecting,
}: SocialConnectionsProps) {
  return (
    <section>
      <SectionHeader as={3} title="Cuentas vinculadas" />
      <SettingCard className="divide-y divide-border">
        {(['google', 'apple', 'facebook'] as SocialProvider[]).map((provider) => {
          const config = PROVIDER_CONFIG[provider];

          if (!profile) {
            return (
              <div key={provider} className="flex items-center gap-3 px-4 py-3.5">
                <div className="size-9 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                  {config.icon}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-32 bg-muted/60 rounded animate-pulse" />
                </div>
              </div>
            );
          }

          const linked = profile.social_accounts?.find((sa) => sa.provider === provider);
          const canDisconnect =
            profile.has_password || (profile.social_accounts?.length ?? 0) > 1;

          return (
            <div
              key={provider}
              className={cn(
                'flex items-center justify-between px-4 py-3.5 transition-colors',
                linked ? 'hover:bg-muted/50' : 'opacity-50',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'size-9 rounded-lg flex items-center justify-center shrink-0',
                    linked ? config.linkedIconBg : 'bg-muted',
                  )}
                >
                  {config.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{config.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {linked ? linked.email : 'No vinculado'}
                  </p>
                </div>
              </div>

              {linked ? (
                <div className="flex items-center gap-3 shrink-0">
                  <Badge
                    variant="outline"
                    className="gap-1 text-xs text-emerald-600 border-emerald-200 bg-emerald-50/80"
                  >
                    <Check className="size-3" aria-hidden="true" />
                    Vinculado
                  </Badge>
                  {canDisconnect && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-destructive hover:underline transition-colors cursor-pointer"
                        >
                          Desvincular
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Desvincular {config.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ya no podrás iniciar sesión con <strong>{config.name}</strong>.
                            Puedes volver a vincularla desde la pantalla de login.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDisconnect(provider)}
                            disabled={isDisconnecting}
                            className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
                          >
                            {isDisconnecting ? 'Desvinculando…' : 'Desvincular'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      `Para vincular ${config.name}, inicia sesión con esa cuenta desde la pantalla de login.`,
                    )
                  }
                  className="text-xs font-medium text-[var(--color-text-brand)] hover:underline transition-colors cursor-pointer"
                >
                  Vincular
                </button>
              )}
            </div>
          );
        })}
      </SettingCard>
    </section>
  );
}
