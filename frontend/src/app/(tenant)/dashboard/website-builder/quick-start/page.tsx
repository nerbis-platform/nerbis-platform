'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import {
  Check,
  AlertCircle,
  ArrowRight,
  Send,
  FileText,
  Layout,
  MessageSquare,
  Search,
  Sparkles,
  LogOut,
  UserCircle,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import {
  quickStartGenerate,
  QuickStartResponse,
  getPlatformModules,
  getOnboardingQuestions,
  getOnboardingPages,
  getGenerationStatus,
  GenerationStatusResponse,
} from '@/lib/api/websites';
import { configureModules, ModuleSelection, getCurrentUser } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';
import { Tenant, PlatformModule, OnboardingQuestion, WebsitePage } from '@/types';

// ─── Brand constants ──────────────────────────────────────
const NAVY = '#1C3B57';
const TEAL = '#0D9488';
const WARM_GRAY_50 = '#FAFAF8';
const WARM_GRAY_100 = '#F5F5F0';
const WARM_GRAY_200 = '#E8E6E1';
const WARM_GRAY_400 = '#A8A29E';
const WARM_GRAY_500 = '#78716C';
const WARM_GRAY_600 = '#57534E';
const WARM_GRAY_800 = '#292524';

// ─── Conversational steps ─────────────────────────────────
interface ConversationStep {
  id: string;
  message: string;
  type: 'textarea' | 'input' | 'action' | 'multiselect' | 'modules' | 'pages';
  placeholder?: string;
  hint?: string;
  inputType?: string;
  minLength?: number;
  rows?: number;
}

// ─── Agent identity ───────────────────────────────────────
const AGENT_NAME = 'Pipe';

// ─── Lucide icon resolver ─────────────────────────────────
function getLucideIcon(name: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  // Convert kebab-case to PascalCase: "shopping-cart" → "ShoppingCart"
  const pascalName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[pascalName] || LucideIcons.Circle;
}

// ─── Fallback data (used while API loads) ─────────────────
const FALLBACK_MODULES: PlatformModule[] = [
  { key: 'has_website', label: 'Sitio Web', description: 'Tu presencia online', icon: 'Globe', accent_color: '#1C3B57', sort_order: 0, dependencies: [] },
  { key: 'has_shop', label: 'Tienda Online', description: 'Vende productos 24/7', icon: 'ShoppingCart', accent_color: '#0D9488', sort_order: 1, dependencies: [] },
  { key: 'has_services', label: 'Servicios', description: 'Muestra y vende tus servicios', icon: 'Briefcase', accent_color: '#6366F1', sort_order: 2, dependencies: [] },
  { key: 'has_bookings', label: 'Reservas', description: 'Agenda de citas online', icon: 'Calendar', accent_color: '#F59E0B', sort_order: 3, dependencies: ['has_services'] },
];

const FALLBACK_PAGES: WebsitePage[] = [
  { key: 'home', label: 'Inicio', description: 'Página principal', icon: 'home', is_mandatory: true, is_default: true, sort_order: 0, auto_include_modules: [] },
  { key: 'contact', label: 'Contacto', description: 'Formulario de contacto', icon: 'mail', is_mandatory: true, is_default: true, sort_order: 1, auto_include_modules: [] },
  { key: 'about', label: 'Sobre nosotros', description: 'Tu historia', icon: 'users', is_mandatory: false, is_default: true, sort_order: 2, auto_include_modules: [] },
  { key: 'blog', label: 'Blog', description: 'Artículos y noticias', icon: 'file-text', is_mandatory: false, is_default: false, sort_order: 6, auto_include_modules: [] },
];

