/**
 * Derivación de paleta CSS — primitive-layer injection.
 *
 * Genera ~10 primitive-layer tokens (--primitive-brand-50..900) desde
 * un color primario. Las capas semantic y component de globals.css
 * referencian estos primitivos via var(), así que el cascadeo es
 * automático: cambiar los primitivos actualiza todo el tema.
 *
 * Para tenants con colores custom, solo se inyectan los primitivos.
 * La fuente (heading/body) se inyecta aparte si el tenant la define.
 */

// ─── Conversiones de color ──────────────────────────────────

interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export function hexToHSL(hex: string): HSL {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (v: number) => {
    const hex = Math.round((v + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Determina si un color es "claro" usando luminancia relativa.
 * Si es claro → necesita foreground oscuro; si es oscuro → foreground blanco.
 */
export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Fórmula de luminancia relativa (WCAG)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55;
}

// ─── Derivación de paleta (primitive-layer) ─────────────────

/**
 * Genera una escala de 10 tonos (50..900) desde un color base.
 * Los tonos se distribuyen en lightness de claro a oscuro,
 * manteniendo el hue y ajustando saturación para naturalidad.
 */
function generateBrandScale(baseHex: string): Record<string, string> {
  const base = hexToHSL(baseHex);

  // Lightness targets para cada stop (inspirados en Tailwind)
  const stops: [string, number, number][] = [
    ['50', 97, -40],   // muy claro, baja saturación
    ['100', 93, -30],
    ['200', 85, -15],
    ['300', 74, -5],
    ['400', 62, 0],
    ['500', 50, 5],
    ['600', 42, 0],    // ~base (el color del tenant)
    ['700', 35, -5],
    ['800', 28, -10],
    ['900', 22, -15],
  ];

  const scale: Record<string, string> = {};

  for (const [stop, lightness, satOffset] of stops) {
    const sat = Math.max(0, Math.min(100, base.s + satOffset));
    scale[`--primitive-brand-${stop}`] = hslToHex(base.h, sat, lightness);
  }

  return scale;
}

/**
 * Genera primitive-layer CSS variables desde un color primario.
 *
 * Solo inyecta --primitive-brand-50..900. Las capas semantic y
 * component de globals.css hacen var(--primitive-brand-*), así
 * que el cascadeo actualiza todo automáticamente.
 *
 * @param primaryColor — El color de marca del tenant (hex)
 * @param _secondaryColor — Mantenido por compatibilidad, ignorado.
 *   El sistema de 3 capas usa una sola escala de brand.
 */
export function deriveThemeVariables(
  primaryColor: string,
  _secondaryColor: string,
): Record<string, string> {
  return generateBrandScale(primaryColor);
}

// ─── Carga dinámica de Google Fonts ─────────────────────────

export function loadGoogleFonts(heading?: string, body?: string): void {
  if (typeof document === 'undefined') return;

  const families: string[] = [];
  if (heading) families.push(`${heading}:wght@400;600;700`);
  if (body && body !== heading) families.push(`${body}:wght@300;400;500;600`);

  if (families.length === 0) return;

  const url = `https://fonts.googleapis.com/css2?${families
    .map((f) => `family=${f.replace(/ /g, '+')}`)
    .join('&')}&display=swap`;

  // No duplicar si ya existe
  if (document.querySelector(`link[href="${url}"]`)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

// ─── Aplicar tema completo al DOM ───────────────────────────

const DJANGO_DEFAULT_PRIMARY = '#3B82F6';
const DJANGO_DEFAULT_SECONDARY = '#8B5CF6';

export interface ThemeConfig {
  primary_color: string;
  secondary_color: string;
  font_heading?: string;
  font_body?: string;
  style?: string;
}

/**
 * Aplica el tema del tenant al DOM inyectando CSS variables en :root.
 * Retorna true si se aplicó, false si se usaron los defaults.
 */
export function applyThemeToDOM(theme: ThemeConfig): boolean {
  // Si son los defaults de Django, no inyectar → mantener Rose Gold de globals.css
  if (
    theme.primary_color === DJANGO_DEFAULT_PRIMARY &&
    theme.secondary_color === DJANGO_DEFAULT_SECONDARY
  ) {
    return false;
  }

  const vars = deriveThemeVariables(theme.primary_color, theme.secondary_color);
  const root = document.documentElement;

  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }

  // Fuentes
  if (theme.font_heading) {
    root.style.setProperty('--font-heading', `'${theme.font_heading}', sans-serif`);
  }
  if (theme.font_body) {
    root.style.setProperty('--font-body', `'${theme.font_body}', sans-serif`);
    root.style.fontFamily = `'${theme.font_body}', sans-serif`;
  }

  if (theme.font_heading || theme.font_body) {
    loadGoogleFonts(theme.font_heading, theme.font_body);
  }

  return true;
}
