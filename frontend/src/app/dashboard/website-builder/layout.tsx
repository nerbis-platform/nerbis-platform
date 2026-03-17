'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  number: number;
  name: string;
  path: string;
}

const steps: Step[] = [
  { id: 'template', number: 1, name: 'Plantilla', path: '/dashboard/website-builder' },
  { id: 'onboarding', number: 2, name: 'Tu Negocio', path: '/dashboard/website-builder/onboarding' },
  { id: 'generate', number: 3, name: 'Generar', path: '/dashboard/website-builder/generate' },
  { id: 'editor', number: 4, name: 'Editar', path: '/dashboard/website-builder/editor' },
];

// Map backend website_status to the highest step index reached
function getMaxStepFromStatus(websiteStatus: string | null | undefined): number {
  switch (websiteStatus) {
    case 'review':
    case 'published':
      return 3; // editor
    case 'generating':
      return 2; // generate
    case 'onboarding':
      return 1; // onboarding
    case 'draft':
      return 0; // template
    default:
      return 0;
  }
}

function getCurrentStepIndex(currentPath: string): number {
  let currentIndex = -1;
  let longestMatch = 0;
  steps.forEach((s, i) => {
    if (currentPath.startsWith(s.path) && s.path.length > longestMatch) {
      longestMatch = s.path.length;
      currentIndex = i;
    }
  });
  return currentIndex;
}

type StepVisual = 'complete' | 'current' | 'upcoming';

function getStepStatus(stepIndex: number, currentIndex: number, maxReached: number): StepVisual {
  if (stepIndex === currentIndex) return 'current';
  if (stepIndex <= maxReached && stepIndex < currentIndex) return 'complete';
  // Steps beyond current but within reached range: show as complete (reachable)
  if (stepIndex <= maxReached) return 'complete';
  return 'upcoming';
}

export default function WebsiteBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { logout, tenant } = useAuth();
  const currentIndex = getCurrentStepIndex(pathname);
  const maxReached = getMaxStepFromStatus(tenant?.website_status);

  const isEditorPage = pathname.startsWith('/dashboard/website-builder/editor');

  // ─── Editor: immersive full-screen layout (no stepper) ─────
  if (isEditorPage) {
    return (
      <div
        className="h-screen bg-white overflow-hidden"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}
      >
        {children}
      </div>
    );
  }

  // ─── Standard wizard layout (stepper visible) ──────────────
  return (
    <div
      className="min-h-screen bg-[#FAFAFA]"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}
    >
      <style jsx global>{`
        @keyframes g-pendulum {
          0%   { transform: rotate(0deg); }
          6%   { transform: rotate(-18deg); }
          15%  { transform: rotate(-18deg); }
          35%  { transform: rotate(0deg); }
          42%  { transform: rotate(0deg); }
          48%  { transform: rotate(18deg); }
          57%  { transform: rotate(18deg); }
          77%  { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .g-pendulum {
          animation: g-pendulum 4.3s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .g-pendulum { animation: none; }
        }
      `}</style>

      {/* Header — misma identidad que Setup */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo + NERBIS — misma posición que Setup */}
          <div className="flex items-center gap-2">
            <Image
              src="/Isotipo_color_NERBIS.png"
              alt="Nerbis"
              width={36}
              height={36}
              className="g-pendulum"
            />
            <span
              className="text-[0.85rem] font-semibold tracking-wide"
              style={{ color: '#1C3B57' }}
            >
              NERBIS
            </span>
          </div>

          {/* Step indicator */}
          <span className="text-[0.72rem] text-gray-400 font-medium tracking-wide">
            PASO 2 DE 2
          </span>

          {/* Salir */}
          <button
            type="button"
            onClick={() => logout('/register-business')}
            className="flex items-center gap-1.5 text-[0.72rem] text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-5 relative">
          {/* Volver — posicionado a la izquierda sin afectar el centrado del stepper */}
          <Link
            href="/dashboard/setup"
            className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[0.72rem] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver
          </Link>
          <div className="flex items-center justify-center">
            {steps.map((step, index) => {
              const status = getStepStatus(index, currentIndex, maxReached);
              const isClickable = index <= maxReached;

              const circleAndLabel = (
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-[0.7rem] font-semibold transition-all duration-300',
                      status === 'complete' && 'bg-[#1C3B57] text-white',
                      status === 'current' && 'bg-[#0D9488] text-white',
                      status === 'upcoming' && 'bg-gray-100 text-gray-400'
                    )}
                  >
                    {status === 'complete' ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[0.68rem] font-medium transition-colors',
                      status === 'complete' && 'text-[#1C3B57]',
                      status === 'current' && 'text-[#1C3B57] font-semibold',
                      status === 'upcoming' && 'text-gray-400'
                    )}
                  >
                    {step.name}
                  </span>
                </div>
              );

              return (
                <div key={step.id} className="flex items-center">
                  {isClickable ? (
                    <Link
                      href={index !== currentIndex ? `${step.path}?nav=1` : step.path}
                      className={cn(
                        'transition-opacity',
                        status !== 'current' && 'hover:opacity-70'
                      )}
                    >
                      {circleAndLabel}
                    </Link>
                  ) : (
                    <div className="cursor-not-allowed opacity-100">
                      {circleAndLabel}
                    </div>
                  )}

                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className="w-16 sm:w-24 h-[2px] mx-3 sm:mx-4 -mt-5">
                      <div
                        className={cn(
                          'h-full rounded-full transition-colors duration-500',
                          status === 'complete' ? 'bg-[#1C3B57]' : 'bg-gray-200'
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}
