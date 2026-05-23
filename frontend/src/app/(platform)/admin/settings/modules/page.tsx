// src/app/(platform)/admin/settings/modules/page.tsx
//
// Platform modules management page for superadmins.
// CRUD operations for PlatformModule records. All requests go through
// `adminClient` (via `admin-settings` helpers) — never the tenant `apiClient`.
'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ChevronRight,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
} from 'lucide-react';
import { icons as lucideIcons, type LucideIcon } from 'lucide-react';
import {
  adminCreateModule,
  adminDeleteModule,
  adminListModules,
  adminUpdateModule,
} from '@/lib/api/admin-settings';
import { toast } from 'sonner';
import type {
  AdminPlatformModule,
  AdminPlatformModulePayload,
} from '@/types/admin';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

// ──────────────────────────────────────────────────────────────────────
// Icon Picker
// ──────────────────────────────────────────────────────────────────────

const ICON_NAMES = [
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

function IconPicker({
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

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────

export default function AdminModulesPage() {
  useEffect(() => {
    document.title = 'Modulos — NERBIS Admin';
  }, []);

  // ── Data state ──────────────────────────────────────────────────────
  const [modules, setModules] = useState<AdminPlatformModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Dialog state (create / edit) ────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPlatformModule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formAccentColor, setFormAccentColor] = useState('#0D9488');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formDependencies, setFormDependencies] = useState<number[]>([]);

  // ── Delete confirmation state ───────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<AdminPlatformModule | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  // ── Data loading ────────────────────────────────────────────────────
  const loadModules = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await adminListModules();
      setModules(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista de modulos.';
      setListError(message);
      setModules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModules();
  }, [loadModules]);

  // ── Dialog helpers ──────────────────────────────────────────────────
  function resetForm() {
    setFormKey('');
    setFormLabel('');
    setFormDescription('');
    setFormIcon('');
    setFormAccentColor('#0D9488');
    setFormSortOrder(0);
    setFormIsActive(true);
    setFormDependencies([]);
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    const maxOrder = modules.length > 0
      ? Math.max(...modules.map((m) => m.sort_order))
      : -1;
    setFormSortOrder(maxOrder + 1);
    setDialogOpen(true);
  }

  function openEdit(mod: AdminPlatformModule) {
    setEditing(mod);
    setFormKey(mod.key);
    setFormLabel(mod.label);
    setFormDescription(mod.description);
    setFormIcon(mod.icon);
    setFormAccentColor(mod.accent_color);
    setFormSortOrder(mod.sort_order);
    setFormIsActive(mod.is_active);
    setFormDependencies(mod.dependencies_detail?.map((d) => d.id) ?? []);
    setDialogOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: AdminPlatformModulePayload = {
        key: formKey.trim(),
        label: formLabel.trim(),
        description: formDescription.trim(),
        icon: formIcon.trim(),
        accent_color: formAccentColor.trim(),
        sort_order: formSortOrder,
        is_active: formIsActive,
        dependencies: formDependencies,
      };

      if (editing) {
        await adminUpdateModule(editing.id, payload);
        toast.success(`Modulo "${payload.label}" actualizado.`);
      } else {
        await adminCreateModule(payload);
        toast.success(`Modulo "${payload.label}" creado.`);
      }

      setDialogOpen(false);
      void loadModules();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : editing
            ? 'No se pudo actualizar el modulo.'
            : 'No se pudo crear el modulo.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Toggle active status ────────────────────────────────────────────
  async function handleToggleActive(mod: AdminPlatformModule) {
    try {
      await adminUpdateModule(mod.id, { is_active: !mod.is_active });
      toast.success(
        mod.is_active
          ? `Modulo "${mod.label}" desactivado.`
          : `Modulo "${mod.label}" activado.`,
      );
      void loadModules();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar el estado del modulo.';
      toast.error(message);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────
  async function handleDelete() {
    const target = deleteTarget;
    if (!target) return;
    setDeleting(true);
    try {
      await adminDeleteModule(target.id);
      setDeleteTarget(null);
      toast.success(`Modulo "${target.label}" eliminado.`);
      void loadModules();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp = (err as any)?.response?.data;
      const detail = typeof resp === 'object' && resp !== null
        ? resp.detail || JSON.stringify(resp)
        : (err instanceof Error ? err.message : 'No se pudo eliminar el modulo.');
      setDeleteTarget(null);
      toast.error(detail);
    } finally {
      setDeleting(false);
    }
  }

  // ── Dependency toggle helper ────────────────────────────────────────
  function toggleDependency(depId: number) {
    setFormDependencies((prev) =>
      prev.includes(depId) ? prev.filter((d) => d !== depId) : [...prev, depId],
    );
  }

  // Available modules for dependency selection (exclude current module when editing)
  const availableDeps = modules.filter(
    (m) => !editing || m.id !== editing.id,
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
            Modulos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {modules.length === 0 && !isLoading
              ? 'No hay modulos configurados.'
              : `${modules.length} modulo${modules.length === 1 ? '' : 's'} configurado${modules.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-500"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo modulo
        </button>
      </div>

        {/* Error */}
        {listError && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{listError}</span>
            <button
              type="button"
              onClick={() => void loadModules()}
              className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-4"
                  aria-hidden="true"
                >
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Cargando modulos...
            </div>
          </div>
        ) : modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Plus className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              No hay modulos configurados
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Los modulos definen las funcionalidades disponibles para los
              negocios. Crea el primer modulo para comenzar.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo modulo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Icono
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Color
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Dependencias
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Orden
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modules.map((mod) => (
                  <tr
                    key={mod.id}
                    className="group transition-colors hover:bg-slate-50/60"
                  >
                    {/* Nombre */}
                    <td className="px-4 py-3">
                      <span className="block font-medium text-slate-900">
                        {mod.label}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {mod.key}
                      </span>
                    </td>

                    {/* Icono */}
                    <td className="px-4 py-3 text-slate-600">
                      {(() => {
                        const Icon = mod.icon
                          ? (lucideIcons[mod.icon as keyof typeof lucideIcons] as LucideIcon | undefined)
                          : null;
                        return Icon ? (
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="text-xs text-slate-400">{mod.icon}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">{'\u2014'}</span>
                        );
                      })()}
                    </td>

                    {/* Color */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-block h-5 w-5 rounded-full border border-slate-200"
                        style={{ backgroundColor: mod.accent_color }}
                        title={mod.accent_color}
                      />
                    </td>

                    {/* Dependencias */}
                    <td className="px-4 py-3">
                      {mod.dependencies_detail.length === 0 ? (
                        <span className="text-xs text-slate-400">{'\u2014'}</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {mod.dependencies_detail.map((dep) => (
                            <Badge
                              key={dep.id}
                              className="border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50"
                            >
                              {dep.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Orden */}
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-700">
                      {mod.sort_order}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      {mod.is_active ? (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          Activo
                        </Badge>
                      ) : (
                        <Badge className="border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-100">
                          Inactivo
                        </Badge>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Acciones para ${mod.label}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                        >
                          <MoreHorizontal
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              openEdit(mod);
                            }}
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              void handleToggleActive(mod);
                            }}
                          >
                            {mod.is_active ? (
                              <>
                                <PowerOff
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Power
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setDeleteTarget(mod);
                            }}
                            className="text-red-600 focus:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* ── Create / Edit Dialog ─────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setDialogOpen(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar modulo' : 'Nuevo modulo'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Modifica los campos y guarda los cambios.'
                : 'Completa los campos para crear un nuevo modulo.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Key */}
            <div>
              <label
                htmlFor="mod-key"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Key
              </label>
              <input
                id="mod-key"
                type="text"
                required
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="ej: shop, bookings"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Label */}
            <div>
              <label
                htmlFor="mod-label"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Nombre
              </label>
              <input
                id="mod-label"
                type="text"
                required
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="ej: Tienda Online"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="mod-description"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Descripcion
              </label>
              <textarea
                id="mod-description"
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descripcion breve del modulo"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            {/* Icon + Color row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Icono
                </label>
                <IconPicker value={formIcon} onChange={setFormIcon} />
              </div>
              <div>
                <label
                  htmlFor="mod-color"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Color de acento
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="mod-color"
                    type="color"
                    value={formAccentColor}
                    onChange={(e) => setFormAccentColor(e.target.value)}
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  />
                  <span className="text-sm text-slate-500">
                    {formAccentColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Sort order + Active row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="mod-sort"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Orden
                </label>
                <input
                  id="mod-sort"
                  type="number"
                  min={0}
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <Switch
                    checked={formIsActive}
                    onCheckedChange={setFormIsActive}
                  />
                  <span>{formIsActive ? 'Activo' : 'Inactivo'}</span>
                </label>
              </div>
            </div>

            {/* Dependencies */}
            {availableDeps.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Dependencias
                </label>
                <div className="max-h-32 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
                  {availableDeps.map((dep) => (
                    <label
                      key={dep.id}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <Checkbox
                        checked={formDependencies.includes(dep.id)}
                        onCheckedChange={() => toggleDependency(dep.id)}
                      />
                      <span>{dep.label}</span>
                      <span className="text-xs text-slate-400">
                        ({dep.key})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !formKey.trim() || !formLabel.trim()}
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:opacity-50"
              >
                {submitting && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {editing ? 'Guardar cambios' : 'Crear modulo'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar modulo</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Se eliminara permanentemente el modulo "${deleteTarget.label}" (${deleteTarget.key}). Esta accion no se puede deshacer.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {deleting ? 'Eliminando...' : 'Si, eliminar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