// ─── Pipe Keyframes ──────────────────────────────────────
const PIPE_KEYFRAMES = `
/* Idle — lively floating with squash, like hovering */
@keyframes pipe-breathe {
  0%, 100% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
  15% { transform: translateY(-6px) scaleX(0.94) scaleY(1.08) rotate(2deg); }
  35% { transform: translateY(-8px) scaleX(0.92) scaleY(1.1) rotate(-1deg); }
  55% { transform: translateY(-4px) scaleX(1.04) scaleY(0.96) rotate(1deg); }
  75% { transform: translateY(-2px) scaleX(1.02) scaleY(0.98) rotate(-2deg); }
}

/* Thinking — dramatic weight shifts, like pacing */
@keyframes pipe-think {
  0%, 100% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
  15% { transform: translateY(-6px) scaleX(1.06) scaleY(0.94) rotate(-5deg); }
  30% { transform: translateY(-3px) scaleX(0.94) scaleY(1.06) rotate(3deg); }
  50% { transform: translateY(-8px) scaleX(0.92) scaleY(1.1) rotate(-2deg); }
  70% { transform: translateY(-2px) scaleX(1.04) scaleY(0.96) rotate(4deg); }
  85% { transform: translateY(-5px) scaleX(0.98) scaleY(1.03) rotate(-1deg); }
}

/* Happy — exuberant multi-bounce with heavy squash & stretch */
@keyframes pipe-happy {
  0% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
  8% { transform: translateY(4px) scaleX(1.2) scaleY(0.8) rotate(0deg); }
  20% { transform: translateY(-22px) scaleX(0.8) scaleY(1.25) rotate(-5deg); }
  32% { transform: translateY(3px) scaleX(1.22) scaleY(0.78) rotate(3deg); }
  42% { transform: translateY(-12px) scaleX(0.85) scaleY(1.18) rotate(-3deg); }
  55% { transform: translateY(2px) scaleX(1.12) scaleY(0.88) rotate(2deg); }
  68% { transform: translateY(-5px) scaleX(0.93) scaleY(1.08) rotate(-1deg); }
  82% { transform: translateY(1px) scaleX(1.04) scaleY(0.96) rotate(1deg); }
  100% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
}

/* Surprised — explosive stretch up then wobbly jelly settle */
@keyframes pipe-surprised {
  0% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
  8% { transform: translateY(3px) scaleX(1.15) scaleY(0.85) rotate(0deg); }
  18% { transform: translateY(-20px) scaleX(0.75) scaleY(1.3) rotate(-3deg); }
  30% { transform: translateY(3px) scaleX(1.2) scaleY(0.82) rotate(4deg); }
  42% { transform: translateY(-8px) scaleX(0.88) scaleY(1.14) rotate(-2deg); }
  56% { transform: translateY(1px) scaleX(1.08) scaleY(0.93) rotate(2deg); }
  72% { transform: translateY(-3px) scaleX(0.96) scaleY(1.05) rotate(-1deg); }
  100% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
}

/* Listening — curious head-tilt with big movement */
@keyframes pipe-listen {
  0%, 100% { transform: translateY(0) rotate(0deg) scaleX(1) scaleY(1); }
  15% { transform: translateY(-5px) rotate(8deg) scaleX(0.95) scaleY(1.06); }
  35% { transform: translateY(-3px) rotate(-6deg) scaleX(1.04) scaleY(0.96); }
  55% { transform: translateY(-6px) rotate(5deg) scaleX(0.97) scaleY(1.04); }
  75% { transform: translateY(-2px) rotate(-3deg) scaleX(1.02) scaleY(0.98); }
}

/* Reading — focused nodding with forward lean */
@keyframes pipe-read {
  0%, 100% { transform: translateY(0) rotate(0deg) scaleX(1) scaleY(1); }
  20% { transform: translateY(5px) rotate(6deg) scaleX(1.05) scaleY(0.95); }
  45% { transform: translateY(2px) rotate(2deg) scaleX(1.02) scaleY(0.98); }
  65% { transform: translateY(6px) rotate(5deg) scaleX(1.04) scaleY(0.96); }
  85% { transform: translateY(1px) rotate(1deg) scaleX(1.01) scaleY(0.99); }
}

/* Nudge — energetic wiggle demanding attention */
@keyframes pipe-nudge {
  0% { transform: rotate(0deg) scaleX(1) scaleY(1) translateX(0); }
  8% { transform: rotate(12deg) scaleX(0.88) scaleY(1.12) translateX(4px); }
  20% { transform: rotate(-10deg) scaleX(1.12) scaleY(0.88) translateX(-5px); }
  32% { transform: rotate(9deg) scaleX(0.9) scaleY(1.1) translateX(4px); }
  46% { transform: rotate(-7deg) scaleX(1.08) scaleY(0.92) translateX(-3px); }
  60% { transform: rotate(5deg) scaleX(0.95) scaleY(1.05) translateX(2px); }
  74% { transform: rotate(-3deg) scaleX(1.03) scaleY(0.97) translateX(-1px); }
  88% { transform: rotate(1deg) scaleX(1) scaleY(1) translateX(0); }
  100% { transform: rotate(0deg) scaleX(1) scaleY(1) translateX(0); }
}

/* Blink — quick close and open */
@keyframes pipe-blink {
  0%, 42%, 48%, 100% { transform: scaleY(1); }
  45% { transform: scaleY(0.05); }
}

/* Pulse ring for thinking */
@keyframes pipe-pulse {
  0%, 100% { transform: scale(1); opacity: 0; }
  50% { transform: scale(1.5); opacity: 0.12; }
}

/* Shadow stretch — syncs with body movement */
@keyframes pipe-shadow-breathe {
  0%, 100% { rx: 25%; opacity: 0.08; }
  50% { rx: 27%; opacity: 0.06; }
}

@media(prefers-reduced-motion:reduce){.pipe-dot,.pipe-dot *{animation:none!important;transition:none!important}}
`;

// ─── Pipe "The Dot" — Premium AI Avatar ──────────────────
// Esfera teal minimalista. Ojos SOLO blancos (sin pupila).
// La expresión viene de: forma de ojos + deformación del cuerpo + movimiento.
// Inspiración: Pixar lamp, Apple Memoji simplificado, personajes de Journey.
type PipeMood = 'idle' | 'listening' | 'thinking' | 'happy' | 'surprised' | 'reading' | 'nudge';

// Eye config — SOLO forma blanca, sin pupila
// rxScale/ryScale controlan la forma de la elipse del ojo
// offsetY mueve los ojos verticalmente (mirar arriba/abajo)
// rotation rota los ojos para expresividad (cejas implícitas)
const MOOD_EYES: Record<PipeMood, {
  rxScale: number; ryScale: number; offsetY: number;
  rotation: number; blinks: boolean; gap: number;
}> = {
  idle:      { rxScale: 1,    ryScale: 1,    offsetY: 0,      rotation: 0,   blinks: true,  gap: 1 },
  listening: { rxScale: 1.05, ryScale: 1.1,  offsetY: -0.005, rotation: 0,   blinks: true,  gap: 1 },
  thinking:  { rxScale: 0.85, ryScale: 0.5,  offsetY: 0.008,  rotation: 0,   blinks: false, gap: 0.95 },
  happy:     { rxScale: 1.2,  ryScale: 0.45, offsetY: -0.01,  rotation: 0,   blinks: false, gap: 1.1 },
  surprised: { rxScale: 1.35, ryScale: 1.5,  offsetY: -0.015, rotation: 0,   blinks: false, gap: 1.15 },
  reading:   { rxScale: 0.9,  ryScale: 0.35, offsetY: 0.02,   rotation: 0,   blinks: false, gap: 0.95 },
  nudge:     { rxScale: 1.15, ryScale: 1.1,  offsetY: 0,      rotation: 5,   blinks: false, gap: 1.05 },
};

