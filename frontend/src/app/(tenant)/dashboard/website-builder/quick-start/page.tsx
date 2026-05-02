'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import {
  Check,

  ArrowRight,
  Send,
  FileText,
  Layout,
  MessageSquare,
  Search,
  Sparkles,
  LogOut,
  Globe,
  ShoppingCart,
  CalendarCheck,
  Briefcase,
  UserCircle,
} from 'lucide-react';
import Link from 'next/link';
import { quickStartGenerate, QuickStartResponse } from '@/lib/api/websites';
import { configureModules, ModuleSelection, getCurrentUser } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';
import { Tenant } from '@/types';
import {
  PipeAvatar,
  PipeMessage,
  PipeMessageLoading,
  usePipeMood,
  AGENT_NAME,
  PIPE_COLORS,

} from '@/components/pipe';


// ─── Conversational steps ─────────────────────────────────
interface ConversationStep {
  id: string;
  message: string;
  type: 'textarea' | 'input' | 'action' | 'multiselect' | 'modules';
  placeholder?: string;
  hint?: string;
  inputType?: string;
  minLength?: number;
  rows?: number;
}

// ─── NERBIS modules (mirrors setup page) ─────────────────
interface NerbisModule {
  key: keyof ModuleSelection;
  label: string;
  subtitle: string;
  icon: typeof Globe;
  accentColor: string;
  alwaysOn?: boolean; // has_website is always included
}

const NERBIS_MODULES: NerbisModule[] = [
  {
    key: 'has_website',
    label: 'Sitio Web',
    subtitle: 'Presencia online con IA',
    icon: Globe,
    accentColor: PIPE_COLORS.navy,
    alwaysOn: true,
  },
  {
    key: 'has_services',
    label: 'Servicios',
    subtitle: 'Muestra y vende tus servicios',
    icon: Briefcase,
    accentColor: '#8b5cf6',
  },
  {
    key: 'has_bookings',
    label: 'Reservas',
    subtitle: 'Agenda de citas online',
    icon: CalendarCheck,
    accentColor: '#6366f1',
  },
  {
    key: 'has_shop',
    label: 'Tienda Online',
    subtitle: 'Vende productos 24/7',
    icon: ShoppingCart,
    accentColor: '#10b981',
  },
];

// ─── Section options (match backend SECTION_OPTION_MAP keys) ──
interface SectionOption {
  label: string;
  value: string;
  defaultOn: boolean;
}

const SECTION_OPTIONS: SectionOption[] = [
  { label: 'Sobre nosotros', value: 'Sobre nosotros', defaultOn: true },
  { label: 'Testimonios', value: 'Testimonios / Resenas', defaultOn: true },
  { label: 'Preguntas frecuentes', value: 'Preguntas frecuentes', defaultOn: true },
  { label: 'Galeria de fotos', value: 'Galeria de fotos', defaultOn: false },
  { label: 'Precios / Tarifas', value: 'Precios / Tarifas', defaultOn: false },
];

// ─── Pipe's conversation messages ─────────────────────────
// Following PIPE_CHARACTER: onboarding warmth 0.9, formality 0.2,
// short sentences, tuteo, no marketing language, no excessive exclamation
const STEPS: ConversationStep[] = [
  {
    id: 'modules',
    message: 'Primero lo primero — elige las herramientas que necesitas para tu negocio.',
    type: 'modules',
    hint: 'Incluye 14 dias gratis. Puedes cambiar despues.',
  },
  {
    id: 'description',
    message: 'Dale, vamos con eso. Cuentame sobre tu negocio — entre mas detalles, mejor queda tu sitio.',
    type: 'textarea',
    placeholder: 'Ej: Somos un centro de estetica en Pedrezuela con 6 anos de experiencia, especializados en tratamientos faciales y corporales con productos Germaine de Capuccini...',
    hint: 'Se especifico: tipo de negocio, ubicacion, lo que te hace diferente.',
    minLength: 20,
    rows: 3,
  },
  {
    id: 'services',
    message: 'Buena pregunta... bueno, la buena pregunta es mia. Que servicios ofreces?',
    type: 'textarea',
    placeholder: 'Ej:\nLimpieza facial profunda\nRadiofrecuencia facial\nPresoterapia corporal\nDepilacion laser diodo',
    hint: 'Uno por linea o separados por coma.',
    minLength: 5,
    rows: 4,
  },
  {
    id: 'sections',
    message: 'Ya casi — un detalle mas. Que paginas adicionales quieres en tu sitio?',
    type: 'multiselect',
    hint: 'Puedes agregar mas despues.',
  },
];

