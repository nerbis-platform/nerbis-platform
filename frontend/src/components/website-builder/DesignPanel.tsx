'use client';

import { useState, useRef, useEffect } from 'react';
import { Palette, Type, Layout, Check, ChevronDown, RotateCcw, Maximize, MousePointerClick, Zap, Wand2, Layers, Sun, Moon } from 'lucide-react';

interface ThemeData {
  primary_color: string;
  secondary_color: string;
  font_heading: string;
  font_body: string;
  style: string;
  spacing: string;
  button_style: string;
  animation: string;
  shadow: string;
  color_mode: string;
  bg_color: string;
}

interface DesignPanelProps {
  themeData: ThemeData;
  defaultTheme: ThemeData;
  onChange: (theme: ThemeData) => void;
  isSaving?: boolean;
}

const FONT_PAIRINGS = [
  { heading: 'Inter', body: 'Inter', label: 'Moderno', desc: 'Tech, startups' },
  { heading: 'Playfair Display', body: 'Inter', label: 'Clásico', desc: 'Consultoría, legal' },
  { heading: 'Poppins', body: 'Open Sans', label: 'Amigable', desc: 'Restaurant, retail' },
  { heading: 'Playfair Display', body: 'Lato', label: 'Elegante', desc: 'Belleza, lujo' },
  { heading: 'Raleway', body: 'Open Sans', label: 'Creativo', desc: 'Agencias, diseño' },
  { heading: 'Montserrat', body: 'Roboto', label: 'Seguro', desc: 'Salud, finanzas' },
];

const STYLE_OPTIONS = [
  { value: 'modern', label: 'Moderno', desc: 'Bordes suaves, espaciado amplio' },
  { value: 'elegant', label: 'Elegante', desc: 'Líneas finas, tono premium' },
  { value: 'bold', label: 'Audaz', desc: 'Colores fuertes, alto contraste' },
  { value: 'clean', label: 'Minimalista', desc: 'Mucho blanco, ultra limpio' },
  { value: 'minimal', label: 'Minimal', desc: 'Solo contenido esencial' },
  { value: 'artistic', label: 'Artístico', desc: 'Creativo, formas orgánicas' },
];

