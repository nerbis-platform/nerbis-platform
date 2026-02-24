'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Check,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Lock,
  Layout,
  Search,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { getOnboardingStatus, generateContent, getWebsiteConfig } from '@/lib/api/websites';
import { GenerateContentResponse } from '@/types';
import { ApiError } from '@/lib/api/client';

// ─── Status messages shown during generation ─────────────────
const GENERATION_STEPS = [
  { message: 'Analizando tu información...', icon: FileText },
  { message: 'Diseñando la estructura...', icon: Layout },
  { message: 'Escribiendo contenido personalizado...', icon: MessageSquare },
  { message: 'Optimizando para buscadores...', icon: Search },
  { message: 'Dando los toques finales...', icon: Sparkles },
];

// Nombres amigables para las secciones generadas
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
  footer: 'Pie de página',
  team: 'Equipo',
  blog: 'Blog',
};

type PageState = 'checking' | 'generating' | 'success' | 'error' | 'limit-reached';

interface LimitError {
  used: number;
  limit: number;
}

// ─── Main page ───────────────────────────────────────────────
export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isNavBack = searchParams.get('nav') === '1';
  const [pageState, setPageState] = useState<PageState>('checking');
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GenerateContentResponse | null>(null);
  const [limitError, setLimitError] = useState<LimitError | null>(null);
  const hasTriggered = useRef(false);

  // Check onboarding status
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: getOnboardingStatus,
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: () => generateContent(),
    onSuccess: (data) => {
      // Invalidate so editor reads the updated status ('review') instead of stale 'generating'
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus'] });
      setProgress(100);
      setTimeout(() => {
        setResult(data);
        setPageState('success');
      }, 600);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 402) {
        const data = error.data as Record<string, number> | undefined;
        setLimitError({ used: data?.used ?? 0, limit: data?.limit ?? 0 });
        setPageState('limit-reached');
      } else {
        setPageState('error');
      }
    },
  });

  // Redirect based on status (skip forward-redirect if user navigated back via stepper)
  useEffect(() => {
    if (isLoading || !statusData) return;

    const { status } = statusData;

    if (status === 'not_started' || status === 'draft') {
      router.push('/dashboard/website-builder');
    } else if ((status === 'review' || status === 'published') && !isNavBack) {
      router.push('/dashboard/website-builder/editor');
    } else if ((status === 'review' || status === 'published') && isNavBack) {
      // User navigated back — show existing generated content
      if (!hasTriggered.current) {
        hasTriggered.current = true;
        getWebsiteConfig().then((config) => {
          if (config?.content_data) {
            setResult({
              content_data: config.content_data,
              seo_data: config.seo_data ?? {},
              tokens_used: 0,
              remaining_generations: config.remaining_generations ?? 0,
              is_billable: false,
              status: config.status,
            });
            setPageState('success');
          } else {
            router.push('/dashboard/website-builder/editor');
          }
        });
      }
    } else if (status === 'onboarding' || status === 'generating') {
      // Ready to generate
      if (!hasTriggered.current) {
        hasTriggered.current = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPageState('generating');
        generateMutation.mutate();
      }
    }
  }, [statusData, isLoading, router, generateMutation, isNavBack]);

  // Rotate status messages during generation
  useEffect(() => {
    if (pageState !== 'generating') return;

    const interval = setInterval(() => {
      setCurrentStep((prev) =>
        prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [pageState]);

  // Simulate progress bar
  useEffect(() => {
    if (pageState !== 'generating') return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) return 88;
        // Slow down as it approaches 88%
        const increment = prev < 40 ? 3 : prev < 70 ? 1.5 : 0.5;
        return Math.min(88, prev + increment);
      });
    }, 300);

    return () => clearInterval(interval);
  }, [pageState]);

  // Retry generation
  const handleRetry = useCallback(() => {
    setPageState('generating');
    setCurrentStep(0);
    setProgress(0);
    setResult(null);
    setLimitError(null);
    generateMutation.mutate();
  }, [generateMutation]);

  // ─── Checking state ──────────────────────────────────────
  if (pageState === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-12 h-12 rounded-full bg-[#E2F3F1] flex items-center justify-center mb-4">
          <Sparkles className="h-5 w-5 text-[#95D0C9] animate-pulse" />
        </div>
        <p className="text-[0.85rem] text-gray-400">Preparando la generación...</p>
      </div>
    );
  }

  // ─── Generating state ────────────────────────────────────
  if (pageState === 'generating') {
    const step = GENERATION_STEPS[currentStep];
    const StepIcon = step.icon;

    return (
      <>
        <style jsx global>{`
          @keyframes fade-up {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes gentle-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.08); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .fade-up { animation: fade-up 0.4s ease-out forwards; }
          .gentle-pulse { animation: gentle-pulse 2s ease-in-out infinite; }
        `}</style>

        <div className="flex flex-col items-center justify-center py-24 fade-up">
          {/* Animated icon */}
          <div className="relative mb-10">
            <div className="w-24 h-24 rounded-full bg-[#E2F3F1] flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-[#95D0C9] gentle-pulse" />
            </div>
            {/* Orbiting dots */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#95D0C9]/40" />
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }}>
              <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rounded-full bg-[#1C3B57]/20" />
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-[1.8rem] sm:text-[2.2rem] leading-[1.1] tracking-[-0.03em] text-center mb-3"
            style={{ color: '#1C3B57', fontWeight: 300 }}
          >
            Estamos creando
            <br />
            <span style={{ fontWeight: 600 }}>
              tu{' '}
              <span className="text-[#95D0C9]">sitio web</span>
            </span>
          </h1>

          <p className="text-[0.85rem] text-gray-400 mb-10 text-center">
            Nuestra IA está diseñando contenido único para tu negocio.
          </p>

          {/* Progress bar */}
          <div className="w-full max-w-sm mb-8">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #95D0C9, #1C3B57)',
                }}
              />
            </div>
            <p className="text-[0.72rem] text-gray-400 text-right mt-1.5">
              {Math.round(progress)}%
            </p>
          </div>

          {/* Current step message */}
          <div
            key={currentStep}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white border border-gray-100 shadow-sm fade-up"
          >
            <StepIcon className="h-4 w-4 text-[#95D0C9] shrink-0" />
            <span className="text-[0.82rem] text-gray-500">
              {step.message}
            </span>
          </div>
        </div>
      </>
    );
  }

  // ─── Success state ───────────────────────────────────────
  if (pageState === 'success' && result) {
    const sections = result.content_data ? Object.keys(result.content_data) : [];
    const seoReady = result.seo_data && Object.keys(result.seo_data).length > 0;

    return (
      <>
        <style jsx global>{`
          @keyframes fade-up {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scale-in {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
          }
          .fade-up { animation: fade-up 0.4s ease-out forwards; }
          .scale-in { animation: scale-in 0.3s ease-out forwards; }
          .fade-up-delay-1 { animation: fade-up 0.4s ease-out 0.15s forwards; opacity: 0; }
          .fade-up-delay-2 { animation: fade-up 0.4s ease-out 0.3s forwards; opacity: 0; }
        `}</style>

        <div className="flex flex-col items-center py-16">
          {/* Success icon */}
          <div className="w-20 h-20 rounded-full bg-[#E2F3F1] flex items-center justify-center mb-6 scale-in">
            <Check className="h-9 w-9 text-[#1C3B57]" strokeWidth={2.5} />
          </div>

          {/* Title */}
          <h1
            className="text-[1.8rem] sm:text-[2.2rem] leading-[1.1] tracking-[-0.03em] text-center mb-3 fade-up"
            style={{ color: '#1C3B57', fontWeight: 300 }}
          >
            Tu sitio web
            <br />
            <span style={{ fontWeight: 600 }}>
              ha sido{' '}
              <span className="text-[#95D0C9]">generado</span>
            </span>
          </h1>

          <p className="text-[0.85rem] text-gray-400 mb-10 text-center max-w-md fade-up">
            La IA ha creado contenido personalizado basado en la información de tu negocio.
            Ahora puedes revisarlo y editarlo a tu gusto.
          </p>

          {/* Summary cards */}
          <div className="w-full max-w-md space-y-3 mb-10 fade-up-delay-1">
            {/* Sections generated */}
            {sections.length > 0 && (
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white border border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-[#E2F3F1] flex items-center justify-center shrink-0">
                  <Layout className="h-4 w-4 text-[#1C3B57]" />
                </div>
                <div>
                  <p className="text-[0.82rem] font-medium text-gray-800">
                    {sections.length} secciones creadas
                  </p>
                  <p className="text-[0.72rem] text-gray-400">
                    {sections.map((s) => SECTION_LABELS[s] || s).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* SEO */}
            {seoReady && (
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white border border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-[#E2F3F1] flex items-center justify-center shrink-0">
                  <Search className="h-4 w-4 text-[#1C3B57]" />
                </div>
                <div>
                  <p className="text-[0.82rem] font-medium text-gray-800">
                    SEO optimizado
                  </p>
                  <p className="text-[0.72rem] text-gray-400">
                    Títulos, descripciones y keywords configurados
                  </p>
                </div>
              </div>
            )}

            {/* Remaining generations */}
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white border border-gray-100">
              <div className="w-9 h-9 rounded-lg bg-[#E2F3F1] flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-[#1C3B57]" />
              </div>
              <div>
                <p className="text-[0.82rem] font-medium text-gray-800">
                  {result.remaining_generations} generaciones restantes
                </p>
                <p className="text-[0.72rem] text-gray-400">
                  Disponibles este mes para regenerar contenido
                </p>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="fade-up-delay-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard/website-builder/editor?nav=1')}
              className="flex items-center gap-2.5 h-12 px-8 rounded-xl text-white text-[0.88rem] font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98] cursor-pointer"
              style={{ background: '#1C3B57' }}
            >
              Personalizar mi sitio
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Limit reached state ─────────────────────────────────
  if (pageState === 'limit-reached') {
    return (
      <>
        <style jsx global>{`
          @keyframes fade-up {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .fade-up { animation: fade-up 0.4s ease-out forwards; }
        `}</style>

        <div className="flex flex-col items-center justify-center py-24 fade-up">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-6">
            <Lock className="h-8 w-8 text-amber-500" />
          </div>

          <h1
            className="text-[1.6rem] sm:text-[1.8rem] leading-[1.1] tracking-[-0.02em] text-center mb-3"
            style={{ color: '#1C3B57', fontWeight: 600 }}
          >
            Límite de generaciones alcanzado
          </h1>

          <p className="text-[0.85rem] text-gray-400 mb-6 text-center max-w-sm">
            Has usado{' '}
            <span className="font-semibold text-gray-600">
              {limitError?.used} de {limitError?.limit}
            </span>{' '}
            generaciones disponibles este mes.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard/website-builder')}
              className="h-10 px-5 rounded-lg border border-gray-200 text-gray-500 text-[0.82rem] font-medium transition-all hover:border-gray-300 hover:text-gray-600 cursor-pointer"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => router.push('/plans')}
              className="flex items-center gap-2 h-10 px-5 rounded-lg text-white text-[0.82rem] font-medium transition-all duration-150 hover:opacity-90 cursor-pointer"
              style={{ background: '#1C3B57' }}
            >
              Ver planes
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Error state ─────────────────────────────────────────
  return (
    <>
      <style jsx global>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fade-up 0.4s ease-out forwards; }
      `}</style>

      <div className="flex flex-col items-center justify-center py-24 fade-up">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>

        <h1
          className="text-[1.6rem] sm:text-[1.8rem] leading-[1.1] tracking-[-0.02em] text-center mb-3"
          style={{ color: '#1C3B57', fontWeight: 600 }}
        >
          Error al generar
        </h1>

        <p className="text-[0.85rem] text-gray-400 mb-8 text-center max-w-sm">
          Hubo un problema al generar el contenido de tu sitio web.
          Puedes intentarlo de nuevo.
        </p>

        <button
          type="button"
          onClick={handleRetry}
          className="flex items-center gap-2 h-11 px-6 rounded-lg text-white text-[0.85rem] font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98] cursor-pointer"
          style={{ background: '#1C3B57' }}
        >
          <RotateCcw className="h-4 w-4" />
          Intentar de nuevo
        </button>
      </div>
    </>
  );
}
