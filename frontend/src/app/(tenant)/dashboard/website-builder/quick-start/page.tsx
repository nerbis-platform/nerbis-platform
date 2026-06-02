'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { NerbisWordmark } from '@/components/marketing/nerbis-wordmark';
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
import { PipeAvatar } from '@/components/pipe-avatar';
import type { PipeMood } from '@/components/pipe-avatar';
import {
  quickStartGenerate,
  QuickStartResponse,
  getPlatformModules,
  getOnboardingQuestions,
  getGenerationStatus,
  GenerationStatusResponse,
  saveOnboardingResponses,
  getOnboardingStatus,
} from '@/lib/api/websites';
import { configureModules, ModuleSelection, getCurrentUser } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';
import { Tenant, PlatformModule } from '@/types';

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

// ─── Progress persistence helpers ─────────────────────────
// Bump this when step structure changes to invalidate stale localStorage
const QS_PROGRESS_VERSION = 2;

interface QsProgressSnapshot {
  version: number;
  currentStepIdx: number;
  answers: Record<string, string>;
  selectedPages: string[];
  selectedStyle: string;
  selectedTone: string;
  primaryColor: string;
  secondaryColor: string;
}

function saveProgress(tenantId: string, data: Omit<QsProgressSnapshot, 'version'>): void {
  try {
    localStorage.setItem(`qs_progress_${tenantId}`, JSON.stringify({ ...data, version: QS_PROGRESS_VERSION }));
  } catch { /* quota exceeded — silently ignore */ }
}