// ─── Contextual reactions when Pipe receives answers ──────
function getReactionMessage(stepId: string, answer: string): string | null {
  if (stepId === 'modules') {
    const hasShop = answer.toLowerCase().includes('tienda');
    const hasBookings = answer.toLowerCase().includes('reservas');
    if (hasShop && hasBookings) return 'Tienda y reservas, vas con todo.';
    if (hasShop) return 'Buena eleccion con la tienda online.';
    if (hasBookings) return 'Las reservas online ahorran mucho tiempo.';
    return 'Perfecto, siguiente paso.';
  }
  if (stepId === 'description') {
    // Detect industry keywords for contextual reactions
    const lower = answer.toLowerCase();
    if (lower.includes('belleza') || lower.includes('estetica') || lower.includes('salon') || lower.includes('spa'))
      return 'Se nota que conoces tu negocio. Un sitio web va a hacer que te encuentren mas clientes.';
    if (lower.includes('restaurante') || lower.includes('comida') || lower.includes('cocina'))
      return 'Buen contenido. Un sitio web con tu menu va a hacer la diferencia.';
    if (lower.includes('gimnasio') || lower.includes('fitness') || lower.includes('entrenamiento'))
      return 'Eso quedo muy bien. Vamos a armar algo que refleje la energia de tu negocio.';
    return 'Buen contenido, se nota que conoces tu negocio.';
  }
  return null;
}

// ─── Generation progress steps ────────────────────────────
// Using Pipe's voice: first person, warm, specific
const GENERATION_STEPS = [
  { message: 'Estoy leyendo lo que me contaste de tu negocio', icon: FileText },
  { message: 'Eligiendo el diseno que mejor va con tu estilo', icon: Layout },
  { message: 'Escribiendo el contenido de cada seccion', icon: MessageSquare },
  { message: 'Optimizando para que te encuentren en Google', icon: Search },
  { message: 'Ultimos detalles, ya casi queda', icon: Sparkles },
];

const SECTION_LABELS: Record<string, string> = {
  hero: 'Inicio',
  about: 'Sobre nosotros',
  services: 'Servicios',
  products: 'Productos',
  contact: 'Contacto',
  testimonials: 'Testimonios',
  gallery: 'Galeria',
  pricing: 'Precios',
  faq: 'Preguntas frecuentes',
};

// ─── Progressive nudge system ─────────────────────────────
// 3-step nudge: subtle animation, hint message, offer help
const NUDGE_THRESHOLDS = {
  first: 5000,   // 5s — subtle mood change
  second: 8000,  // 8s — contextual hint
  third: 15000,  // 15s — offer help
} as const;

function getNudgeHint(stepId: string): string {
  switch (stepId) {
    case 'modules': return 'Sitio Web ya esta incluido. Activa los que necesites.';
    case 'description': return 'No tiene que ser perfecto — con un par de oraciones me alcanza.';
    case 'services': return 'Puedes poner solo los principales, despues agregas mas.';
    case 'sections': return 'Las marcadas ya son un buen inicio.';
    default: return '';
  }
}

function getNudgeOffer(stepId: string): string {
  switch (stepId) {
    case 'description': return 'Necesitas una mano? Puedo sugerirte algo si me dices a que se dedica tu negocio en una palabra.';
    case 'services': return 'Si no tienes la lista a la mano, escribe los que recuerdes. Siempre puedes editar despues.';
    default: return 'Toma el tiempo que necesites. Estoy aqui.';
  }
}

type PageState = 'chat' | 'generating' | 'success' | 'error' | 'limit-reached';

