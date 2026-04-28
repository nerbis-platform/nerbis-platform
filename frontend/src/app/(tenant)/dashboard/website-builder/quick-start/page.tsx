'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
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
  Globe,
  ShoppingCart,
  CalendarCheck,
  Briefcase,
  UserCircle,
} from 'lucide-react';
import Link from 'next/link';
import { quickStartGenerate, QuickStartResponse } from '@/lib/api/websites';
import { configureModules, ModuleSelection } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';

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
    accentColor: NAVY,
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
  { label: 'Testimonios', value: 'Testimonios / Reseñas', defaultOn: true },
  { label: 'Preguntas frecuentes', value: 'Preguntas frecuentes', defaultOn: true },
  { label: 'Galería de fotos', value: 'Galería de fotos', defaultOn: false },
  { label: 'Precios / Tarifas', value: 'Precios / Tarifas', defaultOn: false },
];

// ─── Agent identity ───────────────────────────────────────
const AGENT_NAME = 'Pipe';

const STEPS: ConversationStep[] = [
  {
    id: 'modules',
    message: '¿Qué necesitas para tu negocio?',
    type: 'modules',
    hint: 'Incluye 14 días gratis. Puedes cambiar después.',
  },
  {
    id: 'description',
    message: 'Perfecto. Cuéntame sobre tu negocio — ¿a qué se dedican y qué los hace únicos?',
    type: 'textarea',
    placeholder: 'Ej: Somos un centro de estética en Pedrezuela con 6 años de experiencia, especializados en tratamientos faciales y corporales con productos Germaine de Capuccini...',
    hint: 'Entre más detalles, mejor queda tu sitio.',
    minLength: 20,
    rows: 3,
  },
  {
    id: 'services',
    message: 'Genial. ¿Qué servicios ofreces?',
    type: 'textarea',
    placeholder: 'Ej:\nLimpieza facial profunda\nRadiofrecuencia facial\nPresoterapia corporal\nDepilación láser diodo',
    hint: 'Uno por línea o separados por coma.',
    minLength: 5,
    rows: 4,
  },
  {
    id: 'sections',
    message: 'Última pregunta — ¿qué páginas adicionales quieres?',
    type: 'multiselect',
    hint: 'Puedes agregar más después.',
  },
];

// ─── Pipe keyframe animations (avoids styled-jsx / Turbopack hang) ──
const PIPE_KEYFRAMES = `
@keyframes pipe-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
@keyframes pipe-bob { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-3px) scale(1.03)} }
@keyframes pipe-tilt { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(4deg)} 75%{transform:rotate(-3deg)} }
@keyframes pipe-blink { 0%,42%,44%,100%{transform:scaleY(1)} 43%{transform:scaleY(0.1)} }
@keyframes pipe-antenna { 0%,100%{opacity:.5;filter:drop-shadow(0 0 1px #5EEAD4)} 50%{opacity:1;filter:drop-shadow(0 0 4px #5EEAD4)} }
@keyframes pipe-glow { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:.7;transform:scale(1.1)} }
@keyframes pipe-mouth-think { 0%,100%{transform:scale(1)} 50%{transform:scale(0.8)} }
@keyframes pipe-jump { 0%{transform:translateY(0) scale(1)} 40%{transform:translateY(-5px) scale(1.08)} 70%{transform:translateY(-2px) scale(1.03)} 100%{transform:translateY(0) scale(1)} }
@keyframes pipe-nod { 0%,100%{transform:rotate(0) translateY(0)} 30%{transform:rotate(0) translateY(1px)} 50%{transform:rotate(0) translateY(-1px)} 70%{transform:rotate(0) translateY(1px)} }
@keyframes pipe-nudge { 0%{transform:translateX(0) rotate(0)} 15%{transform:translateX(-3px) rotate(-6deg)} 30%{transform:translateX(3px) rotate(6deg)} 45%{transform:translateX(-2px) rotate(-4deg)} 60%{transform:translateX(2px) rotate(4deg)} 75%{transform:translateX(-1px) rotate(-2deg)} 100%{transform:translateX(0) rotate(0)} }
@media(prefers-reduced-motion:reduce){svg,div{animation:none!important}}
`;

