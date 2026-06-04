'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TEAL, NAVY, MOOD_EYES, MOOD_ANIM, type PipeMood } from './pipe-avatar-helpers';

// Re-export for backward compatibility
export type { PipeMood } from './pipe-avatar-helpers';

// ─── usePipeLook — Singleton mouse-tracking hook ─────────
// One global mousemove listener shared across all Pipe instances.
// Uses rAF throttle to avoid firing on every mousemove event.

let listenerCount = 0;
let currentPos = { x: 0, y: 0 };
let rafId: number | null = null;
const subscribers = new Set<() => void>();

function onMouseMove(e: MouseEvent) {
  currentPos = { x: e.clientX, y: e.clientY };
  if (rafId === null) {
    rafId = requestAnimationFrame(() => {
      rafId = null;
      subscribers.forEach((cb) => cb());
    });
  }
}

function usePipeLook(
  containerRef: React.RefObject<HTMLElement | null>,
  maxLook: number,
  enabled: boolean = true,
): { x: number; y: number } {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const update = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = currentPos.x - (rect.left + rect.width / 2);
    const dy = currentPos.y - (rect.top + rect.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;
    const t = Math.min(dist / 150, 1);
    setOffset({
      x: (dx / dist) * maxLook * t,
      y: (dy / dist) * maxLook * t,
    });
  }, [containerRef, maxLook]);

  useEffect(() => {
    if (!enabled) return;

    subscribers.add(update);
    listenerCount++;
    if (listenerCount === 1) {
      window.addEventListener('mousemove', onMouseMove);
    }

    return () => {
      subscribers.delete(update);
      listenerCount--;
      if (listenerCount === 0) {
        window.removeEventListener('mousemove', onMouseMove);
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };
  }, [enabled, update]);

  if (!enabled) return { x: 0, y: 0 };
  return offset;
}

// ─── PipeAvatar Component ────────────────────────────────
export function PipeAvatar({
  mood = 'idle',
  size = 36,
  calm = false,
  lookTarget,
  headset = false,
}: {
  mood?: PipeMood;
  size?: number;
  calm?: boolean;
  /** Fixed look direction: 'right' | 'left' | 'up' | 'down'. Overrides cursor tracking. */
  lookTarget?: 'right' | 'left' | 'up' | 'down';
  /** Show call-center headset on Pipe */
  headset?: boolean;
}) {
  const s = size;
  const r = s * 0.42;
  const cx = s * 0.5;
  const cy = s * 0.5;

  const eyeBaseRx = s * 0.075;
  const eyeBaseRy = s * 0.085;
  const eyeY = s * 0.48;
  const baseEyeSpread = s * 0.13;

  const eyes = MOOD_EYES[mood];

  const uid = 'pipe-g';
  const containerRef = useRef<HTMLDivElement>(null);
  const [tapped, setTapped] = useState(false);
  const [hovered, setHovered] = useState(false);

  const maxLook = s * 0.06;

  const fixedLookOffset = useMemo(() => {
    if (!lookTarget) return null;
    const directions = {
      right: { x: maxLook, y: 0 },
      left:  { x: -maxLook, y: 0 },
      up:    { x: 0, y: -maxLook },
      down:  { x: 0, y: maxLook },
    };
    return directions[lookTarget];
  }, [maxLook, lookTarget]);

  const trackingOffset = usePipeLook(containerRef, maxLook, !fixedLookOffset);

  const handleTap = () => {
    if (tapped) return;
    setTapped(true);
    setTimeout(() => setTapped(false), 600);
  };

  const activeEyes = tapped
    ? { rxScale: 1.3, ryScale: 0.3, offsetY: -0.01, rotation: 0, blinks: false, gap: 1.15 }
    : eyes;

  const eyeRx = eyeBaseRx * activeEyes.rxScale;
  const eyeRy = eyeBaseRy * activeEyes.ryScale;
  const eyeSpread = baseEyeSpread * activeEyes.gap;
  const eyeOffY = activeEyes.offsetY * s;
  const eyeRot = activeEyes.rotation;
  const blinkAnim = !tapped && eyes.blinks ? 'pipe-blink 4s ease-in-out infinite' : 'none';

  const look = fixedLookOffset ?? trackingOffset;
  const eyeLeftX = cx - eyeSpread + look.x;
  const eyeRightX = cx + eyeSpread + look.x;
  const eyeFinalY = eyeY + eyeOffY + look.y;

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
            'rx 0.2s ease-out',
            'ry 0.2s ease-out',
            'cx 0.05s linear',
            'cy 0.05s linear',
          ].join(', '),
        }}
      />
    );
  };

  const bodyAnim = calm
    ? (hovered || tapped ? MOOD_ANIM[mood] : 'none')
    : (tapped ? 'none' : MOOD_ANIM[mood]);

  return (
    <div
      ref={containerRef}
      className="pipe-dot relative flex-shrink-0 cursor-pointer"
      style={{ width: s, height: s }}
      onClick={handleTap}
      onMouseEnter={calm ? () => setHovered(true) : undefined}
      onMouseLeave={calm ? () => setHovered(false) : undefined}
    >
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
          animation: bodyAnim,
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

        <ellipse
          cx={cx} cy={s * 0.9} rx={s * 0.22} ry={s * 0.05}
          fill={NAVY} opacity={0.07}
        />

        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-body)`} />
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-depth)`} />
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-shine)`} />

        <circle
          cx={s * 0.37} cy={s * 0.33}
          r={s * 0.035}
          fill="#fff" opacity={0.4}
        />

        {renderEye(eyeLeftX, 'left')}
        {renderEye(eyeRightX, 'right')}

        {/* Call-center headset */}
        {headset && (
          <g>
            {/* Headband arc */}
            <path
              d={`M${s * 0.1} ${s * 0.38} C${s * 0.1} ${s * 0.0}, ${s * 0.9} ${s * 0.0}, ${s * 0.9} ${s * 0.38}`}
              stroke="#374151"
              strokeWidth={s * 0.06}
              strokeLinecap="round"
              fill="none"
            />
            {/* Left ear cup */}
            <rect x={s * 0.02} y={s * 0.32} width={s * 0.16} height={s * 0.22} rx={s * 0.08} fill="#374151" />
            <rect x={s * 0.05} y={s * 0.35} width={s * 0.08} height={s * 0.16} rx={s * 0.04} fill="#4B5563" />
            {/* Right ear cup */}
            <rect x={s * 0.82} y={s * 0.32} width={s * 0.16} height={s * 0.22} rx={s * 0.08} fill="#374151" />
            <rect x={s * 0.85} y={s * 0.35} width={s * 0.08} height={s * 0.16} rx={s * 0.04} fill="#4B5563" />
            {/* Mic arm from right ear */}
            <path
              d={`M${s * 0.82} ${s * 0.5} C${s * 0.96} ${s * 0.56}, ${s * 0.94} ${s * 0.68}, ${s * 0.84} ${s * 0.74}`}
              stroke="#374151"
              strokeWidth={s * 0.04}
              strokeLinecap="round"
              fill="none"
            />
            {/* Mic tip */}
            <circle cx={s * 0.84} cy={s * 0.75} r={s * 0.06} fill="#374151" />
            <circle cx={s * 0.84} cy={s * 0.75} r={s * 0.03} fill="#4B5563" />
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── PipeStatic — 3D sphere with idle eyes, minimal interactivity ─
export function PipeStatic({ size = 24, blink = false }: { size?: number; blink?: boolean }) {
  const s = size;
  const r = s * 0.42;
  const cx = s * 0.5;
  const cy = s * 0.5;

  const eyeBaseRx = s * 0.075;
  const eyeBaseRy = s * 0.085;
  const eyeY = s * 0.48;
  const baseEyeSpread = s * 0.13;

  const eyes = MOOD_EYES.idle;
  const eyeRx = eyeBaseRx * eyes.rxScale;
  const eyeRy = eyeBaseRy * eyes.ryScale;
  const eyeSpread = baseEyeSpread * eyes.gap;
  const eyeOffY = eyes.offsetY * s;

  const uid = 'pipe-gs';

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      role="img"
      aria-label="Pipe"
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

      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-body)`} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-depth)`} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-shine)`} />

      <circle
        cx={s * 0.37} cy={s * 0.33}
        r={s * 0.035}
        fill="#fff" opacity={0.4}
      />

      <ellipse cx={cx - eyeSpread} cy={eyeY + eyeOffY} rx={eyeRx} ry={eyeRy} fill="#fff"
        style={blink ? { animation: 'pipe-blink 4s ease-in-out infinite', transformOrigin: `${cx - eyeSpread}px ${eyeY + eyeOffY}px` } : undefined}
      />
      <ellipse cx={cx + eyeSpread} cy={eyeY + eyeOffY} rx={eyeRx} ry={eyeRy} fill="#fff"
        style={blink ? { animation: 'pipe-blink 4s ease-in-out infinite', transformOrigin: `${cx + eyeSpread}px ${eyeY + eyeOffY}px` } : undefined}
      />
    </svg>
  );
}

