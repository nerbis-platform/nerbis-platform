'use client';

import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  CalendarCheck,
  Eye,
  EyeOff,
  GripVertical,
  Heart,
  Image,
  Info,
  Megaphone,
  MessageCircle,
  Plus,
  ShoppingCart,
  Type,
  Loader2,
  Upload,
  User,
  X,
} from 'lucide-react';
import LogoOptimizer from './LogoOptimizer';
import SubComponentToggle from './SubComponentToggle';

// ─── Types ────────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  visible: boolean;
}

interface SectionContent {
  [key: string]: unknown;
}

interface HeaderEditorProps {
  content: SectionContent;
  logoUrl: string;
  onChange: (content: SectionContent) => void;
  onLogoUrlChange: (url: string | null) => void;
  onUploadMedia: (file: File) => Promise<{ url: string }>;
  availableNavSections: string[];
  contactWhatsapp?: string;
  industry?: string;
  contactContent?: SectionContent;
  socialLinks?: Record<string, string>;
}

// ─── Nav label defaults (mirrors backend SECTION_NAV_LABELS) ──

const NAV_LABELS: Record<string, string> = {
  about: 'Nosotros',
  services: 'Servicios',
  products: 'Productos',
  testimonials: 'Testimonios',
  gallery: 'Galería',
  pricing: 'Precios',
  faq: 'FAQ',
  contact: 'Contacto',
  team: 'Equipo',
  blog: 'Blog',
};

const NAV_ICONS: Record<string, string> = {
  about: '📖',
  services: '⚙️',
  products: '🛍️',
  testimonials: '⭐',
  gallery: '🖼️',
  pricing: '💰',
  faq: '❓',
  contact: '📞',
  team: '👥',
  blog: '✍️',
};

// ─── Industry defaults ───────────────────────────────────────

const INDUSTRY_HEADER_DEFAULTS: Record<string, Record<string, unknown>> = {
  retail: {
    action_login_enabled: true,
    action_cart_enabled: true,
    action_wishlist_enabled: true,
  },
  beauty: {
    action_login_enabled: true,
    action_booking_enabled: true,
    action_booking_text: 'Reservar cita',
  },
  health: {
    action_login_enabled: true,
    action_booking_enabled: true,
    action_booking_text: 'Agendar cita',
  },
  fitness: {
    action_login_enabled: true,
    action_booking_enabled: true,
    action_booking_text: 'Reservar clase',
  },
  restaurant: {
    action_booking_enabled: true,
    action_booking_text: 'Reservar mesa',
  },
  events: {
    action_booking_enabled: true,
    action_booking_text: 'Reservar',
  },
};

function getField(content: SectionContent, field: string, industry: string, fallback: unknown = undefined): unknown {
  if (field in content) return content[field];
  const defaults = INDUSTRY_HEADER_DEFAULTS[industry];
  if (defaults && field in defaults) return defaults[field];
  return fallback;
}

// ─── Component ────────────────────────────────────────────────