// ─── Pipe Avatar Component ────────────────────────────────
type PipeAvatarMood = 'idle' | 'listening' | 'thinking' | 'happy' | 'surprised' | 'reading' | 'nudge';

function PipeAvatar({
  mood = 'idle',
  size = 36,
}: {
  mood?: PipeAvatarMood;
  size?: number;
}) {
  const s = size;
  const eyeW = s * 0.11;
  const eyeH = s * 0.13;
  const eyeY = s * 0.42;
  const eyeLeftX = s * 0.36;
  const eyeRightX = s * 0.64;
  const mouthY = s * 0.64;
  const [uid] = useState(() => `pipe-${size}-${Math.random().toString(36).slice(2, 6)}`);
  const maxPupilMove = s * 0.025;

  const containerRef = useRef<HTMLDivElement>(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      const clamp = Math.min(dist / 200, 1);
      setPupilOffset({
        x: (dx / dist) * maxPupilMove * clamp,
        y: (dy / dist) * maxPupilMove * clamp,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [maxPupilMove]);

  return (
    <div
      ref={containerRef}
      className="relative flex-shrink-0"
      style={{ width: s, height: s }}
    >
      {/* Glow ring — pulses when thinking */}
      {mood === 'thinking' && (
        <div
          className="absolute rounded-full"
          style={{
            inset: -4,
            background: `radial-gradient(circle, ${TEAL}25 0%, transparent 70%)`,
            animation: 'pipe-glow 2s ease-in-out infinite',
          }}
        />
      )}

      <svg
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
        fill="none"
        style={{
          animation:
            mood === 'thinking'
              ? 'pipe-bob 2s ease-in-out infinite'
              : mood === 'surprised'
                ? 'pipe-jump 0.4s ease-out'
                : mood === 'nudge'
                  ? 'pipe-nudge 0.8s ease-in-out'
                  : mood === 'reading'
                    ? 'pipe-nod 2.5s ease-in-out infinite'
                    : mood === 'listening'
                      ? 'pipe-tilt 3s ease-in-out infinite'
                      : 'pipe-float 4s ease-in-out infinite',
        }}
      >
        <defs>
          <linearGradient id={`${uid}-face`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
          <linearGradient id={`${uid}-shine`} x1="0.3" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Shadow */}
        <rect
          x={s * 0.15}
          y={s * 0.16}
          width={s * 0.74}
          height={s * 0.74}
          rx={s * 0.24}
          fill={NAVY}
          opacity={0.15}
        />

        {/* Head — teal gradient */}
        <rect
          x={s * 0.12}
          y={s * 0.13}
          width={s * 0.76}
          height={s * 0.76}
          rx={s * 0.24}
          fill={`url(#${uid}-face)`}
        />

        {/* Shine overlay */}
        <rect
          x={s * 0.12}
          y={s * 0.13}
          width={s * 0.76}
          height={s * 0.76}
          rx={s * 0.24}
          fill={`url(#${uid}-shine)`}
        />

        {/* Left eye */}
        <ellipse
          cx={eyeLeftX}
          cy={eyeY}
          rx={mood === 'surprised' || mood === 'nudge' ? eyeW * 0.7 : eyeW / 2}
          ry={mood === 'surprised' || mood === 'nudge' ? eyeH * 0.8 : mood === 'reading' ? eyeH * 0.3 : eyeH / 2}
          fill="#fff"
          style={{
            animation: mood === 'surprised' || mood === 'reading' || mood === 'nudge' ? 'none' : 'pipe-blink 3.5s ease-in-out infinite',
            transformOrigin: `${eyeLeftX}px ${eyeY}px`,
            transition: 'rx 0.2s ease-out, ry 0.2s ease-out',
          }}
        />
        {/* Left pupil — follows cursor */}
        <circle
          cx={eyeLeftX + pupilOffset.x}
          cy={eyeY + (mood === 'reading' ? s * 0.01 : 0) + pupilOffset.y}
          r={mood === 'surprised' || mood === 'nudge' ? s * 0.04 : s * 0.035}
          fill={NAVY}
          style={{
            animation: mood === 'surprised' || mood === 'reading' || mood === 'nudge' ? 'none' : 'pipe-blink 3.5s ease-in-out infinite',
            transformOrigin: `${eyeLeftX}px ${eyeY}px`,
            transition: 'cx 0.1s ease-out, cy 0.1s ease-out, r 0.2s ease-out',
          }}
        />

        {/* Right eye */}
        <ellipse
          cx={eyeRightX}
          cy={eyeY}
          rx={mood === 'surprised' || mood === 'nudge' ? eyeW * 0.7 : eyeW / 2}
          ry={mood === 'surprised' || mood === 'nudge' ? eyeH * 0.8 : mood === 'reading' ? eyeH * 0.3 : eyeH / 2}
          fill="#fff"
          style={{
            animation: mood === 'surprised' || mood === 'reading' || mood === 'nudge' ? 'none' : 'pipe-blink 3.5s ease-in-out infinite',
            transformOrigin: `${eyeRightX}px ${eyeY}px`,
            transition: 'rx 0.2s ease-out, ry 0.2s ease-out',
          }}
        />
        {/* Right pupil — follows cursor */}
        <circle
          cx={eyeRightX + pupilOffset.x}
          cy={eyeY + (mood === 'reading' ? s * 0.01 : 0) + pupilOffset.y}
          r={mood === 'surprised' || mood === 'nudge' ? s * 0.04 : s * 0.035}
          fill={NAVY}
          style={{
            animation: mood === 'surprised' || mood === 'reading' || mood === 'nudge' ? 'none' : 'pipe-blink 3.5s ease-in-out infinite',
            transformOrigin: `${eyeRightX}px ${eyeY}px`,
            transition: 'cx 0.1s ease-out, cy 0.1s ease-out, r 0.2s ease-out',
          }}
        />

        {/* Mouth — changes with mood */}
        {mood === 'nudge' ? (
          /* Playful open smile — "hey!" */
          <path
            d={`M ${s * 0.37} ${mouthY} Q ${s * 0.5} ${mouthY + s * 0.12} ${s * 0.63} ${mouthY}`}
            stroke="#fff"
            strokeWidth={s * 0.038}
            strokeLinecap="round"
            fill="rgba(255,255,255,0.3)"
          />
        ) : mood === 'happy' ? (
          /* Big smile */
          <path
            d={`M ${s * 0.35} ${mouthY} Q ${s * 0.5} ${mouthY + s * 0.15} ${s * 0.65} ${mouthY}`}
            stroke="#fff"
            strokeWidth={s * 0.04}
            strokeLinecap="round"
            fill="none"
          />
        ) : mood === 'surprised' ? (
          /* Open mouth — "oh!" */
          <ellipse
            cx={s * 0.5}
            cy={mouthY + s * 0.02}
            rx={s * 0.06}
            ry={s * 0.07}
            fill="#fff"
            opacity={0.9}
          />
        ) : mood === 'thinking' ? (
          /* Small "o" — processing */
          <ellipse
            cx={s * 0.5}
            cy={mouthY + s * 0.02}
            rx={s * 0.045}
            ry={s * 0.04}
            fill="#fff"
            opacity={0.9}
            style={{ animation: 'pipe-mouth-think 2s ease-in-out infinite' }}
          />
        ) : mood === 'reading' ? (
          /* Flat line — concentrated */
          <line
            x1={s * 0.42}
            y1={mouthY + s * 0.02}
            x2={s * 0.58}
            y2={mouthY + s * 0.02}
            stroke="#fff"
            strokeWidth={s * 0.035}
            strokeLinecap="round"
            opacity={0.8}
          />
        ) : (
          /* Gentle smile — default */
          <path
            d={`M ${s * 0.4} ${mouthY} Q ${s * 0.5} ${mouthY + s * 0.08} ${s * 0.6} ${mouthY}`}
            stroke="#fff"
            strokeWidth={s * 0.035}
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Antenna — stalk + glowing dot */}
        <line
          x1={s * 0.5}
          y1={s * 0.13}
          x2={s * 0.5}
          y2={s * 0.03}
          stroke="#5EEAD4"
          strokeWidth={s * 0.03}
          strokeLinecap="round"
          opacity={0.8}
        />
        <circle
          cx={s * 0.5}
          cy={s * 0.02}
          r={s * 0.045}
          fill="#5EEAD4"
          style={{ animation: 'pipe-antenna 2s ease-in-out infinite' }}
        />
      </svg>

      {/* CSS Animations */}
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

  // ─── Generation state ─────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>('chat');
  const [activeMood, setActiveMood] = useState<PipeAvatarMood>('listening');
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
    setActiveMood((prev: string) => prev === newMood ? prev : newMood);
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
      setTimeout(() => {
        setResult(data);
        setPageState('success');
      }, 600);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 402) {
        setPageState('limit-reached');
      } else {
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
      setActiveMood('surprised');
      setTimeout(() => setActiveMood('listening'), 600);

      // Save display string
      const labels = NERBIS_MODULES
        .filter((m) => selectedModules.has(m.key))
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
          has_marketing: false,
        };
        const updatedTenant = await configureModules(payload);
        setTenant(updatedTenant);
      } catch {
        // Non-blocking — continue even if config fails
      }

      setCurrentStepIdx((prev) => prev + 1);
      return;
    }

    // Handle multiselect step (sections)
    if (step.type === 'multiselect') {
      if (selectedSections.size === 0) return;

      setActiveMood('surprised');
      setTimeout(() => setActiveMood('listening'), 600);

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
    setActiveMood('surprised');
    setTimeout(() => setActiveMood('listening'), 600);

    // Save answer
    const newAnswers = { ...answers, [step.id]: value };
    setAnswers(newAnswers);
    setCurrentInput('');

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
  }, [currentStepIdx, currentInput, answers, selectedModules, selectedSections, generateMutation, setTenant]);

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
        style={{ background: `linear-gradient(170deg, ${TEAL}06 0%, ${WARM_GRAY_50} 35%, #fff 100%)` }}
      >
        {header}

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
            {/* Welcome message (always visible) */}
            <div className="flex gap-3">
              <PipeAvatar mood="happy" size={36} />
              <div
                className="flex-1 rounded-2xl rounded-tl-md px-4 py-3"
                style={{ backgroundColor: '#fff', border: `1px solid ${WARM_GRAY_100}` }}
              >
                <p className="text-[0.72rem] font-semibold mb-1.5">
                  <span
                    style={{
                      color: TEAL,
                      fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontSize: '0.68rem',
                    }}
                  >
                    {AGENT_NAME}
                  </span>
                  <span style={{ color: WARM_GRAY_400 }}> · </span>
                  <span style={{ color: WARM_GRAY_500, fontWeight: 500 }}>
                    Asistente inteligente
                  </span>
                </p>
                <p
                  className="text-[0.92rem] leading-relaxed"
                  style={{ color: WARM_GRAY_800 }}
                >
                  Hola{firstName ? ', ' : ''}
                  {firstName && <strong>{firstName}</strong>}
                  {firstName ? '.' : '.'} Soy{' '}
                  <span
                    style={{
                      fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
                      letterSpacing: '0.04em',
                      fontWeight: 600,
                      color: TEAL,
                    }}
                  >
                    {AGENT_NAME}
                  </span>, tu asistente
                  inteligente. Voy a crear tu sitio web en menos de un
                  minuto — solo necesito conocerte un poco.
                </p>
              </div>
            </div>

            {/* Previous answered steps */}
            {STEPS.slice(0, currentStepIdx).map((s) => (
              <div key={s.id} className="space-y-3">
                {/* Bot question — bubble without avatar */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0" style={{ width: 36 }} />
                  <div
                    className="flex-1 rounded-2xl rounded-tl-md px-4 py-3"
                    style={{ backgroundColor: '#fff', border: `1px solid ${WARM_GRAY_100}` }}
                  >
                    <p
                      className="text-[0.92rem] leading-relaxed"
                      style={{ color: WARM_GRAY_800 }}
                    >
                      {s.message}
                    </p>
                  </div>
                </div>
                {/* User answer */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-br-md text-[0.86rem] leading-relaxed whitespace-pre-wrap"
                    style={{
                      backgroundColor: NAVY,
                      color: '#fff',
                    }}
                  >
                    {answers[s.id] || (
                      <span style={{ opacity: 0.6 }}>Omitido</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Current step */}
            {step && (
              <div className="space-y-4">
                {/* Bot question with typing indicator */}
                <div className="flex gap-3">
                  <PipeAvatar mood={isTyping ? 'thinking' : activeMood} size={36} />
                  <div
                    className="flex-1 rounded-2xl rounded-tl-md px-4 py-3"
                    style={{ backgroundColor: '#fff', border: `1px solid ${WARM_GRAY_100}` }}
                  >
                    {isTyping ? (
                      <div className="flex gap-1 py-1">
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
                      <p
                        className="text-[0.92rem] leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-300"
                        style={{ color: WARM_GRAY_800 }}
                      >
                        {step.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Input area (appears after typing) */}
                {!isTyping && (
                  <div className="pl-11 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
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
                                if (mod.alwaysOn) return; // Can't deselect website
                                const next = new Set(selectedModules);
                                if (isSelected) {
                                  next.delete(mod.key);
                                } else {
                                  next.add(mod.key);
                                  next.add('has_website'); // Auto-enable website
                                }
                                setSelectedModules(next);
                              }}
                              className="flex items-start gap-3 px-3.5 py-3.5 rounded-xl border transition-all duration-150 text-left"
                              style={{
                                backgroundColor: isSelected ? `${mod.accentColor}08` : '#fff',
                                borderColor: isSelected ? mod.accentColor : WARM_GRAY_200,
                                cursor: mod.alwaysOn ? 'default' : 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected && !mod.alwaysOn) {
                                  e.currentTarget.style.borderColor = `${mod.accentColor}80`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected && !mod.alwaysOn) {
                                  e.currentTarget.style.borderColor = WARM_GRAY_200;
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
                                    style={{ color: isSelected ? NAVY : WARM_GRAY_600 }}
                                  >
                                    {mod.label}
                                  </span>
                                  {mod.alwaysOn && (
                                    <span
                                      className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded-full"
                                      style={{ backgroundColor: `${TEAL}15`, color: TEAL }}
                                    >
                                      Incluido
                                    </span>
                                  )}
                                </div>
                                <p
                                  className="text-[0.72rem] mt-0.5"
                                  style={{ color: WARM_GRAY_500 }}
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
                                    borderColor: WARM_GRAY_200,
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
                                backgroundColor: isSelected ? `${TEAL}0A` : '#fff',
                                borderColor: isSelected ? TEAL : WARM_GRAY_200,
                                color: isSelected ? NAVY : WARM_GRAY_600,
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = `${TEAL}80`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = WARM_GRAY_200;
                                }
                              }}
                            >
                              <div
                                className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0 transition-colors duration-150"
                                style={{
                                  backgroundColor: isSelected ? TEAL : 'transparent',
                                  borderWidth: isSelected ? 0 : 1.5,
                                  borderColor: WARM_GRAY_200,
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
                          borderColor: WARM_GRAY_200,
                          color: WARM_GRAY_800,
                          // @ts-expect-error -- CSS custom property
                          '--tw-ring-color': `${TEAL}40`,
                        }}
                      />
                    )}

                    {/* Hint + actions */}
                    <div className="flex items-center justify-between mt-3">
                      <p
                        className="text-[0.75rem]"
                        style={{ color: WARM_GRAY_500 }}
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
                            backgroundColor: canSend ? TEAL : WARM_GRAY_200,
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
            borderColor: WARM_GRAY_100,
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
                          ? TEAL
                          : i === currentStepIdx
                            ? NAVY
                            : WARM_GRAY_200,
                      color:
                        i <= currentStepIdx ? '#fff' : WARM_GRAY_500,
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
                      color: i <= currentStepIdx ? NAVY : WARM_GRAY_400,
                    }}
                  >
                    {s.id === 'modules' ? 'Herramientas' : s.id === 'description' ? 'Tu negocio' : s.id === 'services' ? 'Servicios' : 'Páginas'}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-8 h-[2px] rounded-full transition-colors duration-300"
                    style={{
                      backgroundColor: i < currentStepIdx ? TEAL : WARM_GRAY_200,
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
