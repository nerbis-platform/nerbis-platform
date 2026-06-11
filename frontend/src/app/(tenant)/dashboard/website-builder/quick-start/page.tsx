'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { NerbisWordmark } from '@/components/marketing/nerbis-wordmark';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Send,
  LogOut,
  UserCircle,
  ImagePlus,
  Sparkles,
  X,
} from 'lucide-react';
import { deriveHarmonicSecondary } from '@/lib/utils/theme-colors';
import Link from 'next/link';
import { PipeAvatar } from '@/components/pipe-avatar';
import type { PipeMood } from '@/components/pipe-avatar';
import {
  quickStartGenerate,
  QuickStartResponse,
  classifyIndustry,
  confirmClassification,
  ClassifyIndustryResponse,
  suggestColors,
  getPlatformModules,
  getOnboardingQuestions,
  getOnboardingPages,
  getGenerationStatus,
  GenerationStatusResponse,
} from '@/lib/api/websites';
import { configureModules, ModuleSelection, getCurrentUser } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';
import { toast } from 'sonner';
import { Tenant } from '@/types';
import {
  NAVY, TEAL, WARM_GRAY_50, WARM_GRAY_100, WARM_GRAY_200,
  WARM_GRAY_400, WARM_GRAY_500, WARM_GRAY_600, WARM_GRAY_800,
  ERROR_RED, SUCCESS_GREEN,
  AGENT_NAME, getLucideIcon,
  FALLBACK_MODULES, FALLBACK_PAGES,
  FALLBACK_PALETTES, FALLBACK_TONE_OPTIONS,
  GENERATION_STEPS, SECTION_LABELS,
  type PaletteOption, type ToneOption,
  type ConversationStep, type PageState,
} from './_helpers';

