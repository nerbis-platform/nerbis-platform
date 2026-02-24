'use client';

import { useState } from 'react';
import {
  Search,
  Share2,
  Globe,
  BarChart3,
  Tag,
  X,
  Plus,
  Instagram,
  Facebook,
  ChevronDown,
  Image as ImageIcon,
  Code,
  Shield,
  AlertTriangle,
  Sparkles,
  EyeOff,
  Eye,
  Lock,
  MessageCircle,
  Braces,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────
export interface SiteSettings {
  // SEO
  meta_title: string;
  meta_description: string;
  keywords: string[];
  // Favicon
  favicon_url: string;
  // OG (Open Graph)
  og_image_url: string;
  og_title?: string;
  og_description?: string;
  og_inherit_seo?: boolean;
  // Social links
  social_links: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
    linkedin?: string;
    twitter?: string;
  };
  // Analytics
  google_analytics_id: string;
  gtm_id?: string;
  facebook_pixel_id?: string;
  hotjar_id?: string;
  // Custom code
  custom_head_code?: string;
  custom_body_code?: string;
  // Cookie banner
  cookie_banner_enabled?: boolean;
  cookie_banner_position?: 'bottom-bar' | 'bottom-left' | 'bottom-right';
  cookie_banner_text?: string;
  cookie_accept_label?: string;
  cookie_decline_label?: string;
  cookie_privacy_url?: string;
  // Noindex
  hide_from_search?: boolean;
  // Search engine verification
  google_site_verification?: string;
  bing_site_verification?: string;
  // Site access
  site_access_mode?: 'public' | 'coming_soon' | 'password';
  site_password?: string;
  coming_soon_message?: string;
  coming_soon_launch_date?: string;
  // WhatsApp floating button
  whatsapp_float_enabled?: boolean;
  whatsapp_float_number?: string;
  whatsapp_float_message?: string;
  whatsapp_float_position?: 'bottom-left' | 'bottom-right';
  // Structured data
  schema_enabled?: boolean;
  schema_business_type?: string;
}

interface SettingsPanelProps {
  settings: SiteSettings;
  siteName: string;
  siteUrl?: string;
  onChange: (settings: SiteSettings) => void;
}

// ─── SEO Score ──────────────────────────────────────────────
interface SeoCheck {
  label: string;
  status: 'good' | 'warning' | 'bad';
  hint: string;
  points: number;
}

function calculateSeoScore(s: SiteSettings): { score: number; checks: SeoCheck[] } {
  const checks: SeoCheck[] = [];
  const tLen = s.meta_title.length;
  checks.push({
    label: 'Título SEO',
    status: tLen >= 30 && tLen <= 60 ? 'good' : tLen > 0 ? 'warning' : 'bad',
    hint: tLen === 0 ? 'Agrega un título' : tLen < 30 ? 'Muy corto (mín 30)' : tLen > 60 ? 'Muy largo (máx 60)' : 'Óptimo',
    points: tLen >= 30 && tLen <= 60 ? 25 : tLen > 0 ? 12 : 0,
  });
  const dLen = s.meta_description.length;
  checks.push({
    label: 'Meta descripción',
    status: dLen >= 120 && dLen <= 155 ? 'good' : dLen > 0 ? 'warning' : 'bad',
    hint: dLen === 0 ? 'Agrega descripción' : dLen < 120 ? 'Muy corta (mín 120)' : dLen > 155 ? 'Muy larga (máx 155)' : 'Óptima',
    points: dLen >= 120 && dLen <= 155 ? 25 : dLen > 0 ? 12 : 0,
  });
  const kwC = s.keywords.length;
  checks.push({
    label: 'Palabras clave',
    status: kwC >= 5 && kwC <= 10 ? 'good' : kwC > 0 ? 'warning' : 'bad',
    hint: kwC === 0 ? 'Sin keywords' : kwC < 5 ? `${kwC}/5 mínimo` : kwC > 10 ? 'Demasiadas' : `${kwC} palabras`,
    points: kwC >= 5 && kwC <= 10 ? 20 : kwC > 0 ? 10 : 0,
  });
  checks.push({
    label: 'Imagen para compartir',
    status: s.og_image_url ? 'good' : 'bad',
    hint: s.og_image_url ? 'Configurada' : 'Sin imagen',
    points: s.og_image_url ? 15 : 0,
  });
  checks.push({
    label: 'Favicon',
    status: s.favicon_url ? 'good' : 'bad',
    hint: s.favicon_url ? 'Configurado' : 'Sin favicon',
    points: s.favicon_url ? 15 : 0,
  });
  return { score: checks.reduce((sum, c) => sum + c.points, 0), checks };
}

