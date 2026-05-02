'use client';

// ─── Pipe Identity — PipeEditorSidebar Component ─────────
// Companion sidebar/pill para el editor de sitios web.
// Colapsado: muestra PipePill flotante en esquina inferior derecha.
// Expandido: Sheet lateral con avatar y tips contextuales.
// Persiste preferencia open/closed en localStorage.

import { useCallback, useEffect, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

import { PIPE_COLORS } from './constants';
import { PipeAvatar } from './pipe-avatar';
import { PipePill } from './pipe-pill';
import type { PipeMood } from './types';

// ─── Editor Tips ──────────────────────────────────────────

interface EditorTip {
  id: string;
  category: string;
  text: string;
  mood: PipeMood;
}

const EDITOR_TIPS: EditorTip[] = [
  {
    id: 'hero-image',
    category: 'General',
    text: 'Un buen hero con imagen grande convierte mejor.',
    mood: 'encouraging',
  },
  {
    id: 'about-story',
    category: 'Sobre ti',
    text: 'Cuenta tu historia \u2014 los clientes conectan con personas, no logos.',
    mood: 'idle',
  },
  {
    id: 'contact-whatsapp',
    category: 'Contacto',
    text: 'Agrega WhatsApp si puedes, convierte 3x mas que el email.',
    mood: 'happy',
  },
  {
    id: 'services-photos',
    category: 'Servicios',
    text: 'Fotos reales siempre ganan a fotos de stock.',
    mood: 'focused',
  },
  {
    id: 'consistency',
    category: 'General',
    text: 'Mantener colores y tipografia consistentes transmite profesionalismo.',
    mood: 'idle',
  },
  {
    id: 'cta-clarity',
    category: 'General',
    text: 'Un CTA claro y visible vale mas que tres escondidos.',
    mood: 'encouraging',
  },
];

// ─── localStorage helpers ─────────────────────────────────

const STORAGE_KEY = 'pipe-editor-sidebar-open';

function getStoredPreference(): boolean | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

function setStoredPreference(open: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(open));
  } catch {
    // localStorage not available
  }
}

// ─── Component ────────────────────────────────────────────

interface PipeEditorSidebarProps {
  /** Active section ID from the editor, for context-aware tips in the future */
  activeSection?: string;
  className?: string;
}

/**
 * PipeEditorSidebar — Companion de Pipe para el editor de sitios web.
 *
 * Estado colapsado: PipePill flotante en la esquina inferior derecha.
 * Estado expandido: Sheet lateral con avatar, tips y sugerencias.
 * La preferencia open/closed persiste en localStorage.
 * Primera visita: colapsado (solo pill).
 */
export function PipeEditorSidebar({ activeSection, className }: PipeEditorSidebarProps) {
  // Restore preference from localStorage (only on client)
  const [isOpen, setIsOpen] = useState(() => {
    const stored = getStoredPreference();
    return stored === true;
  });
  const [mounted, setMounted] = useState(false);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());

  // Mark mounted to avoid hydration mismatch
  useEffect(() => {
    // Use startTransition-like pattern to avoid cascading render warning
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setStoredPreference(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setStoredPreference(false);
  }, []);

  const handleDismissTip = useCallback((tipId: string) => {
    setDismissedTips((prev) => new Set(prev).add(tipId));
  }, []);

  // Don't render until mounted (avoids hydration mismatch with localStorage)
  if (!mounted) return null;

  // Show section-relevant tips first when activeSection is provided
  const SECTION_TO_CATEGORY: Record<string, string> = {
    about: 'Sobre ti',
    contact: 'Contacto',
    services: 'Servicios',
  };
  const activeCat = activeSection ? SECTION_TO_CATEGORY[activeSection] : undefined;
  const visibleTips = EDITOR_TIPS
    .filter((tip) => !dismissedTips.has(tip.id))
    .sort((a, b) => {
      if (!activeCat) return 0;
      const aMatch = a.category === activeCat ? -1 : 0;
      const bMatch = b.category === activeCat ? -1 : 0;
      return aMatch - bMatch;
    });

  return (
    <>
      {/* ─── Collapsed: Floating Pill ───────────────────────── */}
      {!isOpen && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-40',
            'transition-opacity duration-200 ease-out',
            className,
          )}
        >
          <PipePill
            mood="idle"
            onClick={handleOpen}
            pulse={visibleTips.length > 0}
            className="shadow-lg"
          />
        </div>
      )}

      {/* ─── Expanded: Sheet Sidebar ────────────────────────── */}
      <Sheet open={isOpen} onOpenChange={(open) => (open ? handleOpen() : handleClose())}>
        <SheetContent
          side="right"
          className="w-[320px] sm:max-w-[320px] flex flex-col gap-0 p-0"
        >
          <SheetHeader className="p-5 pb-4">
            <div className="flex items-center gap-3">
              <PipeAvatar mood="focused" size="lg" />
              <div className="flex flex-col gap-0.5">
                <SheetTitle className="text-base font-semibold tracking-tight">
                  Pipe
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Tu asistente de edicion
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* ─── Tips List ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb
                className="size-3.5 flex-shrink-0"
                style={{ color: PIPE_COLORS.teal }}
              />
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: PIPE_COLORS.warmGray500 }}
              >
                Tips
              </span>
            </div>

            {visibleTips.length === 0 ? (
              <p
                className="text-sm leading-relaxed"
                style={{ color: PIPE_COLORS.warmGray400 }}
              >
                Ya revisaste todos los tips. Sigue editando, voy a estar por aqui.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {visibleTips.map((tip) => (
                  <div
                    key={tip.id}
                    className="group relative rounded-lg p-3 transition-colors duration-150"
                    style={{
                      backgroundColor: `${PIPE_COLORS.teal}06`,
                      border: `1px solid ${PIPE_COLORS.teal}12`,
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 mt-0.5">
                        <PipeAvatar mood={tip.mood} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-[0.65rem] font-medium uppercase tracking-wider"
                          style={{ color: PIPE_COLORS.warmGray400 }}
                        >
                          {tip.category}
                        </span>
                        <p
                          className="text-sm leading-relaxed mt-0.5"
                          style={{ color: PIPE_COLORS.warmGray600 }}
                        >
                          {tip.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDismissTip(tip.id)}
                        className="flex-shrink-0 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-black/5 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                        style={{ color: PIPE_COLORS.warmGray400 }}
                        aria-label={`Descartar tip: ${tip.text}`}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Footer ─────────────────────────────────────── */}
          <div
            className="px-5 py-3 border-t"
            style={{ borderColor: `${PIPE_COLORS.warmGray200}` }}
          >
            <p
              className="text-xs leading-relaxed"
              style={{ color: PIPE_COLORS.warmGray400 }}
            >
              Pipe aprende de tu sitio para darte mejores tips.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