// ─── Logo upload constraints (paso de color) ────────────────
const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Respuesta del paso de color: "#rrggbb / #rrggbb". Para el usuario el hex no
// significa nada → mostramos swatches de color en vez del texto.
const HEX_PAIR_RE = /^(#[0-9a-fA-F]{6}) \/ (#[0-9a-fA-F]{6})$/;

function UserAnswerContent({ content }: { content: string }) {
  const match = content.match(HEX_PAIR_RE);
  if (!match) return <>{content}</>;
  const [, primary, secondary] = match;
  return (
    <span
      className="flex items-center gap-2"
      aria-label={`Colores elegidos: ${primary} y ${secondary}`}
    >
      <span className="text-[0.82rem]">Mis colores</span>
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="w-4 h-4 rounded-full border border-white/50" style={{ backgroundColor: primary }} />
        <span className="w-4 h-4 rounded-full border border-white/50" style={{ backgroundColor: secondary }} />
      </span>
    </span>
  );
}

export default function QuickStartPage() {
  const router = useRouter();
  const { user, tenant, logout, setTenant } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Phase guard: solo redirigir cuando el sitio ya fue generado ──
  // Tener módulos configurados NO significa haber terminado el onboarding:
  // el tenant puede haber elegido módulos pero aún no generó el sitio. Solo
  // salimos de Quick Start cuando existe un sitio (review/published); de lo
  // contrario el tenant sigue en onboarding aquí. Antes este guard rebotaba
  // por `modules_configured` hacia `/website-builder`, que reenviaba de vuelta
  // a Quick Start → loop infinito de redirects (flood de requests → 429).
  useEffect(() => {
    if (!tenant) return;
    if (tenant.website_status === 'published') {
      router.replace('/dashboard');
    } else if (tenant.website_status === 'review') {
      router.replace('/dashboard/website-builder/editor');
    }
  }, [tenant, router]);

  // ─── Fetch config from API ──────────────────────────────
  const { data: apiModules } = useQuery({
    queryKey: ['platform-modules'],
    queryFn: getPlatformModules,
    staleTime: 0,
  });
  const { data: apiQuestions } = useQuery({
    queryKey: ['onboarding-questions'],
    queryFn: getOnboardingQuestions,
    staleTime: 0,
  });
  const { data: apiPages } = useQuery({
    queryKey: ['onboarding-pages'],
    queryFn: getOnboardingPages,
    staleTime: 0,
  });

  const modules = apiModules ?? FALLBACK_MODULES;

  // ─── Conversation state ───────────────────────────────────
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [selectedModules, setSelectedModules] = useState<Set<keyof ModuleSelection>>(
    () => new Set()
  );
  // Track modules explicitly clicked by the user (vs auto-included as dependency).
  // Using a ref so toggleModule always reads the latest value without stale closures.
  const explicitModulesRef = useRef<Set<keyof ModuleSelection>>(new Set());
  const [selectedPages, setSelectedPages] = useState<Set<string>>(() => {
    const defaults = (apiPages ?? FALLBACK_PAGES).filter((p) => p.is_default).map((p) => p.key);
    return new Set(defaults);
  });
  const [selectedTone, setSelectedTone] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  // Logo subido en el paso de color (camino 1): ColorThief extrae el primario y
  // deriveHarmonicSecondary calcula el secundario. El archivo se envía al backend
  // como multipart. No se persiste en sessionStorage (los File no son serializables).
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoSource, setLogoSource] = useState(false); // true → colores vienen del logo
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // ─── Sugerencia de color por IA (camino "Sugiéreme los colores") ──
  // Pipe propone un primario a partir del sector + descripción + tono. El
  // secundario lo deriva el front (deriveHarmonicSecondary). El resultado se
  // muestra en la MISMA tarjeta de swatches que el camino del logo. Ante error
  // degradamos a las paletas predefinidas — nunca se atrapa al usuario.
  const [aiColorLoading, setAiColorLoading] = useState(false);
  const [aiColorRationale, setAiColorRationale] = useState<string | null>(null);
  const [aiColorSource, setAiColorSource] = useState(false); // true → colores vienen de Pipe

  // ─── Dependency helpers ─────────────────────────────────────

  // Rebuild the full selected set from explicit selections + their transitive deps
  const resolveSelected = useCallback((explicit: Set<keyof ModuleSelection>): Set<keyof ModuleSelection> => {
    const result = new Set<keyof ModuleSelection>();
    for (const key of explicit) {
      result.add(key);
      const mod = modules.find((m) => m.key === key);
      if (mod) {
        for (const dep of mod.dependencies) {
          result.add(dep as keyof ModuleSelection);
        }
      }
    }
    return result;
  }, [modules]);

  const toggleModule = useCallback((modKey: keyof ModuleSelection) => {
    const explicit = explicitModulesRef.current;

    if (explicit.has(modKey)) {
      explicit.delete(modKey);
      // Also remove dependents (modules that require this one)
      for (const m of modules) {
        if (m.dependencies.includes(modKey)) {
          explicit.delete(m.key as keyof ModuleSelection);
        }
      }
    } else {
      explicit.add(modKey);
    }

    setSelectedModules(resolveSelected(explicit));
  }, [modules, resolveSelected]);

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

  // Derive selectedPages automatically — the pages question was removed from the
  // chat. A page is included if it is mandatory or its module is active
  // (auto_include_modules). Elective pages (about/blog/portfolio/pricing) are NO
  // longer force-sent here: the AI decides them server-side via selected_pages
  // and the centralized derive_enabled_pages helper. The user refines pages later
  // in the editor (step 2).
  useEffect(() => {
    if (!apiPages) return;
    const derived = apiPages
      .filter((p) =>
        p.is_mandatory ||
        p.auto_include_modules.some((m) => selectedModules.has(m as keyof ModuleSelection))
      )
      .map((p) => p.key);
    setSelectedPages((prev) => {
      const key = derived.sort().join(',');
      const prevKey = Array.from(prev).sort().join(',');
      return key !== prevKey ? new Set(derived) : prev;
    });
  }, [apiPages, selectedModules]);

  // ─── Build dynamic steps based on selected modules ──────
  const steps = useMemo<ConversationStep[]>(() => {
    // Step 1: modules selection (from API or fallback)
    const modulesQ = apiQuestions?.find((q) => q.input_type === 'modules');
    const result: ConversationStep[] = [
      {
        id: modulesQ?.question_key ?? 'modules',
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
          const step: ConversationStep = {
            id: q.question_key,
            message: q.message,
            type: q.input_type as ConversationStep['type'],
            placeholder: q.placeholder || undefined,
            hint: q.hint || undefined,
            minLength: q.min_length || undefined,
            maxLength: q.max_length || undefined,
            rows: q.input_type === 'textarea' ? 3 : undefined,
            optional: !q.is_required,
          };
          // Pass options for special types
          if (q.input_type === 'color_picker' && q.options?.length) {
            step.options = q.options as unknown as PaletteOption[];
          } else if (q.input_type === 'tone_select' && q.options?.length) {
            step.options = q.options as unknown as ToneOption[];
          }
          result.push(step);
        }
      }
    } else {
      // Fallback hardcoded questions while API loads
      result.push(
        { id: 'description', message: 'Cuéntame, ¿para qué necesitas tu sitio y qué haces?', type: 'textarea', placeholder: 'Ej: Soy diseñadora gráfica freelance...', hint: 'Entre más detalles, mejor queda tu sitio.', minLength: 20, maxLength: 1000, rows: 3 },
      );
      if (selectedModules.has('has_services')) {
        result.push({ id: 'services', message: '¿Qué servicios ofreces? Incluye nombre, descripción corta y precio aproximado.', type: 'textarea', placeholder: 'Ej:\nDiseño de logo — Creación de identidad visual — $500\nBranding completo — Logo + papelería + guía de marca — $1,200', hint: 'Uno por línea.', minLength: 5, maxLength: 2000, rows: 4 });
      }
      if (selectedModules.has('has_shop')) {
        result.push({ id: 'products', message: '¿Qué productos vendes? Cuéntame las categorías y rango de precios.', type: 'textarea', placeholder: 'Ej:\nCamisetas estampadas — $15-25\nHoodies premium — $40-60', hint: 'Categorías y precios aproximados.', minLength: 5, maxLength: 2000, rows: 4 });
      }
      if (selectedModules.has('has_bookings')) {
        result.push({ id: 'bookings', message: '¿Qué se puede reservar? Cuéntame duración, horarios y si es presencial o virtual.', type: 'textarea', placeholder: 'Ej:\nConsulta inicial — 30 min — virtual\nSesión de coaching — 1 hora — presencial', hint: 'Detalla cada tipo de cita.', minLength: 5, maxLength: 2000, rows: 4 });
      }
    }
    return result;
  }, [apiQuestions, selectedModules]);

  // ─── Generation state ─────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>('chat');
  const [activeMood, setActiveMood] = useState<PipeMood>('idle');
  const [genStep, setGenStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<QuickStartResponse | null>(null);
  const [usageLimitInfo, setUsageLimitInfo] = useState<{ used: number; limit: number } | null>(null);

  // ─── Industry classification (Pipe confirm/correct step) ──
  const [classifying, setClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState<ClassifyIndustryResponse | null>(null);
  const [classifyError, setClassifyError] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [correctionInput, setCorrectionInput] = useState('');
  // Inline industry-confirm phase: rendered as a Pipe message inside the chat
  // (no full-screen jump). Active between the description step and confirmation.
  const [inlineConfirm, setInlineConfirm] = useState(false);
  // Industry confirmed by the user right after the description step (Option 1:
  // classify is decoupled from generate). Carried into the final generation call.
  const [confirmedIndustryKey, setConfirmedIndustryKey] = useState('');
  // Label of the confirmed industry, kept so the decision stays visible in the
  // chat history (Pipe's suggestion + the user's "Sí, es correcto").
  const [confirmedIndustryLabel, setConfirmedIndustryLabel] = useState('');

  // ─── Session storage keys (scoped to tenant to prevent cross-tenant leaks) ──
  const SS_KEY = `nerbis_quickstart_state_${tenant?.id || 'unknown'}`;

  // ─── Restore state from sessionStorage on mount ────────────
  const hasRestored = useRef(false);
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;
    try {
      const saved = sessionStorage.getItem(SS_KEY);
      if (!saved) return;
      const state = JSON.parse(saved);
      if (state.currentStepIdx > 0) {
        setCurrentStepIdx(state.currentStepIdx);
        setAnswers(state.answers || {});
        if (state.selectedModules?.length) {
          setSelectedModules(new Set(state.selectedModules));
          explicitModulesRef.current = new Set(state.explicitModules || []);
        }
        if (state.selectedPages?.length) setSelectedPages(new Set(state.selectedPages));
        if (state.selectedTone) setSelectedTone(state.selectedTone);
        if (state.primaryColor) setPrimaryColor(state.primaryColor);
        if (state.secondaryColor) setSecondaryColor(state.secondaryColor);
        if (state.confirmedIndustryKey) setConfirmedIndustryKey(state.confirmedIndustryKey);
        if (state.confirmedIndustryLabel) setConfirmedIndustryLabel(state.confirmedIndustryLabel);
      }
    } catch { /* corrupted storage — start fresh */ }
  }, []);

  // ─── Persist state to sessionStorage on changes ────────────
  useEffect(() => {
    if (pageState !== 'chat') return;
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({
        currentStepIdx,
        answers,
        selectedModules: Array.from(selectedModules),
        explicitModules: Array.from(explicitModulesRef.current),
        selectedPages: Array.from(selectedPages),
        selectedTone,
        primaryColor,
        secondaryColor,
        confirmedIndustryKey,
        confirmedIndustryLabel,
      }));
    } catch { /* storage full — silently ignore */ }
  }, [currentStepIdx, answers, selectedModules, selectedPages, selectedTone, primaryColor, secondaryColor, confirmedIndustryKey, confirmedIndustryLabel, pageState]);

  // ─── Simulate typing delay for each new message ──────────
  useEffect(() => {
    if (pageState !== 'chat') return;
    setIsTyping(true);
    const delay = currentStepIdx === 0 ? 800 : 500;
    const timer = setTimeout(() => {
      setIsTyping(false);
    }, delay);
    return () => clearTimeout(timer);
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
  }, [currentStepIdx, isTyping, pageState, inlineConfirm, classifying, classifyResult, correcting]);

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
    industryKey?: string,
  ) => {
    try {
      await quickStartGenerate({
        business_description: answersData.description || answersData.pipe_description || '',
        main_services: answersData.services || answersData.pipe_services || '',
        // home y contact son páginas obligatorias, no secciones de contenido
        // seleccionables — se excluyen del hint website_sections.
        website_sections: Array.from(sections).filter((key) => key !== 'home' && key !== 'contact'),
        brand_tone: selectedTone || undefined,
        primary_color: primaryColor || undefined,
        secondary_color: secondaryColor || undefined,
        business_whatsapp: answersData.pipe_whatsapp || undefined,
        industry_key: industryKey || undefined,
        // Solo se envía cuando el tenant subió un logo en el paso de color.
        // Activa el camino multipart en quickStartGenerate (backward-compat sin logo).
        logo_file: logoFile || undefined,
      });
      startPolling();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        startPolling();
      } else if (error instanceof ApiError && error.status === 402) {
        const data = error.data as { used?: number; limit?: number } | undefined;
        if (data?.used !== undefined && data?.limit !== undefined) {
          setUsageLimitInfo({ used: data.used, limit: data.limit });
        }
        setPageState('limit-reached');
      } else {
        // The backend never rejects an industry now — any failure is a
        // generic generation error the user can retry.
        setPageState('error');
      }
    }
  }, [startPolling, selectedTone, primaryColor, secondaryColor, logoFile]);

  // ─── Industry classification + confirm step ───────────────
  // Classify the business based on its description + selected modules, then
  // surface the confirm/correct interstitial. Never dead-ends: if the call
  // fails we let the user proceed (the backend resolves a generic template).
  const runClassification = useCallback(async (description: string) => {
    setClassifying(true);
    setClassifyError(false);
    setCorrecting(false);
    setCorrectionInput('');
    const moduleKeys = Array.from(selectedModules) as string[];
    try {
      const res = await classifyIndustry(description, moduleKeys);
      setClassifyResult(res);
    } catch {
      setClassifyResult(null);
      setClassifyError(true);
    } finally {
      setClassifying(false);
    }
  }, [selectedModules]);

  // Enter the generating phase with the (already confirmed) industry key.
  const startGeneration = useCallback((
    answersData: Record<string, string>,
    sections: Set<string>,
    industryKey?: string,
  ) => {
    setPageState('generating');
    setGenStep(0);
    setProgress(0);
    setTimeout(() => {
      triggerQuickStartGeneration(answersData, sections, industryKey || undefined);
    }, 100);
  }, [triggerQuickStartGeneration]);

  // User confirmed the detected sector. Option 1: classification is decoupled
  // from generation, so confirming just records the decision (feeding NERBIS'
  // own dataset) and continues the conversation — generation happens at the end.
  const confirmIndustry = useCallback(() => {
    const key = classifyResult?.industry_key ?? '';
    setConfirmedIndustryKey(key);
    setConfirmedIndustryLabel(classifyResult?.industry_label ?? '');
    if (classifyResult) {
      // Fire-and-forget: persisting the decision must never block the user.
      void confirmClassification(classifyResult.classification_id, 'confirmed').catch(() => {});
    }
    setCorrecting(false);
    setInlineConfirm(false);
    setActiveMood('happy');
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      // Description was the last question — generate right away.
      startGeneration(answers, selectedPages, key);
    }
  }, [classifyResult, currentStepIdx, steps.length, answers, selectedPages, startGeneration]);

  // User wants to correct the sector — reveal the correction input.
  const startCorrection = useCallback(() => {
    setCorrecting(true);
    setCorrectionInput('');
  }, []);

  // Re-classify using the user's own description of their sector. The previous
  // prediction is recorded as "corrected" so the dataset learns from the miss.
  const submitCorrection = useCallback(() => {
    const text = correctionInput.trim();
    if (text.length < 3) return;
    if (classifyResult) {
      void confirmClassification(classifyResult.classification_id, 'corrected', undefined, text).catch(() => {});
    }
    void runClassification(text);
  }, [correctionInput, classifyResult, runClassification]);

  // ─── Rotating generation messages ─────────────────────────
  // Los 5 pasos avanzan cada 6s para cubrir los ~30s reales de generación
  // (5 × 6s = 30s); el último ("ya casi") queda hasta que el polling completa.
  useEffect(() => {
    if (pageState !== 'generating') return;
    const interval = setInterval(() => {
      setGenStep((prev) =>
        prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 6000);
    return () => clearInterval(interval);
  }, [pageState]);

  // ─── Progress bar ─────────────────────────────────────────
  // Simula el avance acompasado al tiempo real (~30s) con una curva ease-out
  // basada en el tiempo transcurrido: rápida al inicio y desacelerando al
  // acercarse al techo (95%). A los ~30s ronda el 90%. Nunca llega a 100% por
  // sí sola — el polling fija 100% al completar la generación. El guard
  // monótono evita retrocesos y respeta el 100% del polling.
  useEffect(() => {
    if (pageState !== 'generating') return;
    const start = Date.now();
    const CEILING = 95;
    const TAU = 10.2; // segundos: calibra la curva para ~90% a los 30s
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const target = CEILING * (1 - Math.exp(-elapsed / TAU));
      setProgress((prev) => (target > prev ? target : prev));
    }, 200);
    return () => clearInterval(interval);
  }, [pageState]);

  // ─── Send answer ──────────────────────────────────────────
  // ─── Logo upload → extracción de color (camino 1 del paso de color) ──
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = useCallback(async (file: File) => {
    setLogoError(null);

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Formato no válido. Usa PNG, JPG o WEBP.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('El logo pesa más de 5 MB. Sube una versión más liviana.');
      return;
    }

    setLogoLoading(true);
    try {
      // Preview local (data URL) para mostrar el logo subido.
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read-failed'));
        reader.readAsDataURL(file);
      });

      // ColorThief necesita una imagen rasterizada. Los SVG no se pueden muestrear
      // directamente en canvas en todos los navegadores: si falla, conservamos el
      // logo pero pedimos color manual (sin romper el flujo).
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('decode-failed'));
      });

      const ColorThief = (await import('colorthief')).default;
      const ct = new ColorThief();
      const dominant = ct.getColor(img) as [number, number, number];
      const toHex = (rgb: [number, number, number]) =>
        '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
      const primary = toHex(dominant);
      const secondary = deriveHarmonicSecondary(primary);

      setLogoFile(file);
      setLogoPreview(dataUrl);
      setPrimaryColor(primary);
      setSecondaryColor(secondary);
      setLogoSource(true);
    } catch {
      setLogoError('No pudimos leer los colores del logo. Elige un color manualmente abajo.');
    } finally {
      setLogoLoading(false);
    }
  }, []);

  const clearLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoSource(false);
    setLogoError(null);
    setAiColorSource(false);
    setAiColorRationale(null);
    setPrimaryColor('');
    setSecondaryColor('');
    if (logoInputRef.current) logoInputRef.current.value = '';
  }, []);

  // Color primario manual (camino 2): el secundario se auto-deriva.
  const handleManualPrimary = useCallback((hex: string) => {
    setLogoSource(false);
    setLogoFile(null);
    setLogoPreview(null);
    setAiColorSource(false);
    setAiColorRationale(null);
    setPrimaryColor(hex);
    setSecondaryColor(deriveHarmonicSecondary(hex));
  }, []);

  // Camino "Sugiéreme los colores": Pipe propone un primario a partir del
  // sector + descripción + tono. Solo disponible cuando NO hay logo (el logo
  // ya define los colores). Ante cualquier error degradamos en silencio a las
  // paletas predefinidas — el usuario nunca queda atrapado.
  const handleSuggestColors = useCallback(async () => {
    setAiColorLoading(true);
    setLogoError(null);
    // Recuperar la descripción del negocio. Las claves canónicas del paso de
    // descripción son 'pipe_description' (backend) o 'description' (fallback);
    // se priorizan en ese orden y, si no están, se cae a una clave que TERMINE
    // en 'description' (evita falsos positivos a mitad de string como includes).
    const descriptionKey =
      'pipe_description' in answers
        ? 'pipe_description'
        : 'description' in answers
          ? 'description'
          : Object.keys(answers).find((k) => /description$/i.test(k));
    const businessDescription = (descriptionKey ? answers[descriptionKey] : '') || '';
    try {
      const res = await suggestColors({
        industry_key: confirmedIndustryKey || undefined,
        industry_label: confirmedIndustryLabel || undefined,
        business_description: businessDescription,
        tone: selectedTone || undefined,
      });
      const primary = res.primary_hex;
      setLogoSource(false);
      setLogoFile(null);
      setLogoPreview(null);
      setPrimaryColor(primary);
      setSecondaryColor(deriveHarmonicSecondary(primary));
      setAiColorRationale(res.rationale);
      setAiColorSource(true);
    } catch {
      // Degradar con gracia: limpiar el estado de IA y dejar visibles las
      // paletas predefinidas para que el usuario siga sin fricción.
      setAiColorSource(false);
      setAiColorRationale(null);
      setLogoError('No pude sugerir colores ahora. Elige uno abajo o usa una paleta.');
    } finally {
      setAiColorLoading(false);
    }
  }, [answers, confirmedIndustryKey, confirmedIndustryLabel, selectedTone]);

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
        toast.error('Error al configurar los módulos. Intenta de nuevo.');
        return;
      }

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

    // Option 1: classify the industry right after the business description,
    // decoupled from generation. Pipe confirms the sector inline, then the
    // conversation continues (pages/design) and generation happens at the end.
    if (step.id?.includes('description')) {
      setActiveMood('happy');
      setInlineConfirm(true);
      void runClassification(value);
      return;
    }

    // Next step
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      // All questions answered — generate using the confirmed industry key.
      setActiveMood('happy');
      startGeneration(newAnswers, selectedPages, confirmedIndustryKey);
    }
  }, [currentStepIdx, currentInput, answers, selectedModules, selectedPages, selectedTone, primaryColor, secondaryColor, confirmedIndustryKey, steps, modules, runClassification, startGeneration, setTenant]);

  // Skip an optional step: record an empty answer (generation degrades gracefully
  // via tenant.phone fallback) and advance, or generate if it was the last step.
  const handleSkip = useCallback(() => {
    const step = steps[currentStepIdx];
    if (!step) return;
    setActiveMood('happy');
    setTimeout(() => setActiveMood('listening'), 600);
    setCurrentInput('');
    const newAnswers = { ...answers, [step.id]: '' };
    setAnswers(newAnswers);
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      startGeneration(newAnswers, selectedPages, confirmedIndustryKey);
    }
  }, [currentStepIdx, steps, answers, selectedPages, confirmedIndustryKey, startGeneration]);

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
    // "Intentar de nuevo con los mismos datos": el fallo de generación es
    // transitorio, así que NO reiniciamos el flujo ni borramos respuestas.
    // Relanzamos la generación con los datos ya registrados (answers, páginas
    // e industria confirmada siguen en el estado y en sessionStorage).
    setResult(null);
    startGeneration(answers, selectedPages, confirmedIndustryKey || undefined);
  }, [answers, selectedPages, confirmedIndustryKey, startGeneration]);

  const handleBack = useCallback(() => {
    if (currentStepIdx <= 0) return;
    const prevStep = steps[currentStepIdx - 1];
    // Restore previous answer into the input for textarea/input types
    if (prevStep && (prevStep.type === 'textarea' || prevStep.type === 'input')) {
      setCurrentInput(answers[prevStep.id] || '');
    } else {
      setCurrentInput('');
    }
    // Remove the current step's answer so it can be re-answered
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[prevStep.id];
      return next;
    });
    setCurrentStepIdx((prev) => prev - 1);
  }, [currentStepIdx, steps, answers]);

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
          <NerbisWordmark size={14} variant="full" pipeSize={28} className="text-[#1C3B57]" />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-1.5 text-[0.72rem] font-medium transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
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
            className="flex items-center gap-1.5 text-[0.72rem] font-medium transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
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
      : step?.type === 'tone_select'
        ? selectedTone !== ''
        : step?.type === 'color_picker'
          ? true
          : currentInput.trim().length >= minLen;

    const hasHistory = currentStepIdx > 0;

    // Guard: persisted progress (sessionStorage) can restore currentStepIdx
    // beyond the steps array while apiQuestions is still loading (steps falls
    // back to a shorter set). steps is contiguous, so a missing current step
    // means the conversation isn't ready yet — show a brief loader instead of
    // indexing into undefined steps.
    if (!step) {
      return (
        <div
          className="h-screen flex flex-col font-[family-name:var(--font-geist-sans)]"
          style={{ backgroundColor: WARM_GRAY_50 }}
        >
          {header}
          <div className="flex-1 flex items-center justify-center" role="status" aria-live="polite">
            <div
              className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: WARM_GRAY_200, borderTopColor: TEAL }}
            />
            <span className="sr-only">Cargando conversación…</span>
          </div>
        </div>
      );
    }

    // Build chat history from completed steps
    const chatHistory: { role: 'pipe' | 'user'; content: string; sector?: string }[] = [];
    for (let i = 0; i < currentStepIdx; i++) {
      const s = steps[i];
      chatHistory.push({ role: 'pipe', content: i === 0
        ? `Hola${firstName ? ` ${firstName}` : ''}, soy ${AGENT_NAME}, tu asistente creativo. ${s.message}`
        : s.message });
      if (answers[s.id]) {
        chatHistory.push({ role: 'user', content: answers[s.id] });
      } else if (s.optional && s.id in answers) {
        chatHistory.push({ role: 'user', content: 'Lo agrego más tarde' });
      }
      // Keep the industry decision in the conversation: right after the
      // description step, replay Pipe's suggestion + the user's confirmation.
      // El sector va en `sector` para resaltarlo como chip en el historial.
      if (s.id?.includes('description') && confirmedIndustryLabel) {
        chatHistory.push({ role: 'pipe', content: '', sector: confirmedIndustryLabel });
        chatHistory.push({ role: 'user', content: 'Sí, es correcto' });
      }
    }

    // ── Initial state: greeting centered + input below (like Claude empty state) ──
    if (!hasHistory) {
      return (
        <div
          className="h-screen flex flex-col font-[family-name:var(--font-geist-sans)]"
          style={{ backgroundColor: WARM_GRAY_50 }}
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
                  <div
                    className="relative mb-14 rounded-2xl px-5 py-4 text-center shadow-sm"
                    style={{
                      backgroundColor: '#fff',
                      border: `1px solid ${WARM_GRAY_100}`,
                      maxWidth: '22rem',
                    }}
                  >
                    {/* Speech bubble tail */}
                    <div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
                      style={{
                        backgroundColor: '#fff',
                        borderLeft: `1px solid ${WARM_GRAY_100}`,
                        borderTop: `1px solid ${WARM_GRAY_100}`,
                      }}
                    />
                    <p
                      className="text-sm font-medium"
                      style={{ color: WARM_GRAY_800 }}
                    >
                      Hola{firstName ? ' ' : ''}
                      {firstName && <span style={{ color: TEAL }}>{firstName}</span>}
                      {firstName ? ', s' : 'S'}oy{' '}
                      <span className="font-semibold" style={{ color: TEAL }}>{AGENT_NAME}</span>
                      , tu asistente creativo.
                    </p>
                    <p
                      className="text-lg font-semibold mt-1.5"
                      style={{ color: WARM_GRAY_800, letterSpacing: '-0.01em' }}
                    >
                      {step.message}
                    </p>
                  </div>

                  {/* Module grid + continue — same width as title */}
                  {step.type === 'modules' && (
                    <div className="w-full space-y-12">
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
                              className="relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all duration-300 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
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
                        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[0.84rem] font-semibold transition-all duration-200 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 disabled:shadow-none disabled:hover:translate-y-0"
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
        style={{ backgroundColor: WARM_GRAY_50 }}
      >
        {header}

        {/* Scrollable message area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-12 pb-6 space-y-6">
            {/* Chat history */}
            {chatHistory.map((msg, i) => (
              <div key={`msg-${i}`}>
                {msg.role === 'user' ? (
                  /* User bubble — right aligned */
                  <div className="flex justify-end">
                    <div
                      className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-[0.88rem] leading-relaxed max-w-[75%]"
                      style={{ backgroundColor: TEAL, color: '#fff' }}
                    >
                      <UserAnswerContent content={msg.content} />
                    </div>
                  </div>
                ) : (
                  /* Pipe bubble — left aligned, no avatar (Pipe only lives on the
                     current message); aligned with the active message's bubble. */
                  <div className="flex gap-3 items-start">
                    <div className="w-10 flex-shrink-0" aria-hidden="true" />
                    <div
                      className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-[0.88rem] leading-relaxed max-w-[75%]"
                      style={{ backgroundColor: '#fff', color: WARM_GRAY_500, border: `1px solid ${WARM_GRAY_200}` }}
                    >
                      {msg.sector ? (
                        <>
                          Tu negocio es del sector{' '}
                          <span style={{ color: NAVY, fontWeight: 600 }}>{msg.sector}</span>
                        </>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Current Pipe message — Pipe stays bigger on the active turn */}
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0">
                <PipeAvatar mood={isTyping ? 'thinking' : activeMood} size={40} />
              </div>
              <div className="flex-1">
                {isTyping ? (
                  <div
                    className="inline-flex gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm"
                    style={{ backgroundColor: '#fff', border: `1px solid ${WARM_GRAY_200}` }}
                  >
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
                  <div
                    className="inline-block px-4 py-2.5 rounded-2xl rounded-tl-sm text-[0.9rem] font-medium leading-relaxed max-w-[85%] animate-in fade-in duration-300"
                    style={{ backgroundColor: '#fff', color: NAVY, border: `1px solid ${WARM_GRAY_100}` }}
                  >
                    {step.message}
                  </div>
                )}
              </div>
            </div>

            {/* Inline industry classification — lives inside the chat as a Pipe
                message (no full-screen jump), keeping the conversation intact. */}
            {inlineConfirm && (
              <>
                {answers[step.id] && (
                  <div className="flex justify-end">
                    <div
                      className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-[0.88rem] leading-relaxed max-w-[75%]"
                      style={{ backgroundColor: TEAL, color: '#fff' }}
                    >
                      <UserAnswerContent content={answers[step.id]} />
                    </div>
                  </div>
                )}
                <div className="flex gap-3 items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <PipeAvatar mood={classifying ? 'thinking' : 'happy'} size={28} />
                  </div>
                  <div className="flex-1">
                    {classifying ? (
                      <div className="flex gap-1.5 py-2">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ backgroundColor: WARM_GRAY_400, animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
                          />
                        ))}
                      </div>
                    ) : correcting ? (
                      <div className="animate-in fade-in duration-300">
                        <p className="text-[0.88rem] leading-relaxed mb-3" style={{ color: WARM_GRAY_800 }}>
                          Cuéntame a qué se dedica tu negocio y lo reviso de nuevo.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={correctionInput}
                            onChange={(e) => setCorrectionInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCorrection(); } }}
                            placeholder="Ej: Floristería, taller mecánico, estudio de tatuajes..."
                            autoFocus
                            className="flex-1 min-w-[12rem] h-10 px-3.5 rounded-lg border text-[0.85rem] outline-none focus:ring-2"
                            style={{ borderColor: WARM_GRAY_200, backgroundColor: WARM_GRAY_50, color: WARM_GRAY_800 }}
                          />
                          <button
                            type="button"
                            onClick={submitCorrection}
                            disabled={correctionInput.trim().length < 3}
                            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-[0.82rem] font-medium transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 disabled:shadow-none disabled:hover:translate-y-0"
                            style={{ backgroundColor: TEAL, color: '#fff' }}
                          >
                            Revisar <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCorrecting(false)}
                            className="h-10 px-3 rounded-lg text-[0.82rem] font-medium"
                            style={{ color: WARM_GRAY_500 }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : classifyError ? (
                      <div className="animate-in fade-in duration-300">
                        <p className="text-[0.88rem] leading-relaxed mb-3" style={{ color: WARM_GRAY_800 }}>
                          No alcancé a identificar tu sector, pero no pasa nada — puedo seguir con un diseño versátil, o dime a qué te dedicas.
                        </p>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={confirmIndustry}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[0.82rem] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 disabled:shadow-none disabled:hover:translate-y-0"
                            style={{ backgroundColor: TEAL, color: '#fff' }}
                          >
                            Continuar <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={startCorrection}
                            className="inline-flex items-center h-9 px-4 rounded-lg border text-[0.82rem] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
                            style={{ borderColor: WARM_GRAY_200, backgroundColor: '#fff', color: WARM_GRAY_500 }}
                          >
                            Decirle mi sector
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-in fade-in duration-300">
                        <p className="text-[0.88rem] leading-relaxed mb-3" style={{ color: WARM_GRAY_800 }}>
                          Entonces tu negocio es del sector{' '}
                          <span style={{ color: NAVY, fontWeight: 600 }}>{classifyResult?.industry_label}</span>.
                          {' '}¿Es correcto? Con esto elijo el mejor diseño para ti.
                        </p>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={confirmIndustry}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[0.82rem] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 disabled:shadow-none disabled:hover:translate-y-0"
                            style={{ backgroundColor: TEAL, color: '#fff' }}
                          >
                            <Check className="w-3.5 h-3.5" /> Sí, es correcto
                          </button>
                          <button
                            type="button"
                            onClick={startCorrection}
                            className="inline-flex items-center h-9 px-4 rounded-lg border text-[0.82rem] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
                            style={{ borderColor: WARM_GRAY_200, backgroundColor: '#fff', color: WARM_GRAY_500 }}
                          >
                            No, corregir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input area — stays at the bottom; only blocked (not hidden) while Pipe
            is "typing" the next question, and hidden during inline industry confirm. */}
        {!inlineConfirm && (
          <div
            className={`border-t transition-opacity ${isTyping ? 'pointer-events-none opacity-50' : ''}`}
            aria-disabled={isTyping}
            style={{ borderColor: WARM_GRAY_100 }}
          >
            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-7">
              {/* Back button */}
              {currentStepIdx > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 text-[0.75rem] font-medium mb-2 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
                  style={{ color: WARM_GRAY_400 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = TEAL)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = WARM_GRAY_400)}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver al paso anterior
                </button>
              )}

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
                      onChange={(e) => {
                        const val = e.target.value;
                        if (step.maxLength && val.length > step.maxLength) return;
                        setCurrentInput(val);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={step.placeholder}
                      rows={step.rows || 2}
                      maxLength={step.maxLength}
                      autoFocus
                      className="flex-1 bg-transparent text-[0.88rem] leading-relaxed resize-none focus:outline-none"
                      style={{ color: WARM_GRAY_800 }}
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!canSend}
                      className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 transition-all disabled:opacity-25 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
                      style={{ backgroundColor: canSend ? TEAL : WARM_GRAY_200, color: '#fff' }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2 mx-1">
                    {step.hint ? (
                      <p className="text-[0.7rem]" style={{ color: WARM_GRAY_400 }}>{step.hint}</p>
                    ) : <span />}
                    {step.maxLength && (
                      <p
                        className="text-[0.7rem] tabular-nums"
                        style={{
                          color:
                            currentInput.length < (step.minLength || 0) ||
                            currentInput.length > step.maxLength * 0.9
                              ? ERROR_RED
                              : WARM_GRAY_600,
                        }}
                      >
                        {currentInput.length}/{step.maxLength}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Text input (single line) */}
              {step.type === 'input' && (
                <>
                  <div
                    className="flex items-center gap-2 rounded-xl border px-4 py-3 transition-all focus-within:ring-2"
                    style={{
                      borderColor: WARM_GRAY_200,
                      backgroundColor: WARM_GRAY_50,
                      // @ts-expect-error -- CSS custom property
                      '--tw-ring-color': `${TEAL}30`,
                    }}
                  >
                    <input
                      type={step.inputType || 'text'}
                      value={currentInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (step.maxLength && val.length > step.maxLength) return;
                        setCurrentInput(val);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={step.placeholder}
                      maxLength={step.maxLength}
                      autoFocus
                      className="flex-1 bg-transparent text-[0.88rem] focus:outline-none"
                      style={{ color: WARM_GRAY_800 }}
                    />
                    {step.optional && (
                      <button
                        type="button"
                        onClick={handleSkip}
                        className="inline-flex items-center h-9 px-3.5 rounded-lg border text-[0.82rem] font-medium flex-shrink-0 transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
                        style={{ borderColor: WARM_GRAY_200, backgroundColor: '#fff', color: WARM_GRAY_500 }}
                      >
                        Omitir
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!canSend}
                      className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 transition-all disabled:opacity-25 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
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

              {/* Color picker */}
              {step.type === 'color_picker' && (() => {
                const palettes = (step.options || FALLBACK_PALETTES) as PaletteOption[];
                const hasManualPrimary = /^#[0-9a-fA-F]{6}$/.test(primaryColor);
                return (
                  <div className="space-y-4">
                    {/* ── Camino 1: subir logo → detectar colores ── */}
                    <div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        aria-label="Subir logo para detectar colores de marca"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleLogoUpload(file);
                        }}
                      />

                      {!logoSource && !aiColorSource ? (
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={logoLoading || aiColorLoading}
                          aria-busy={logoLoading}
                          className="flex w-full items-center gap-3 px-4 py-3 rounded-xl border border-dashed transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-wait"
                          style={{ borderColor: WARM_GRAY_200, backgroundColor: WARM_GRAY_50 }}
                        >
                          <span
                            className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                            style={{ backgroundColor: `${TEAL}12` }}
                          >
                            <ImagePlus className="w-4 h-4" style={{ color: TEAL }} />
                          </span>
                          <span className="text-left">
                            <span className="block text-[0.82rem] font-medium" style={{ color: NAVY }}>
                              {logoLoading ? 'Leyendo tu logo…' : 'Sube tu logo'}
                            </span>
                            <span className="block text-[0.7rem]" style={{ color: WARM_GRAY_500 }}>
                              Detectamos tus colores automáticamente · PNG, JPG o WEBP
                            </span>
                          </span>
                        </button>
                      ) : (
                        <div
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
                          style={{ borderColor: TEAL, backgroundColor: `${TEAL}08` }}
                        >
                          {aiColorSource ? (
                            <span
                              className="flex items-center justify-center w-10 h-10 rounded-md shrink-0"
                              style={{ backgroundColor: `${TEAL}14` }}
                            >
                              <Sparkles className="w-4 h-4" style={{ color: TEAL }} />
                            </span>
                          ) : logoPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={logoPreview}
                              alt="Logo subido"
                              className="w-10 h-10 object-contain rounded-md shrink-0"
                              style={{ backgroundColor: '#fff' }}
                            />
                          ) : null}
                          <div className="flex-1 min-w-0">
                            <p className="text-[0.78rem] font-medium" style={{ color: NAVY }}>
                              {aiColorSource
                                ? `Elegí estos por tu sector${confirmedIndustryLabel ? ` ${confirmedIndustryLabel}` : ''}`
                                : 'Detectamos estos colores en tu logo'}
                            </p>
                            {aiColorSource && aiColorRationale && (
                              <p className="text-[0.7rem] mt-0.5 leading-snug" style={{ color: WARM_GRAY_600 }}>
                                {aiColorRationale}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full border border-black/5" style={{ backgroundColor: primaryColor }} />
                                <span className="text-[0.68rem] font-mono" style={{ color: WARM_GRAY_500 }}>{primaryColor}</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full border border-black/5" style={{ backgroundColor: secondaryColor }} />
                                <span className="text-[0.68rem] font-mono" style={{ color: WARM_GRAY_500 }}>{secondaryColor}</span>
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={clearLogo}
                            aria-label={aiColorSource ? 'Descartar sugerencia y elegir otro color' : 'Quitar logo y elegir otro color'}
                            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40"
                            style={{ color: WARM_GRAY_500 }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {!logoSource && !aiColorSource && (
                        <button
                          type="button"
                          onClick={() => void handleSuggestColors()}
                          disabled={aiColorLoading || logoLoading}
                          aria-busy={aiColorLoading}
                          aria-label="Sugiéreme los colores con inteligencia artificial"
                          className="mt-2.5 flex w-full items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-wait"
                          style={{ borderColor: WARM_GRAY_200, backgroundColor: '#fff' }}
                        >
                          <span
                            className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                            style={{ backgroundColor: `${TEAL}12` }}
                          >
                            <Sparkles className="w-4 h-4" style={{ color: TEAL }} />
                          </span>
                          <span className="text-left flex-1">
                            <span className="block text-[0.82rem] font-medium" style={{ color: NAVY }}>
                              {aiColorLoading ? 'Pipe está eligiendo tus colores…' : 'Sugiéreme los colores'}
                            </span>
                            <span className="block text-[0.7rem]" style={{ color: WARM_GRAY_500 }}>
                              Pipe los elige según tu negocio
                            </span>
                          </span>
                          {aiColorLoading && (
                            <span className="flex gap-1 shrink-0" aria-hidden="true">
                              {[0, 1, 2].map((i) => (
                                <span
                                  key={i}
                                  className="w-1.5 h-1.5 rounded-full motion-safe:animate-bounce"
                                  style={{ backgroundColor: TEAL, animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
                                />
                              ))}
                            </span>
                          )}
                        </button>
                      )}

                      {logoError && (
                        <p role="alert" className="text-[0.7rem] mt-1.5 ml-1" style={{ color: ERROR_RED }}>
                          {logoError}
                        </p>
                      )}
                    </div>

                    {/* ── Camino 2: color manual (secundario auto-derivado) ── */}
                    {!logoSource && !aiColorSource && (
                      <div className="flex items-center gap-3">
                        <label
                          htmlFor="quickstart-primary-color"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all duration-200 focus-within:ring-2 focus-within:ring-[#0D9488]/40 focus-within:ring-offset-1"
                          style={{ borderColor: WARM_GRAY_200, backgroundColor: '#fff' }}
                        >
                          <span
                            className="w-7 h-7 rounded-lg border border-black/5 shrink-0"
                            style={{ backgroundColor: hasManualPrimary ? primaryColor : WARM_GRAY_100 }}
                          />
                          <span className="text-left">
                            <span className="block text-[0.78rem] font-medium" style={{ color: NAVY }}>
                              Elige tu color
                            </span>
                            <span className="block text-[0.68rem]" style={{ color: WARM_GRAY_500 }}>
                              Derivamos el secundario armónico
                            </span>
                          </span>
                          <input
                            id="quickstart-primary-color"
                            type="color"
                            aria-label="Color primario de marca"
                            value={hasManualPrimary ? primaryColor : '#1C3B57'}
                            onChange={(e) => handleManualPrimary(e.target.value)}
                            className="sr-only"
                          />
                        </label>
                        {hasManualPrimary && (
                          <span className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full border border-black/5" style={{ backgroundColor: secondaryColor }} />
                            <span className="text-[0.68rem] font-mono" style={{ color: WARM_GRAY_500 }}>{secondaryColor}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* ── Camino 3: paletas predefinidas (par tal cual) ── */}
                    {!logoSource && !aiColorSource && (
                      <div className="max-h-28 overflow-y-auto pr-1 -mr-1">
                        <div className="grid grid-cols-4 gap-1.5">
                          {palettes.map((pal) => {
                            const isActive = primaryColor === pal.primary && secondaryColor === pal.secondary;
                            return (
                              <button
                                key={pal.label}
                                type="button"
                                onClick={() => { setAiColorSource(false); setAiColorRationale(null); setPrimaryColor(pal.primary); setSecondaryColor(pal.secondary); }}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
                                style={{
                                  borderColor: isActive ? TEAL : WARM_GRAY_200,
                                  backgroundColor: isActive ? `${TEAL}08` : '#fff',
                                }}
                              >
                                <span className="flex shrink-0">
                                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: pal.primary }} />
                                  <span className="w-4 h-4 rounded-full border border-white/20 -ml-1.5" style={{ backgroundColor: pal.secondary }} />
                                </span>
                                <span className="text-[0.7rem] font-medium truncate" style={{ color: isActive ? TEAL : WARM_GRAY_600 }}>{pal.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {step.hint && (
                      <p className="text-[0.7rem] ml-1" style={{ color: WARM_GRAY_400 }}>
                        {step.hint}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleSend}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[0.82rem] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0"
                        style={{ backgroundColor: TEAL, color: '#fff' }}
                      >
                        Continuar <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Tone selector */}
              {step.type === 'tone_select' && (() => {
                const toneOpts = (step.options || FALLBACK_TONE_OPTIONS) as ToneOption[];
                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {toneOpts.map((opt) => {
                        const isActive = selectedTone === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setSelectedTone(opt.key)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-200 text-[0.82rem] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
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
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!canSend}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[0.82rem] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 disabled:shadow-none disabled:hover:translate-y-0"
                        style={{ backgroundColor: canSend ? TEAL : WARM_GRAY_200, color: '#fff' }}
                      >
                        Continuar <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Modules selection (in conversation mode) */}
              {step.type === 'modules' && (
                <div className="space-y-4">
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
                          className="relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all duration-300 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
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
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[0.84rem] font-semibold transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 disabled:shadow-none disabled:hover:translate-y-0"
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
        style={{ backgroundColor: WARM_GRAY_50 }}
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
        style={{ backgroundColor: WARM_GRAY_50 }}
      >
        {header}

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-lg text-center">
            {/* Pipe happy */}
            <div className="flex justify-center mb-6 animate-in zoom-in duration-300">
              <PipeAvatar mood="happy" size={64} />
            </div>

            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: WARM_GRAY_800, letterSpacing: '-0.03em' }}
            >
              Tu sitio web está listo
            </h2>
            <p
              className="mb-8 text-[0.92rem]"
              style={{ color: WARM_GRAY_500 }}
            >
              {result.template.name} · {sections.length} secciones generadas
            </p>

            {/* Section cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
              {sections.map((key) => (
                <div
                  key={key}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[0.82rem]"
                  style={{
                    backgroundColor: '#fff',
                    borderColor: WARM_GRAY_200,
                    color: WARM_GRAY_800,
                  }}
                >
                  <Check
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: SUCCESS_GREEN }}
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
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg font-medium text-[0.88rem] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40 focus-visible:ring-offset-1"
              style={{
                backgroundColor: TEAL,
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

  // ─── ERROR / LIMIT / UNSUPPORTED STATES ──────────────────
  return (
    <div
      className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]"
      style={{ backgroundColor: WARM_GRAY_50 }}
    >
      {header}

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-5 flex justify-center">
            <PipeAvatar mood="idle" size={48} />
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
                className="mb-2 text-[0.92rem]"
                style={{ color: WARM_GRAY_500 }}
              >
                Usaste todas las generaciones disponibles este mes.
              </p>
              {usageLimitInfo && (
                <p
                  className="mb-6 text-[0.8rem] font-medium"
                  style={{ color: WARM_GRAY_400 }}
                >
                  {usageLimitInfo.used} de {usageLimitInfo.limit} generaciones usadas
                </p>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/precios"
                  className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg text-[0.85rem] font-medium transition-all duration-150"
                  style={{ backgroundColor: TEAL, color: '#fff' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.opacity = '0.92';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  Ver planes
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg border text-[0.85rem] font-medium transition-all duration-150"
                  style={{ borderColor: WARM_GRAY_200, backgroundColor: '#fff', color: WARM_GRAY_500 }}
                >
                  Ir al dashboard
                </button>
              </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