// Mini mockup per style — compact visual preview
function StyleMockup({ style, color }: { style: string; color: string }) {
  if (style === 'modern') {
    return (
      <div className="w-full bg-linear-to-br from-gray-50 to-gray-100 rounded-xl p-2">
        <div className="h-1.5 w-2/3 rounded-full mb-1.5" style={{ background: color }} />
        <div className="h-[3px] w-full rounded-full bg-gray-200/80 mb-1" />
        <div className="h-[3px] w-3/4 rounded-full bg-gray-200/80 mb-1.5" />
        <div className="rounded-lg px-2 py-0.5 text-[0.35rem] font-bold text-white inline-block" style={{ background: color }}>
          Empezar
        </div>
      </div>
    );
  }

  if (style === 'elegant') {
    return (
      <div className="w-full bg-white border border-gray-200 p-2">
        <div className="h-px w-6 mb-1.5" style={{ background: color }} />
        <div className="h-1 w-3/4 bg-gray-800 mb-1" />
        <div className="h-0.5 w-full bg-gray-100 mb-0.5" />
        <div className="h-0.5 w-2/3 bg-gray-100 mb-1.5" />
        <div className="border px-2 py-0.5 text-[0.35rem] tracking-widest uppercase inline-block" style={{ borderColor: color, color }}>
          Ver más
        </div>
      </div>
    );
  }

  if (style === 'bold') {
    return (
      <div className="w-full rounded-lg p-2 text-white" style={{ background: color }}>
        <div className="h-1.5 w-4/5 rounded bg-white/30 mb-1" />
        <div className="h-[3px] w-full rounded bg-white/20 mb-0.5" />
        <div className="h-[3px] w-3/4 rounded bg-white/20 mb-1.5" />
        <div className="rounded-md bg-white px-2 py-0.5 text-[0.35rem] font-black inline-block" style={{ color }}>
          COMPRAR
        </div>
      </div>
    );
  }

  if (style === 'clean') {
    return (
      <div className="w-full bg-white rounded-lg p-2">
        <div className="h-[3px] w-1/2 rounded-full bg-gray-300 mb-2" />
        <div className="h-0.5 w-full rounded-full bg-gray-100 mb-0.5" />
        <div className="h-0.5 w-1/2 rounded-full bg-gray-100 mb-2" />
        <div className="rounded px-2 py-0.5 text-[0.32rem] font-medium inline-block border border-gray-200 text-gray-500">
          Continuar
        </div>
      </div>
    );
  }

  if (style === 'minimal') {
    return (
      <div className="w-full p-2">
        <div className="h-1 w-2/5 bg-gray-800 mb-1.5" />
        <div className="h-0.5 w-full bg-gray-100 mb-0.5" />
        <div className="h-0.5 w-3/5 bg-gray-100 mb-1.5" />
        <div className="text-[0.35rem] font-medium underline underline-offset-2" style={{ color }}>
          Leer más →
        </div>
      </div>
    );
  }

  // artistic
  return (
    <div className="w-full bg-gray-50 rounded-2xl p-2 relative overflow-hidden">
      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-20" style={{ background: color }} />
      <div className="h-1.5 w-3/5 rounded-full mb-1" style={{ background: color }} />
      <div className="h-[3px] w-4/5 rounded-full bg-gray-200 mb-0.5" />
      <div className="h-[3px] w-3/5 rounded-full bg-gray-200 mb-1.5" />
      <div className="rounded-full px-2 py-0.5 text-[0.35rem] font-bold text-white inline-block" style={{ background: color }}>
        Explorar
      </div>
    </div>
  );
}

const PRESET_COLORS = [
  '#1C3B57', '#0F172A', '#1A1A2E', '#2D2D2D', '#4A1942',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#14B8A6', '#0D9488', '#06B6D4',
];

const SPACING_OPTIONS = [
  { value: 'compact', label: 'Compacto', desc: 'Menos espacio, más contenido visible', icon: '▪' },
  { value: 'normal', label: 'Normal', desc: 'Balance entre contenido y respiración', icon: '▫' },
  { value: 'spacious', label: 'Espacioso', desc: 'Mucho aire, look premium y relajado', icon: '□' },
];

const BUTTON_STYLE_OPTIONS = [
  { value: 'pill', label: 'Pill', desc: 'Muy redondeado, amigable', preview: 'rounded-full' },
  { value: 'rounded', label: 'Redondeado', desc: 'Bordes suaves, versátil', preview: 'rounded-lg' },
  { value: 'square', label: 'Recto', desc: 'Sin redondeo, formal', preview: 'rounded-none' },
  { value: 'outline', label: 'Outline', desc: 'Solo borde, sin relleno', preview: 'rounded-lg' },
];

const ANIMATION_OPTIONS = [
  { value: 'none', label: 'Sin animación', desc: 'Carga instantánea' },
  { value: 'fade', label: 'Fade', desc: 'Aparición suave' },
  { value: 'slide', label: 'Slide Up', desc: 'Sube desde abajo' },
  { value: 'stagger', label: 'Stagger', desc: 'Secuencial, premium' },
];

const SHADOW_OPTIONS = [
  { value: 'none', label: 'Sin sombra', desc: 'Plano, ultra limpio', preview: 'shadow-none' },
  { value: 'subtle', label: 'Sutil', desc: 'Apenas perceptible', preview: 'shadow-sm' },
  { value: 'medium', label: 'Pronunciada', desc: 'Profundidad clara', preview: 'shadow-md' },
  { value: 'dramatic', label: 'Dramática', desc: 'Máxima profundidad', preview: 'shadow-xl' },
];