const MOOD_ANIM: Record<PipeMood, string> = {
  idle:      'pipe-breathe 3s cubic-bezier(0.37,0,0.63,1) infinite',
  listening: 'pipe-listen 2.5s cubic-bezier(0.37,0,0.63,1) infinite',
  thinking:  'pipe-think 2.5s cubic-bezier(0.37,0,0.63,1) infinite',
  happy:     'pipe-happy 1s cubic-bezier(0.34,1.56,0.64,1)',
  surprised: 'pipe-surprised 0.8s cubic-bezier(0.22,1,0.36,1)',
  reading:   'pipe-read 2.8s cubic-bezier(0.37,0,0.63,1) infinite',
  nudge:     'pipe-nudge 1s cubic-bezier(0.37,0,0.63,1)',
};

function PipeAvatar({
  mood = 'idle',
  size = 36,
}: {
  mood?: PipeMood;
  size?: number;
}) {
  const s = size;
  const r = s * 0.42;
  const cx = s * 0.5;
  const cy = s * 0.5;

  // Eye base dimensions
  const eyeBaseRx = s * 0.075;
  const eyeBaseRy = s * 0.085;
  const eyeY = s * 0.48;
  const baseEyeSpread = s * 0.13;

  const eyes = MOOD_EYES[mood];

  const [uid] = useState(() => `pipe-${Math.random().toString(36).slice(2, 6)}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lookOffset, setLookOffset] = useState({ x: 0, y: 0 });
  const [tapped, setTapped] = useState(false);

  const maxLook = s * 0.06;

  // Cursor tracking — moves eyes within the face subtly
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      const t = Math.min(dist / 150, 1);
      setLookOffset({
        x: (dx / dist) * maxLook * t,
        y: (dy / dist) * maxLook * t,
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [maxLook]);

  // Tapped = cute squish reaction
  const handleTap = () => {
    if (tapped) return;
    setTapped(true);
    setTimeout(() => setTapped(false), 600);
  };

  // Computed eye values — override when tapped for cute expression
  const activeEyes = tapped
    ? { rxScale: 1.3, ryScale: 0.3, offsetY: -0.01, rotation: 0, blinks: false, gap: 1.15 }
    : eyes;

  const eyeRx = eyeBaseRx * activeEyes.rxScale;
  const eyeRy = eyeBaseRy * activeEyes.ryScale;
  const eyeSpread = baseEyeSpread * activeEyes.gap;
  const eyeOffY = activeEyes.offsetY * s;
  const eyeRot = activeEyes.rotation;
  const blinkAnim = !tapped && eyes.blinks ? 'pipe-blink 4s ease-in-out infinite' : 'none';

  const eyeLeftX = cx - eyeSpread + lookOffset.x;
  const eyeRightX = cx + eyeSpread + lookOffset.x;
  const eyeFinalY = eyeY + eyeOffY + lookOffset.y;

  const renderEye = (ex: number, side: 'left' | 'right') => {
    const rot = side === 'left' ? -eyeRot : eyeRot;
    return (
      <ellipse
        cx={ex}
        cy={eyeFinalY}
        rx={eyeRx}
        ry={eyeRy}
        fill="#fff"
        style={{
          animation: blinkAnim,
          transformOrigin: `${ex}px ${eyeFinalY}px`,
          transform: rot ? `rotate(${rot}deg)` : undefined,
          transition: [
            'rx 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            'ry 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            'cx 0.15s ease-out',
            'cy 0.15s ease-out',
          ].join(', '),
        }}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className="pipe-dot relative flex-shrink-0 cursor-pointer"
      style={{ width: s, height: s }}
      onClick={handleTap}
    >
      {/* Pulse ring — thinking */}
      {mood === 'thinking' && (
        <div
          className="absolute rounded-full"
          style={{
            inset: -2,
            animation: 'pipe-pulse 2.5s ease-in-out infinite',
            backgroundColor: TEAL,
            borderRadius: '50%',
          }}
        />
      )}

      <svg
        width={s} height={s}
        viewBox={`0 0 ${s} ${s}`}
        fill="none"
        role="img"
        aria-label="Pipe"
        style={{
          animation: tapped ? 'none' : MOOD_ANIM[mood],
          transform: tapped ? 'scaleX(1.15) scaleY(0.85) translateY(2px)' : undefined,
          transition: tapped ? 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.3s ease-out',
          transformOrigin: `${cx}px ${s * 0.85}px`,
        }}
      >
        <defs>
          <radialGradient id={`${uid}-body`} cx="0.4" cy="0.35" r="0.65">
            <stop offset="0%" stopColor="#5EEAD4" />
            <stop offset="35%" stopColor="#2DD4BF" />
            <stop offset="70%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0D9488" />
          </radialGradient>
          <radialGradient id={`${uid}-depth`} cx="0.5" cy="1.0" r="0.6">
            <stop offset="0%" stopColor="#0F766E" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0F766E" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-shine`} cx="0.32" cy="0.25" r="0.35">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#fff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft shadow — stretches with body via CSS sync */}
        <ellipse
          cx={cx} cy={s * 0.9} rx={s * 0.22} ry={s * 0.05}
          fill={NAVY} opacity={0.07}
        />

        {/* Body — teal sphere */}
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-body)`} />

        {/* Bottom depth — grounding */}
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-depth)`} />

        {/* Top shine — 3D sphere feel */}
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-shine)`} />

        {/* Specular highlight — bright dot top-left */}
        <circle
          cx={s * 0.37} cy={s * 0.33}
          r={s * 0.035}
          fill="#fff" opacity={0.4}
        />

        {/* Eyes — pure white, no pupils */}
        {renderEye(eyeLeftX, 'left')}
        {renderEye(eyeRightX, 'right')}
      </svg>

      <style dangerouslySetInnerHTML={{ __html: PIPE_KEYFRAMES }} />
    </div>
  );
}

// ─── Generation progress steps ────────────────────────────
const GENERATION_STEPS = [
  { message: 'Estoy conociendo tu negocio', icon: FileText },
  { message: 'Eligiendo el diseño ideal para ti', icon: Layout },
  { message: 'Escribiendo el contenido de tu sitio', icon: MessageSquare },
  { message: 'Optimizando para que te encuentren en Google', icon: Search },
  { message: 'Últimos detalles, ya casi', icon: Sparkles },
];

const SECTION_LABELS: Record<string, string> = {
  hero: 'Inicio',
  about: 'Sobre nosotros',
  services: 'Servicios',
  products: 'Productos',
  contact: 'Contacto',
  testimonials: 'Testimonios',
  gallery: 'Galería',
  pricing: 'Precios',
  faq: 'Preguntas frecuentes',
};

type PageState = 'chat' | 'generating' | 'success' | 'error' | 'limit-reached';

export default function QuickStartPage() {
  const router = useRouter();
  const { user, tenant, logout, setTenant } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Phase guard: si ya pasó onboarding, redirigir ────────
  useEffect(() => {
    if (!tenant) return;
    if (tenant.modules_configured) {
      // Ya configuró módulos — no debería estar en Quick Start
      if (tenant.website_status === 'published') {
        router.replace('/dashboard');
      } else {
        router.replace('/dashboard/website-builder');
      }
    }
  }, [tenant, router]);

  // ─── Fetch config from API ──────────────────────────────
  const { data: apiModules } = useQuery({
    queryKey: ['platform-modules'],
    queryFn: getPlatformModules,
    staleTime: 5 * 60 * 1000,
  });
  const { data: apiQuestions } = useQuery({
    queryKey: ['onboarding-questions'],
    queryFn: getOnboardingQuestions,
    staleTime: 5 * 60 * 1000,
  });
  const { data: apiPages } = useQuery({
    queryKey: ['onboarding-pages'],
    queryFn: getOnboardingPages,
    staleTime: 5 * 60 * 1000,
  });

  const modules = apiModules ?? FALLBACK_MODULES;
  const pages = apiPages ?? FALLBACK_PAGES;

  // ─── Dependency helpers ─────────────────────────────────────
  const toggleModule = useCallback((modKey: keyof ModuleSelection) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(modKey)) {
        // Deselect: also remove modules that depend on this one
        next.delete(modKey);
        for (const m of modules) {
          if (m.dependencies.includes(modKey) && next.has(m.key as keyof ModuleSelection)) {
            next.delete(m.key as keyof ModuleSelection);
          }
        }
      } else {
        // Select: also add its dependencies
        next.add(modKey);
        const mod = modules.find((m) => m.key === modKey);
        if (mod) {
          for (const dep of mod.dependencies) {
            next.add(dep as keyof ModuleSelection);
          }
        }
      }
      return next;
    });
  }, [modules]);

  // ─── Conversation state ───────────────────────────────────
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [selectedModules, setSelectedModules] = useState<Set<keyof ModuleSelection>>(
    () => new Set()
  );
  const [selectedPages, setSelectedPages] = useState<Set<string>>(() => {
    const defaults = (apiPages ?? FALLBACK_PAGES).filter((p) => p.is_default).map((p) => p.key);
    return new Set(defaults);
  });

  // Sync selectedPages when apiPages loads
  useEffect(() => {
    if (!apiPages) return;
    const defaults = apiPages.filter((p) => p.is_default).map((p) => p.key);
    setSelectedPages((prev) => {
      const key = defaults.sort().join(',');
      const prevKey = Array.from(prev).sort().join(',');
      return key !== prevKey ? new Set(defaults) : prev;
    });
  }, [apiPages]);

  // ─── Build dynamic steps based on selected modules ──────
  const steps = useMemo<ConversationStep[]>(() => {
    // Step 1: always modules selection
    const result: ConversationStep[] = [
      { id: 'modules', message: '¿Qué necesitas?', type: 'modules', hint: 'Incluye 14 días gratis. Puedes cambiar después.' },
    ];

    // Filter questions by selected modules
    if (apiQuestions) {
      for (const q of apiQuestions) {
        if (q.input_type === 'modules') continue; // already added
        // Show question if no required_modules OR if user selected at least one
        const shouldShow = q.required_modules.length === 0 ||
          q.required_modules.some((mk) => selectedModules.has(mk as keyof ModuleSelection));
        if (shouldShow) {
          result.push({
            id: q.key,
            message: q.message,
            type: q.input_type === 'multiselect' ? 'pages' : q.input_type as ConversationStep['type'],
            placeholder: q.placeholder || undefined,
            hint: q.hint || undefined,
            minLength: q.min_length || undefined,
            rows: q.input_type === 'textarea' ? 3 : undefined,
          });
        }
      }
    } else {
      // Fallback hardcoded questions while API loads
      result.push(
        { id: 'description', message: 'Cuéntame, ¿para qué necesitas tu sitio y qué haces?', type: 'textarea', placeholder: 'Ej: Soy diseñadora gráfica freelance...', hint: 'Entre más detalles, mejor queda tu sitio.', minLength: 20, rows: 3 },
      );
      if (selectedModules.has('has_services')) {
        result.push({ id: 'services', message: '¿Qué servicios ofreces? Incluye nombre, descripción corta y precio aproximado.', type: 'textarea', placeholder: 'Ej:\nDiseño de logo — Creación de identidad visual — $500\nBranding completo — Logo + papelería + guía de marca — $1,200', hint: 'Uno por línea.', minLength: 5, rows: 4 });
      }
      if (selectedModules.has('has_shop')) {
        result.push({ id: 'products', message: '¿Qué productos vendes? Cuéntame las categorías y rango de precios.', type: 'textarea', placeholder: 'Ej:\nCamisetas estampadas — $15-25\nHoodies premium — $40-60', hint: 'Categorías y precios aproximados.', minLength: 5, rows: 4 });
      }
      if (selectedModules.has('has_bookings')) {
        result.push({ id: 'bookings', message: '¿Qué se puede reservar? Cuéntame duración, horarios y si es presencial o virtual.', type: 'textarea', placeholder: 'Ej:\nConsulta inicial — 30 min — virtual\nSesión de coaching — 1 hora — presencial', hint: 'Detalla cada tipo de cita.', minLength: 5, rows: 4 });
      }
      result.push({ id: 'pages', message: '¿Qué páginas quieres en tu sitio?', type: 'pages', hint: 'Puedes agregar más después.' });
    }
    return result;
  }, [apiQuestions, selectedModules]);

  // ─── Generation state ─────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>('chat');
  const [activeMood, setActiveMood] = useState<PipeMood>('idle');
  const [genStep, setGenStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<QuickStartResponse | null>(null);


  // ─── Simulate typing delay for each new message ──────────
  useEffect(() => {
    if (pageState !== 'chat') return;
    setIsTyping(true);
    const delay = currentStepIdx === 0 ? 800 : 500;
    const timer = setTimeout(() => {
      setIsTyping(false);
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIdx, pageState]);

  // ─── Active mood reacts to user typing ───────────────────
  useEffect(() => {
    if (pageState !== 'chat' || isTyping) return;
    const newMood = currentInput.trim().length > 0 ? 'reading' : 'listening';
    setActiveMood((prev) => prev === newMood ? prev : newMood);
  }, [currentInput, pageState, isTyping]);

  // ─── Idle nudge — Pipe calls for attention after inactivity ──
  const lastInteractionRef = useRef(0);
  // Initialize on mount
  useEffect(() => { lastInteractionRef.current = Date.now(); }, []);

  // Reset timer on any interaction
  useEffect(() => {
    lastInteractionRef.current = Date.now();
  }, [currentInput, currentStepIdx]);

  useEffect(() => {
    if (pageState !== 'chat' || isTyping) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastInteractionRef.current;
      if (elapsed >= 3000 && activeMood !== 'nudge' && activeMood !== 'reading') {
        setActiveMood('nudge');
        // Return to listening after the nudge animation
        setTimeout(() => {
          setActiveMood('listening');
          lastInteractionRef.current = Date.now(); // avoid re-nudging immediately
        }, 1200);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [pageState, isTyping, activeMood]);

  // ─── Auto-scroll to bottom ───────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentStepIdx, isTyping, pageState]);

  // ─── Polling ref para limpiar al desmontar ────────────────
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Iniciar polling del estado de generacion
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const status: GenerationStatusResponse = await getGenerationStatus();

        if (status.status === 'review') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;

          setProgress(100);
          getCurrentUser().then(() => {
            const stored = localStorage.getItem('tenant');
            if (stored) setTenant(JSON.parse(stored) as Tenant);
          }).catch(() => {});
          setTimeout(() => {
            setResult({
              content_data: status.content_data ?? {},
              seo_data: status.seo_data ?? {},
              theme_data: status.theme_data ?? {},
              status: 'review',
              template: { slug: '', name: 'Tu sitio' },
            });
            setPageState('success');
          }, 600);
        }
      } catch {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        setPageState('error');
      }
    }, 2000);
  }, [setTenant]);

  // ─── Resume on refresh: si ya hay generacion activa, retomar polling ──
  const hasResumed = useRef(false);
  useEffect(() => {
    if (hasResumed.current) return;
    hasResumed.current = true;

    getGenerationStatus()
      .then((status) => {
        if (status.status === 'generating') {
          setPageState('generating');
          startPolling();
        }
      })
      .catch(() => {});
  }, [startPolling]);

  // Disparar generacion asincrona y empezar polling
  const triggerQuickStartGeneration = useCallback(async (
    answersData: Record<string, string>,
    sections: Set<string>,
  ) => {
    try {
      await quickStartGenerate({
        business_description: answersData.description || '',
        main_services: answersData.services || '',
        website_sections: Array.from(sections),
      });
      startPolling();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        startPolling();
      } else if (error instanceof ApiError && error.status === 402) {
        setPageState('limit-reached');
      } else {
        setPageState('error');
      }
    }
  }, [startPolling]);

  // ─── Rotating generation messages ─────────────────────────
  useEffect(() => {
    if (pageState !== 'generating') return;
    const interval = setInterval(() => {
      setGenStep((prev) =>
        prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [pageState]);

  // ─── Progress bar ─────────────────────────────────────────
  useEffect(() => {
    if (pageState !== 'generating') return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) return 88;
        const increment = prev < 40 ? 3 : prev < 70 ? 1.5 : 0.5;
        return Math.min(88, prev + increment);
      });
    }, 300);
    return () => clearInterval(interval);
  }, [pageState]);

  // ─── Send answer ──────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const step = steps[currentStepIdx];
    if (!step) return;

    // Handle modules step — call configureModules API
    if (step.type === 'modules') {
      setActiveMood('surprised');
      setTimeout(() => setActiveMood('listening'), 600);

      // Save display string
      const labels = modules
        .filter((m) => selectedModules.has(m.key as keyof ModuleSelection))
        .map((m) => m.label);
      const newAnswers = { ...answers, [step.id]: labels.join(', ') };
      setAnswers(newAnswers);

      // Call configure-modules API
      try {
        const payload: ModuleSelection = {
          has_website: selectedModules.has('has_website'),
          has_shop: selectedModules.has('has_shop'),
          has_bookings: selectedModules.has('has_bookings'),
          has_services: selectedModules.has('has_services'),
          has_marketing: selectedModules.has('has_marketing'),
          has_management: selectedModules.has('has_management'),
        };
        const updatedTenant = await configureModules(payload);
        setTenant(updatedTenant);
      } catch {
        setPageState('error');
        return;
      }

      setCurrentStepIdx((prev) => prev + 1);
      return;
    }

    // Handle pages step
    if (step.type === 'pages') {
      if (selectedPages.size === 0) return;

      setActiveMood('surprised');
      setTimeout(() => setActiveMood('listening'), 600);

      const labels = pages
        .filter((p) => selectedPages.has(p.key))
        .map((p) => p.label);
      const newAnswers = { ...answers, [step.id]: labels.join(', ') };
      setAnswers(newAnswers);

      // Last step — start generating
      setPageState('generating');
      setGenStep(0);
      setProgress(0);
      setTimeout(() => triggerQuickStartGeneration(newAnswers, selectedPages), 100);
      return;
    }

    const value = currentInput.trim();
    const minLen = step.minLength || 0;

    if (value.length < minLen) return;

    // Pipe reacts — surprised briefly, then moves on
    setActiveMood('surprised');
    setTimeout(() => setActiveMood('listening'), 600);

    // Save answer
    const newAnswers = { ...answers, [step.id]: value };
    setAnswers(newAnswers);
    setCurrentInput('');

    // Next step
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      // All questions answered — start generating
      setPageState('generating');
      setGenStep(0);
      setProgress(0);
      setTimeout(() => triggerQuickStartGeneration(newAnswers, selectedPages), 100);
    }
  }, [currentStepIdx, currentInput, answers, selectedModules, selectedPages, steps, modules, pages, triggerQuickStartGeneration, setTenant]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleRetry = useCallback(() => {
    setPageState('chat');
    setCurrentStepIdx(0);
    setAnswers({});
    setCurrentInput('');
    setGenStep(0);
    setProgress(0);
    setResult(null);
  }, []);

  const firstName = user?.first_name || tenant?.name?.split(' ')[0] || '';

  // ─── HEADER (shared across all states) ────────────────────
  const header = (
    <div
      className="sticky top-0 z-10 border-b"
      style={{
        backgroundColor: '#fff',
        borderColor: WARM_GRAY_100,
      }}
    >
      <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image
            src="/Isotipo_color_NERBIS.png"
            alt="NERBIS"
            width={32}
            height={32}
            style={{ width: 32, height: 'auto' }}
          />
          <span
            className="text-[0.82rem] font-semibold tracking-wider"
            style={{ color: NAVY }}
          >
            NERBIS
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-1.5 text-[0.72rem] font-medium transition-colors"
            style={{ color: WARM_GRAY_400 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = NAVY)}
            onMouseLeave={(e) => (e.currentTarget.style.color = WARM_GRAY_400)}
          >
            <UserCircle className="w-3.5 h-3.5" />
            Mi cuenta
          </Link>
          <span style={{ color: WARM_GRAY_200 }}>|</span>
          <button
            type="button"
            onClick={() => logout('/register-business')}
            className="flex items-center gap-1.5 text-[0.72rem] font-medium transition-colors cursor-pointer"
            style={{ color: WARM_GRAY_400 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = WARM_GRAY_400)}
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      </div>
    </div>
  );

  // ─── CHAT STATE — Claude-style AI Chat ──────────────────
  if (pageState === 'chat') {
    const step = steps[currentStepIdx];
    const minLen = step?.minLength || 0;
    const canSend = step?.type === 'modules'
      ? selectedModules.size > 0
      : step?.type === 'pages'
        ? selectedPages.size > 0
        : currentInput.trim().length >= minLen;

    const hasHistory = currentStepIdx > 0;

    // Build chat history from completed steps
    const chatHistory: { role: 'pipe' | 'user'; content: string }[] = [];
    for (let i = 0; i < currentStepIdx; i++) {
      const s = steps[i];
      chatHistory.push({ role: 'pipe', content: i === 0
        ? `Hola${firstName ? ` ${firstName}` : ''}, soy ${AGENT_NAME}. ${s.message}`
        : s.message });
      if (answers[s.id]) {
        chatHistory.push({ role: 'user', content: answers[s.id] });
      }
    }

    // ── Initial state: greeting centered + input below (like Claude empty state) ──
    if (!hasHistory) {
      return (
        <div
          className="h-screen flex flex-col font-[family-name:var(--font-geist-sans)]"
          style={{ backgroundColor: '#fff' }}
        >
          {header}

          <div className="flex-1 flex flex-col items-center justify-center px-4">
            {/* Everything in one container with consistent width */}
            <div className="w-full max-w-sm flex flex-col items-center">
              {/* Avatar */}
              <div className="mb-5">
                <PipeAvatar mood={isTyping ? 'thinking' : activeMood} size={48} />
              </div>

              {/* Greeting */}
              {isTyping ? (
                <div className="flex gap-1.5 justify-center py-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        backgroundColor: WARM_GRAY_400,
                        animationDelay: `${i * 150}ms`,
                        animationDuration: '0.8s',
                      }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <h1
                    className="text-xl sm:text-2xl font-semibold text-center mb-14 animate-in fade-in duration-500"
                    style={{ color: WARM_GRAY_800, letterSpacing: '-0.02em' }}
                  >
                    Hola{firstName ? ' ' : ''}
                    {firstName && <>{firstName}</>}
                    {firstName ? ', s' : '. S'}oy{' '}
                    <span style={{ color: TEAL }}>{AGENT_NAME}</span>.{' '}
                    {step.message}
                  </h1>

                  {/* Module grid + continue — same width as title */}
                  {step.type === 'modules' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100 space-y-12">
                      <div className="grid grid-cols-3 gap-3">
                        {modules.map((mod) => {
                          const modKey = mod.key as keyof ModuleSelection;
                          const isSelected = selectedModules.has(modKey);
                          const ModIcon = getLucideIcon(mod.icon);
                          return (
                            <button
                              key={mod.key}
                              type="button"
                              onClick={() => {
                                toggleModule(modKey);
                                if (isSelected) {
                                  setActiveMood('listening');
                                } else {
                                  setActiveMood('happy');
                                  setTimeout(() => setActiveMood('listening'), 900);
                                }
                              }}
                              className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all duration-300 overflow-hidden"
                              style={{
                                backgroundColor: isSelected ? `${mod.accent_color}08` : '#fff',
                                borderColor: isSelected ? mod.accent_color : WARM_GRAY_200,
                              }}
                            >
                              <div
                                className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300"
                                style={{ backgroundColor: `${mod.accent_color}${isSelected ? '18' : '10'}` }}
                              >
                                <ModIcon className="w-[18px] h-[18px]" style={{ color: mod.accent_color }} />
                                {isSelected && (
                                  <div
                                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: mod.accent_color }}
                                  >
                                    <Check className="w-2 h-2 text-white" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <span
                                  className="text-[0.72rem] font-medium leading-tight text-center block"
                                  style={{ color: isSelected ? NAVY : WARM_GRAY_600 }}
                                >
                                  {mod.label}
                                </span>
                                <span
                                  className="text-[0.58rem] leading-snug block text-center mt-0.5"
                                  style={{ color: WARM_GRAY_400 }}
                                >
                                  {mod.description}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!canSend}
                        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[0.84rem] font-semibold transition-all duration-200 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: canSend ? TEAL : WARM_GRAY_100,
                          color: canSend ? '#fff' : WARM_GRAY_400,
                          border: canSend ? 'none' : `1px solid ${WARM_GRAY_200}`,
                        }}
                      >
                        Continuar <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <p className="text-[0.68rem] text-center -mt-6" style={{ color: WARM_GRAY_400 }}>{step.hint}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ── Conversation state: messages flow top-down, input fixed at bottom ──
    return (
      <div
        className="h-screen flex flex-col font-[family-name:var(--font-geist-sans)]"
        style={{ backgroundColor: '#fff' }}
      >
        {header}

        {/* Scrollable message area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {/* Chat history */}
            {chatHistory.map((msg, i) => (
              <div key={`msg-${i}`}>
                {msg.role === 'user' ? (
                  /* User bubble — right aligned */
                  <div className="flex justify-end">
                    <div
                      className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-[0.88rem] leading-relaxed max-w-[75%]"
                      style={{ backgroundColor: WARM_GRAY_100, color: WARM_GRAY_800 }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* Pipe text — left aligned, no bubble, with small avatar */
                  <div className="flex gap-3 items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <PipeAvatar mood="idle" size={28} />
                    </div>
                    <p
                      className="text-[0.88rem] leading-relaxed pt-0.5"
                      style={{ color: WARM_GRAY_800 }}
                    >
                      {msg.content}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Current Pipe message */}
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 mt-0.5">
                <PipeAvatar mood={isTyping ? 'thinking' : activeMood} size={28} />
              </div>
              <div className="flex-1">
                {isTyping ? (
                  <div className="flex gap-1.5 py-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{
                          backgroundColor: WARM_GRAY_400,
                          animationDelay: `${i * 150}ms`,
                          animationDuration: '0.8s',
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p
                    className="text-[0.88rem] leading-relaxed pt-0.5 animate-in fade-in duration-300"
                    style={{ color: WARM_GRAY_800 }}
                  >
                    {step.message}
                  </p>
                )}
              </div>
            </div>

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input area — fixed at bottom */}
        {!isTyping && (
          <div
            className="border-t animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ borderColor: WARM_GRAY_100 }}
          >
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
              {/* Textarea input */}
              {step.type === 'textarea' && (
                <>
                  <div
                    className="flex items-end gap-3 rounded-xl border px-4 py-3 transition-all focus-within:ring-2"
                    style={{
                      borderColor: WARM_GRAY_200,
                      backgroundColor: WARM_GRAY_50,
                      // @ts-expect-error -- CSS custom property
                      '--tw-ring-color': `${TEAL}30`,
                    }}
                  >
                    <textarea
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={step.placeholder}
                      rows={step.rows || 2}
                      autoFocus
                      className="flex-1 bg-transparent text-[0.88rem] leading-relaxed resize-none focus:outline-none"
                      style={{ color: WARM_GRAY_800 }}
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!canSend}
                      className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                      style={{ backgroundColor: canSend ? TEAL : WARM_GRAY_200, color: '#fff' }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  {step.hint && (
                    <p className="text-[0.7rem] mt-2 ml-1" style={{ color: WARM_GRAY_400 }}>{step.hint}</p>
                  )}
                </>
              )}

              {/* Pages selection */}
              {step.type === 'pages' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {pages.map((page) => {
                      const isSelected = selectedPages.has(page.key);
                      const PageIcon = getLucideIcon(page.icon);
                      return (
                        <button
                          key={page.key}
                          type="button"
                          onClick={() => {
                            if (page.is_mandatory) return;
                            const next = new Set(selectedPages);
                            if (isSelected) next.delete(page.key);
                            else next.add(page.key);
                            setSelectedPages(next);
                          }}
                          disabled={page.is_mandatory}
                          className="flex items-center gap-2 px-3.5 py-2 rounded-full text-[0.82rem] font-medium border transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-default"
                          style={{
                            backgroundColor: isSelected ? `${TEAL}0A` : '#fff',
                            borderColor: isSelected ? TEAL : WARM_GRAY_200,
                            color: isSelected ? TEAL : WARM_GRAY_600,
                          }}
                        >
                          <PageIcon className="w-3.5 h-3.5" />
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {page.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[0.72rem]" style={{ color: WARM_GRAY_400 }}>{step.hint}</p>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!canSend}
                      className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[0.82rem] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ backgroundColor: canSend ? TEAL : WARM_GRAY_200, color: '#fff' }}
                    >
                      Generar mi sitio <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Modules selection (in conversation mode) */}
              {step.type === 'modules' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2.5">
                    {modules.map((mod) => {
                      const modKey = mod.key as keyof ModuleSelection;
                      const isSelected = selectedModules.has(modKey);
                      const ModIcon = getLucideIcon(mod.icon);
                      return (
                        <button
                          key={mod.key}
                          type="button"
                          onClick={() => {
                            toggleModule(modKey);
                            if (isSelected) {
                              setActiveMood('listening');
                            } else {
                              setActiveMood('happy');
                              setTimeout(() => setActiveMood('listening'), 900);
                            }
                          }}
                          className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all duration-300"
                          style={{
                            backgroundColor: isSelected ? `${mod.accent_color}08` : '#fff',
                            borderColor: isSelected ? mod.accent_color : WARM_GRAY_200,
                          }}
                        >
                          <div
                            className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300"
                            style={{ backgroundColor: `${mod.accent_color}${isSelected ? '18' : '10'}` }}
                          >
                            <ModIcon className="w-4 h-4" style={{ color: mod.accent_color }} />
                            {isSelected && (
                              <div
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: mod.accent_color }}
                              >
                                <Check className="w-2 h-2 text-white" />
                              </div>
                            )}
                          </div>
                          <span
                            className="text-[0.7rem] font-medium leading-tight text-center"
                            style={{ color: isSelected ? NAVY : WARM_GRAY_600 }}
                          >
                            {mod.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[0.84rem] font-semibold transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ backgroundColor: canSend ? TEAL : WARM_GRAY_200, color: '#fff' }}
                  >
                    Continuar <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── GENERATING STATE ─────────────────────────────────────
  if (pageState === 'generating') {
    const StepIcon = GENERATION_STEPS[genStep].icon;

    return (
      <div
        className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]"
        style={{ background: `linear-gradient(170deg, ${TEAL}06 0%, ${WARM_GRAY_50} 35%, #fff 100%)` }}
      >
        {header}

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-md text-center">
            {/* Pipe thinking */}
            <div className="flex justify-center mb-8">
              <PipeAvatar mood="thinking" size={72} />
            </div>

            <h2
              className="text-xl font-semibold mb-2"
              style={{ color: WARM_GRAY_800, letterSpacing: '-0.02em' }}
            >
              {AGENT_NAME} está creando tu sitio
            </h2>
            <p
              className="mb-8 transition-all duration-500 text-[0.92rem]"
              style={{ color: WARM_GRAY_500 }}
            >
              {GENERATION_STEPS[genStep].message}...
            </p>

            {/* Progress bar */}
            <div
              className="w-full rounded-full h-1.5 mb-2"
              style={{ backgroundColor: WARM_GRAY_200 }}
            >
              <div
                className="h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: TEAL,
                }}
              />
            </div>
            <p
              className="text-[0.72rem] font-medium"
              style={{ color: WARM_GRAY_400 }}
            >
              {Math.round(progress)}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── SUCCESS STATE ────────────────────────────────────────
  if (pageState === 'success' && result) {
    const sections = Object.keys(result.content_data).filter(
      (k) => !k.startsWith('_') && k !== 'header' && k !== 'footer'
    );

    return (
      <div
        className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]"
        style={{ background: `linear-gradient(170deg, ${TEAL}06 0%, ${WARM_GRAY_50} 35%, #fff 100%)` }}
      >
        {header}

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-lg text-center">
            {/* Pipe happy */}
            <div className="flex justify-center mb-6 animate-in zoom-in duration-300">
              <PipeAvatar mood="happy" size={64} />
            </div>

            <h2
              className="text-2xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ color: WARM_GRAY_800, letterSpacing: '-0.03em' }}
            >
              Tu sitio web está listo
            </h2>
            <p
              className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-[0.92rem]"
              style={{ color: WARM_GRAY_500, animationDelay: '100ms' }}
            >
              {result.template.name} · {sections.length} secciones generadas
            </p>

            {/* Section cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
              {sections.map((key, i) => (
                <div
                  key={key}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[0.82rem] animate-in fade-in slide-in-from-bottom-2"
                  style={{
                    backgroundColor: '#fff',
                    borderColor: WARM_GRAY_200,
                    color: WARM_GRAY_800,
                    animationDelay: `${150 + i * 80}ms`,
                  }}
                >
                  <Check
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: '#16A34A' }}
                  />
                  <span className="truncate">
                    {SECTION_LABELS[key] || key}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => router.push('/dashboard/website-builder/editor')}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg font-medium text-[0.88rem] transition-all duration-150"
              style={{
                backgroundColor: NAVY,
                color: '#fff',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.opacity = '0.92';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.opacity = '1';
              }}
            >
              Personalizar mi sitio
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ERROR / LIMIT STATES ─────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]"
      style={{ backgroundColor: WARM_GRAY_50 }}
    >
      {header}

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
            style={{ backgroundColor: '#FEE2E2' }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: '#DC2626' }} />
          </div>

          {pageState === 'limit-reached' ? (
            <>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: WARM_GRAY_800, letterSpacing: '-0.02em' }}
              >
                Límite de generaciones alcanzado
              </h2>
              <p
                className="mb-6 text-[0.92rem]"
                style={{ color: WARM_GRAY_500 }}
              >
                Usaste todas las generaciones de este mes.
                Mejora tu plan para continuar.
              </p>
            </>
          ) : (
            <>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: WARM_GRAY_800, letterSpacing: '-0.02em' }}
              >
                No pudimos generar tu sitio
              </h2>
              <p
                className="mb-6 text-[0.92rem]"
                style={{ color: WARM_GRAY_500 }}
              >
                Hubo un problema con la generación. Puedes intentar de nuevo
                con los mismos datos.
              </p>
            </>
          )}

          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg border text-[0.85rem] font-medium transition-all duration-150"
            style={{
              borderColor: WARM_GRAY_200,
              backgroundColor: '#fff',
              color: WARM_GRAY_800,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = WARM_GRAY_100;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    </div>
  );
}
