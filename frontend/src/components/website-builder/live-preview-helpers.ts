// ─── Types ───────────────────────────────────────────────

export interface ThemeOverrides {
  primary_color?: string;
  secondary_color?: string;
  font_heading?: string;
  font_body?: string;
  style?: string;
  spacing?: string;
  button_style?: string;
  animation?: string;
  shadow?: string;
  color_mode?: string;
  bg_color?: string;
}

export interface LivePreviewProps {
  htmlContent: string | null;
  isLoading?: boolean;
  activeSection?: string;
  onSectionClick?: (sectionId: string) => void;
  onRefresh?: () => void;
  themeOverrides?: ThemeOverrides;
  contentOverrides?: Record<string, Record<string, unknown>>;
  siteName?: string;
  faviconUrl?: string;
  siteUrl?: string;
}

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

// ─── Constants ───────────────────────────────────────────

export const DEVICE_CONFIG: Record<DeviceMode, { width: string; label: string; scale?: boolean }> = {
  desktop: { width: '100%', label: 'Escritorio' },
  tablet: { width: '768px', label: 'Tablet', scale: true },
  mobile: { width: '375px', label: 'Móvil', scale: true },
};