const EXTENDED_FONTS = [
  'Inter', 'Poppins', 'Montserrat', 'Raleway', 'Open Sans', 'Roboto', 'Lato',
  'Playfair Display', 'Merriweather', 'Libre Baskerville', 'DM Sans', 'DM Serif Display',
  'Nunito', 'Nunito Sans', 'Work Sans', 'Source Sans 3', 'Rubik', 'Manrope',
  'Space Grotesk', 'Outfit', 'Sora', 'Josefin Sans', 'Crimson Text', 'Cormorant Garamond',
  'Bitter', 'Archivo', 'Plus Jakarta Sans', 'Lexend',
];

const BG_PRESET_COLORS_LIGHT = [
  { value: '#FFFFFF', label: 'Blanco' },
  { value: '#FAFAFA', label: 'Gris claro' },
  { value: '#F8FAFC', label: 'Slate' },
  { value: '#FFFBEB', label: 'Crema' },
  { value: '#FFF7ED', label: 'Cálido' },
  { value: '#F0FDF4', label: 'Verde suave' },
  { value: '#EFF6FF', label: 'Azul suave' },
  { value: '#FDF2F8', label: 'Rosa suave' },
];

const BG_PRESET_COLORS_DARK = [
  { value: '#0F172A', label: 'Midnight' },
  { value: '#111827', label: 'Carbón' },
  { value: '#18181B', label: 'Zinc' },
  { value: '#1C1917', label: 'Tierra' },
  { value: '#172554', label: 'Navy' },
  { value: '#1E1B4B', label: 'Indigo' },
  { value: '#14532D', label: 'Bosque' },
  { value: '#4C1D95', label: 'Púrpura' },
];

const BG_GRADIENT_PRESETS_LIGHT = [
  { value: 'linear-gradient(135deg, #DBEAFE 0%, #EDE9FE 100%)', label: 'Cielo' },
  { value: 'linear-gradient(135deg, #FBCFE8 0%, #BFDBFE 100%)', label: 'Aurora' },
  { value: 'linear-gradient(135deg, #FDE68A 0%, #FDBA74 100%)', label: 'Arena' },
  { value: 'linear-gradient(135deg, #A7F3D0 0%, #BAE6FD 100%)', label: 'Brisa' },
  { value: 'linear-gradient(135deg, #E9D5FF 0%, #FBCFE8 100%)', label: 'Neblina' },
  { value: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)', label: 'Nieve' },
];

const BG_GRADIENT_PRESETS_DARK = [
  { value: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', label: 'Abyss' },
  { value: 'linear-gradient(135deg, #111827 0%, #172554 100%)', label: 'Océano' },
  { value: 'linear-gradient(135deg, #18181B 0%, #3F3F46 100%)', label: 'Acero' },
  { value: 'linear-gradient(135deg, #0F172A 0%, #14532D 100%)', label: 'Matrix' },
  { value: 'linear-gradient(135deg, #1C1917 0%, #4C1D95 100%)', label: 'Cosmos' },
  { value: 'linear-gradient(135deg, #111827 0%, #7F1D1D 100%)', label: 'Lava' },
];

// ─── Color Harmony Utilities ──────────────────────────────────
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generateHarmonies(hex: string): { label: string; color: string }[] {
  if (!hex || hex.length < 7) return [];
  const [h, s, l] = hexToHsl(hex);
  return [
    { label: 'Complementario', color: hslToHex(h + 180, s, l) },
    { label: 'Análogo', color: hslToHex(h + 30, s, l) },
    { label: 'Análogo inv.', color: hslToHex(h - 30, s, l) },
    { label: 'Triádico', color: hslToHex(h + 120, s, l) },
    { label: 'Split comp.', color: hslToHex(h + 150, s, l) },
  ];
}

// ─── Accordion Section ────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  isOpen,
  onToggle,
  children,
}: {
  icon: typeof Palette;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl transition-colors duration-200 ${isOpen ? 'bg-white shadow-sm ring-1 ring-gray-100' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center justify-between w-full px-3 py-2.5 cursor-pointer group rounded-xl transition-colors duration-150 ${
          isOpen ? '' : 'hover:bg-white/60'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center justify-center w-6 h-6 rounded-lg transition-colors duration-200 ${
            isOpen ? 'bg-[#E2F3F1]' : 'bg-gray-100 group-hover:bg-gray-200/60'
          }`}>
            <Icon className={`h-3.5 w-3.5 transition-colors duration-200 ${isOpen ? 'text-[#1C3B57]' : 'text-gray-400'}`} />
          </div>
          <span className={`text-[0.78rem] font-semibold transition-colors duration-200 ${isOpen ? 'text-[#1C3B57]' : 'text-gray-500'}`}>
            {title}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${
            isOpen ? '' : '-rotate-90'
          }`}
        />
      </button>
      {isOpen && <div className="px-3 pt-1 pb-3">{children}</div>}
    </div>
  );
}