export default function QuickStartPage() {
  const router = useRouter();
  const { user, tenant, logout, setTenant } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Phase guard: si ya paso onboarding, redirigir ────────
  useEffect(() => {
    if (!tenant) return;
    if (tenant.modules_configured) {
      if (tenant.website_status === 'published') {
        router.replace('/dashboard');
      } else {
        router.replace('/dashboard/website-builder');
      }
    }
  }, [tenant, router]);

  // ─── Pipe mood management via hook ─────────────────────────
  const { mood: pipeMood, setMood: setPipeMood } = usePipeMood({
    initialMood: 'happy',
    idleTimeoutMs: 0, // We manage idle manually via nudge system
  });

  // ─── Conversation state ───────────────────────────────────
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [selectedModules, setSelectedModules] = useState<Set<keyof ModuleSelection>>(
    () => new Set(['has_website'] as (keyof ModuleSelection)[])
  );
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    () => new Set(SECTION_OPTIONS.filter((o) => o.defaultOn).map((o) => o.value))
  );

  // ─── Reaction messages (contextual responses from Pipe) ────
  const [reactionMessages, setReactionMessages] = useState<Record<string, string>>({});

  // ─── Generation state ─────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>('chat');
  const [genStep, setGenStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<QuickStartResponse | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // ─── Progressive nudge state ───────────────────────────────
  const [nudgeLevel, setNudgeLevel] = useState(0); // 0=none, 1=subtle, 2=hint, 3=offer
  const lastInteractionRef = useRef(0);

  // Initialize interaction timestamp
  useEffect(() => { lastInteractionRef.current = Date.now(); }, []);

  // ─── Simulate typing delay for each new message ──────────
  useEffect(() => {
    if (pageState !== 'chat') return;
    setIsTyping(true);
    setPipeMood('thinking');
    const delay = currentStepIdx === 0 ? 800 : 500;
    const timer = setTimeout(() => {
      setIsTyping(false);
      setPipeMood('listening');
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIdx, pageState]);

  // ─── Active mood reacts to user typing ───────────────────
  useEffect(() => {
    if (pageState !== 'chat' || isTyping) return;
    if (currentInput.trim().length > 0) {
      setPipeMood('reading');
    } else if (nudgeLevel === 0) {
      setPipeMood('listening');
    }
  }, [currentInput, pageState, isTyping, nudgeLevel, setPipeMood]);

  // ─── Reset nudge on any interaction ────────────────────────
  useEffect(() => {
    lastInteractionRef.current = Date.now();
    setNudgeLevel(0);
  }, [currentInput, currentStepIdx, selectedModules, selectedSections]);

  // ─── Progressive nudge system (3 steps) ────────────────────
  useEffect(() => {
    if (pageState !== 'chat' || isTyping) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastInteractionRef.current;

      if (elapsed >= NUDGE_THRESHOLDS.third && nudgeLevel < 3) {
        setNudgeLevel(3);
        setPipeMood('sleepy');
      } else if (elapsed >= NUDGE_THRESHOLDS.second && nudgeLevel < 2) {
        setNudgeLevel(2);
        setPipeMood('nudge');
      } else if (elapsed >= NUDGE_THRESHOLDS.first && nudgeLevel < 1) {
        setNudgeLevel(1);
        setPipeMood('nudge');
        // Return to listening after nudge animation
        setTimeout(() => {
          setPipeMood('listening');
        }, 1200);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pageState, isTyping, nudgeLevel, setPipeMood]);

  // ─── Auto-scroll to bottom ───────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentStepIdx, isTyping, pageState, nudgeLevel]);

  // ─── Mutation ─────────────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: () =>
      quickStartGenerate({
        business_description: answers.description || '',
        main_services: answers.services || '',
        website_sections: Array.from(selectedSections),
      }),
    onSuccess: (data) => {
      setProgress(100);
      // Refresh tenant in context so phase guards see updated website_status
      getCurrentUser().then(() => {
        const stored = localStorage.getItem('tenant');
        if (stored) setTenant(JSON.parse(stored) as Tenant);
      }).catch(() => {});
      setTimeout(() => {
        setResult(data);
        setPageState('success');
      }, 600);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 402) {
        setPageState('limit-reached');
      } else {
        setRetryCount((prev) => prev + 1);
        setPageState('error');
      }
    },
  });

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
    const step = STEPS[currentStepIdx];
    if (!step) return;

    // Handle modules step — call configureModules API
    if (step.type === 'modules') {
      setPipeMood('surprised');
      setTimeout(() => setPipeMood('listening'), 600);

      // Save display string
      const labels = NERBIS_MODULES
        .filter((m) => selectedModules.has(m.key))
        .map((m) => m.label);
      const answerStr = labels.join(', ');
      const newAnswers = { ...answers, [step.id]: answerStr };
      setAnswers(newAnswers);

      // Generate reaction
      const reaction = getReactionMessage(step.id, answerStr);
      if (reaction) {
        setReactionMessages((prev) => ({ ...prev, [step.id]: reaction }));
      }

      // Call configure-modules API
      try {
        const payload: ModuleSelection = {
          has_website: selectedModules.has('has_website'),
          has_shop: selectedModules.has('has_shop'),
          has_bookings: selectedModules.has('has_bookings'),
          has_services: selectedModules.has('has_services'),
          has_marketing: false,
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

    // Handle multiselect step (sections)
    if (step.type === 'multiselect') {
      if (selectedSections.size === 0) return;

      setPipeMood('surprised');
      setTimeout(() => setPipeMood('listening'), 600);

      const labels = SECTION_OPTIONS
        .filter((o) => selectedSections.has(o.value))
        .map((o) => o.label);
      const newAnswers = { ...answers, [step.id]: labels.join(', ') };
      setAnswers(newAnswers);

      // This is the last step — start generating
      setPageState('generating');
      setGenStep(0);
      setProgress(0);
      setTimeout(() => generateMutation.mutate(), 100);
      return;
    }

    const value = currentInput.trim();
    const minLen = step.minLength || 0;

    if (value.length < minLen) return;

    // Pipe reacts — surprised briefly, then moves on
    setPipeMood('surprised');
    setTimeout(() => setPipeMood('listening'), 600);

    // Save answer & generate reaction
    const newAnswers = { ...answers, [step.id]: value };
    setAnswers(newAnswers);
    setCurrentInput('');

    const reaction = getReactionMessage(step.id, value);
    if (reaction) {
      setReactionMessages((prev) => ({ ...prev, [step.id]: reaction }));
    }

    // Next step
    if (currentStepIdx < STEPS.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      // All questions answered — start generating
      setPageState('generating');
      setGenStep(0);
      setProgress(0);
      setTimeout(() => generateMutation.mutate(), 100);
    }
  }, [currentStepIdx, currentInput, answers, selectedModules, selectedSections, generateMutation, setTenant, setPipeMood]);

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
    if (retryCount >= 2) {
      // After 2 failures, go back to chat with data preserved
      setPageState('chat');
      setCurrentStepIdx(STEPS.length - 1); // Go to last step
    } else {
      // Retry generation with same data
      setPageState('generating');
      setGenStep(0);
      setProgress(0);
      setTimeout(() => generateMutation.mutate(), 100);
    }
  }, [retryCount, generateMutation]);

  const handleRestart = useCallback(() => {
    setPageState('chat');
    setCurrentStepIdx(0);
    setAnswers({});
    setCurrentInput('');
    setGenStep(0);
    setProgress(0);
    setResult(null);
    setRetryCount(0);
    setReactionMessages({});
  }, []);

  const firstName = user?.first_name || tenant?.name?.split(' ')[0] || '';

  // ─── HEADER (shared across all states) ────────────────────
  const header = (
    <div
      className="sticky top-0 z-10 border-b"
      style={{
        backgroundColor: '#fff',
        borderColor: PIPE_COLORS.warmGray100,
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
            style={{ color: PIPE_COLORS.navy }}
          >
            NERBIS
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-1.5 text-[0.72rem] font-medium transition-colors"
            style={{ color: PIPE_COLORS.warmGray400 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = PIPE_COLORS.navy)}
            onMouseLeave={(e) => (e.currentTarget.style.color = PIPE_COLORS.warmGray400)}
          >
            <UserCircle className="w-3.5 h-3.5" />
            Mi cuenta
          </Link>
          <span style={{ color: PIPE_COLORS.warmGray200 }}>|</span>
          <button
            type="button"
            onClick={() => logout('/register-business')}
            className="flex items-center gap-1.5 text-[0.72rem] font-medium transition-colors cursor-pointer"
            style={{ color: PIPE_COLORS.warmGray400 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = PIPE_COLORS.warmGray400)}
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      </div>
    </div>
  );

  // ─── CHAT STATE ───────────────────────────────────────────
  if (pageState === 'chat') {
    const step = STEPS[currentStepIdx];
    const minLen = step?.minLength || 0;
    const canSend = step?.type === 'modules'
      ? selectedModules.size > 0
      : step?.type === 'multiselect'
        ? selectedSections.size > 0
        : currentInput.trim().length >= minLen;

    return (
      <div
        className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]"
        style={{ background: `linear-gradient(170deg, ${PIPE_COLORS.teal}06 0%, ${PIPE_COLORS.warmGray50} 35%, #fff 100%)` }}
      >
        {header}

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-4">
            {/* Welcome message (always visible) */}
            <PipeMessage variant="pipe" animate={false}>
              <p className="text-[0.72rem] font-semibold mb-1.5">
                <span
                  style={{
                    color: PIPE_COLORS.teal,
                    fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontSize: '0.68rem',
                  }}
                >
                  {AGENT_NAME}
                </span>
                <span style={{ color: PIPE_COLORS.warmGray400 }}> · </span>
                <span style={{ color: PIPE_COLORS.warmGray500, fontWeight: 500 }}>
                  Tu asistente
                </span>
              </p>
              <p
                className="text-[0.92rem] leading-relaxed"
                style={{ color: PIPE_COLORS.warmGray800 }}
              >
                Hola{firstName ? ', ' : ''}
                {firstName && <strong>{firstName}</strong>}
                {firstName ? '.' : '.'} Soy{' '}
                <span
                  style={{
                    fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
                    letterSpacing: '0.04em',
                    fontWeight: 600,
                    color: PIPE_COLORS.teal,
                  }}
                >
                  {AGENT_NAME}
                </span>. Vamos a crear tu sitio web en menos de un
                minuto — solo necesito conocerte un poco.
              </p>
            </PipeMessage>

            {/* Previous answered steps */}
            {STEPS.slice(0, currentStepIdx).map((s) => (
              <div key={s.id} className="flex flex-col gap-3">
                {/* Pipe's question */}
                <PipeMessage variant="pipe" animate={false}>
                  <p
                    className="text-[0.92rem] leading-relaxed"
                    style={{ color: PIPE_COLORS.warmGray800 }}
                  >
                    {s.message}
                  </p>
                </PipeMessage>
                {/* User answer */}
                <PipeMessage variant="user" animate={false}>
                  <span className="text-[0.86rem] leading-relaxed whitespace-pre-wrap">
                    {answers[s.id] || (
                      <span style={{ opacity: 0.6 }}>Omitido</span>
                    )}
                  </span>
                </PipeMessage>
                {/* Pipe's contextual reaction (if any) */}
                {reactionMessages[s.id] && (
                  <PipeMessage variant="pipe" animate={false}>
                    <p
                      className="text-[0.88rem] leading-relaxed"
                      style={{ color: PIPE_COLORS.warmGray600 }}
                    >
                      {reactionMessages[s.id]}
                    </p>
                  </PipeMessage>
                )}
              </div>
            ))}

            {/* Current step */}
            {step && (
              <div className="flex flex-col gap-4">
                {/* Pipe's question with typing indicator */}
                {isTyping ? (
                  <PipeMessageLoading />
                ) : (
                  <PipeMessage variant="pipe">
                    <p
                      className="text-[0.92rem] leading-relaxed"
                      style={{ color: PIPE_COLORS.warmGray800 }}
                    >
                      {step.message}
                    </p>
                  </PipeMessage>
                )}

                {/* Progressive nudge messages */}
                {!isTyping && nudgeLevel >= 2 && (
                  <PipeMessage variant="pipe">
                    <p
                      className="text-[0.85rem] leading-relaxed"
                      style={{ color: PIPE_COLORS.warmGray500 }}
                    >
                      {nudgeLevel >= 3
                        ? getNudgeOffer(step.id)
                        : getNudgeHint(step.id)}
                    </p>
                  </PipeMessage>
                )}

                {/* Pipe avatar for current step (with mood) */}
                {!isTyping && (
                  <div className="flex items-start gap-3 pl-1">
                    <PipeAvatar mood={pipeMood} size="sm" />
                    <div className="flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                      {/* ── Module selection cards ── */}
                      {step.type === 'modules' && (
                        <div className="grid grid-cols-2 gap-2.5">
                          {NERBIS_MODULES.map((mod) => {
                            const isSelected = selectedModules.has(mod.key);
                            const ModIcon = mod.icon;
                            return (
                              <button
                                key={mod.key}
                                type="button"
                                onClick={() => {
                                  if (mod.alwaysOn) return;
                                  const next = new Set(selectedModules);
                                  if (isSelected) {
                                    next.delete(mod.key);
                                  } else {
                                    next.add(mod.key);
                                    next.add('has_website');
                                  }
                                  setSelectedModules(next);
                                }}
                                className="flex items-start gap-3 px-3.5 py-3.5 rounded-xl border transition-all duration-150 text-left"
                                style={{
                                  backgroundColor: isSelected ? `${mod.accentColor}08` : '#fff',
                                  borderColor: isSelected ? mod.accentColor : PIPE_COLORS.warmGray200,
                                  cursor: mod.alwaysOn ? 'default' : 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected && !mod.alwaysOn) {
                                    e.currentTarget.style.borderColor = `${mod.accentColor}80`;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected && !mod.alwaysOn) {
                                    e.currentTarget.style.borderColor = PIPE_COLORS.warmGray200;
                                  }
                                }}
                              >
                                <div
                                  className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 mt-0.5"
                                  style={{ backgroundColor: `${mod.accentColor}12` }}
                                >
                                  <ModIcon
                                    className="w-4 h-4"
                                    style={{ color: mod.accentColor }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="text-[0.84rem] font-semibold"
                                      style={{ color: isSelected ? PIPE_COLORS.navy : PIPE_COLORS.warmGray600 }}
                                    >
                                      {mod.label}
                                    </span>
                                    {mod.alwaysOn && (
                                      <span
                                        className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded-full"
                                        style={{ backgroundColor: `${PIPE_COLORS.teal}15`, color: PIPE_COLORS.teal }}
                                      >
                                        Incluido
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className="text-[0.72rem] mt-0.5"
                                    style={{ color: PIPE_COLORS.warmGray500 }}
                                  >
                                    {mod.subtitle}
                                  </p>
                                </div>
                                {!mod.alwaysOn && (
                                  <div
                                    className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0 mt-1 transition-colors duration-150"
                                    style={{
                                      backgroundColor: isSelected ? mod.accentColor : 'transparent',
                                      borderWidth: isSelected ? 0 : 1.5,
                                      borderColor: PIPE_COLORS.warmGray200,
                                    }}
                                  >
                                    {isSelected && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Section multi-select ── */}
                      {step.type === 'multiselect' && (
                        <div className="grid grid-cols-2 gap-2">
                          {SECTION_OPTIONS.map((option) => {
                            const isSelected = selectedSections.has(option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  const next = new Set(selectedSections);
                                  if (isSelected) {
                                    next.delete(option.value);
                                  } else {
                                    next.add(option.value);
                                  }
                                  setSelectedSections(next);
                                }}
                                className="flex items-center gap-2 px-3.5 py-3 rounded-xl text-[0.84rem] font-medium border transition-all duration-150 cursor-pointer text-left"
                                style={{
                                  backgroundColor: isSelected ? `${PIPE_COLORS.teal}0A` : '#fff',
                                  borderColor: isSelected ? PIPE_COLORS.teal : PIPE_COLORS.warmGray200,
                                  color: isSelected ? PIPE_COLORS.navy : PIPE_COLORS.warmGray600,
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = `${PIPE_COLORS.teal}80`;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = PIPE_COLORS.warmGray200;
                                  }
                                }}
                              >
                                <div
                                  className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0 transition-colors duration-150"
                                  style={{
                                    backgroundColor: isSelected ? PIPE_COLORS.teal : 'transparent',
                                    borderWidth: isSelected ? 0 : 1.5,
                                    borderColor: PIPE_COLORS.warmGray200,
                                  }}
                                >
                                  {isSelected && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Textarea ── */}
                      {step.type === 'textarea' && (
                        <textarea
                          value={currentInput}
                          onChange={(e) => setCurrentInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={step.placeholder}
                          rows={step.rows || 3}
                          autoFocus
                          className="w-full rounded-xl border px-4 py-3 text-[0.88rem] leading-relaxed resize-none transition-all duration-150 focus:outline-none focus:ring-2"
                          style={{
                            backgroundColor: '#fff',
                            borderColor: PIPE_COLORS.warmGray200,
                            color: PIPE_COLORS.warmGray800,
                            // @ts-expect-error -- CSS custom property
                            '--tw-ring-color': `${PIPE_COLORS.teal}40`,
                          }}
                        />
                      )}

                      {/* Hint + actions */}
                      <div className="flex items-center justify-between mt-3">
                        <p
                          className="text-[0.75rem]"
                          style={{ color: PIPE_COLORS.warmGray500 }}
                        >
                          {step.hint}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSend}
                            disabled={!canSend}
                            className={`flex items-center justify-center rounded-xl transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
                              step.type === 'modules' || step.type === 'multiselect'
                                ? 'h-9 px-4 gap-1.5 text-[0.82rem] font-medium'
                                : 'w-9 h-9'
                            }`}
                            style={{
                              backgroundColor: canSend ? PIPE_COLORS.teal : PIPE_COLORS.warmGray200,
                              color: '#fff',
                            }}
                            onMouseEnter={(e) => {
                              if (canSend) e.currentTarget.style.opacity = '0.85';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                          >
                            {step.type === 'modules' || step.type === 'multiselect' ? (
                              <>
                                Continuar
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Progress indicator */}
        <div
          className="border-t px-6 py-3"
          style={{
            backgroundColor: '#fff',
            borderColor: PIPE_COLORS.warmGray100,
          }}
        >
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center w-6 h-6 rounded-full text-[0.65rem] font-semibold transition-all duration-300"
                    style={{
                      backgroundColor:
                        i < currentStepIdx
                          ? PIPE_COLORS.teal
                          : i === currentStepIdx
                            ? PIPE_COLORS.navy
                            : PIPE_COLORS.warmGray200,
                      color:
                        i <= currentStepIdx ? '#fff' : PIPE_COLORS.warmGray500,
                    }}
                  >
                    {i < currentStepIdx ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className="text-[0.72rem] font-medium hidden sm:inline"
                    style={{
                      color: i <= currentStepIdx ? PIPE_COLORS.navy : PIPE_COLORS.warmGray400,
                    }}
                  >
                    {s.id === 'modules' ? 'Herramientas' : s.id === 'description' ? 'Tu negocio' : s.id === 'services' ? 'Servicios' : 'Paginas'}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-8 h-[2px] rounded-full transition-colors duration-300"
                    style={{
                      backgroundColor: i < currentStepIdx ? PIPE_COLORS.teal : PIPE_COLORS.warmGray200,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── GENERATING STATE ─────────────────────────────────────
  if (pageState === 'generating') {
    return (
      <div
        className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]"
        style={{ background: `linear-gradient(170deg, ${PIPE_COLORS.teal}06 0%, ${PIPE_COLORS.warmGray50} 35%, #fff 100%)` }}
      >
        {header}

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-md text-center">
            {/* Pipe thinking */}
            <div className="flex justify-center mb-8">
              <PipeAvatar mood="thinking" size="xl" />
            </div>

            <h2
              className="text-xl font-semibold mb-2"
              style={{ color: PIPE_COLORS.warmGray800, letterSpacing: '-0.02em' }}
            >
              Ahi va, estoy armando tu sitio
            </h2>
            <p
              className="mb-8 transition-all duration-500 text-[0.92rem]"
              style={{ color: PIPE_COLORS.warmGray500 }}
            >
              {GENERATION_STEPS[genStep].message}...
            </p>

            {/* Progress bar */}
            <div
              className="w-full rounded-full h-1.5 mb-2"
              style={{ backgroundColor: PIPE_COLORS.warmGray200 }}
            >
              <div
                className="h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: PIPE_COLORS.teal,
                }}
              />
            </div>
            <p
              className="text-[0.72rem] font-medium"
              style={{ color: PIPE_COLORS.warmGray400 }}
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
        style={{ background: `linear-gradient(170deg, ${PIPE_COLORS.teal}06 0%, ${PIPE_COLORS.warmGray50} 35%, #fff 100%)` }}
      >
        {header}

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-lg text-center">
            {/* Pipe celebrating */}
            <div className="flex justify-center mb-6 animate-in zoom-in duration-300">
              <PipeAvatar mood="celebrating" size="lg" />
            </div>

            <h2
              className="text-2xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ color: PIPE_COLORS.warmGray800, letterSpacing: '-0.03em' }}
            >
              Listo, ya quedo.
            </h2>
            <p
              className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 text-[0.92rem]"
              style={{ color: PIPE_COLORS.warmGray500, animationDelay: '100ms' }}
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
                    borderColor: PIPE_COLORS.warmGray200,
                    color: PIPE_COLORS.warmGray800,
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
                backgroundColor: PIPE_COLORS.navy,
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
  // Pipe shows confused mood and uses empathetic, actionable language
  const isLimitReached = pageState === 'limit-reached';
  const hasRetriedTooMuch = retryCount >= 2;

  return (
    <div
      className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]"
      style={{ backgroundColor: PIPE_COLORS.warmGray50 }}
    >
      {header}

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          {/* Pipe with confused mood instead of generic error icon */}
          <div className="flex justify-center mb-6">
            <PipeAvatar mood="confused" size="lg" />
          </div>

          {isLimitReached ? (
            <>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: PIPE_COLORS.warmGray800, letterSpacing: '-0.02em' }}
              >
                Limite de generaciones alcanzado
              </h2>
              <p
                className="mb-6 text-[0.92rem]"
                style={{ color: PIPE_COLORS.warmGray500 }}
              >
                Usaste todas las generaciones de este mes. Mejora tu plan para continuar.
              </p>
            </>
          ) : hasRetriedTooMuch ? (
            <>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: PIPE_COLORS.warmGray800, letterSpacing: '-0.02em' }}
              >
                No pude generar tu sitio
              </h2>
              <p
                className="mb-6 text-[0.92rem]"
                style={{ color: PIPE_COLORS.warmGray500 }}
              >
                A veces la tecnologia nos juega malas pasadas. Vamos a intentar de nuevo con datos frescos.
              </p>
            </>
          ) : (
            <>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: PIPE_COLORS.warmGray800, letterSpacing: '-0.02em' }}
              >
                Algo salio mal con la generacion
              </h2>
              <p
                className="mb-6 text-[0.92rem]"
                style={{ color: PIPE_COLORS.warmGray500 }}
              >
                No te preocupes, tus datos estan guardados. Puedo intentar de nuevo.
              </p>
            </>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={hasRetriedTooMuch ? handleRestart : handleRetry}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg text-[0.85rem] font-medium transition-all duration-150"
              style={{
                backgroundColor: PIPE_COLORS.navy,
                color: '#fff',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.92';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {hasRetriedTooMuch ? 'Empezar de nuevo' : 'Intentar de nuevo'}
            </button>
            {!isLimitReached && !hasRetriedTooMuch && (
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg border text-[0.85rem] font-medium transition-all duration-150"
                style={{
                  borderColor: PIPE_COLORS.warmGray200,
                  backgroundColor: '#fff',
                  color: PIPE_COLORS.warmGray800,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = PIPE_COLORS.warmGray100;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                }}
              >
                Empezar de nuevo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
