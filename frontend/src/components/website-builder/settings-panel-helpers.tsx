'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  Search,
  ChevronDown,
  Upload,
  Loader2,
  Link2,
  Lock,
} from 'lucide-react';
import type { SiteSettings } from './SettingsPanel';

// ─── SEO Score ──────────────────────────────────────────────

export interface SeoCheck {
  label: string;
  status: 'good' | 'warning' | 'bad' | 'locked';
  hint: string;
  points: number;
}

export function calculateSeoScore(s: SiteSettings, isPublished: boolean): { score: number; maxScore: number; checks: SeoCheck[]; noindexActive: boolean } {
  const checks: SeoCheck[] = [];

  // 1. Título SEO (20 pts) — Factor directo de ranking en Google
  const tLen = s.meta_title.length;
  checks.push({
    label: 'Título SEO',
    status: tLen >= 30 && tLen <= 60 ? 'good' : tLen > 0 ? 'warning' : 'bad',
    hint: tLen === 0 ? 'Requerido para aparecer en Google' : tLen < 30 ? `${tLen}/30 chars — muy corto` : tLen > 60 ? `${tLen}/60 chars — Google lo cortará` : `${tLen} chars — óptimo`,
    points: tLen >= 30 && tLen <= 60 ? 20 : tLen > 0 ? 10 : 0,
  });

  // 2. Meta Descripción (20 pts) — Afecta CTR en resultados de búsqueda
  const dLen = s.meta_description.length;
  checks.push({
    label: 'Meta descripción',
    status: dLen >= 120 && dLen <= 155 ? 'good' : dLen > 0 ? 'warning' : 'bad',
    hint: dLen === 0 ? 'Google mostrará texto aleatorio' : dLen < 120 ? `${dLen}/120 chars — muy corta` : dLen > 155 ? `${dLen}/155 chars — se cortará` : `${dLen} chars — óptima`,
    points: dLen >= 120 && dLen <= 155 ? 20 : dLen > 0 ? 10 : 0,
  });

  // 3. Datos Estructurados (15 pts) — Habilita rich results (estrellas, horarios)
  checks.push({
    label: 'Datos estructurados',
    status: s.schema_enabled ? 'good' : 'bad',
    hint: s.schema_enabled ? `Schema ${s.schema_business_type || 'LocalBusiness'}` : 'Actívalos en Datos Estructurados',
    points: s.schema_enabled ? 15 : 0,
  });

  // 4. Google Search Console (10 pts) — Bloqueado hasta publicar
  checks.push({
    label: 'Google Search Console',
    status: !isPublished ? 'locked' : s.google_site_verification ? 'good' : 'bad',
    hint: !isPublished ? 'Disponible al publicar tu sitio' : s.google_site_verification ? 'Verificado' : 'Sin verificar — Google no te notificará errores',
    points: !isPublished ? 0 : s.google_site_verification ? 10 : 0,
  });

  // 5. Imagen para compartir (10 pts) — Más clics desde redes sociales
  checks.push({
    label: 'Imagen para compartir',
    status: s.og_image_url ? 'good' : 'bad',
    hint: s.og_image_url ? 'Configurada' : 'Sin imagen — links sin vista previa',
    points: s.og_image_url ? 10 : 0,
  });

  // 6. Favicon (10 pts) — Google lo muestra en resultados móviles
  checks.push({
    label: 'Favicon',
    status: s.favicon_url ? 'good' : 'bad',
    hint: s.favicon_url ? 'Configurado' : 'Sin favicon — se ve genérico en Google',
    points: s.favicon_url ? 10 : 0,
  });

  // 7. Redes Sociales (10 pts) — Señal de marca legítima (E-E-A-T)
  const socialCount = Object.values(s.social_links || {}).filter(v => v?.trim()).length;
  checks.push({
    label: 'Redes sociales',
    status: socialCount >= 2 ? 'good' : socialCount > 0 ? 'warning' : 'bad',
    hint: socialCount === 0 ? 'Agrega tus redes — valida tu marca' : socialCount < 2 ? `${socialCount} red — agrega al menos 2` : `${socialCount} redes conectadas`,
    points: socialCount >= 2 ? 10 : socialCount > 0 ? 5 : 0,
  });

  // 8. Palabras Clave (5 pts) — Guía de estrategia (Google no usa meta keywords)
  const kwC = s.keywords.length;
  checks.push({
    label: 'Palabras clave',
    status: kwC >= 3 ? 'good' : kwC > 0 ? 'warning' : 'bad',
    hint: kwC === 0 ? 'Guía tu estrategia de contenido' : kwC < 3 ? `${kwC} keywords — agrega más` : `${kwC} keywords definidas`,
    points: kwC >= 3 ? 5 : kwC > 0 ? 2 : 0,
  });

  // maxScore: 90 antes de publicar (GSC bloqueado), 100 después
  const maxScore = isPublished ? 100 : 90;

  return {
    score: checks.reduce((sum, c) => sum + c.points, 0),
    maxScore,
    checks,
    noindexActive: !!s.hide_from_search,
  };
}

