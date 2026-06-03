'use client';

import { useState } from 'react';
import { Palette, Type, Layout, RotateCcw, Maximize, MousePointerClick, Zap, Wand2, Layers, Sun, Moon } from 'lucide-react';
import {
  type ThemeData,
  FONT_PAIRINGS,
  STYLE_OPTIONS,
  SPACING_OPTIONS,
  BUTTON_STYLE_OPTIONS,
  ANIMATION_OPTIONS,
  SHADOW_OPTIONS,
  BG_PRESET_COLORS_LIGHT,
  BG_PRESET_COLORS_DARK,
  BG_GRADIENT_PRESETS_LIGHT,
  BG_GRADIENT_PRESETS_DARK,
  generateHarmonies,
  StyleMockup,
  Section,
  ColorPicker,
  FontDropdown,
} from './design-panel-helpers';

interface DesignPanelProps {
  themeData: ThemeData;
  defaultTheme: ThemeData;
  onChange: (theme: ThemeData) => void;
  isSaving?: boolean;
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
                ? 'bg-white text-foreground shadow-sm'
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
            <Wand2 className="h-3 w-3 text-primary" />
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
                        ? 'border-foreground scale-110 shadow-sm'
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
                      ? 'border-foreground'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div
                    className="w-full aspect-square rounded-sm border border-gray-200"
                    style={{ background: bg.value }}
                  />
                  <p className={`text-[0.5rem] font-medium leading-tight mt-1 ${
                    isActive && !showCustomBg ? 'text-foreground' : 'text-gray-500'
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
                  ? 'border-foreground'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-full aspect-square rounded-sm border border-dashed flex items-center justify-center ${
                themeData.color_mode === 'dark' ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
              }`}>
                <span className={`text-sm ${themeData.color_mode === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>+</span>
              </div>
              <p className={`text-[0.5rem] font-medium leading-tight mt-1 ${
                showCustomBg ? 'text-foreground' : 'text-gray-500'
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
                      ? 'border-foreground'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div
                    className="w-full aspect-square rounded-sm border border-gray-200"
                    style={{ background: gr.value }}
                  />
                  <p className={`text-[0.5rem] font-medium leading-tight mt-1 ${
                    isActive ? 'text-foreground' : 'text-gray-500'
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
                  ? 'border-foreground'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-full aspect-square rounded-sm border border-dashed flex items-center justify-center ${
                themeData.color_mode === 'dark' ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
              }`}>
                <span className={`text-sm ${themeData.color_mode === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>+</span>
              </div>
              <p className={`text-[0.5rem] font-medium leading-tight mt-1 ${
                showCustomBg && themeData.bg_color.startsWith('linear-gradient') ? 'text-foreground' : 'text-gray-500'
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
                ? 'bg-white text-foreground shadow-sm'
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
                ? 'bg-white text-foreground shadow-sm'
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
                      ? themeData.color_mode === 'dark' ? 'border-[#0D9488] bg-[#1e293b]' : 'border-foreground bg-primary/30'
                      : themeData.color_mode === 'dark' ? 'border-gray-700 bg-gray-800/50 hover:border-gray-600' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <p
                    className={`text-[0.85rem] leading-tight mb-0.5 ${
                      isActive
                        ? themeData.color_mode === 'dark' ? 'text-white' : 'text-foreground'
                        : themeData.color_mode === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}
                    style={{ fontFamily: `'${pair.heading}', sans-serif` }}
                  >
                    Aa
                  </p>
                  <p className={`text-[0.65rem] font-medium ${
                    isActive
                      ? themeData.color_mode === 'dark' ? 'text-primary' : 'text-foreground'
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
                    ? 'border-foreground bg-primary/30'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Visual mockup */}
                <StyleMockup style={opt.value} color={themeData.primary_color || '#3b82f6'} />
                {/* Label + desc */}
                <p className={`text-[0.65rem] font-medium mt-2 ${isActive ? 'text-foreground' : 'text-gray-600'}`}>
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
                  ? 'border-foreground bg-primary/30'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="text-lg leading-none block mb-1">{opt.icon}</span>
              <p className={`text-[0.65rem] font-medium ${
                themeData.spacing === opt.value ? 'text-foreground' : 'text-gray-600'
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
                    ? 'border-foreground bg-primary/30'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Mini button preview */}
                <div className="mb-2">
                  <span
                    className={`inline-block px-3 py-1 text-[0.6rem] font-medium text-white ${opt.preview} ${
                      opt.value === 'outline'
                        ? 'bg-transparent text-foreground! border border-foreground'
                        : 'bg-foreground'
                    }`}
                  >
                    Botón
                  </span>
                </div>
                <p className={`text-[0.65rem] font-medium ${isActive ? 'text-foreground' : 'text-gray-600'}`}>
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
                    ? 'border-foreground bg-primary/30'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Mini shadow preview */}
                <div className="mb-2 flex justify-center">
                  <div className={`w-10 h-7 rounded bg-white border border-gray-100 ${opt.preview}`} />
                </div>
                <p className={`text-[0.65rem] font-medium ${isActive ? 'text-foreground' : 'text-gray-600'}`}>
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
                    ? 'border-foreground bg-primary/30'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <p className={`text-[0.65rem] font-medium ${isActive ? 'text-foreground' : 'text-gray-600'}`}>
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
