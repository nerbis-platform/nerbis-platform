'use client';

import { Users } from 'lucide-react';
import { navyText, ROLE_CONFIG } from '../_helpers';

interface TeamSummaryProps {
  counts: {
    total: number;
    admins: number;
    staff: number;
    customers: number;
  };
}

export function TeamSummary({ counts }: TeamSummaryProps) {
  const stats = [
    { label: 'Total de miembros', value: counts.total, icon: Users, color: 'text-text-brand', bg: 'bg-text-brand/[0.08]', alwaysShow: true },
    { ...ROLE_CONFIG.admin, label: 'Administradores', value: counts.admins },
    { ...ROLE_CONFIG.staff, label: 'Staff', value: counts.staff },
    { ...ROLE_CONFIG.customer, label: 'Clientes', value: counts.customers },
  ].filter((stat) => stat.alwaysShow || stat.value > 0);

  return (
    <section className="mb-8">
      <h3 className="text-xs text-muted-foreground font-medium tracking-wide uppercase mb-3">
        Resumen
      </h3>
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            </div>
            <span className={`text-lg font-semibold ${navyText}`}>{stat.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
