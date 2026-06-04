// ─── Types ───────────────────────────────────────────────

export type TabFilter = 'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed';

// ─── Constants ───────────────────────────────────────────

export const STATUS_BORDER: Record<string, string> = {
  pending: 'border-l-amber-400',
  confirmed: 'border-l-blue-500',
  in_progress: 'border-l-violet-500',
  completed: 'border-l-green-500',
  cancelled: 'border-l-red-400',
  expired: 'border-l-red-400',
  no_show: 'border-l-orange-400',
};

export const STATUS_DATE_BG: Record<string, string> = {
  pending: 'bg-amber-50 dark:bg-amber-950/30',
  confirmed: 'bg-blue-50 dark:bg-blue-950/30',
  in_progress: 'bg-violet-50 dark:bg-violet-950/30',
  completed: 'bg-green-50 dark:bg-green-950/30',
  cancelled: 'bg-muted/50',
  expired: 'bg-muted/50',
  no_show: 'bg-orange-50 dark:bg-orange-950/30',
};

// ─── Utility functions ───────────────────────────────────

export function parseDateParts(dateString: string) {
  const date = new Date(dateString);
  return {
    dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase(),
    dayNumber: date.getDate(),
    month: date.toLocaleDateString('es-ES', { month: 'short' }),
    time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  };
}
