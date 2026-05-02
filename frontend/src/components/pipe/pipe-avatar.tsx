'use client';

// ─── Pipe Identity — PipeAvatar Component ─────────────────
// Standalone avatar de Pipe, extraido del quick-start.
// Renderiza el SVG con expresiones faciales segun el mood,
// pupilas que siguen el cursor, y animaciones del cuerpo.

import { useEffect, useInsertionEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { PIPE_KEYFRAMES } from './animations';
import {
  PIPE_COLORS,
  PIPE_FACE_GRADIENT,
  PIPE_PROPORTIONS,
  PIPE_SHINE_GRADIENT,
  PIPE_SIZES,
} from './constants';
import { MOOD_CONFIGS } from './moods';
import type { PipeMood } from './types';

type PipeSizePresetKey = 'sm' | 'md' | 'lg' | 'xl';

interface PipeAvatarProps {
  mood?: PipeMood;
  size?: number | PipeSizePresetKey;
  className?: string;
  onMoodChange?: (mood: PipeMood) => void;
}

/**
 * Resuelve el tamano en px a partir de un preset o un numero directo.
 */
function resolveSize(size: number | PipeSizePresetKey): number {
  if (typeof size === 'string') {
    return PIPE_SIZES[size].size;
  }
  return size;
}

/**
 * Genera el path d de la boca, reemplazando MOUTH con la posicion Y real.
 */
function resolveMouthPath(template: string, mouthY: number, s: number): string {
  return template
    .replace(/MOUTH\+([0-9.]+)/g, (_match, offset) => String(mouthY + s * parseFloat(offset)))
    .replace(/MOUTH/g, String(mouthY))
    .replace(/([0-9.]+)\s/g, (_match, val) => {
      const num = parseFloat(val);
      // Only replace values that look like proportions (0-1 range)
      if (num > 0 && num < 1) return `${s * num} `;
      return _match;
    });
}

// Singleton: inject keyframes CSS once into the document
let keyframesInjected = false;

function useKeyframesInjection() {
  useInsertionEffect(() => {
    if (keyframesInjected || typeof document === 'undefined') return;
    keyframesInjected = true;
    const style = document.createElement('style');
    style.setAttribute('data-pipe-keyframes', '');
    style.textContent = PIPE_KEYFRAMES;
    document.head.appendChild(style);
  }, []);
}

/**
 * PipeAvatar — Avatar SVG animado de Pipe con expresiones por mood.
 *
 * Soporta los 13 moods del sistema, cursor-tracking en pupilas,
 * y respeta prefers-reduced-motion.
 */
export function PipeAvatar({ mood = 'idle', size = 'md', className, onMoodChange }: PipeAvatarProps) {
  useKeyframesInjection();
  const s = resolveSize(size);
  const p = PIPE_PROPORTIONS;
  const config = MOOD_CONFIGS[mood];

  const eyeW = s * p.eyeWidth;
  const eyeH = s * p.eyeHeight;
  const eyeY = s * p.eyeCenterY;
  const eyeLeftX = s * p.eyeLeftX;
  const eyeRightX = s * p.eyeRightX;
  const mouthY = s * p.mouthY;

  const [uid] = useState(() => `pipe-${s}-${Math.random().toString(36).slice(2, 6)}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

  const maxPupilMove = s * p.maxPupilMove;

  // Cursor-tracking pupils
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
      const clampVal = Math.min(dist / 200, 1);
      setPupilOffset({
        x: (dx / dist) * maxPupilMove * clampVal,
        y: (dy / dist) * maxPupilMove * clampVal,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [maxPupilMove]);

  // Notify parent of mood changes
  useEffect(() => {
    onMoodChange?.(mood);
  }, [mood, onMoodChange]);

  // ─── Derived SVG values from mood config ─────────────────

  const { eyes, antenna, mouth } = config;

  // Eye radii with mood-specific scaling
  const eyeRx = (eyeW / 2) * eyes.rxScale;
  const eyeRy = (eyeH / 2) * eyes.ryScale;
  const pupilR = s * p.pupilRadius * (eyes.pupilScale ?? 1);
  const pupilExtraY = (eyes.pupilOffsetY ?? 0) * s;
  const shouldBlink = eyes.blinks;

  // Body animation
  const bodyAnim = `${config.bodyAnimation} ${config.bodyAnimationDuration} ease-in-out ${config.bodyAnimationIteration ?? 'infinite'}`;

  // Antenna
  const antennaAnim = `${antenna.animation} ${antenna.duration} ease-in-out infinite`;
  const antennaGlow = antenna.glowColor ?? PIPE_COLORS.cyan;

  // ─── Render mouth ────────────────────────────────────────

  function renderMouth() {
    if (mouth.type === 'ellipse') {
      return (
        <ellipse
          cx={s * 0.5}
          cy={mouthY + s * (mouth.offsetY ?? 0)}
          rx={s * mouth.rx}
          ry={s * mouth.ry}
          fill={PIPE_COLORS.white}
          opacity={mouth.opacity ?? 1}
          style={
            mood === 'thinking'
              ? { animation: 'pipe-mouth-think 2s ease-in-out infinite' }
              : undefined
          }
        />
      );
    }

    if (mouth.type === 'line') {
      return (
        <line
          x1={s * mouth.x1}
          y1={mouthY + s * (mouth.offsetY ?? 0)}
          x2={s * mouth.x2}
          y2={mouthY + s * (mouth.offsetY ?? 0)}
          stroke={PIPE_COLORS.white}
          strokeWidth={s * 0.035}
          strokeLinecap="round"
          opacity={mouth.opacity ?? 1}
        />
      );
    }

    // Path type
    const d = resolveMouthPath(mouth.d, mouthY, s);
    return (
      <path
        d={d}
        stroke={PIPE_COLORS.white}
        strokeWidth={s * (mouth.strokeWidth ?? 0.035)}
        strokeLinecap="round"
        fill={mouth.fill ?? 'none'}
      />
    );
  }

  // ─── Render eye (shared for left and right) ──────────────

  function renderEye(cx: number) {
    const blinkAnim = shouldBlink
      ? 'pipe-blink 3.5s ease-in-out infinite'
      : 'none';

    return (
      <>
        <ellipse
          cx={cx}
          cy={eyeY}
          rx={eyeRx}
          ry={eyeRy}
          fill={PIPE_COLORS.white}
          style={{
            animation: blinkAnim,
            transformOrigin: `${cx}px ${eyeY}px`,
            transition: 'rx 0.2s ease-out, ry 0.2s ease-out',
          }}
        />
        <circle
          cx={cx + pupilOffset.x}
          cy={eyeY + pupilExtraY + pupilOffset.y}
          r={pupilR}
          fill={PIPE_COLORS.navy}
          style={{
            animation: blinkAnim,
            transformOrigin: `${cx}px ${eyeY}px`,
            transition: 'cx 0.1s ease-out, cy 0.1s ease-out, r 0.2s ease-out',
          }}
        />
      </>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('pipe-avatar relative flex-shrink-0', className)}
      style={{ width: s, height: s }}
    >
      {/* Glow ring for thinking mood */}
      {mood === 'thinking' && (
        <div
          className="absolute rounded-full"
          style={{
            inset: -4,
            background: `radial-gradient(circle, ${PIPE_COLORS.teal}25 0%, transparent 70%)`,
            animation: 'pipe-glow 2s ease-in-out infinite',
          }}
        />
      )}

      <svg
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
        fill="none"
        role="img"
        aria-label={`Pipe avatar - ${mood}`}
        style={{ animation: bodyAnim }}
      >
        <defs>
          <linearGradient
            id={`${uid}-face`}
            x1={PIPE_FACE_GRADIENT.x1}
            y1={PIPE_FACE_GRADIENT.y1}
            x2={PIPE_FACE_GRADIENT.x2}
            y2={PIPE_FACE_GRADIENT.y2}
          >
            {PIPE_FACE_GRADIENT.stops.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
          <linearGradient
            id={`${uid}-shine`}
            x1={PIPE_SHINE_GRADIENT.x1}
            y1={PIPE_SHINE_GRADIENT.y1}
            x2={PIPE_SHINE_GRADIENT.x2}
            y2={PIPE_SHINE_GRADIENT.y2}
          >
            {PIPE_SHINE_GRADIENT.stops.map((stop) => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </linearGradient>
        </defs>

        {/* Shadow */}
        <rect
          x={s * (p.headOffset + p.shadowOffset)}
          y={s * (p.antennaBaseY + p.shadowOffset)}
          width={s * (p.headSize - 0.02)}
          height={s * (p.headSize - 0.02)}
          rx={s * p.headRadius}
          fill={PIPE_COLORS.navy}
          opacity={0.15}
        />

        {/* Head */}
        <rect
          x={s * p.headOffset}
          y={s * p.antennaBaseY}
          width={s * p.headSize}
          height={s * p.headSize}
          rx={s * p.headRadius}
          fill={`url(#${uid}-face)`}
        />

        {/* Shine overlay */}
        <rect
          x={s * p.headOffset}
          y={s * p.antennaBaseY}
          width={s * p.headSize}
          height={s * p.headSize}
          rx={s * p.headRadius}
          fill={`url(#${uid}-shine)`}
        />

        {/* Eyes */}
        {renderEye(eyeLeftX)}
        {renderEye(eyeRightX)}

        {/* Mouth */}
        {renderMouth()}

        {/* Antenna stalk */}
        <line
          x1={s * 0.5}
          y1={s * p.antennaBaseY}
          x2={s * 0.5}
          y2={s * p.antennaTipY}
          stroke={antennaGlow}
          strokeWidth={s * p.antennaWidth}
          strokeLinecap="round"
          opacity={antenna.stalkOpacity}
        />

        {/* Antenna dot */}
        <circle
          cx={s * 0.5}
          cy={s * p.antennaDotY}
          r={s * p.antennaDotRadius}
          fill={antennaGlow}
          style={{ animation: antennaAnim }}
        />
      </svg>

      {/* CSS Animations injected once via useKeyframesInjection */}
    </div>
  );
}