function loadProgress(tenantId: string): QsProgressSnapshot | null {
  try {
    const raw = localStorage.getItem(`qs_progress_${tenantId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Invalidate stale data from old versions
    if (parsed.version !== QS_PROGRESS_VERSION) return null;
    if (typeof parsed.currentStepIdx !== 'number' || typeof parsed.answers !== 'object') return null;
    return parsed as QsProgressSnapshot;
  } catch { return null; }
}

function clearProgress(tenantId: string): void {
  try { localStorage.removeItem(`qs_progress_${tenantId}`); } catch { /* ignore */ }
}

// ─── Conversational steps ─────────────────────────────────
interface StyleOption { key: string; label: string; description: string; icon: string; color: string }
interface PaletteOption { primary: string; secondary: string; label: string }
interface ToneOption { key: string; label: string; emoji: string }


interface ConversationStep {
  id: string;
  message: string;
  type: 'textarea' | 'input' | 'action' | 'multiselect' | 'modules' | 'pages' | 'style_select' | 'color_picker' | 'tone_select';
  placeholder?: string;
  hint?: string;
  inputType?: string;
  minLength?: number;
  rows?: number;
  options?: StyleOption[] | PaletteOption[] | ToneOption[];
}

// ─── Typewriter effect ────────────────────────────────────
interface TypewriterSegment { text: string; bold?: boolean }

function Typewriter({ text, segments, speed = 18, onDone }: { text?: string; segments?: TypewriterSegment[]; speed?: number; onDone?: () => void }) {
  const resolvedSegments = useMemo(() => segments ?? [{ text: text ?? '' }], [text, segments]);
  const fullLength = useMemo(() => resolvedSegments.reduce((sum, s) => sum + s.text.length, 0), [resolvedSegments]);
  const [charCount, setCharCount] = useState(0);
  const [done, setDone] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    setDone(false);
    setCharCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setCharCount(i);
      if (i >= fullLength) {
        clearInterval(interval);
        setDone(true);
        onDoneRef.current?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [fullLength, speed]);

  // Render segments up to charCount
  let remaining = charCount;
  const rendered = resolvedSegments.map((seg, idx) => {
    if (remaining <= 0) return null;
    const slice = seg.text.slice(0, remaining);
    remaining -= slice.length;
    return seg.bold
      ? <strong key={idx} style={{ color: NAVY }}>{slice}</strong>
      : <span key={idx}>{slice}</span>;
  });

  return <>{rendered}{!done && <span className="animate-pulse">|</span>}</>;
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

/** Recommend pages based on selected modules + business description */
function getSmartPageRecommendations(
  modules: Set<string>,
  description: string,
): { recommended: string[]; available: string[] } {
  const desc = description.toLowerCase();
  const recommended = new Set<string>(['Contacto', 'Sobre nosotros']);
  const allPages = ['Contacto', 'Sobre nosotros', 'Tienda', 'FAQ', 'Testimonios', 'Blog', 'Galería', 'Equipo', 'Precios', 'Ubicación', 'Casos de éxito'];

  // Module-based recommendations
  if (modules.has('has_website')) {
    recommended.add('FAQ');
    recommended.add('Testimonios');
  }
  if (modules.has('has_services') || modules.has('has_bookings')) {
    recommended.add('Precios');
    recommended.add('Testimonios');
    recommended.add('Equipo');
  }
  if (modules.has('has_shop')) {
    recommended.add('Tienda');
    recommended.add('FAQ');
    recommended.add('Galería');
    recommended.add('Precios');
  }
  if (modules.has('has_bookings')) {
    recommended.add('Ubicación');
  }
  if (modules.has('has_management')) {
    recommended.add('Equipo');
  }

  // Description-based hints
  if (desc.match(/belleza|spa|salon|salón|estética|estetica|peluquer|nail|uñas|masaje|wellness|maquilla/)) {
    recommended.add('Galería');
    recommended.add('Equipo');
    recommended.add('Precios');
  }
  if (desc.match(/restauran|café|cafe|comida|cocina|chef|menu|menú|gastronom|bar|pizz|sushi|panaderi|pastel/)) {
    recommended.add('Galería');
    recommended.add('Ubicación');
  }
  if (desc.match(/consult|coach|abogad|contador|asesor|freelanc|agencia|diseñ|market|publicid|creativ/)) {
    recommended.add('Casos de éxito');
    recommended.add('Testimonios');
    recommended.add('Blog');
  }
  if (desc.match(/clínica|clinica|doctor|médic|medic|salud|dental|dentist|veterinar|fisio|psicólog|psicologo|terapi|nutri/)) {
    recommended.add('Equipo');
    recommended.add('FAQ');
    recommended.add('Ubicación');
  }
  if (desc.match(/gym|fitness|entrena|deport|yoga|crossfit|pilates|boxeo/)) {
    recommended.add('Galería');
    recommended.add('Precios');
    recommended.add('Equipo');
  }
  if (desc.match(/educa|curso|academ|escuela|taller|capacitac|clase|profesor|tutor|formaci/)) {
    recommended.add('Blog');
    recommended.add('FAQ');
    recommended.add('Testimonios');
  }
  if (desc.match(/foto|fotograf|video|produc.*audiovisual|estudio.*grab/)) {
    recommended.add('Galería');
    recommended.add('Casos de éxito');
    recommended.add('Precios');
  }
  if (desc.match(/tienda|ropa|moda|zapato|accesorio|joyeri|artesani|producto/)) {
    recommended.add('Galería');
    recommended.add('FAQ');
  }
  if (desc.match(/inmobiliari|bienes.*raices|propiedade|arquitect|construccion|remodelaci/)) {
    recommended.add('Galería');
    recommended.add('Casos de éxito');
    recommended.add('Ubicación');
  }

  const recommendedArr = allPages.filter(p => recommended.has(p));
  const availableArr = allPages.filter(p => !recommended.has(p));
  return { recommended: recommendedArr, available: availableArr };
}

const FALLBACK_STYLE_OPTIONS: StyleOption[] = [
  { key: 'moderno', label: 'Moderno', description: 'Limpio y contemporáneo', icon: 'Sparkles', color: '#6366F1' },
  { key: 'clasico', label: 'Clásico', description: 'Elegante y atemporal', icon: 'Crown', color: '#D97706' },
  { key: 'minimalista', label: 'Minimalista', description: 'Menos es más', icon: 'Minus', color: '#1C3B57' },
  { key: 'vibrante', label: 'Vibrante', description: 'Colorido y energético', icon: 'Zap', color: '#EC4899' },
];

const FALLBACK_PALETTES: PaletteOption[] = [
  { primary: '#1C3B57', secondary: '#0D9488', label: 'NERBIS' },
  { primary: '#1E293B', secondary: '#3B82F6', label: 'Corporativo' },
  { primary: '#0F172A', secondary: '#10B981', label: 'Tech' },
  { primary: '#7C3AED', secondary: '#EC4899', label: 'Creativo' },
  { primary: '#DC2626', secondary: '#F59E0B', label: 'Energético' },
  { primary: '#059669', secondary: '#34D399', label: 'Natural' },
];

const FALLBACK_TONE_OPTIONS: ToneOption[] = [
  { key: 'profesional', label: 'Profesional', emoji: '💼' },
  { key: 'calido', label: 'Cálido', emoji: '🤗' },
  { key: 'moderno', label: 'Moderno', emoji: '✨' },
  { key: 'minimalista', label: 'Minimalista', emoji: '🎯' },
  { key: 'juvenil', label: 'Juvenil', emoji: '🚀' },
];

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

  // ─── Phase guard: solo redirigir si ya pasó el quick-start completo ────────
  useEffect(() => {
    if (!tenant) return;
    const phase = tenant.onboarding_phase;
    // Phases where quick-start is still valid
    if (phase === 'onboarding' || phase === 'modules_configured') return;
    // Already building or beyond — redirect out
    if (phase === 'operational' || phase === 'suspended') {
      router.replace('/dashboard');
    } else {
      router.replace('/dashboard/website-builder');
    }
  }, [tenant, router]);

  // ─── Fetch config from API ──────────────────────────────
  const { data: apiModules } = useQuery({
    queryKey: ['platform-modules'],
    queryFn: getPlatformModules,
    staleTime: 5 * 60 * 1000, // 5 min — modules don't change mid-session
  });
  const { data: apiQuestions } = useQuery({
    queryKey: ['onboarding-questions'],
    queryFn: getOnboardingQuestions,
    staleTime: 5 * 60 * 1000,
  });
  const modules = apiModules ?? FALLBACK_MODULES;

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
        // Also remove dependencies that are no longer needed by any other selected module
        const deselected = modules.find((m) => m.key === modKey);
        if (deselected) {
          for (const dep of deselected.dependencies) {
            const stillNeeded = modules.some(
              (m) => m.key !== modKey && next.has(m.key as keyof ModuleSelection) && m.dependencies.includes(dep)
            );
            if (!stillNeeded) {
              next.delete(dep as keyof ModuleSelection);
            }
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
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [selectedModules, setSelectedModules] = useState<Set<keyof ModuleSelection>>(() => {
    if (!tenant) return new Set();
    const initial = new Set<keyof ModuleSelection>();
    if (tenant.has_website) initial.add('has_website');
    if (tenant.has_shop) initial.add('has_shop');
    if (tenant.has_services) initial.add('has_services');
    if (tenant.has_bookings) initial.add('has_bookings');
    if (tenant.has_management) initial.add('has_management');
    if (tenant.has_marketing) initial.add('has_marketing');
    return initial;
  });
  const [selectedPages, setSelectedPages] = useState<Set<string>>(() => new Set());
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedTone, setSelectedTone] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');

  // ─── Detect modules included as dependencies ─────────────
  const includedAsDep = useMemo(() => {
    const deps = new Set<string>();
    for (const mod of modules) {
      if (selectedModules.has(mod.key as keyof ModuleSelection)) {
        for (const dep of mod.dependencies) {
          deps.add(dep);
        }
      }
    }
    return deps;
  }, [modules, selectedModules]);

  // ─── Build dynamic steps based on selected modules ──────
  const steps = useMemo<ConversationStep[]>(() => {
    // Step 1: modules selection (from API or fallback)
    const modulesQ = apiQuestions?.find((q) => q.input_type === 'modules');
    const result: ConversationStep[] = [
      {
        id: modulesQ?.key ?? 'modules',
        message: modulesQ?.message ?? '¿Qué necesitas?',
        type: 'modules',
        hint: modulesQ?.hint ?? 'Incluye 14 días gratis. Puedes cambiar después.',
      },
    ];

    // Filter questions by selected modules
    if (apiQuestions) {
      for (const q of apiQuestions) {
        if (q.input_type === 'modules') continue; // already added above
        // Show question if no required_modules OR if user selected at least one
        const shouldShow = q.required_modules.length === 0 ||
          q.required_modules.some((mk) => selectedModules.has(mk as keyof ModuleSelection));
        if (shouldShow) {
          const stepType: ConversationStep['type'] = q.input_type === 'multiselect' ? 'pages' : q.input_type as ConversationStep['type'];
          const step: ConversationStep = {
            id: q.key,
            message: q.message,
            type: stepType,
            placeholder: q.placeholder || undefined,
            hint: q.hint || undefined,
            minLength: q.min_length || undefined,
            rows: q.input_type === 'textarea' ? 3 : undefined,
          };
          // Pass options for special types
          if (q.input_type === 'multiselect') {
            // Message is generated dynamically in render based on smartPages
            step.message = '';
          } else if (q.input_type === 'style_select' && q.options?.length) {
            step.options = q.options as unknown as StyleOption[];
          } else if (q.input_type === 'color_picker' && q.options?.length) {
            step.options = q.options as unknown as PaletteOption[];
          } else if (q.input_type === 'tone_select' && q.options?.length) {
            step.options = q.options as unknown as ToneOption[];
          }
          result.push(step);
        }
      }
    } else {
      // Fallback hardcoded questions while API loads (mirrors DB sort_order)
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
      // Branding & contact (sort 40-70)
      result.push({ id: 'style', message: '¿Qué estilo visual te representa mejor?', type: 'style_select' as ConversationStep['type'] });
      result.push({ id: 'colors', message: '¿Tienes colores de marca?', type: 'color_picker' as ConversationStep['type'] });
      result.push({ id: 'tone', message: '¿Cómo le hablas a tus clientes?', type: 'tone_select' as ConversationStep['type'] });
      result.push({ id: 'whatsapp', message: '¿Cuál es tu WhatsApp de contacto?', type: 'input', placeholder: 'Ej: +57 300 123 4567' });
      // Pages always last (sort 80)
      result.push({ id: 'pages', message: '', type: 'pages' });
    }
    return result;
  }, [apiQuestions, selectedModules]);

  // Sync selectedPages with smart recommendations when reaching pages step
  const smartPages = useMemo(() => {
    const desc = answers['description'] || answers['business_description'] || '';
    return getSmartPageRecommendations(selectedModules, desc);
  }, [selectedModules, answers]);

  useEffect(() => {
    const pagesStep = steps.find((s) => s.type === 'pages');
    if (!pagesStep) return;
    // Pipe decides: Inicio + smart recommendations
    const defaults = ['Inicio', ...smartPages.recommended];
    setSelectedPages((prev) => {
      if (prev.size > 0) return prev;
      return new Set(defaults);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length, smartPages.recommended.length]);

  // ─── Generation state ─────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>('chat');
  const [activeMood, setActiveMood] = useState<PipeMood>('idle');
  const [genStep, setGenStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<QuickStartResponse | null>(null);

  // ─── Simulate typing delay for each new message (skip first step) ──
  useEffect(() => {
    if (pageState !== 'chat') return;
    // First step shows immediately — no typing indicator on page load
    if (currentStepIdx === 0) {
      setIsTyping(false);
      setTypewriterDone(true);
      return;
    }
    setIsTyping(true);
    setTypewriterDone(false);
    const timer = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIdx, pageState]);

  // ─── Rehydrate progress on mount ──────────────────────────
  const rehydratedRef = useRef(false);
  useEffect(() => {
    if (!tenant?.id || rehydratedRef.current) return;
    rehydratedRef.current = true;

    const saved = loadProgress(tenant.id);

    // Restore UI state from localStorage
    if (saved) {
      if (saved.answers && Object.keys(saved.answers).length > 0) {
        setAnswers(saved.answers);
      }
      if (saved.selectedPages?.length > 0) {
        setSelectedPages(new Set(saved.selectedPages));
      }
      if (saved.selectedStyle) setSelectedStyle(saved.selectedStyle);
      if (saved.selectedTone) setSelectedTone(saved.selectedTone);
      if (saved.primaryColor) setPrimaryColor(saved.primaryColor);
      if (saved.secondaryColor) setSecondaryColor(saved.secondaryColor);
    }

    // Restore text answers from backend (fire-and-forget)
    getOnboardingStatus().then((status) => {
      if (status.status === 'generating') return; // polling-resume handles this
      if (status.responses && Object.keys(status.responses).length > 0) {
        // Convert array values to strings
        const restoredAnswers: Record<string, string> = {};
        for (const [key, val] of Object.entries(status.responses)) {
          restoredAnswers[key] = Array.isArray(val) ? val.join(', ') : String(val);
        }
        setAnswers(prev => ({ ...restoredAnswers, ...prev }));
      }
    }).catch(() => { /* API unavailable — use localStorage only */ });

    // Restore step index AFTER answers are set
    if (saved?.currentStepIdx && saved.currentStepIdx > 0) {
      setTimeout(() => {
        setCurrentStepIdx(saved.currentStepIdx);
      }, 50);
    }
  }, [tenant?.id]);

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
  const startPollingRef = useRef(startPolling);
  startPollingRef.current = startPolling;

  useEffect(() => {
    let cancelled = false;
    getGenerationStatus()
      .then((status) => {
        if (!cancelled && status.status === 'generating') {
          setPageState('generating');
          startPollingRef.current();
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Disparar generacion asincrona y empezar polling
  const triggerQuickStartGeneration = useCallback(async (
    answersData: Record<string, string>,
    sections: Set<string>,
  ) => {
    try {
      await quickStartGenerate({
        business_description: answersData.description || answersData.pipe_description || '',
        main_services: answersData.services || answersData.pipe_services || '',
        website_sections: Array.from(sections),
        brand_tone: selectedTone || undefined,
        primary_color: primaryColor || undefined,
        secondary_color: secondaryColor || undefined,
        business_whatsapp: answersData.pipe_whatsapp || undefined,
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
  }, [startPolling, selectedTone, primaryColor, secondaryColor]);

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

  // ─── Auto-save progress to localStorage ──────────────────
  useEffect(() => {
    if (!tenant?.id || currentStepIdx === 0) return;
    saveProgress(tenant.id, {
      currentStepIdx,
      answers,
      selectedPages: Array.from(selectedPages),
      selectedStyle,
      selectedTone,
      primaryColor,
      secondaryColor,
    });
  }, [tenant?.id, currentStepIdx, answers, selectedStyle, selectedTone, primaryColor, secondaryColor, selectedPages]);

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

  // ─── Clear persisted progress on successful generation ───
  useEffect(() => {
    if (pageState === 'success' && tenant?.id) {
      clearProgress(tenant.id);
    }
  }, [pageState, tenant?.id]);

  // ─── Auto-advance pages step (Pipe decides, no user click needed) ──
  const pagesAutoAdvancedRef = useRef(false);
  const autoAdvancePagesRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      const newAnswers = { ...answers, [step.id]: Array.from(selectedPages).join(', ') };
      setAnswers(newAnswers);

      // Last step — start generating
      setPageState('generating');
      setGenStep(0);
      setProgress(0);
      setTimeout(() => triggerQuickStartGeneration(newAnswers, selectedPages), 100);
      return;
    }

    // Handle style_select step
    if (step.type === 'style_select') {
      if (!selectedStyle) return;
      setActiveMood('happy');
      setTimeout(() => setActiveMood('listening'), 900);
      const styleOpts = (step.options || FALLBACK_STYLE_OPTIONS) as StyleOption[];
      const label = styleOpts.find((s) => s.key === selectedStyle)?.label || selectedStyle;
      const newAnswers = { ...answers, [step.id]: label };
      setAnswers(newAnswers);
      setCurrentStepIdx((prev) => prev + 1);
      return;
    }

    // Handle color_picker step
    if (step.type === 'color_picker') {
      setActiveMood('happy');
      setTimeout(() => setActiveMood('listening'), 900);
      const label = primaryColor ? `${primaryColor} / ${secondaryColor}` : 'Colores por defecto';
      const newAnswers = { ...answers, [step.id]: label };
      setAnswers(newAnswers);
      setCurrentStepIdx((prev) => prev + 1);
      return;
    }

    // Handle tone_select step
    if (step.type === 'tone_select') {
      if (!selectedTone) return;
      setActiveMood('happy');
      setTimeout(() => setActiveMood('listening'), 900);
      const toneOpts = (step.options || FALLBACK_TONE_OPTIONS) as ToneOption[];
      const label = toneOpts.find((t) => t.key === selectedTone)?.label || selectedTone;
      const newAnswers = { ...answers, [step.id]: label };
      setAnswers(newAnswers);
      setCurrentStepIdx((prev) => prev + 1);
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
    // Persist text answer to backend (fire-and-forget)
    saveOnboardingResponses({ [step.id]: value }).catch(() => {});
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
  }, [currentStepIdx, currentInput, answers, selectedModules, selectedPages, selectedStyle, selectedTone, primaryColor, secondaryColor, steps, modules, triggerQuickStartGeneration, setTenant]);

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
    setSelectedStyle('');
    setSelectedTone('');
    setPrimaryColor('');
    setSecondaryColor('');
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
        <NerbisWordmark variant="full" size={15} pipeSize={36} className="text-[#1C3B57]" />
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
    if (!step) return null;
    const minLen = step?.minLength || 0;
    const canSend = step?.type === 'modules'
      ? selectedModules.size > 0
      : step?.type === 'pages'
        ? true
        : step?.type === 'style_select'
          ? selectedStyle !== ''
          : step?.type === 'tone_select'
            ? selectedTone !== ''
            : step?.type === 'color_picker'
              ? true
              : currentInput.trim().length >= minLen;

    const hasHistory = currentStepIdx > 0;

    // Build chat history from completed steps
    const chatHistory: { role: 'pipe' | 'user'; content: React.ReactNode }[] = [];
    for (let i = 0; i < currentStepIdx; i++) {
      const s = steps[i];
      // Pages step: Pipe decided — show info message with bold names, skip user bubble
      if (s.type === 'pages') {
        const pageNames = answers[s.id] || 'Inicio, Contacto, Sobre nosotros';
        chatHistory.push({ role: 'pipe', content: (
          <span>
            Voy a incluir estas páginas:{' '}
            {pageNames.split(', ').map((p, pi, arr) => (
              <span key={p}><strong style={{ color: NAVY }}>{p}</strong>{pi < arr.length - 1 ? ', ' : ''}</span>
            ))}
            . Puedes cambiarlas después en el editor.
          </span>
        ) });
        continue;
      }
      chatHistory.push({ role: 'pipe', content: i === 0
        ? `Hola${firstName ? ` ${firstName}` : ''}, soy ${AGENT_NAME}, tu asistente creativo. ${s.message}`
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
                  {/* Pipe avatar */}
                  <div className="mb-6 animate-in fade-in zoom-in-95 duration-500">
                    <PipeAvatar mood={canSend ? 'happy' : 'listening'} size={120} />
                  </div>

                  <h1
                    className="text-xl sm:text-2xl font-semibold text-center mb-3 animate-in fade-in duration-500"
                    style={{ color: WARM_GRAY_800, letterSpacing: '-0.02em' }}
                  >
                    Hola{firstName ? ' ' : ''}
                    {firstName && <span style={{ color: TEAL }}>{firstName}</span>}
                    {firstName ? ', s' : 'S'}oy{' '}
                    <span style={{ color: TEAL }}>{AGENT_NAME}</span>
                  </h1>
                  <p
                    className="text-[0.92rem] text-center mb-10 animate-in fade-in duration-500 delay-100"
                    style={{ color: WARM_GRAY_500 }}
                  >
                    ¿Qué quieres crear?
                  </p>

                  {/* Module grid + continue — same width as title */}
                  {step.type === 'modules' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100 space-y-12">
                      <div className="grid grid-cols-3 gap-3">
                        {modules.map((mod) => {
                          const modKey = mod.key as keyof ModuleSelection;
                          const isSelected = selectedModules.has(modKey);
                          const isIncluded = isSelected && includedAsDep.has(mod.key);
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
                              className="relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all duration-300 overflow-hidden cursor-pointer"
                              style={{
                                backgroundColor: isSelected ? `${mod.accent_color}08` : '#fff',
                                borderColor: isSelected ? mod.accent_color : WARM_GRAY_200,
                              }}
                            >
                              {isIncluded && (
                                <span
                                  className="absolute top-0 right-0 flex items-center gap-0.5 text-[0.5rem] font-semibold text-white px-1.5 py-0.5 rounded-bl-lg rounded-tr-[11px]"
                                  style={{ backgroundColor: mod.accent_color }}
                                >
                                  <Check className="w-2.5 h-2.5" />
                                  Incluido
                                </span>
                              )}
                              <div
                                className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300"
                                style={{ backgroundColor: `${mod.accent_color}${isSelected ? '18' : '10'}` }}
                              >
                                <ModIcon className="w-[18px] h-[18px]" style={{ color: mod.accent_color }} />
                                {isSelected && !isIncluded && (
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
                        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-[0.84rem] font-semibold transition-all duration-300 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: canSend ? TEAL : WARM_GRAY_100,
                          color: canSend ? '#fff' : WARM_GRAY_400,
                          border: canSend ? 'none' : `1px solid ${WARM_GRAY_200}`,
                          transform: canSend ? 'scale(1)' : 'scale(0.98)',
                          boxShadow: canSend ? `0 2px 8px ${TEAL}30` : 'none',
                        }}
                      >
                        Continuar <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <p className="text-[0.68rem] text-center -mt-6" style={{ color: WARM_GRAY_400 }}>
                        {canSend ? step.hint : 'Selecciona al menos uno para continuar'}
                      </p>
                    </div>
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
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Spacer — pushes messages to bottom when few, collapses when many */}
          <div className="flex-1 min-h-6" />
          <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-8 pt-4 space-y-8 w-full">
            {/* Chat history */}
            {chatHistory.map((msg, i) => (
              <div key={`msg-${i}`} className={`animate-in fade-in duration-300 ${
                msg.role === 'user' ? 'slide-in-from-right-3' : 'slide-in-from-left-3'
              }`}>
                {msg.role === 'user' ? (
                  /* User bubble — right aligned, dark */
                  <div className="flex justify-end">
                    <div
                      className="px-4 py-3 rounded-2xl rounded-tr-sm text-[0.88rem] leading-relaxed max-w-[80%]"
                      style={{ backgroundColor: WARM_GRAY_800, color: '#fff' }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* Pipe bubble — left aligned, bordered */
                  <div
                    className="px-4 py-3 rounded-2xl rounded-tl-sm text-[0.88rem] leading-relaxed max-w-[80%] border"
                    style={{ backgroundColor: '#fff', color: WARM_GRAY_800, borderColor: WARM_GRAY_200 }}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            ))}


            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Pipe message + input area — always visible at bottom */}
        <div>
            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-12">
              {/* Pipe message above input */}
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex-shrink-0">
                  <PipeAvatar mood={activeMood} size={28} lookTarget="right" />
                </div>
                {isTyping ? (
                  <span className="inline-flex items-center gap-1.5 text-[0.82rem]" style={{ color: WARM_GRAY_400 }}>
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: WARM_GRAY_400, animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }} />
                      ))}
                    </span>
                  </span>
                ) : (
                  <div
                    className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-[0.88rem] leading-relaxed border animate-in fade-in duration-300"
                    style={{ backgroundColor: '#fff', color: WARM_GRAY_800, borderColor: WARM_GRAY_200 }}
                  >
                    {step.type === 'pages' ? (
                      <Typewriter
                        segments={[
                          { text: 'Basándome en tu negocio, voy a incluir estas páginas: ' },
                          { text: ['Inicio', ...smartPages.recommended].join(', '), bold: true },
                          { text: '. Si después quieres agregar o quitar alguna, puedes hacerlo en el editor.' },
                        ]}
                        speed={18}
                        onDone={() => {
                          setTypewriterDone(true);
                          if (pagesAutoAdvancedRef.current) return;
                          pagesAutoAdvancedRef.current = true;
                          const isLastStep = currentStepIdx === steps.length - 1;
                          autoAdvancePagesRef.current = setTimeout(() => {
                            const newAnswers = { ...answers, [step.id]: Array.from(selectedPages).join(', ') };
                            setAnswers(newAnswers);
                            setActiveMood('surprised');
                            setTimeout(() => setActiveMood('listening'), 600);
                            if (isLastStep) {
                              setPageState('generating');
                              setGenStep(0);
                              setProgress(0);
                              triggerQuickStartGeneration(newAnswers, selectedPages);
                            } else {
                              setCurrentStepIdx((prev) => prev + 1);
                            }
                          }, 500);
                        }}
                      />
                    ) : (
                      <Typewriter text={step.message} speed={20} onDone={() => setTypewriterDone(true)} />
                    )}
                  </div>
                )}
              </div>
              {/* Options — only show after Pipe finishes typing */}
              {!isTyping && typewriterDone && (<>
              {step.type === 'style_select' && (() => {
                const styleOpts = (step.options || FALLBACK_STYLE_OPTIONS) as StyleOption[];
                return (
                  <div className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-2 gap-2.5">
                      {styleOpts.map((opt) => {
                        const isActive = selectedStyle === opt.key;
                        const OptIcon = getLucideIcon(opt.icon);
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setSelectedStyle(opt.key)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer"
                            style={{
                              backgroundColor: isActive ? `${opt.color}0A` : '#fff',
                              borderColor: isActive ? opt.color : WARM_GRAY_200,
                            }}
                          >
                            <div
                              className="flex items-center justify-center w-9 h-9 rounded-lg"
                              style={{ backgroundColor: `${opt.color}12` }}
                            >
                              <OptIcon className="w-4 h-4" style={{ color: opt.color }} />
                            </div>
                            <div className="text-left">
                              <span className="text-[0.82rem] font-medium block" style={{ color: isActive ? opt.color : WARM_GRAY_800 }}>{opt.label}</span>
                              <span className="text-[0.68rem] block" style={{ color: WARM_GRAY_400 }}>{opt.description}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {step.type === 'color_picker' && (() => {
                const palettes = (step.options || FALLBACK_PALETTES) as PaletteOption[];
                return (
                  <div className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-3 gap-2.5">
                      {palettes.map((pal) => {
                        const isActive = primaryColor === pal.primary && secondaryColor === pal.secondary;
                        return (
                          <button
                            key={pal.label}
                            type="button"
                            onClick={() => { setPrimaryColor(pal.primary); setSecondaryColor(pal.secondary); }}
                            className="flex flex-col items-center gap-2 px-3 py-3 rounded-xl border transition-all duration-200 cursor-pointer"
                            style={{
                              borderColor: isActive ? TEAL : WARM_GRAY_200,
                              backgroundColor: isActive ? `${TEAL}08` : '#fff',
                            }}
                          >
                            <div className="flex gap-1">
                              <div className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: pal.primary }} />
                              <div className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: pal.secondary }} />
                            </div>
                            <span className="text-[0.72rem] font-medium" style={{ color: isActive ? TEAL : WARM_GRAY_600 }}>{pal.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {step.hint && (
                      <p className="text-[0.7rem] mt-2 ml-1" style={{ color: WARM_GRAY_400 }}>{step.hint}</p>
                    )}
                  </div>
                );
              })()}

              {step.type === 'tone_select' && (() => {
                const toneOpts = (step.options || FALLBACK_TONE_OPTIONS) as ToneOption[];
                return (
                  <div className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-wrap gap-2">
                      {toneOpts.map((opt) => {
                        const isActive = selectedTone === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setSelectedTone(opt.key)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-200 text-[0.82rem] font-medium cursor-pointer"
                            style={{
                              borderColor: isActive ? TEAL : WARM_GRAY_200,
                              backgroundColor: isActive ? `${TEAL}0A` : '#fff',
                              color: isActive ? TEAL : WARM_GRAY_600,
                            }}
                          >
                            <span>{opt.emoji}</span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {step.type === 'pages' && (() => {
                return (
                  <div className="mb-2" />
                );
              })()}

              </>)}

              {/* Unified input area — always visible */}
              {(() => {
                const isTextStep = step.type === 'textarea' || step.type === 'input';
                const isTextarea = step.type === 'textarea';
                const charCount = currentInput.trim().length;
                const meetsMin = charCount >= minLen;
                const showIndicator = isTextarea && minLen > 0 && currentInput.length > 0;
                return (
                  <>
                    {showIndicator && (
                      <div className="flex items-center gap-1.5 mb-2 ml-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full transition-colors"
                          style={{ backgroundColor: meetsMin ? TEAL : NAVY }}
                        />
                        <span
                          className="text-[0.7rem] font-medium transition-colors"
                          style={{ color: meetsMin ? TEAL : NAVY }}
                        >
                          {meetsMin ? 'Listo para enviar' : `Mínimo ${minLen} caracteres (${charCount}/${minLen})`}
                        </span>
                      </div>
                    )}
                    <div
                      className="flex items-end gap-3 rounded-xl border px-4 py-3 transition-all focus-within:ring-2"
                      style={{
                        borderColor: isTextStep ? WARM_GRAY_200 : WARM_GRAY_100,
                        backgroundColor: isTextStep ? WARM_GRAY_50 : `${WARM_GRAY_100}60`,
                        // @ts-expect-error -- CSS custom property
                        '--tw-ring-color': `${TEAL}30`,
                      }}
                    >
                      {isTextarea ? (
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
                      ) : step.type === 'input' ? (
                        <input
                          type={step.inputType || 'text'}
                          value={currentInput}
                          onChange={(e) => setCurrentInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={step.placeholder}
                          autoFocus
                          className="flex-1 bg-transparent text-[0.88rem] focus:outline-none"
                          style={{ color: WARM_GRAY_800 }}
                        />
                      ) : (
                        <span className="flex-1 text-[0.88rem] py-1" style={{ color: WARM_GRAY_400 }}>
                          Selecciona y confirma
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!canSend}
                        className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-all duration-200 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: canSend ? TEAL : WARM_GRAY_200,
                          color: '#fff',
                          transform: canSend ? 'scale(1)' : 'scale(0.9)',
                          opacity: canSend ? 1 : 0.4,
                        }}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    {isTextStep && step.hint && (
                      <p className="text-[0.7rem] mt-2 ml-1" style={{ color: WARM_GRAY_400 }}>{step.hint}</p>
                    )}
                  </>
                );
              })()}

              {/* Modules selection (in conversation mode) */}
              {step.type === 'modules' && (
                <div className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-3 gap-2.5">
                    {modules.map((mod) => {
                      const modKey = mod.key as keyof ModuleSelection;
                      const isSelected = selectedModules.has(modKey);
                      const isIncluded = isSelected && includedAsDep.has(mod.key);
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
                          className="relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all duration-300 overflow-hidden cursor-pointer"
                          style={{
                            backgroundColor: isSelected ? `${mod.accent_color}08` : '#fff',
                            borderColor: isSelected ? mod.accent_color : WARM_GRAY_200,
                          }}
                        >
                          {isIncluded && (
                            <span
                              className="absolute top-0 right-0 flex items-center gap-0.5 text-[0.48rem] font-semibold text-white px-1.5 py-0.5 rounded-bl-lg rounded-tr-[11px]"
                              style={{ backgroundColor: mod.accent_color }}
                            >
                              <Check className="w-2 h-2" />
                              Incluido
                            </span>
                          )}
                          <div
                            className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300"
                            style={{ backgroundColor: `${mod.accent_color}${isSelected ? '18' : '10'}` }}
                          >
                            <ModIcon className="w-4 h-4" style={{ color: mod.accent_color }} />
                            {isSelected && !isIncluded && (
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
                </div>
              )}
            </div>
          </div>
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
