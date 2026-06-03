// ─── Types ───────────────────────────────────────────────────

export interface SectionContent {
  title?: string;
  subtitle?: string;
  content?: string;
  cta_text?: string;
  cta_link?: string;
  highlights?: string[];
  items?: Record<string, unknown>[];
  phone?: string;
  email?: string;
  address?: string;
  whatsapp?: string;
  hours?: string;
  [key: string]: unknown;
}

export interface ChatMsg {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  section_id?: string;
  created_at?: string;
}

export interface ThemeData {
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

export type ActiveTab = 'design' | 'content' | 'settings';

// ─── Constants ────────────────────────────────────────────────

export const DEFAULT_THEME: ThemeData = {
  primary_color: '#3b82f6',
  secondary_color: '#10b981',
  font_heading: 'Poppins',
  font_body: 'Inter',
  style: 'modern',
  spacing: 'normal',
  button_style: 'rounded',
  animation: 'fade',
  shadow: 'subtle',
  color_mode: 'light',
  bg_color: '#FFFFFF',
};

export const TOP_BAR_HEIGHT = 48;
