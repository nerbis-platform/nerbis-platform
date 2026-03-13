'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Scissors, Eraser, Undo2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { autoTrimImage } from '@/lib/utils/logo-canvas';

// ─── Types ───────────────────────────────────────────────────

interface LogoOptimizerProps {
  imageDataUrl: string;
  onApply: (newDataUrl: string) => void;
  onColorsExtracted?: (colors: { primary: string; secondary: string }) => void;
  compact?: boolean;
}

// ─── Transparency hint (subtle dot grid — replaces checkerboard) ──

const dotPatternStyle: React.CSSProperties = {
  backgroundColor: '#FAFAFA',
  backgroundImage: 'radial-gradient(circle, #E5E5E5 0.5px, transparent 0.5px)',
  backgroundSize: '8px 8px',
};

const solidBgStyle: React.CSSProperties = {
  backgroundColor: '#F8F8F8',
};

// ─── Component ───────────────────────────────────────────────

export default function LogoOptimizer({
  imageDataUrl,
  onApply,
  onColorsExtracted,
  compact = false,
}: LogoOptimizerProps) {
  // Image state
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [workingImage, setWorkingImage] = useState<string | null>(null);

  // Operation flags
  const [bgRemoved, setBgRemoved] = useState(false);
  const [isTrimmed, setIsTrimmed] = useState(false);

  // UI states
  const [showOriginal, setShowOriginal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelStatus, setModelStatus] = useState<'idle' | 'downloading' | 'processing'>('idle');
  const [justApplied, setJustApplied] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const prevImageRef = useRef<string>(imageDataUrl);

  const hasModifications = bgRemoved || isTrimmed;

  // ── Initialize / reset on new image ──
  useEffect(() => {
    if (!originalImage) {
      setOriginalImage(imageDataUrl);
      setWorkingImage(imageDataUrl);
    } else if (
      imageDataUrl !== prevImageRef.current &&
      imageDataUrl !== originalImage &&
      imageDataUrl !== workingImage
    ) {
      setOriginalImage(imageDataUrl);
      setWorkingImage(imageDataUrl);
      setBgRemoved(false);
      setIsTrimmed(false);
      setShowOriginal(false);
      setModelStatus('idle');
      setJustApplied(false);
    }
    prevImageRef.current = imageDataUrl;
  }, [imageDataUrl, originalImage, workingImage]);

  // ── Re-extract colors ──
  const reExtractColors = useCallback(
    async (dataUrl: string) => {
      if (!onColorsExtracted) return;
      try {
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.src = dataUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
        });
        const ColorThief = (await import('colorthief')).default;
        const ct = new ColorThief();
        const palette = ct.getPalette(img, 5);
        const toHex = (rgb: [number, number, number]) =>
          '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
        onColorsExtracted({
          primary: toHex(palette[0]),
          secondary: toHex(palette[1]),
        });
      } catch {
        /* silently fail */
      }
    },
    [onColorsExtracted],
  );

  // ── Remove background ──
  const handleRemoveBackground = async () => {
    setIsProcessing(true);
    try {
      setModelStatus('downloading');
      const { removeBackground } = await import('@imgly/background-removal');
      const source = workingImage || imageDataUrl;
      const blob = await removeBackground(source, {
        progress: (key: string, current: number, total: number) => {
          if (key.startsWith('fetch:') && current < total) {
            setModelStatus('downloading');
          } else if (key.startsWith('compute:')) {
            setModelStatus('processing');
          }
        },
      });

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setWorkingImage(result);
        setBgRemoved(true);
        setModelStatus('idle');
        setIsProcessing(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Background removal failed:', err);
      toast.error('No se pudo quitar el fondo. Intenta con Chrome o Edge.');
      setIsProcessing(false);
      setModelStatus('idle');
    }
  };

  // ── Auto-trim ──
  const handleTrim = async () => {
    const current = workingImage || imageDataUrl;
    const trimmed = await autoTrimImage(current);
    setWorkingImage(trimmed);
    setIsTrimmed(true);
  };

  // ── Apply (commit to parent) ──
  const handleApply = () => {
    if (!workingImage || !hasModifications) return;
    setJustApplied(true);
    onApply(workingImage);
    reExtractColors(workingImage);
    setTimeout(() => setJustApplied(false), 800);
  };

  // ── Undo all ──
  const handleUndo = () => {
    if (originalImage) {
      setWorkingImage(originalImage);
      setBgRemoved(false);
      setIsTrimmed(false);
      setShowOriginal(false);
    }
  };

  // ── Before/after crossfade ──
  const handleToggleOriginal = () => {
    setIsFading(true);
    setTimeout(() => {
      setShowOriginal((prev) => !prev);
      setTimeout(() => setIsFading(false), 20);
    }, 150);
  };

  // ── Preview image source ──
  const previewSrc = showOriginal
    ? originalImage || imageDataUrl
    : workingImage || imageDataUrl;

  // ── Preview background ──
  const previewBg = bgRemoved && !showOriginal ? dotPatternStyle : solidBgStyle;

  return (
    <div className="space-y-2.5 mt-3">
      {/* Header */}
      <p className="text-[0.72rem] font-medium text-gray-400 uppercase tracking-wide">
        Optimizar logo
      </p>

      {/* ── Preview card ── */}
      <div
        className="relative flex items-center justify-center rounded-xl border border-gray-100 overflow-hidden"
        style={{ ...previewBg, padding: compact ? '12px' : '20px' }}
      >
        {/* Status pill */}
        {hasModifications && (
          <span
            className={`absolute top-2 left-2 text-[0.58rem] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full transition-colors duration-200 ${
              showOriginal
                ? 'bg-gray-200/80 text-gray-500'
                : 'bg-[#E2F3F1]/80 text-[#1C3B57]'
            }`}
          >
            {showOriginal ? 'Original' : 'Optimizado'}
          </span>
        )}

        {/* Shimmer overlay during processing */}
        {isProcessing && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl"
            aria-hidden
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                animation: 'logo-opt-shimmer 1.5s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {/* Logo image */}
        <img
          src={previewSrc}
          alt="Logo"
          className="relative z-1 object-contain transition-opacity duration-300"
          style={{
            maxHeight: compact ? '56px' : '64px',
            maxWidth: compact ? '160px' : '200px',
            opacity: isFading ? 0 : 1,
          }}
        />
      </div>

      {/* ── Status text (during bg removal) ── */}
      {modelStatus !== 'idle' && (
        <div className="flex items-center gap-2 text-[0.72rem] text-gray-400">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#95D0C9]"
            style={{ animation: 'logo-opt-pulse 1.2s ease-in-out infinite' }}
          />
          {modelStatus === 'downloading'
            ? 'Descargando modelo de IA...'
            : 'Procesando imagen...'}
        </div>
      )}

      {/* ── Tool buttons ── */}
      <div className="flex gap-2">
        <ToolButton
          icon={bgRemoved ? Check : Eraser}
          label={isProcessing ? 'Quitando fondo...' : bgRemoved ? 'Fondo quitado' : 'Quitar fondo'}
          isActive={bgRemoved}
          isLoading={isProcessing}
          disabled={isProcessing}
          onClick={handleRemoveBackground}
          compact={compact}
        />
        <ToolButton
          icon={isTrimmed ? Check : Scissors}
          label={isTrimmed ? 'Recortado' : 'Recortar'}
          isActive={isTrimmed}
          disabled={isProcessing}
          onClick={handleTrim}
          compact={compact}
        />
      </div>

      {/* ── Before/after toggle ── */}
      {hasModifications && (
        <button
          type="button"
          onClick={handleToggleOriginal}
          className="flex items-center gap-1.5 text-[0.72rem] font-medium text-gray-400 hover:text-[#1C3B57] transition-colors duration-200 cursor-pointer"
        >
          {showOriginal ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {showOriginal ? 'Ver optimizado' : 'Ver original'}
        </button>
      )}

      {/* ── Action footer (Deshacer + Aplicar) ── */}
      {hasModifications && (
        <div
          className="flex gap-2 pt-0.5"
          style={{ animation: 'logo-opt-slide-up 200ms ease-out' }}
        >
          <button
            type="button"
            onClick={handleUndo}
            disabled={isProcessing}
            className="flex-1 h-9 rounded-xl border border-gray-200 text-[0.75rem] font-medium text-gray-500 hover:border-gray-300 hover:text-gray-600 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Deshacer
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isProcessing || justApplied}
            className="flex-1 h-9 rounded-xl text-[0.75rem] font-medium text-white transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{
              background: justApplied ? '#95D0C9' : '#1C3B57',
              animation: justApplied ? 'logo-opt-success 400ms ease-out' : undefined,
            }}
          >
            {justApplied ? (
              <span className="flex items-center justify-center gap-1">
                <Check className="h-3.5 w-3.5" />
                Aplicado
              </span>
            ) : (
              'Aplicar'
            )}
          </button>
        </div>
      )}

      {/* ── Inline keyframes ── */}
      <style jsx>{`
        @keyframes logo-opt-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes logo-opt-slide-up {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes logo-opt-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes logo-opt-success {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── ToolButton (local) ──────────────────────────────────────

function ToolButton({
  icon: Icon,
  label,
  isActive = false,
  isLoading = false,
  disabled = false,
  onClick,
  compact = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border text-[0.75rem] font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        isActive
          ? 'border-[#95D0C9] bg-[#E2F3F1]/50 text-[#1C3B57]'
          : 'border-gray-100 text-gray-500 hover:border-[#95D0C9] hover:text-[#1C3B57] hover:bg-[#E2F3F1]/20'
      }`}
      style={{ height: compact ? '32px' : '36px' }}
    >
      <Icon className={`h-3.5 w-3.5 ${isLoading ? 'animate-pulse' : ''}`} />
      <span className="truncate">{label}</span>
    </button>
  );
}
