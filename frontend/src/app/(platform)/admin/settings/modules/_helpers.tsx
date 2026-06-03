'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { icons as lucideIcons, type LucideIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Icon names catalog ───────────────────────────────────

export const ICON_NAMES = [
  // Commerce
  'ShoppingCart', 'ShoppingBag', 'Store', 'CreditCard', 'Wallet', 'Receipt', 'Barcode', 'QrCode', 'Tag', 'Tags', 'Percent', 'DollarSign', 'BadgeDollarSign', 'CircleDollarSign',
  // Services & Work
  'Briefcase', 'Building', 'Building2', 'Landmark', 'Factory', 'Warehouse', 'HardHat', 'Wrench', 'Hammer', 'Scissors', 'Paintbrush', 'Palette',
  // Calendar & Time
  'Calendar', 'CalendarDays', 'CalendarCheck', 'CalendarClock', 'Clock', 'Timer', 'Hourglass', 'AlarmClock',
  // Communication
  'Mail', 'MessageSquare', 'MessageCircle', 'Phone', 'PhoneCall', 'Send', 'Bell', 'BellRing', 'Megaphone', 'Radio',
  // Content & Media
  'FileText', 'File', 'Files', 'Newspaper', 'BookOpen', 'Book', 'Bookmark', 'PenTool', 'Pencil', 'Type', 'Image', 'Camera', 'Video', 'Film', 'Music', 'Mic',
  // People & Social
  'User', 'Users', 'UserPlus', 'UserCheck', 'Heart', 'Star', 'ThumbsUp', 'Award', 'Trophy', 'Crown', 'Gem',
  // Navigation & UI
  'Home', 'Search', 'Menu', 'Grid', 'List', 'Layout', 'LayoutGrid', 'Layers', 'Map', 'MapPin', 'Navigation', 'Compass', 'Globe', 'Link', 'ExternalLink',
  // Health & Wellness
  'Activity', 'Stethoscope', 'Pill', 'Syringe', 'Dumbbell', 'Apple', 'Salad', 'Coffee', 'Wine', 'UtensilsCrossed', 'ChefHat',
  // Tech & Settings
  'Settings', 'Cog', 'Sliders', 'Monitor', 'Smartphone', 'Tablet', 'Laptop', 'Wifi', 'Bluetooth', 'Cloud', 'Database', 'Server', 'Code', 'Terminal', 'Cpu',
  // Transport
  'Car', 'Bike', 'Plane', 'Ship', 'Train',
  // Nature
  'Sun', 'Moon', 'Flower', 'TreePine', 'Mountain', 'Umbrella', 'Snowflake', 'Flame', 'Zap', 'Droplets',
  // Charts & Data
  'BarChart', 'BarChart3', 'LineChart', 'PieChart', 'TrendingUp', 'TrendingDown', 'Target', 'Crosshair',
  // Security
  'Shield', 'ShieldCheck', 'Lock', 'Unlock', 'Key', 'Fingerprint', 'Eye', 'EyeOff',
  // Misc
  'Package', 'Box', 'Gift', 'Truck', 'Rocket', 'Sparkles', 'PartyPopper', 'Smile', 'Lightbulb', 'Info', 'HelpCircle', 'AlertCircle', 'CheckCircle', 'XCircle',
] as const;

// ─── Icon Picker component ───────────────────────────────

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return ICON_NAMES;
    const q = search.toLowerCase();
    return ICON_NAMES.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  const SelectedIcon = value ? (lucideIcons[value as keyof typeof lucideIcons] as LucideIcon | undefined) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors hover:border-slate-300 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
        >
          {SelectedIcon ? (
            <>
              <SelectedIcon className="h-4 w-4 shrink-0 text-slate-700" />
              <span className="truncate">{value}</span>
            </>
          ) : (
            <span className="text-slate-400">Seleccionar icono...</span>
          )}
          <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 rotate-90 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar icono..."
            className="h-8 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Limpiar
            </button>
          )}
        </div>
        <ScrollArea className="h-64">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">
              No se encontraron iconos
            </p>
          ) : (
            <div className="grid grid-cols-6 gap-1 p-2">
              {filtered.map((name) => {
                const Icon = lucideIcons[name as keyof typeof lucideIcons] as LucideIcon | undefined;
                if (!Icon) return null;
                const isSelected = value === name;
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`flex h-10 w-full items-center justify-center rounded-md transition-colors ${
                      isSelected
                        ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-300'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-400">
          {filtered.length} icono{filtered.length !== 1 ? 's' : ''}
        </div>
      </PopoverContent>
    </Popover>
  );
}