// ─── PipeAdmin — Teal Pipe for admin context with eye tracking ─
export function PipeAdmin({ size = 36 }: { size?: number }) {
  const s = size;
  const r = s * 0.42;
  const cx = s * 0.5;
  const cy = s * 0.5;

  const eyeBaseRx = s * 0.075;
  const eyeBaseRy = s * 0.085;
  const eyeY = s * 0.48;
  const baseEyeSpread = s * 0.13;

  const eyes = MOOD_EYES.idle;
  const eyeRx = eyeBaseRx * eyes.rxScale;
  const eyeRy = eyeBaseRy * eyes.ryScale;
  const eyeSpread = baseEyeSpread * eyes.gap;
  const eyeOffY = eyes.offsetY * s;

  const uid = 'pipe-ga';
  const containerRef = useRef<HTMLDivElement>(null);
  const maxLook = s * 0.06;
  const lookOffset = usePipeLook(containerRef, maxLook);

  const eyeLeftX = cx - eyeSpread + lookOffset.x;
  const eyeRightX = cx + eyeSpread + lookOffset.x;
  const eyeFinalY = eyeY + eyeOffY + lookOffset.y;

  return (
    <div
      ref={containerRef}
      className="flex-shrink-0"
      style={{ width: s, height: s }}
    >
      <svg
        width={s} height={s}
        viewBox={`0 0 ${s} ${s}`}
        fill="none"
        role="img"
        aria-label="Pipe Admin"
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

        <ellipse cx={cx} cy={s * 0.9} rx={s * 0.22} ry={s * 0.05} fill={NAVY} opacity={0.07} />

        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-body)`} />
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-depth)`} />
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-shine)`} />

        <circle cx={s * 0.37} cy={s * 0.33} r={s * 0.035} fill="#fff" opacity={0.3} />

        <ellipse
          cx={eyeLeftX} cy={eyeFinalY} rx={eyeRx} ry={eyeRy} fill="#fff"
          style={{ transition: 'cx 0.15s ease-out, cy 0.15s ease-out' }}
        />
        <ellipse
          cx={eyeRightX} cy={eyeFinalY} rx={eyeRx} ry={eyeRy} fill="#fff"
          style={{ transition: 'cx 0.15s ease-out, cy 0.15s ease-out' }}
        />
      </svg>
    </div>
  );
}