// ─── Color Picker Inline ──────────────────────────────────────
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex-1 min-w-0">
      <label className="text-[0.65rem] font-medium text-gray-400 uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex flex-col items-center gap-1.5 w-full p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
        >
          <div
            className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            style={{ background: value }}
          />
          <span className="text-[0.7rem] text-gray-500 font-mono">{value}</span>
        </button>

        {open && (
          <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-white rounded-lg border border-gray-200 shadow-lg p-2.5">
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => { onChange(color); setOpen(false); }}
                  className="w-full aspect-square rounded-md border-2 transition-all cursor-pointer hover:scale-110"
                  style={{
                    background: color,
                    borderColor: color === value ? '#1C3B57' : 'transparent',
                  }}
                >
                  {color === value && (
                    <Check className="h-3 w-3 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-7 rounded cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Font Dropdown ───────────────────────────────────────────
function FontDropdown({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (font: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = EXTENDED_FONTS.filter((f) =>
    f.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 min-w-0" ref={ref}>
      <label className="text-[0.6rem] font-medium text-gray-400 uppercase tracking-wider block mb-1">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer text-left"
        >
          <span
            className="text-[0.75rem] text-gray-700 truncate"
            style={{ fontFamily: `'${value}', sans-serif` }}
          >
            {value}
          </span>
          <ChevronDown className={`h-3 w-3 text-gray-400 shrink-0 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute top-full mt-1 left-0 right-0 z-30 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
            <div className="p-1.5">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar fuente..."
                className="w-full px-2 py-1.5 text-[0.7rem] rounded-md border border-gray-200 focus:outline-none focus:border-[#0D9488]"
                autoFocus
              />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filtered.map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => { onChange(font); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-1.5 text-[0.72rem] transition-colors cursor-pointer hover:bg-gray-50 ${
                    font === value ? 'bg-[#E2F3F1]/40 text-[#1C3B57] font-medium' : 'text-gray-600'
                  }`}
                  style={{ fontFamily: `'${font}', sans-serif` }}
                >
                  {font}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-[0.65rem] text-gray-400">Sin resultados</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function DesignPanel({ themeData, defaultTheme, onChange, isSaving }: DesignPanelProps) {
  const [customFonts, setCustomFonts] = useState(false);
  const [showCustomBg, setShowCustomBg] = useState(false);
  const [customGradient, setCustomGradient] = useState({ from: '#3b82f6', to: '#8b5cf6' });
  const [openSection, setOpenSection] = useState<string>('colors');
  const toggle = (id: string) => setOpenSection(prev => prev === id ? '' : id);

  const updateTheme = (key: keyof ThemeData, value: string) => {
    onChange({ ...themeData, [key]: value });
  };

  const resetToDefault = () => {
    onChange({ ...defaultTheme });
  };

  return (
    <div className="space-y-1.5 bg-gray-50/80 rounded-2xl p-2">
      {/* ─── Restore defaults bar ─────────────────────────────── */}
      <div className="flex items-center justify-end px-2 py-1.5">
        <button
          type="button"
          onClick={resetToDefault}
          className="inline-flex items-center gap-1 text-[0.65rem] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          Restaurar
        </button>
      </div>

      {/* ─── Colors (accordion) ─────────────────────────────── */}
      <Section icon={Palette} title="Colores" isOpen={openSection === 'colors'} onToggle={() => toggle('colors')}>
        {/* Light / Dark toggle */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 mb-3">
          <button
            type="button"
            onClick={() => onChange({ ...themeData, color_mode: 'light', bg_color: '#FFFFFF' })}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[0.65rem] font-medium rounded-md transition-colors cursor-pointer ${
              themeData.color_mode !== 'dark'
                ? 'bg-white text-[#1C3B57] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sun className="h-3 w-3" />
            Claro
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...themeData, color_mode: 'dark', bg_color: '#0F172A' })}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[0.65rem] font-medium rounded-md transition-colors cursor-pointer ${
              themeData.color_mode === 'dark'
                ? 'bg-gray-800 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Moon className="h-3 w-3" />
            Oscuro
          </button>
        </div>

        <div className="flex gap-3">
          <ColorPicker
            label="Primario"
            value={themeData.primary_color}
            onChange={(c) => updateTheme('primary_color', c)}
          />
          <ColorPicker
            label="Secundario"
            value={themeData.secondary_color}
            onChange={(c) => updateTheme('secondary_color', c)}
          />
        </div>

        {/* Color Harmony — suggest secondary from primary */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 mb-2">
            <Wand2 className="h-3 w-3 text-[#0D9488]" />
            <label className="text-[0.65rem] font-medium text-gray-400 uppercase tracking-wider">
              Colores que combinan
            </label>
          </div>
          <div className="flex gap-1.5">
            {generateHarmonies(themeData.primary_color).map((h) => {
              const isActive = themeData.secondary_color.toLowerCase() === h.color.toLowerCase();
              return (
                <button
                  key={h.label}
                  type="button"
                  onClick={() => updateTheme('secondary_color', h.color)}
                  title={`${h.label}: ${h.color}`}
                  className="cursor-pointer"
                >
                  <div
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      isActive
                        ? 'border-[#1C3B57] scale-110 shadow-sm'
                        : 'border-transparent hover:border-gray-300 hover:scale-105'
                    }`}
                    style={{ background: h.color }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Background color inside Colors */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <label className="text-[0.65rem] font-medium text-gray-400 uppercase tracking-wider block mb-2">
            Fondo
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(themeData.color_mode === 'dark' ? BG_PRESET_COLORS_DARK : BG_PRESET_COLORS_LIGHT).map((bg) => {
              const isActive = themeData.bg_color === bg.value;
              return (
                <button
                  key={bg.value}
                  type="button"
                  onClick={() => { setShowCustomBg(false); updateTheme('bg_color', bg.value); }}
                  className={`p-1.5 rounded-md border-2 text-center transition-colors cursor-pointer ${
                    isActive && !showCustomBg
                      ? 'border-[#1C3B57]'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div
                    className="w-full aspect-square rounded-sm border border-gray-200"
                    style={{ background: bg.value }}
                  />
                  <p className={`text-[0.5rem] font-medium leading-tight mt-1 ${
                    isActive && !showCustomBg ? 'text-[#1C3B57]' : 'text-gray-500'
                  }`}>
                    {bg.label}
                  </p>
                </button>
              );
            })}
            {/* Custom solid color card */}
            <button
              type="button"
              onClick={() => setShowCustomBg(prev => !prev)}
              className={`p-1.5 rounded-md border-2 text-center transition-colors cursor-pointer ${
                showCustomBg && !themeData.bg_color.startsWith('linear-gradient')
                  ? 'border-[#1C3B57]'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-full aspect-square rounded-sm border border-dashed flex items-center justify-center ${
                themeData.color_mode === 'dark' ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
              }`}>
                <span className={`text-sm ${themeData.color_mode === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>+</span>
              </div>
              <p className={`text-[0.5rem] font-medium leading-tight mt-1 ${
                showCustomBg ? 'text-[#1C3B57]' : 'text-gray-500'
              }`}>
                Custom
              </p>
            </button>
          </div>
          {/* Custom color picker (appears when Custom is clicked) */}
          {showCustomBg && !themeData.bg_color.startsWith('linear-gradient') && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={themeData.bg_color.startsWith('#') ? themeData.bg_color : (themeData.color_mode === 'dark' ? '#0F172A' : '#FFFFFF')}
                onChange={(e) => updateTheme('bg_color', e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
              />
              <span className="text-[0.6rem] text-gray-400 font-mono">{themeData.bg_color}</span>
            </div>
          )}

          <label className="text-[0.65rem] font-medium text-gray-400 uppercase tracking-wider block mt-3 mb-1.5">
            Degradados
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(themeData.color_mode === 'dark' ? BG_GRADIENT_PRESETS_DARK : BG_GRADIENT_PRESETS_LIGHT).map((gr) => {
              const isActive = themeData.bg_color === gr.value;
              return (
                <button
                  key={gr.label}
                  type="button"
                  onClick={() => { setShowCustomBg(false); updateTheme('bg_color', gr.value); }}
                  className={`p-1.5 rounded-md border-2 text-center transition-colors cursor-pointer ${
                    isActive
                      ? 'border-[#1C3B57]'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div
                    className="w-full aspect-square rounded-sm border border-gray-200"
                    style={{ background: gr.value }}
                  />
                  <p className={`text-[0.5rem] font-medium leading-tight mt-1 ${
                    isActive ? 'text-[#1C3B57]' : 'text-gray-500'
                  }`}>
                    {gr.label}
                  </p>
                </button>
              );
            })}
            {/* Custom gradient card */}
            <button
              type="button"
              onClick={() => {
                setShowCustomBg(true);
                const grad = `linear-gradient(135deg, ${customGradient.from} 0%, ${customGradient.to} 100%)`;
                updateTheme('bg_color', grad);
              }}
              className={`p-1.5 rounded-md border-2 text-center transition-colors cursor-pointer ${
                showCustomBg && themeData.bg_color.startsWith('linear-gradient')
                  ? 'border-[#1C3B57]'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-full aspect-square rounded-sm border border-dashed flex items-center justify-center ${
                themeData.color_mode === 'dark' ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
              }`}>
                <span className={`text-sm ${themeData.color_mode === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>+</span>
              </div>
              <p className={`text-[0.5rem] font-medium leading-tight mt-1 ${
                showCustomBg && themeData.bg_color.startsWith('linear-gradient') ? 'text-[#1C3B57]' : 'text-gray-500'
              }`}>
                Custom
              </p>
            </button>
          </div>
          {/* Custom gradient builder */}
          {showCustomBg && themeData.bg_color.startsWith('linear-gradient') && (
            <div className="mt-2 p-2.5 rounded-lg border border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="color"
                  value={customGradient.from}
                  onChange={(e) => {
                    const next = { ...customGradient, from: e.target.value };
                    setCustomGradient(next);
                    updateTheme('bg_color', `linear-gradient(135deg, ${next.from} 0%, ${next.to} 100%)`);
                  }}
                  className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
                />
                <input
                  type="color"
                  value={customGradient.to}
                  onChange={(e) => {
                    const next = { ...customGradient, to: e.target.value };
                    setCustomGradient(next);
                    updateTheme('bg_color', `linear-gradient(135deg, ${next.from} 0%, ${next.to} 100%)`);
                  }}
                  className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
                />
              </div>
              <div
                className="w-full h-5 rounded-md border border-gray-200"
                style={{ background: `linear-gradient(135deg, ${customGradient.from} 0%, ${customGradient.to} 100%)` }}
              />
            </div>
          )}
        </div>
      </Section>

      {/* ─── Typography (accordion) ─────────────────────────── */}
      <Section icon={Type} title="Tipografía" isOpen={openSection === 'typography'} onToggle={() => toggle('typography')}>
        {/* Mini tabs: Parejas | Personalizar */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 mb-3">
          <button
            type="button"
            onClick={() => setCustomFonts(false)}
            className={`flex-1 py-1.5 text-[0.65rem] font-medium rounded-md transition-colors cursor-pointer ${
              !customFonts
                ? 'bg-white text-[#1C3B57] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Recomendadas
          </button>
          <button
            type="button"
            onClick={() => setCustomFonts(true)}
            className={`flex-1 py-1.5 text-[0.65rem] font-medium rounded-md transition-colors cursor-pointer ${
              customFonts
                ? 'bg-white text-[#1C3B57] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Personalizar
          </button>
        </div>

        {!customFonts ? (
          <div className="grid grid-cols-2 gap-2">
            {FONT_PAIRINGS.map((pair) => {
              const isActive = themeData.font_heading === pair.heading && themeData.font_body === pair.body;
              return (
                <button
                  key={`${pair.heading}-${pair.body}`}
                  type="button"
                  onClick={() => onChange({ ...themeData, font_heading: pair.heading, font_body: pair.body })}
                  className={`p-2.5 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                    isActive
                      ? themeData.color_mode === 'dark' ? 'border-[#0D9488] bg-[#1e293b]' : 'border-[#1C3B57] bg-[#E2F3F1]/30'
                      : themeData.color_mode === 'dark' ? 'border-gray-700 bg-gray-800/50 hover:border-gray-600' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <p
                    className={`text-[0.85rem] leading-tight mb-0.5 ${
                      isActive
                        ? themeData.color_mode === 'dark' ? 'text-white' : 'text-[#1C3B57]'
                        : themeData.color_mode === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}
                    style={{ fontFamily: `'${pair.heading}', sans-serif` }}
                  >
                    Aa
                  </p>
                  <p className={`text-[0.65rem] font-medium ${
                    isActive
                      ? themeData.color_mode === 'dark' ? 'text-[#0D9488]' : 'text-[#1C3B57]'
                      : themeData.color_mode === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {pair.label}
                  </p>
                  <p className={`text-[0.55rem] leading-tight mt-0.5 ${
                    themeData.color_mode === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {pair.desc}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3">
              <FontDropdown
                label="Títulos"
                value={themeData.font_heading}
                onChange={(f) => updateTheme('font_heading', f)}
              />
              <FontDropdown
                label="Cuerpo"
                value={themeData.font_body}
                onChange={(f) => updateTheme('font_body', f)}
              />
            </div>
            {/* Live preview of current selection */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p
                className="text-[0.9rem] font-semibold text-gray-800 leading-tight"
                style={{ fontFamily: `'${themeData.font_heading}', sans-serif` }}
              >
                Título de ejemplo
              </p>
              <p
                className="text-[0.7rem] text-gray-500 mt-1 leading-relaxed"
                style={{ fontFamily: `'${themeData.font_body}', sans-serif` }}
              >
                Este es un texto de cuerpo para ver cómo se combinan tus fuentes elegidas.
              </p>
            </div>
          </div>
        )}
      </Section>

      {/* ─── Style (accordion) ──────────────────────────────── */}
      <Section icon={Layout} title="Estilos recomendados" isOpen={openSection === 'style'} onToggle={() => toggle('style')}>
        <div className="grid grid-cols-2 gap-2">
          {STYLE_OPTIONS.map((opt) => {
            const isActive = themeData.style === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateTheme('style', opt.value)}
                className={`p-2 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#1C3B57] bg-[#E2F3F1]/30'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Visual mockup */}
                <StyleMockup style={opt.value} color={themeData.primary_color || '#3b82f6'} />
                {/* Label + desc */}
                <p className={`text-[0.65rem] font-medium mt-2 ${isActive ? 'text-[#1C3B57]' : 'text-gray-600'}`}>
                  {opt.label}
                </p>
                <p className="text-[0.5rem] text-gray-400 leading-tight mt-0.5">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ─── Spacing / Density (accordion) ────────────────────── */}
      <Section icon={Maximize} title="Densidad" isOpen={openSection === 'spacing'} onToggle={() => toggle('spacing')}>
        <div className="grid grid-cols-3 gap-2">
          {SPACING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateTheme('spacing', opt.value)}
              className={`p-2.5 rounded-lg border-2 text-center transition-colors cursor-pointer ${
                themeData.spacing === opt.value
                  ? 'border-[#1C3B57] bg-[#E2F3F1]/30'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="text-lg leading-none block mb-1">{opt.icon}</span>
              <p className={`text-[0.65rem] font-medium ${
                themeData.spacing === opt.value ? 'text-[#1C3B57]' : 'text-gray-600'
              }`}>
                {opt.label}
              </p>
              <p className="text-[0.5rem] text-gray-400 leading-tight mt-0.5">
                {opt.desc}
              </p>
            </button>
          ))}
        </div>
      </Section>

      {/* ─── Button Style (accordion) ─────────────────────────── */}
      <Section icon={MousePointerClick} title="Botones" isOpen={openSection === 'buttons'} onToggle={() => toggle('buttons')}>
        <div className="grid grid-cols-2 gap-2">
          {BUTTON_STYLE_OPTIONS.map((opt) => {
            const isActive = themeData.button_style === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateTheme('button_style', opt.value)}
                className={`p-2.5 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#1C3B57] bg-[#E2F3F1]/30'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Mini button preview */}
                <div className="mb-2">
                  <span
                    className={`inline-block px-3 py-1 text-[0.6rem] font-medium text-white ${opt.preview} ${
                      opt.value === 'outline'
                        ? 'bg-transparent text-[#1C3B57]! border border-[#1C3B57]'
                        : 'bg-[#1C3B57]'
                    }`}
                  >
                    Botón
                  </span>
                </div>
                <p className={`text-[0.65rem] font-medium ${isActive ? 'text-[#1C3B57]' : 'text-gray-600'}`}>
                  {opt.label}
                </p>
                <p className="text-[0.5rem] text-gray-400 leading-tight mt-0.5">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ─── Shadows (accordion) ────────────────────────────────── */}
      <Section icon={Layers} title="Sombras" isOpen={openSection === 'shadows'} onToggle={() => toggle('shadows')}>
        <div className="grid grid-cols-2 gap-2">
          {SHADOW_OPTIONS.map((opt) => {
            const isActive = themeData.shadow === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateTheme('shadow', opt.value)}
                className={`p-2.5 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#1C3B57] bg-[#E2F3F1]/30'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Mini shadow preview */}
                <div className="mb-2 flex justify-center">
                  <div className={`w-10 h-7 rounded bg-white border border-gray-100 ${opt.preview}`} />
                </div>
                <p className={`text-[0.65rem] font-medium ${isActive ? 'text-[#1C3B57]' : 'text-gray-600'}`}>
                  {opt.label}
                </p>
                <p className="text-[0.5rem] text-gray-400 leading-tight mt-0.5">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ─── Animations (accordion) ───────────────────────────── */}
      <Section icon={Zap} title="Animaciones" isOpen={openSection === 'animations'} onToggle={() => toggle('animations')}>
        <div className="grid grid-cols-2 gap-2">
          {ANIMATION_OPTIONS.map((opt) => {
            const isActive = themeData.animation === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateTheme('animation', opt.value)}
                className={`p-2.5 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#1C3B57] bg-[#E2F3F1]/30'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <p className={`text-[0.65rem] font-medium ${isActive ? 'text-[#1C3B57]' : 'text-gray-600'}`}>
                  {opt.label}
                </p>
                <p className="text-[0.5rem] text-gray-400 leading-tight mt-0.5">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Section>


    </div>
  );
}