function SeoScoreRing({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 71 ? '#10b981' : score >= 41 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-11 h-11 shrink-0">
      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#f3f4f6" strokeWidth="3" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-500" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function SeoChecklist({ checks }: { checks: SeoCheck[] }) {
  return (
    <div className="space-y-1.5 mt-3">
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            c.status === 'good' ? 'bg-emerald-400' : c.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'
          }`} />
          <span className="text-[0.7rem] text-gray-600 flex-1">{c.label}</span>
          <span className={`text-[0.6rem] ${
            c.status === 'good' ? 'text-emerald-500' : c.status === 'warning' ? 'text-amber-500' : 'text-gray-400'
          }`}>{c.hint}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Social Preview Cards ───────────────────────────────────
interface PreviewProps { title: string; description: string; imageUrl: string; siteUrl: string; }

function FacebookPreview({ title, description, imageUrl, siteUrl }: PreviewProps) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      {imageUrl && (
        <div className="aspect-[1.91/1] bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="px-2.5 py-2 bg-[#f0f2f5]">
        <p className="text-[0.55rem] text-gray-500 uppercase tracking-wide">{siteUrl}</p>
        <p className="text-[0.7rem] font-semibold text-[#1c1e21] truncate">{title || 'Título del sitio'}</p>
        <p className="text-[0.6rem] text-gray-500 line-clamp-1">{description || 'Descripción del sitio'}</p>
      </div>
    </div>
  );
}

function TwitterPreview({ title, description, imageUrl, siteUrl }: PreviewProps) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {imageUrl && (
        <div className="aspect-[2/1] bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="px-2.5 py-2">
        <p className="text-[0.7rem] font-medium text-gray-900 truncate">{title || 'Título del sitio'}</p>
        <p className="text-[0.6rem] text-gray-500 line-clamp-2">{description || 'Descripción del sitio'}</p>
        <p className="text-[0.55rem] text-gray-400 mt-0.5">{siteUrl}</p>
      </div>
    </div>
  );
}

function WhatsAppPreview({ title, description, imageUrl }: Omit<PreviewProps, 'siteUrl'>) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white flex gap-2 p-2">
      {imageUrl && (
        <div className="w-16 h-16 rounded bg-gray-100 shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[0.7rem] font-medium text-gray-900 truncate">{title || 'Título del sitio'}</p>
        <p className="text-[0.6rem] text-gray-500 line-clamp-2">{description || 'Descripción del sitio'}</p>
      </div>
    </div>
  );
}

// ─── Accordion Section (same pattern as DesignPanel) ────────
function Section({
  icon: Icon,
  title,
  isOpen,
  onToggle,
  badge,
  children,
}: {
  icon: typeof Search;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
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
          {badge}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
      </button>
      {isOpen && <div className="px-3 pt-1 pb-3">{children}</div>}
    </div>
  );
}

// ─── Social network config ──────────────────────────────────
const SOCIAL_NETWORKS = [
  { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/tu-negocio', color: '#E4405F' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/tu-negocio', color: '#1877F2' },
  { key: 'tiktok', label: 'TikTok', icon: TikTokIcon, placeholder: 'https://tiktok.com/@tu-negocio', color: '#000000' },
  { key: 'youtube', label: 'YouTube', icon: YouTubeIcon, placeholder: 'https://youtube.com/@tu-canal', color: '#FF0000' },
  { key: 'linkedin', label: 'LinkedIn', icon: LinkedInIcon, placeholder: 'https://linkedin.com/company/tu-negocio', color: '#0A66C2' },
  { key: 'twitter', label: 'X (Twitter)', icon: XTwitterIcon, placeholder: 'https://x.com/tu-negocio', color: '#000000' },
] as const;

// ─── Analytics providers config ─────────────────────────────
const ANALYTICS_PROVIDERS = [
  { key: 'google_analytics_id', label: 'Google Analytics', placeholder: 'G-XXXXXXXXXX', help: 'Analytics → Administrar → Flujos de datos', color: '#F59E0B' },
  { key: 'gtm_id', label: 'Google Tag Manager', placeholder: 'GTM-XXXXXXX', help: 'Tag Manager → Admin → Info del contenedor', color: '#4285F4' },
  { key: 'facebook_pixel_id', label: 'Facebook Pixel', placeholder: '1234567890', help: 'Meta Events Manager → Orígenes de datos', color: '#1877F2' },
  { key: 'hotjar_id', label: 'Hotjar', placeholder: '1234567', help: 'Hotjar → Ajustes del sitio → ID', color: '#FF3C00' },
] as const;

const COOKIE_POSITIONS = [
  { value: 'bottom-bar' as const, label: 'Barra inferior' },
  { value: 'bottom-left' as const, label: 'Izq. inferior' },
  { value: 'bottom-right' as const, label: 'Der. inferior' },
];

const WHATSAPP_POSITIONS = [
  { value: 'bottom-right' as const, label: 'Der. inferior' },
  { value: 'bottom-left' as const, label: 'Izq. inferior' },
];

const ACCESS_MODES = [
  { value: 'public' as const, label: 'Público', dot: 'bg-emerald-400', description: 'Visible para todos' },
  { value: 'coming_soon' as const, label: 'Próximamente', dot: 'bg-amber-400', description: 'Muestra página en construcción' },
  { value: 'password' as const, label: 'Con contraseña', dot: 'bg-red-400', description: 'Requiere contraseña para ver' },
];

const SCHEMA_BUSINESS_TYPES = [
  { value: 'LocalBusiness', label: 'Negocio local' },
  { value: 'Restaurant', label: 'Restaurante' },
  { value: 'BeautySalon', label: 'Salón de belleza' },
  { value: 'Store', label: 'Tienda' },
  { value: 'HealthAndBeautyBusiness', label: 'Salud y belleza' },
  { value: 'FoodEstablishment', label: 'Establecimiento de comida' },
  { value: 'SportsActivityLocation', label: 'Deporte / Actividad' },
  { value: 'ProfessionalService', label: 'Servicio profesional' },
];

// ─── Component ──────────────────────────────────────────────
export default function SettingsPanel({ settings, siteName, siteUrl, onChange }: SettingsPanelProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [openSection, setOpenSection] = useState<string>('seo');
  const [showPassword, setShowPassword] = useState(false);
  const toggle = (id: string) => setOpenSection((prev) => (prev === id ? '' : id));

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const updateSocial = (network: string, value: string) => {
    onChange({ ...settings, social_links: { ...settings.social_links, [network]: value } });
  };

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !settings.keywords.includes(kw)) {
      update('keywords', [...settings.keywords, kw]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw: string) => {
    update('keywords', settings.keywords.filter((k) => k !== kw));
  };

  // SEO scoring
  const { score, checks } = calculateSeoScore(settings);
  const scoreColor = score >= 71 ? 'bg-emerald-100 text-emerald-700' : score >= 41 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

  // Social completion
  const filledSocials = SOCIAL_NETWORKS.filter(
    (n) => settings.social_links[n.key as keyof typeof settings.social_links]?.trim()
  ).length;

  // Analytics completion
  const configuredAnalytics = ANALYTICS_PROVIDERS.filter(
    (p) => (settings[p.key as keyof SiteSettings] as string | undefined)?.trim()
  ).length;

  // OG inheritance
  const ogInherit = settings.og_inherit_seo !== false; // default true
  const resolvedOgTitle = ogInherit ? settings.meta_title : (settings.og_title || settings.meta_title);
  const resolvedOgDesc = ogInherit ? settings.meta_description : (settings.og_description || settings.meta_description);
  const displayUrl = siteUrl || 'tusitio.graviti.co';

  const metaTitleLength = settings.meta_title.length;
  const metaDescLength = settings.meta_description.length;

  return (
    <div className="space-y-1.5 bg-gray-50/80 rounded-2xl p-2">

      {/* ═══ 1. SEO ═══════════════════════════════════════════ */}
      <Section
        icon={Search}
        title="SEO"
        isOpen={openSection === 'seo'}
        onToggle={() => toggle('seo')}
        badge={
          <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold ml-1 ${scoreColor}`}>
            {score}
          </span>
        }
      >
        {/* Score ring + checklist */}
        <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
          <SeoScoreRing score={score} />
          <div className="flex-1 min-w-0">
            <p className="text-[0.72rem] font-semibold text-gray-700 mb-0.5">
              Puntuación SEO
            </p>
            <p className="text-[0.6rem] text-gray-400">
              {score >= 71 ? 'Excelente — tu sitio está bien optimizado' : score >= 41 ? 'Aceptable — hay oportunidades de mejora' : 'Necesita atención — completa los campos'}
            </p>
            <SeoChecklist checks={checks} />
          </div>
        </div>

        {/* Google preview */}
        <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-white">
          <p className="text-[0.6rem] text-gray-400 uppercase tracking-wide font-medium mb-2">
            Vista previa en Google
          </p>
          <p className="text-[0.9rem] text-[#1a0dab] font-medium leading-tight">
            {(settings.meta_title || siteName || 'Título de tu sitio').slice(0, 63)}
            {(settings.meta_title || '').length > 63 && '...'}
          </p>
          <p className="text-[0.72rem] text-[#006621] mt-0.5 truncate">
            {displayUrl}
          </p>
          <p className="text-[0.72rem] text-gray-500 mt-0.5 leading-relaxed">
            {(settings.meta_description || 'Agrega una descripción para que los buscadores muestren tu sitio correctamente.').slice(0, 155)}
            {(settings.meta_description || '').length > 155 && '...'}
          </p>
        </div>

        {/* Meta title */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide">
              Título del sitio
            </label>
            <span className={`text-[0.65rem] font-medium ${
              metaTitleLength > 60 ? 'text-red-400' : metaTitleLength >= 30 ? 'text-emerald-500' : metaTitleLength > 0 ? 'text-amber-400' : 'text-gray-300'
            }`}>
              {metaTitleLength}/60
            </span>
          </div>
          <input
            type="text"
            value={settings.meta_title}
            onChange={(e) => update('meta_title', e.target.value)}
            placeholder={siteName || 'Mi Negocio - Slogan'}
            maxLength={70}
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[0.85rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors"
          />
          <p className="text-[0.6rem] text-gray-400 mt-1">
            Recomendado: 30-60 caracteres. Aparece en Google y en la pestaña del navegador.
          </p>
        </div>

        {/* Meta description */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide">
              Descripción
            </label>
            <span className={`text-[0.65rem] font-medium ${
              metaDescLength > 155 ? 'text-red-400' : metaDescLength >= 120 ? 'text-emerald-500' : metaDescLength > 0 ? 'text-amber-400' : 'text-gray-300'
            }`}>
              {metaDescLength}/155
            </span>
          </div>
          <textarea
            value={settings.meta_description}
            onChange={(e) => update('meta_description', e.target.value)}
            placeholder="Describe tu negocio en 1-2 frases para los buscadores..."
            rows={3}
            maxLength={160}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[0.85rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors resize-none"
          />
          <p className="text-[0.6rem] text-gray-400 mt-1">
            Recomendado: 120-155 caracteres.
          </p>
        </div>

        {/* AI placeholder */}
        <button type="button" disabled className="flex items-center gap-1.5 mb-4 text-[0.68rem] text-gray-300 cursor-not-allowed" title="Próximamente">
          <Sparkles className="h-3 w-3" />
          Sugerir con IA
          <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 ml-1">Próximamente</span>
        </button>

        {/* Keywords */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide">
              Palabras clave
            </label>
            <span className={`text-[0.6rem] font-medium ${
              settings.keywords.length >= 5 && settings.keywords.length <= 10 ? 'text-emerald-500' : settings.keywords.length > 0 ? 'text-amber-400' : 'text-gray-300'
            }`}>
              {settings.keywords.length}/10
            </span>
          </div>
          {settings.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {settings.keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-[#E2F3F1] text-[0.72rem] text-[#1C3B57] font-medium">
                  <Tag className="h-2.5 w-2.5" />
                  {kw}
                  <button type="button" onClick={() => removeKeyword(kw)} className="ml-0.5 text-[#1C3B57]/40 hover:text-red-400 cursor-pointer">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
              placeholder="Agregar keyword..."
              className="flex-1 h-8 px-2.5 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors"
            />
            <button
              type="button"
              onClick={addKeyword}
              disabled={!newKeyword.trim()}
              className="h-8 w-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#95D0C9] hover:text-[#1C3B57] disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[0.6rem] text-gray-400 mt-1">Recomendado: 5-10 palabras clave.</p>
        </div>

        {/* ── Verificación de buscadores ── */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide mb-3">
            Verificación de buscadores
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">
                Google Search Console
              </label>
              <input
                type="text"
                value={settings.google_site_verification || ''}
                onChange={(e) => update('google_site_verification', e.target.value)}
                placeholder="Código de verificación"
                className="w-full h-8 px-2.5 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 font-mono placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors"
              />
              <p className="text-[0.55rem] text-gray-400 mt-0.5">
                Search Console → Configuración → Verificación del dominio
              </p>
            </div>
            <div>
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">
                Bing Webmaster Tools
              </label>
              <input
                type="text"
                value={settings.bing_site_verification || ''}
                onChange={(e) => update('bing_site_verification', e.target.value)}
                placeholder="Código de verificación"
                className="w-full h-8 px-2.5 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 font-mono placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors"
              />
              <p className="text-[0.55rem] text-gray-400 mt-0.5">
                Bing Webmaster Tools → Agregar un sitio → Verificar
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ 2. Visibilidad en Buscadores ════════════════════ */}
      <Section
        icon={EyeOff}
        title="Visibilidad en Buscadores"
        isOpen={openSection === 'noindex'}
        onToggle={() => toggle('noindex')}
        badge={settings.hide_from_search ? (
          <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-medium ml-1">
            Oculto
          </span>
        ) : undefined}
      >
        <p className="text-[0.65rem] text-gray-500 leading-relaxed mb-3">
          Controla si tu sitio aparece en Google y otros buscadores. Activa esta opción si aún estás construyendo tu sitio y no quieres que aparezca en búsquedas todavía.
        </p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[0.78rem] text-gray-700 font-medium">Ocultar de buscadores</span>
          <button
            type="button"
            onClick={() => update('hide_from_search', !settings.hide_from_search)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              settings.hide_from_search ? 'bg-[#95D0C9]' : 'bg-gray-200'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              settings.hide_from_search ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        {settings.hide_from_search ? (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[0.65rem] text-red-700 leading-relaxed">
              Google y otros buscadores no indexarán este sitio. Los visitantes directos sí podrán acceder.
            </p>
          </div>
        ) : (
          <p className="text-[0.65rem] text-gray-400 leading-relaxed">
            Tu sitio aparece normalmente en los resultados de búsqueda.
          </p>
        )}
      </Section>

      {/* ═══ 3. Redes Sociales ════════════════════════════════ */}
      <Section
        icon={Share2}
        title="Redes Sociales"
        isOpen={openSection === 'social'}
        onToggle={() => toggle('social')}
        badge={filledSocials > 0 ? (
          <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-[#E2F3F1] text-[#1C3B57] font-medium ml-1">
            {filledSocials}/{SOCIAL_NETWORKS.length}
          </span>
        ) : undefined}
      >
        <p className="text-[0.68rem] text-gray-400 mb-3">
          Los links aparecerán en el footer de tu sitio
        </p>
        <div className="space-y-2.5">
          {SOCIAL_NETWORKS.map(({ key, icon: Icon, placeholder, color }) => {
            const val = settings.social_links[key as keyof typeof settings.social_links] || '';
            return (
              <div key={key} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 relative" style={{ background: `${color}12` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                  {val.trim() && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white" />
                  )}
                </div>
                <input
                  type="url"
                  value={val}
                  onChange={(e) => updateSocial(key, e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 h-8 px-2.5 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors"
                />
              </div>
            );
          })}
        </div>
      </Section>

      {/* ═══ 3. Imagen para Compartir (OG) ════════════════════ */}
      <Section
        icon={Globe}
        title="Imagen para Compartir"
        isOpen={openSection === 'og'}
        onToggle={() => toggle('og')}
        badge={settings.og_image_url ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" /> : undefined}
      >
        {/* OG Inherit checkbox */}
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={ogInherit}
            onChange={(e) => update('og_inherit_seo', e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 accent-[#95D0C9]"
          />
          <span className="text-[0.72rem] text-gray-600">Usar título y descripción SEO</span>
        </label>

        {/* Custom OG fields (only when not inheriting) */}
        {!ogInherit && (
          <div className="space-y-3 mb-3">
            <div>
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">OG Título</label>
              <input
                type="text"
                value={settings.og_title || ''}
                onChange={(e) => update('og_title', e.target.value)}
                placeholder="Título al compartir"
                className="w-full h-8 px-2.5 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors"
              />
            </div>
            <div>
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">OG Descripción</label>
              <textarea
                value={settings.og_description || ''}
                onChange={(e) => update('og_description', e.target.value)}
                placeholder="Descripción al compartir"
                rows={2}
                className="w-full px-2.5 py-2 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors resize-none"
              />
            </div>
          </div>
        )}

        {/* Image URL */}
        <div className="mb-3">
          <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">
            URL de imagen
          </label>
          <input
            type="url"
            value={settings.og_image_url}
            onChange={(e) => update('og_image_url', e.target.value)}
            placeholder="https://... imagen 1200x630px"
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[0.85rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors"
          />
        </div>

        {/* Social previews */}
        {(settings.og_image_url || resolvedOgTitle) && (
          <div className="space-y-3">
            <p className="text-[0.6rem] text-gray-400 uppercase tracking-wide font-medium">
              Vista previa al compartir
            </p>
            <div>
              <p className="text-[0.6rem] text-gray-400 mb-1 flex items-center gap-1">
                <Facebook className="h-2.5 w-2.5" /> Facebook
              </p>
              <FacebookPreview title={resolvedOgTitle} description={resolvedOgDesc} imageUrl={settings.og_image_url} siteUrl={displayUrl} />
            </div>
            <div>
              <p className="text-[0.6rem] text-gray-400 mb-1 flex items-center gap-1">
                <XTwitterIcon className="h-2.5 w-2.5" style={{ color: '#6b7280' }} /> X (Twitter)
              </p>
              <TwitterPreview title={resolvedOgTitle} description={resolvedOgDesc} imageUrl={settings.og_image_url} siteUrl={displayUrl} />
            </div>
            <div>
              <p className="text-[0.6rem] text-gray-400 mb-1">WhatsApp</p>
              <WhatsAppPreview title={resolvedOgTitle} description={resolvedOgDesc} imageUrl={settings.og_image_url} />
            </div>
          </div>
        )}
      </Section>

      {/* ═══ 4. Favicon ═══════════════════════════════════════ */}
      <Section
        icon={ImageIcon}
        title="Favicon"
        isOpen={openSection === 'favicon'}
        onToggle={() => toggle('favicon')}
        badge={settings.favicon_url ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" /> : undefined}
      >
        <div>
          <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">
            URL del Favicon
          </label>
          <input
            type="url"
            value={settings.favicon_url}
            onChange={(e) => update('favicon_url', e.target.value)}
            placeholder="https://... imagen PNG 32x32"
            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[0.85rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors"
          />
          <p className="text-[0.6rem] text-gray-400 mt-1">
            Recomendado: PNG de 32x32px. Aparece en la pestaña del navegador.
          </p>

          {settings.favicon_url && (
            <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-[0.6rem] text-gray-400 mb-2">Vista previa</p>
              <div className="flex items-center gap-3">
                {/* 16px */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-4 h-4 rounded-sm bg-white border border-gray-200 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.favicon_url} alt="" className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <span className="text-[0.5rem] text-gray-400">16px</span>
                </div>
                {/* 32px */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-sm bg-white border border-gray-200 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.favicon_url} alt="" className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <span className="text-[0.5rem] text-gray-400">32px</span>
                </div>
                {/* Browser tab mockup */}
                <div className="flex items-center gap-1.5 bg-white rounded-t-md border border-b-0 border-gray-200 px-2.5 py-1.5 ml-2">
                  <div className="w-3 h-3 rounded-sm overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.favicon_url} alt="" className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <span className="text-[0.6rem] text-gray-600 truncate max-w-[80px]">
                    {settings.meta_title || siteName || 'Mi sitio'}
                  </span>
                  <X className="h-2.5 w-2.5 text-gray-300 shrink-0" />
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ═══ 6. Botón de WhatsApp ══════════════════════════ */}
      <Section
        icon={MessageCircle}
        title="Botón de WhatsApp"
        isOpen={openSection === 'whatsapp_float'}
        onToggle={() => toggle('whatsapp_float')}
        badge={settings.whatsapp_float_enabled ? (
          <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium ml-1">Activo</span>
        ) : undefined}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[0.78rem] text-gray-700 font-medium">Botón flotante</span>
          <button
            type="button"
            onClick={() => update('whatsapp_float_enabled', !settings.whatsapp_float_enabled)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              settings.whatsapp_float_enabled ? 'bg-[#95D0C9]' : 'bg-gray-200'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              settings.whatsapp_float_enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {settings.whatsapp_float_enabled && (
          <>
            <div className="mb-3">
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">
                Número de WhatsApp
              </label>
              <input
                type="tel"
                value={settings.whatsapp_float_number || ''}
                onChange={(e) => update('whatsapp_float_number', e.target.value)}
                placeholder="+52 55 1234 5678"
                className="w-full h-8 px-2.5 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors"
              />
              <p className="text-[0.55rem] text-gray-400 mt-0.5">Con código de país. Ej: +52, +57, +34</p>
            </div>

            <div className="mb-3">
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">
                Mensaje predeterminado
              </label>
              <textarea
                value={settings.whatsapp_float_message || ''}
                onChange={(e) => update('whatsapp_float_message', e.target.value)}
                placeholder="Hola, me interesa obtener más información..."
                rows={2}
                className="w-full px-2.5 py-2 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors resize-none"
              />
            </div>

            <div className="mb-4">
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">
                Posición del botón
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {WHATSAPP_POSITIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update('whatsapp_float_position', value)}
                    className={`px-2 py-1.5 rounded-md text-[0.65rem] font-medium border-2 transition-colors cursor-pointer ${
                      (settings.whatsapp_float_position || 'bottom-right') === value
                        ? 'border-[#1C3B57] bg-[#E2F3F1]/30 text-[#1C3B57]'
                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview mockup */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-[0.6rem] text-gray-400 mb-2">Vista previa</p>
              <div className="relative h-16 rounded bg-white border border-gray-200 overflow-hidden">
                <div className={`absolute bottom-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md ${
                  (settings.whatsapp_float_position || 'bottom-right') === 'bottom-right'
                    ? 'right-2'
                    : 'left-2'
                }`} style={{ background: '#25D366' }}>
                  <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
      </Section>

      {/* ═══ 7. Analytics e Integraciones ═════════════════════ */}
      <Section
        icon={BarChart3}
        title="Analytics"
        isOpen={openSection === 'analytics'}
        onToggle={() => toggle('analytics')}
        badge={configuredAnalytics > 0 ? (
          <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-[#E2F3F1] text-[#1C3B57] font-medium ml-1">
            {configuredAnalytics}/{ANALYTICS_PROVIDERS.length}
          </span>
        ) : undefined}
      >
        <div className="space-y-3">
          {ANALYTICS_PROVIDERS.map(({ key, label, placeholder, help, color }) => {
            const val = (settings[key as keyof SiteSettings] as string | undefined) || '';
            const isConfigured = !!val.trim();
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <label className="text-[0.72rem] font-medium text-gray-600">{label}</label>
                  </div>
                  <span className={`text-[0.55rem] px-1.5 py-0.5 rounded-full font-medium ${
                    isConfigured ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'
                  }`}>
                    {isConfigured ? 'Activo' : 'No configurado'}
                  </span>
                </div>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => update(key as keyof SiteSettings, e.target.value)}
                  placeholder={placeholder}
                  className="w-full h-8 px-2.5 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 font-mono placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors"
                />
                <p className="text-[0.55rem] text-gray-400 mt-0.5">{help}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ═══ 8. Datos Estructurados ═════════════════════════ */}
      <Section
        icon={Braces}
        title="Datos Estructurados"
        isOpen={openSection === 'schema'}
        onToggle={() => toggle('schema')}
        badge={settings.schema_enabled ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" /> : undefined}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[0.78rem] text-gray-700 font-medium">Activar Schema</span>
          <button
            type="button"
            onClick={() => update('schema_enabled', !settings.schema_enabled)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              settings.schema_enabled ? 'bg-[#95D0C9]' : 'bg-gray-200'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              settings.schema_enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {settings.schema_enabled && (
          <>
            <div className="mb-3">
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">
                Tipo de negocio
              </label>
              <div className="relative">
                <select
                  value={settings.schema_business_type || 'LocalBusiness'}
                  onChange={(e) => update('schema_business_type', e.target.value)}
                  className="w-full h-8 px-2.5 pr-7 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 bg-white appearance-none focus:outline-none focus:border-[#95D0C9] transition-colors cursor-pointer"
                >
                  {SCHEMA_BUSINESS_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
              <p className="text-[0.55rem] text-gray-400 mt-0.5">
                Ayuda a Google a entender qué tipo de negocio tienes.
              </p>
            </div>

            <div>
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">
                Vista previa del Schema
              </label>
              <pre className="w-full p-2.5 rounded-md border border-gray-700/30 text-[0.65rem] text-gray-300 bg-[#1e293b] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": settings.schema_business_type || "LocalBusiness",
  "name": settings.meta_title || siteName || "Mi Negocio",
  "description": settings.meta_description || "",
  "url": siteUrl ? `https://${siteUrl}` : "",
}, null, 2)}
              </pre>
              <p className="text-[0.55rem] text-gray-400 mt-1">
                Los datos de contacto y logo se agregan automáticamente al publicar.
              </p>
            </div>
          </>
        )}
      </Section>

      {/* ═══ 9. Código Personalizado ══════════════════════════ */}
      <Section
        icon={Code}
        title="Código Personalizado"
        isOpen={openSection === 'code'}
        onToggle={() => toggle('code')}
        badge={(settings.custom_head_code || settings.custom_body_code) ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" /> : undefined}
      >
        {/* Warning */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100 mb-3">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[0.65rem] text-amber-700 leading-relaxed">
            Código incorrecto puede afectar tu sitio. Usa esta sección solo si sabes lo que haces.
          </p>
        </div>

        {/* Head code */}
        <div className="mb-4">
          <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">
            Código en &lt;head&gt;
          </label>
          <textarea
            value={settings.custom_head_code || ''}
            onChange={(e) => update('custom_head_code', e.target.value)}
            placeholder="<!-- CSS, meta tags, scripts -->"
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-700/30 text-[0.78rem] text-gray-200 bg-[#1e293b] font-mono placeholder:text-gray-500 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors resize-none"
          />
          <p className="text-[0.55rem] text-gray-400 mt-1">CSS personalizado, meta tags, scripts de seguimiento</p>
        </div>

        {/* Body code */}
        <div>
          <label className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">
            Código en &lt;body&gt;
          </label>
          <textarea
            value={settings.custom_body_code || ''}
            onChange={(e) => update('custom_body_code', e.target.value)}
            placeholder="<!-- Widgets, chatbots, embeds -->"
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-700/30 text-[0.78rem] text-gray-200 bg-[#1e293b] font-mono placeholder:text-gray-500 focus:outline-none focus:border-[#95D0C9] focus:ring-1 focus:ring-[#95D0C9]/30 transition-colors resize-none"
          />
          <p className="text-[0.55rem] text-gray-400 mt-1">Widgets de chat, chatbots, scripts antes de &lt;/body&gt;</p>
        </div>
      </Section>

      {/* ═══ 10. Acceso al Sitio ═════════════════════════════ */}
      <Section
        icon={Lock}
        title="Acceso al Sitio"
        isOpen={openSection === 'access'}
        onToggle={() => toggle('access')}
        badge={(() => {
          const mode = settings.site_access_mode || 'public';
          if (mode === 'coming_soon') return <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium ml-1">Próximamente</span>;
          if (mode === 'password') return <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-medium ml-1">Protegido</span>;
          return <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium ml-1">Público</span>;
        })()}
      >
        <p className="text-[0.68rem] text-gray-400 mb-3">
          Configura quién puede ver tu sitio cuando sea publicado.
        </p>

        <div className="space-y-1.5 mb-4">
          {ACCESS_MODES.map(({ value, label, dot, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => update('site_access_mode', value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                (settings.site_access_mode || 'public') === value
                  ? 'border-[#1C3B57] bg-[#E2F3F1]/30'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-[0.75rem] font-semibold ${(settings.site_access_mode || 'public') === value ? 'text-[#1C3B57]' : 'text-gray-600'}`}>
                  {label}
                </p>
                <p className="text-[0.6rem] text-gray-400">{description}</p>
              </div>
            </button>
          ))}
        </div>

        {settings.site_access_mode === 'coming_soon' && (
          <div className="space-y-3">
            <div>
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">
                Mensaje de la página
              </label>
              <textarea
                value={settings.coming_soon_message || ''}
                onChange={(e) => update('coming_soon_message', e.target.value)}
                placeholder="Estamos trabajando en algo increíble. ¡Vuelve pronto!"
                rows={2}
                className="w-full px-2.5 py-2 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors resize-none"
              />
            </div>
            <div>
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">
                Fecha de lanzamiento
              </label>
              <input
                type="date"
                value={settings.coming_soon_launch_date || ''}
                onChange={(e) => update('coming_soon_launch_date', e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 focus:outline-none focus:border-[#95D0C9] transition-colors"
              />
            </div>
          </div>
        )}

        {settings.site_access_mode === 'password' && (
          <div>
            <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">
              Contraseña de acceso
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={settings.site_password || ''}
                onChange={(e) => update('site_password', e.target.value)}
                placeholder="Contraseña segura"
                className="w-full h-8 px-2.5 pr-8 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ═══ 11. Privacidad y Cookies ═════════════════════════ */}
      <Section
        icon={Shield}
        title="Privacidad y Cookies"
        isOpen={openSection === 'privacy'}
        onToggle={() => toggle('privacy')}
        badge={settings.cookie_banner_enabled ? (
          <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium ml-1">Activo</span>
        ) : undefined}
      >
        {/* Toggle */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[0.78rem] text-gray-700 font-medium">Banner de cookies</span>
          <button
            type="button"
            onClick={() => update('cookie_banner_enabled', !settings.cookie_banner_enabled)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              settings.cookie_banner_enabled ? 'bg-[#95D0C9]' : 'bg-gray-200'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              settings.cookie_banner_enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {settings.cookie_banner_enabled && (
          <>
            {/* Position */}
            <div className="mb-3">
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1.5">
                Posición del banner
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {COOKIE_POSITIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update('cookie_banner_position', value)}
                    className={`px-2 py-1.5 rounded-md text-[0.65rem] font-medium border-2 transition-colors cursor-pointer ${
                      (settings.cookie_banner_position || 'bottom-bar') === value
                        ? 'border-[#1C3B57] bg-[#E2F3F1]/30 text-[#1C3B57]'
                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Banner text */}
            <div className="mb-3">
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">Texto del banner</label>
              <textarea
                value={settings.cookie_banner_text || ''}
                onChange={(e) => update('cookie_banner_text', e.target.value)}
                placeholder="Este sitio usa cookies para mejorar tu experiencia."
                rows={2}
                className="w-full px-2.5 py-2 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors resize-none"
              />
            </div>

            {/* Button labels */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">Botón aceptar</label>
                <input
                  type="text"
                  value={settings.cookie_accept_label || ''}
                  onChange={(e) => update('cookie_accept_label', e.target.value)}
                  placeholder="Aceptar"
                  className="w-full h-8 px-2.5 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors"
                />
              </div>
              <div>
                <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">Botón rechazar</label>
                <input
                  type="text"
                  value={settings.cookie_decline_label || ''}
                  onChange={(e) => update('cookie_decline_label', e.target.value)}
                  placeholder="Rechazar"
                  className="w-full h-8 px-2.5 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors"
                />
              </div>
            </div>

            {/* Privacy URL */}
            <div className="mb-3">
              <label className="text-[0.68rem] font-medium text-gray-400 uppercase tracking-wide block mb-1">URL política de privacidad</label>
              <input
                type="url"
                value={settings.cookie_privacy_url || ''}
                onChange={(e) => update('cookie_privacy_url', e.target.value)}
                placeholder="https://tusitio.com/privacidad"
                className="w-full h-8 px-2.5 rounded-md border border-gray-200 text-[0.78rem] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#95D0C9] transition-colors"
              />
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-[0.6rem] text-gray-400 mb-2">Vista previa</p>
              <div className={`p-2.5 rounded-lg bg-white shadow-sm border border-gray-200 ${
                (settings.cookie_banner_position || 'bottom-bar') === 'bottom-bar' ? 'w-full' : 'max-w-[220px]'
              }`}>
                <p className="text-[0.6rem] text-gray-600 mb-2 leading-relaxed">
                  {settings.cookie_banner_text || 'Este sitio usa cookies para mejorar tu experiencia.'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-1 rounded text-[0.55rem] font-medium text-white bg-[#1C3B57]">
                    {settings.cookie_accept_label || 'Aceptar'}
                  </span>
                  <span className="px-2 py-1 rounded text-[0.55rem] font-medium text-gray-500 border border-gray-200">
                    {settings.cookie_decline_label || 'Rechazar'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}

// ─── Custom SVG icons for social networks ───────────────────
function TikTokIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52V6.8a4.84 4.84 0 01-1-.11z" />
    </svg>
  );
}

function YouTubeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.6 31.6 0 000 12a31.6 31.6 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.6 31.6 0 0024 12a31.6 31.6 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  );
}

function LinkedInIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05a3.74 3.74 0 013.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 11-.01-4.13 2.06 2.06 0 01.01 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function XTwitterIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