export default function HeaderEditor({
  content,
  logoUrl,
  onChange,
  onLogoUrlChange,
  onUploadMedia,
  availableNavSections,
  contactWhatsapp,
  industry = 'generic',
  contactContent,
  socialLinks,
}: HeaderEditorProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsUploading(true);
    try {
      const result = await onUploadMedia(file);
      onLogoUrlChange(result.url);
    } finally {
      setIsUploading(false);
    }
  };

  // Initialize nav_items from available sections if not present
  const navItems: NavItem[] = (content.nav_items as NavItem[]) || [];

  useEffect(() => {
    if (!content.nav_items && availableNavSections.length > 0) {
      const defaultItems = availableNavSections.map((sid) => ({
        id: sid,
        label: NAV_LABELS[sid] || sid.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        visible: true,
      }));
      onChange({ ...content, nav_items: defaultItems });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (key: string, value: unknown) => {
    onChange({ ...content, [key]: value });
  };

  const updateNavItems = (items: NavItem[]) => {
    onChange({ ...content, nav_items: items });
  };

  // Sections that can be added to nav (not already in nav_items)
  const navItemIds = new Set(navItems.map((n) => n.id));
  const addableSections = availableNavSections.filter((s) => !navItemIds.has(s));

  const handleAddNavItem = (sectionId: string) => {
    updateNavItems([
      ...navItems,
      {
        id: sectionId,
        label: NAV_LABELS[sectionId] || sectionId.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        visible: true,
      },
    ]);
    setShowAddMenu(false);
  };

  const handleRemoveNavItem = (id: string) => {
    updateNavItems(navItems.filter((n) => n.id !== id));
  };

  const handleToggleVisibility = (id: string) => {
    updateNavItems(navItems.map((n) => (n.id === id ? { ...n, visible: !n.visible } : n)));
  };

  const handleUpdateLabel = (id: string, label: string) => {
    updateNavItems(navItems.map((n) => (n.id === id ? { ...n, label } : n)));
  };

  const inputClass = 'w-full mt-1.5 h-10 px-3 rounded-lg border border-gray-200 text-[0.88rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors';
  const labelClass = 'text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide';

  // Social links display
  const hasSocialLinks = socialLinks && Object.values(socialLinks).some((v) => !!v);

  // Logo mode
  const logoMode = String(content.logo_mode || (logoUrl ? 'image' : 'text')) as 'image' | 'image_text' | 'text';
  const logoScale = Number(content.logo_scale || 100);
  const logoPadding = Number(content.logo_padding || 0);

  return (
    <div className="space-y-5">
      {/* ─── Logo ─────────────────────────────────── */}
      <div>
        <p className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          Logo
        </p>

        {/* Preview + Upload */}
        {(logoMode === 'image' || logoMode === 'image_text') && !logoUrl ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-5 mb-3 cursor-pointer hover:border-[#95D0C9] hover:bg-[#E2F3F1]/20 transition-colors"
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleLogoFile(file);
            }}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 text-[#95D0C9] animate-spin mb-1.5" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#E2F3F1] flex items-center justify-center mb-1.5">
                <Upload className="h-4 w-4 text-[#1C3B57]" />
              </div>
            )}
            <p className="text-[0.78rem] text-gray-500 font-medium">
              {isUploading ? 'Subiendo...' : 'Sube tu logo'}
            </p>
            <p className="text-[0.65rem] text-gray-400 mt-0.5">PNG, JPG, SVG o WebP</p>
          </div>
        ) : (
          <div className="group/logo relative flex items-center justify-center p-4 rounded-xl bg-gray-50 border border-gray-200 mb-3 overflow-hidden">
            <div className="flex items-center gap-2" style={{ padding: `${logoPadding}px` }}>
              {(logoMode === 'image' || logoMode === 'image_text') && logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="object-contain"
                  style={{ height: `${Math.round(36 * logoScale / 100)}px`, width: 'auto' }}
                />
              )}
              {(logoMode === 'text' || logoMode === 'image_text') && (
                <span className="font-semibold text-[#1C3B57]" style={{ fontSize: `${Math.round(1.25 * logoScale / 100 * 100) / 100}rem` }}>
                  {String(content.logo_text || 'Tu Negocio')}
                </span>
              )}
            </div>

            {/* Hover overlay — change / remove logo */}
            {(logoMode === 'image' || logoMode === 'image_text') && logoUrl && (
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-200">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="h-8 px-3 rounded-lg bg-white/90 backdrop-blur-sm text-[0.75rem] font-medium text-gray-700 hover:bg-white flex items-center gap-1.5 cursor-pointer"
                >
                  {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={() => onLogoUrlChange(null)}
                  className="h-8 px-3 rounded-lg bg-white/90 backdrop-blur-sm text-[0.75rem] font-medium text-red-500 hover:bg-white flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hidden file input for logo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); e.target.value = ''; }}
        />

        {/* Logo optimizer (quitar fondo, recortar) */}
        {logoUrl && logoMode !== 'text' && (
          <LogoOptimizer
            imageDataUrl={logoUrl}
            onApply={(newDataUrl) => onLogoUrlChange(newDataUrl)}
            compact
          />
        )}

        {/* Display mode selector */}
        <div>
          <label className={labelClass}>Modo de display</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
            {([
              { value: 'image', label: 'Imagen', icon: Image },
              { value: 'image_text', label: 'Imagen + Texto', icon: Image },
              { value: 'text', label: 'Solo texto', icon: Type },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateField('logo_mode', value)}
                className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border text-[0.72rem] font-medium transition-all cursor-pointer ${
                  logoMode === value
                    ? 'border-[#95D0C9] bg-[#E2F3F1] text-[#1C3B57]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Scale slider */}
        {logoMode !== 'text' && logoUrl && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Tamaño</label>
              <span className="text-[0.72rem] text-gray-500 font-medium">{logoScale}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={150}
              value={logoScale}
              onChange={(e) => updateField('logo_scale', Number(e.target.value))}
              className="w-full mt-1.5 accent-[#1C3B57] cursor-pointer"
            />
          </div>
        )}

        {/* Padding slider */}
        {logoMode !== 'text' && logoUrl && (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Espaciado interno</label>
              <span className="text-[0.72rem] text-gray-500 font-medium">{logoPadding}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              value={logoPadding}
              onChange={(e) => updateField('logo_padding', Number(e.target.value))}
              className="w-full mt-1.5 accent-[#1C3B57] cursor-pointer"
            />
          </div>
        )}

        {/* Logo text */}
        {(logoMode === 'text' || logoMode === 'image_text') && (
          <div className="mt-3">
            <label className={labelClass}>Texto del logo</label>
            <input
              type="text"
              value={String(content.logo_text || '')}
              onChange={(e) => updateField('logo_text', e.target.value)}
              placeholder="Nombre de tu negocio"
              className={inputClass}
            />
          </div>
        )}

      </div>

      {/* ─── Navegación ───────────────────────────── */}
      <div>
        <p className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          Navegación
        </p>

        <NavLinksEditor
          items={navItems}
          onReorder={updateNavItems}
          onToggleVisibility={handleToggleVisibility}
          onUpdateLabel={handleUpdateLabel}
          onRemove={handleRemoveNavItem}
        />

        {addableSections.length > 0 && (
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-dashed border-gray-300 text-[0.75rem] text-gray-500 font-medium hover:border-[#95D0C9] hover:text-[#1C3B57] transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Agregar link
            </button>

            {showAddMenu && (
              <div className="absolute top-10 left-0 right-0 z-20 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                  <p className="text-[0.72rem] font-medium text-gray-500">Secciones disponibles</p>
                  <button
                    type="button"
                    onClick={() => setShowAddMenu(false)}
                    className="p-0.5 rounded hover:bg-gray-100 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                </div>
                {addableSections.map((sid) => (
                  <button
                    key={sid}
                    type="button"
                    onClick={() => handleAddNavItem(sid)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[0.82rem] text-gray-600 hover:bg-[#E2F3F1]/50 transition-colors cursor-pointer"
                  >
                    <span className="text-sm">{NAV_ICONS[sid] || '📄'}</span>
                    {NAV_LABELS[sid] || sid}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Botón CTA ────────────────────────────── */}
      <div>
        <p className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          Botón CTA
        </p>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Texto del botón</label>
            <input
              type="text"
              value={String(content.cta_text || '')}
              onChange={(e) => updateField('cta_text', e.target.value)}
              placeholder="Contáctanos"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Link del botón</label>
            <input
              type="text"
              value={String(content.cta_link || '')}
              onChange={(e) => updateField('cta_link', e.target.value)}
              placeholder="#contact"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* ─── Barras superiores ────────────────────── */}
      <div>
        <p className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          Barras superiores
        </p>
        <div className="space-y-2">
          {/* Info Bar */}
          <SubComponentToggle
            label="Barra de información"
            description="Teléfono, email, horario y redes sociales arriba del menú"
            icon={Info}
            enabled={!!getField(content, 'info_bar_enabled', industry, false)}
            onToggle={(v) => updateField('info_bar_enabled', v)}
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelClass}>Color de fondo</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="color"
                    value={String(content.info_bar_bg || '#1C3B57')}
                    onChange={(e) => updateField('info_bar_bg', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={String(content.info_bar_bg || '#1C3B57')}
                    onChange={(e) => updateField('info_bar_bg', e.target.value)}
                    className="flex-1 h-8 px-2 rounded-lg border border-gray-200 text-[0.78rem] text-gray-600 focus:outline-none focus:border-[#95D0C9]"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className={labelClass}>Color de texto</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="color"
                    value={String(content.info_bar_text_color || '#FFFFFF')}
                    onChange={(e) => updateField('info_bar_text_color', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={String(content.info_bar_text_color || '#FFFFFF')}
                    onChange={(e) => updateField('info_bar_text_color', e.target.value)}
                    className="flex-1 h-8 px-2 rounded-lg border border-gray-200 text-[0.78rem] text-gray-600 focus:outline-none focus:border-[#95D0C9]"
                  />
                </div>
              </div>
            </div>

            {/* What to show */}
            <div className="space-y-2 pt-1">
              <p className={labelClass}>Mostrar en la barra</p>
              {[
                { key: 'info_bar_show_phone', label: 'Teléfono', value: contactContent?.phone },
                { key: 'info_bar_show_email', label: 'Email', value: contactContent?.email },
                { key: 'info_bar_show_hours', label: 'Horario', value: contactContent?.hours },
              ].map(({ key, label, value }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={content[key] !== false}
                    onChange={(e) => updateField(key, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#1C3B57] focus:ring-[#95D0C9] cursor-pointer"
                  />
                  <span className="text-[0.82rem] text-gray-600">{label}</span>
                  {value ? (
                    <span className="text-[0.72rem] text-gray-400 truncate max-w-[140px]">
                      ({String(value)})
                    </span>
                  ) : null}
                </label>
              ))}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.info_bar_show_social !== false}
                  onChange={(e) => updateField('info_bar_show_social', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1C3B57] focus:ring-[#95D0C9] cursor-pointer"
                />
                <span className="text-[0.82rem] text-gray-600">Redes sociales</span>
                {!hasSocialLinks && (
                  <span className="text-[0.68rem] text-amber-500">Sin configurar</span>
                )}
              </label>
            </div>

            {!contactContent?.phone && !contactContent?.email && (
              <p className="text-[0.72rem] text-amber-600 mt-1">
                Agrega teléfono y email en la sección de Contacto para que aparezcan aquí.
              </p>
            )}
          </SubComponentToggle>

          {/* Promo Bar */}
          <SubComponentToggle
            label="Barra de promociones"
            description="Franja de color sobre el menú con un mensaje"
            icon={Megaphone}
            enabled={!!content.promo_bar_enabled}
            onToggle={(v) => updateField('promo_bar_enabled', v)}
          >
            <div>
              <label className={labelClass}>Texto</label>
              <input
                type="text"
                value={String(content.promo_bar_text || '')}
                onChange={(e) => updateField('promo_bar_text', e.target.value)}
                placeholder="¡Envío gratis en compras +$500!"
                className={inputClass}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelClass}>Color de fondo</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="color"
                    value={String(content.promo_bar_bg || '#1C3B57')}
                    onChange={(e) => updateField('promo_bar_bg', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={String(content.promo_bar_bg || '#1C3B57')}
                    onChange={(e) => updateField('promo_bar_bg', e.target.value)}
                    className="flex-1 h-8 px-2 rounded-lg border border-gray-200 text-[0.78rem] text-gray-600 focus:outline-none focus:border-[#95D0C9]"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className={labelClass}>Color de texto</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="color"
                    value={String(content.promo_bar_text_color || '#FFFFFF')}
                    onChange={(e) => updateField('promo_bar_text_color', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={String(content.promo_bar_text_color || '#FFFFFF')}
                    onChange={(e) => updateField('promo_bar_text_color', e.target.value)}
                    className="flex-1 h-8 px-2 rounded-lg border border-gray-200 text-[0.78rem] text-gray-600 focus:outline-none focus:border-[#95D0C9]"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className={labelClass}>Texto del enlace (opcional)</label>
              <input
                type="text"
                value={String(content.promo_bar_link_text || '')}
                onChange={(e) => updateField('promo_bar_link_text', e.target.value)}
                placeholder="Ver ofertas"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>URL del enlace</label>
              <input
                type="text"
                value={String(content.promo_bar_link || '')}
                onChange={(e) => updateField('promo_bar_link', e.target.value)}
                placeholder="/productos"
                className={inputClass}
              />
            </div>
          </SubComponentToggle>
        </div>
      </div>

      {/* ─── Acciones de usuario ──────────────────── */}
      <div>
        <p className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          Acciones de usuario
        </p>
        <div className="space-y-2">
          {/* Login / Mi cuenta */}
          <SubComponentToggle
            label="Login / Mi cuenta"
            description="Botón de inicio de sesión o acceso a cuenta"
            icon={User}
            enabled={!!getField(content, 'action_login_enabled', industry, false)}
            onToggle={(v) => updateField('action_login_enabled', v)}
          >
            <div>
              <label className={labelClass}>Texto del botón</label>
              <input
                type="text"
                value={String(content.action_login_text || 'Mi cuenta')}
                onChange={(e) => updateField('action_login_text', e.target.value)}
                placeholder="Mi cuenta"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Link</label>
              <input
                type="text"
                value={String(content.action_login_link || '/login')}
                onChange={(e) => updateField('action_login_link', e.target.value)}
                placeholder="/login"
                className={inputClass}
              />
            </div>
          </SubComponentToggle>

          {/* Carrito de compras */}
          <SubComponentToggle
            label="Carrito de compras"
            description="Ícono de carrito para tiendas y ecommerce"
            icon={ShoppingCart}
            enabled={!!getField(content, 'action_cart_enabled', industry, false)}
            onToggle={(v) => updateField('action_cart_enabled', v)}
          >
            <div>
              <label className={labelClass}>Link del carrito</label>
              <input
                type="text"
                value={String(content.action_cart_link || '/carrito')}
                onChange={(e) => updateField('action_cart_link', e.target.value)}
                placeholder="/carrito"
                className={inputClass}
              />
            </div>
          </SubComponentToggle>

          {/* Lista de deseos */}
          <SubComponentToggle
            label="Lista de deseos"
            description="Ícono de favoritos para guardar productos"
            icon={Heart}
            enabled={!!getField(content, 'action_wishlist_enabled', industry, false)}
            onToggle={(v) => updateField('action_wishlist_enabled', v)}
          >
            <div>
              <label className={labelClass}>Link de favoritos</label>
              <input
                type="text"
                value={String(content.action_wishlist_link || '/favoritos')}
                onChange={(e) => updateField('action_wishlist_link', e.target.value)}
                placeholder="/favoritos"
                className={inputClass}
              />
            </div>
          </SubComponentToggle>

          {/* Reservar cita */}
          <SubComponentToggle
            label="Reservar cita"
            description="Botón de reservas para negocios con agenda"
            icon={CalendarCheck}
            enabled={!!getField(content, 'action_booking_enabled', industry, false)}
            onToggle={(v) => updateField('action_booking_enabled', v)}
          >
            <div>
              <label className={labelClass}>Texto del botón</label>
              <input
                type="text"
                value={String(getField(content, 'action_booking_text', industry, 'Reservar cita'))}
                onChange={(e) => updateField('action_booking_text', e.target.value)}
                placeholder="Reservar cita"
                className={inputClass}
              />
            </div>
            <div>
              <p className={labelClass}>Destino del botón</p>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="booking_dest"
                    checked={content.action_booking_use_system !== false}
                    onChange={() => updateField('action_booking_use_system', true)}
                    className="w-4 h-4 text-[#1C3B57] focus:ring-[#95D0C9] cursor-pointer"
                  />
                  <div>
                    <span className="text-[0.82rem] text-gray-700">Sistema de reservas integrado</span>
                    <p className="text-[0.68rem] text-gray-400">Usa el sistema de citas de la plataforma</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="booking_dest"
                    checked={content.action_booking_use_system === false}
                    onChange={() => updateField('action_booking_use_system', false)}
                    className="w-4 h-4 text-[#1C3B57] focus:ring-[#95D0C9] cursor-pointer"
                  />
                  <span className="text-[0.82rem] text-gray-700">Link personalizado</span>
                </label>
              </div>
              {content.action_booking_use_system === false && (
                <div className="mt-2">
                  <label className={labelClass}>URL de reservas</label>
                  <input
                    type="text"
                    value={String(content.action_booking_link || '')}
                    onChange={(e) => updateField('action_booking_link', e.target.value)}
                    placeholder="https://tu-sistema-de-reservas.com"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </SubComponentToggle>
        </div>
      </div>

      {/* ─── Otros ────────────────────────────────── */}
      <div>
        <p className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          Otros
        </p>
        <div className="space-y-2">
          {/* WhatsApp Float */}
          <SubComponentToggle
            label="Botón de WhatsApp flotante"
            description="Botón fijo en la esquina para contacto rápido"
            icon={MessageCircle}
            enabled={!!content.whatsapp_float_enabled}
            onToggle={(v) => updateField('whatsapp_float_enabled', v)}
          >
            {contactWhatsapp ? (
              <p className="text-[0.75rem] text-gray-500">
                Usa el número configurado en Contacto: <span className="font-medium text-[#1C3B57]">{contactWhatsapp}</span>
              </p>
            ) : (
              <p className="text-[0.75rem] text-amber-600">
                Configura un número de WhatsApp en la sección de Contacto para activar este botón.
              </p>
            )}
          </SubComponentToggle>
        </div>
      </div>
    </div>
  );
}

// ─── Nav Links Editor (sortable) ──────────────────────────────

function NavLinksEditor({
  items,
  onReorder,
  onToggleVisibility,
  onUpdateLabel,
  onRemove,
}: {
  items: NavItem[];
  onReorder: (items: NavItem[]) => void;
  onToggleVisibility: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onRemove: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {items.map((item) => (
            <SortableNavItem
              key={item.id}
              item={item}
              onToggleVisibility={() => onToggleVisibility(item.id)}
              onUpdateLabel={(label) => onUpdateLabel(item.id, label)}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableNavItem({
  item,
  onToggleVisibility,
  onUpdateLabel,
  onRemove,
}: {
  item: NavItem;
  onToggleVisibility: () => void;
  onUpdateLabel: (label: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    transition: { duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1.5 rounded-lg transition-all ${
        isDragging ? 'opacity-50 bg-[#E2F3F1]/50' : 'hover:bg-gray-50'
      }`}
    >
      <button
        type="button"
        className="p-1.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-[#95D0C9] transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>

      <span className="text-sm shrink-0">{NAV_ICONS[item.id] || '📄'}</span>

      <input
        type="text"
        value={item.label}
        onChange={(e) => onUpdateLabel(e.target.value)}
        className={`flex-1 h-8 px-2 rounded-md border border-transparent text-[0.82rem] focus:outline-none focus:border-[#95D0C9] transition-colors ${
          item.visible ? 'text-gray-700' : 'text-gray-400'
        }`}
      />

      <button
        type="button"
        onClick={onToggleVisibility}
        className={`p-1.5 rounded-md transition-all cursor-pointer ${
          item.visible
            ? 'text-[#1C3B57] hover:bg-[#E2F3F1]'
            : 'text-gray-300 hover:bg-gray-100'
        }`}
        title={item.visible ? 'Ocultar del menú' : 'Mostrar en menú'}
      >
        {item.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>

      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-md text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
        title="Quitar del menú"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