export function SeoScoreRing({ score, maxScore }: { score: number; maxScore: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 71 ? '#10b981' : pct >= 41 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <div className="relative w-11 h-11">
        <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={r} fill="none" stroke="#f3f4f6" strokeWidth="3" />
          <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            className="transition-all duration-500" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold" style={{ color }}>
          {pct}
        </span>
      </div>
      <span className="text-[0.55rem] text-gray-400 font-medium">{score}/{maxScore}</span>
    </div>
  );
}

export function SeoChecklist({ checks }: { checks: SeoCheck[] }) {
  return (
    <div className="space-y-1.5 mt-3">
      {checks.map((c) => (
        <div key={c.label} className={`flex items-center gap-2 ${c.status === 'locked' ? 'opacity-50' : ''}`}>
          {c.status === 'locked' ? (
            <Lock className="w-2.5 h-2.5 text-gray-400 shrink-0" />
          ) : (
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              c.status === 'good' ? 'bg-emerald-400' : c.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'
            }`} />
          )}
          <span className={`text-[0.7rem] flex-1 ${c.status === 'locked' ? 'text-gray-400' : 'text-gray-600'}`}>{c.label}</span>
          <span className={`text-[0.6rem] ${
            c.status === 'good' ? 'text-emerald-500' : c.status === 'warning' ? 'text-amber-500' : 'text-gray-400'
          }`}>{c.hint}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Image Upload Field ────────────────────────────────────

export function ImageUploadField({
  value,
  onChange,
  onUpload,
  accept,
  purpose,
  previewAspect = 'aspect-[1.91/1]',
  helpText,
}: {
  value: string;
  onChange: (url: string) => void;
  onUpload?: (file: File, purpose: 'og_image' | 'favicon' | 'general') => Promise<{ url: string }>;
  accept?: string;
  purpose: 'og_image' | 'favicon' | 'general';
  previewAspect?: string;
  helpText?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFile = async (file: File) => {
    if (!onUpload) {
      toast.error('Upload no disponible');
      return;
    }
    try {
      setUploading(true);
      const result = await onUpload(file, purpose);
      onChange(result.url);
      toast.success('Imagen subida');
    } catch {
      toast.error('Error al subir la imagen. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept || 'image/*'}
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        /* ── Con imagen ── */
        <div className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 bg-gray-50">
          <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.6rem] text-gray-500 truncate mb-1.5">{value.split('/').pop()}</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 bg-white border border-gray-200 rounded text-[0.6rem] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-2 py-1 bg-white border border-gray-200 rounded text-[0.6rem] font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                Quitar
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Sin imagen ── */
        <button
          type="button"
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          disabled={uploading}
          className={`w-full ${previewAspect} rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
            dragOver
              ? 'border-primary bg-primary/30'
              : 'border-gray-200 hover:border-primary hover:bg-gray-50/50'
          } ${uploading ? 'opacity-60 cursor-wait' : ''}`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-[0.68rem] text-gray-400">Subiendo...</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-gray-300" />
              <span className="text-[0.68rem] text-gray-500 font-medium">
                Haz click o arrastra una imagen
              </span>
              {helpText && (
                <span className="text-[0.55rem] text-gray-400">{helpText}</span>
              )}
            </>
          )}
        </button>
      )}

      {/* Link para pegar URL manualmente */}
      {!value && (
        <div className="mt-1.5">
          {showUrlInput ? (
            <div className="flex gap-1.5">
              <input
                type="url"
                placeholder="https://..."
                onChange={(e) => {
                  if (e.target.value) onChange(e.target.value);
                }}
                onBlur={(e) => {
                  if (!e.target.value) setShowUrlInput(false);
                }}
                className="flex-1 h-7 px-2 rounded border border-gray-200 text-[0.7rem] text-gray-600 placeholder:text-gray-300 focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="flex items-center gap-1 text-[0.6rem] text-gray-400 hover:text-foreground transition-colors"
            >
              <Link2 className="w-3 h-3" />
              ¿Tienes una URL? Pégala aquí
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Social Share Preview ────────────────────────────────────

export function SharePreview({ title, description, imageUrl, siteUrl }: { title: string; description: string; imageUrl: string; siteUrl: string }) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white flex">
      {imageUrl && (
        <div className="w-20 shrink-0 bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="px-2.5 py-2 bg-gray-50 flex-1 min-w-0">
        <p className="text-[0.5rem] text-gray-400 truncate">{siteUrl}</p>
        <p className="text-[0.65rem] font-semibold text-gray-900 truncate">{title || 'Título del sitio'}</p>
        <p className="text-[0.55rem] text-gray-500 line-clamp-2">{description || 'Descripción del sitio'}</p>
      </div>
    </div>
  );
}

// ─── Accordion Section ────────────────────────────────────

export function Section({
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
            isOpen ? 'bg-primary/10' : 'bg-gray-100 group-hover:bg-gray-200/60'
          }`}>
            <Icon className={`h-3.5 w-3.5 transition-colors duration-200 ${isOpen ? 'text-foreground' : 'text-gray-400'}`} />
          </div>
          <span className={`text-[0.78rem] font-semibold transition-colors duration-200 ${isOpen ? 'text-foreground' : 'text-gray-500'}`}>
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

// ─── Constants ──────────────────────────────────────────────

export const PHONE_COUNTRIES = [
  { country: 'Colombia', code: '+57', flag: '🇨🇴' },
  { country: 'México', code: '+52', flag: '🇲🇽' },
  { country: 'España', code: '+34', flag: '🇪🇸' },
  { country: 'Perú', code: '+51', flag: '🇵🇪' },
  { country: 'Chile', code: '+56', flag: '🇨🇱' },
  { country: 'Argentina', code: '+54', flag: '🇦🇷' },
  { country: 'Ecuador', code: '+593', flag: '🇪🇨' },
  { country: 'Venezuela', code: '+58', flag: '🇻🇪' },
  { country: 'Panamá', code: '+507', flag: '🇵🇦' },
  { country: 'Costa Rica', code: '+506', flag: '🇨🇷' },
  { country: 'Guatemala', code: '+502', flag: '🇬🇹' },
  { country: 'Estados Unidos', code: '+1', flag: '🇺🇸' },
  { country: 'Brasil', code: '+55', flag: '🇧🇷' },
  { country: 'Francia', code: '+33', flag: '🇫🇷' },
  { country: 'Reino Unido', code: '+44', flag: '🇬🇧' },
  { country: 'Alemania', code: '+49', flag: '🇩🇪' },
  { country: 'Italia', code: '+39', flag: '🇮🇹' },
  { country: 'Portugal', code: '+351', flag: '🇵🇹' },
];

export const ANALYTICS_PROVIDERS = [
  { key: 'google_analytics_id', label: 'Google Analytics', placeholder: 'G-XXXXXXXXXX', help: 'Analytics → Administrar → Flujos de datos', color: '#F59E0B' },
  { key: 'gtm_id', label: 'Google Tag Manager', placeholder: 'GTM-XXXXXXX', help: 'Tag Manager → Admin → Info del contenedor', color: '#4285F4' },
  { key: 'facebook_pixel_id', label: 'Facebook Pixel', placeholder: '1234567890', help: 'Meta Events Manager → Orígenes de datos', color: '#1877F2' },
  { key: 'hotjar_id', label: 'Hotjar', placeholder: '1234567', help: 'Hotjar → Ajustes del sitio → ID', color: '#FF3C00' },
] as const;

export const ACCESS_MODES = [
  { value: 'public' as const, label: 'Público', dot: 'bg-emerald-400', description: 'Visible para todos' },
  { value: 'coming_soon' as const, label: 'Próximamente', dot: 'bg-amber-400', description: 'Muestra página en construcción' },
  { value: 'password' as const, label: 'Con contraseña', dot: 'bg-red-400', description: 'Requiere contraseña para ver' },
];

export const SCHEMA_BUSINESS_TYPES = [
  { value: 'LocalBusiness', label: 'Negocio local' },
  { value: 'Restaurant', label: 'Restaurante' },
  { value: 'BeautySalon', label: 'Salón de belleza' },
  { value: 'Store', label: 'Tienda' },
  { value: 'HealthAndBeautyBusiness', label: 'Salud y belleza' },
  { value: 'FoodEstablishment', label: 'Establecimiento de comida' },
  { value: 'SportsActivityLocation', label: 'Deporte / Actividad' },
  { value: 'ProfessionalService', label: 'Servicio profesional' },
];
