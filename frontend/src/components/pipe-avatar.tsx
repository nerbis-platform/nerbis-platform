'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

// Deterministic counter for SVG gradient IDs — avoids useId() hydration mismatch
// in Next.js App Router with RSC streaming. Safe because React renders components
// in the same order on server and client.
let _pipeIdCounter = 0;

// ─── Colors ──────────────────────────────────────────────
const TEAL = '#0D9488';
const NAVY = '#1C3B57';

// ─── Pipe Keyframes ──────────────────────────────────────
const PIPE_KEYFRAMES = `
@keyframes pipe-breathe {
  0%, 100% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
  15% { transform: translateY(-6px) scaleX(0.94) scaleY(1.08) rotate(2deg); }
  35% { transform: translateY(-8px) scaleX(0.92) scaleY(1.1) rotate(-1deg); }
  55% { transform: translateY(-4px) scaleX(1.04) scaleY(0.96) rotate(1deg); }
  75% { transform: translateY(-2px) scaleX(1.02) scaleY(0.98) rotate(-2deg); }
}

@keyframes pipe-think {
  0%, 100% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
  15% { transform: translateY(-6px) scaleX(1.06) scaleY(0.94) rotate(-5deg); }
  30% { transform: translateY(-3px) scaleX(0.94) scaleY(1.06) rotate(3deg); }
  50% { transform: translateY(-8px) scaleX(0.92) scaleY(1.1) rotate(-2deg); }
  70% { transform: translateY(-2px) scaleX(1.04) scaleY(0.96) rotate(4deg); }
  85% { transform: translateY(-5px) scaleX(0.98) scaleY(1.03) rotate(-1deg); }
}

@keyframes pipe-happy {
  0% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
  8% { transform: translateY(4px) scaleX(1.2) scaleY(0.8) rotate(0deg); }
  20% { transform: translateY(-22px) scaleX(0.8) scaleY(1.25) rotate(-5deg); }
  32% { transform: translateY(3px) scaleX(1.22) scaleY(0.78) rotate(3deg); }
  42% { transform: translateY(-12px) scaleX(0.85) scaleY(1.18) rotate(-3deg); }
  55% { transform: translateY(2px) scaleX(1.15) scaleY(0.85) rotate(2deg); }
  68% { transform: translateY(-5px) scaleX(0.92) scaleY(1.08) rotate(-1deg); }
  82% { transform: translateY(1px) scaleX(1.04) scaleY(0.96) rotate(1deg); }
  100% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
}

@keyframes pipe-surprised {
  0% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
  8% { transform: translateY(3px) scaleX(1.15) scaleY(0.85) rotate(0deg); }
  18% { transform: translateY(-20px) scaleX(0.75) scaleY(1.3) rotate(-3deg); }
  30% { transform: translateY(3px) scaleX(1.2) scaleY(0.82) rotate(4deg); }
  42% { transform: translateY(-8px) scaleX(0.88) scaleY(1.14) rotate(-2deg); }
  58% { transform: translateY(2px) scaleX(1.1) scaleY(0.9) rotate(2deg); }
  72% { transform: translateY(-3px) scaleX(0.96) scaleY(1.05) rotate(-1deg); }
  100% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
}

@keyframes pipe-listen {
  0%, 100% { transform: translateY(0) rotate(0deg) scaleX(1) scaleY(1); }
  15% { transform: translateY(-5px) rotate(8deg) scaleX(0.95) scaleY(1.06); }
  35% { transform: translateY(-3px) rotate(-6deg) scaleX(1.04) scaleY(0.96); }
  55% { transform: translateY(-6px) rotate(5deg) scaleX(0.97) scaleY(1.04); }
  75% { transform: translateY(-2px) rotate(-3deg) scaleX(1.02) scaleY(0.98); }
}

@keyframes pipe-read {
  0%, 100% { transform: translateY(0) rotate(0deg) scaleX(1) scaleY(1); }
  20% { transform: translateY(5px) rotate(6deg) scaleX(1.05) scaleY(0.95); }
  45% { transform: translateY(2px) rotate(2deg) scaleX(1.02) scaleY(0.98); }
  65% { transform: translateY(6px) rotate(5deg) scaleX(1.04) scaleY(0.96); }
  85% { transform: translateY(1px) rotate(1deg) scaleX(1.01) scaleY(0.99); }
}

@keyframes pipe-nudge {
  0% { transform: rotate(0deg) scaleX(1) scaleY(1) translateX(0); }
  8% { transform: rotate(12deg) scaleX(0.88) scaleY(1.12) translateX(4px); }
  20% { transform: rotate(-10deg) scaleX(1.12) scaleY(0.88) translateX(-5px); }
  32% { transform: rotate(9deg) scaleX(0.9) scaleY(1.1) translateX(4px); }
  46% { transform: rotate(-7deg) scaleX(1.08) scaleY(0.92) translateX(-3px); }
  60% { transform: rotate(4deg) scaleX(0.96) scaleY(1.04) translateX(2px); }
  76% { transform: rotate(-2deg) scaleX(1.02) scaleY(0.98) translateX(-1px); }
  88% { transform: rotate(1deg) scaleX(1) scaleY(1) translateX(0); }
  100% { transform: rotate(0deg) scaleX(1) scaleY(1) translateX(0); }
}

@keyframes pipe-blink {
  0%, 42%, 48%, 100% { transform: scaleY(1); }
  45% { transform: scaleY(0.05); }
}

@keyframes pipe-pulse {
  0%, 100% { transform: scale(1); opacity: 0; }
  50% { transform: scale(1.5); opacity: 0.12; }
}

@media(prefers-reduced-motion:reduce){.pipe-dot,.pipe-dot *{animation:none!important;transition:none!important}}
`;

// ─── Types ───────────────────────────────────────────────
export type PipeMood = 'idle' | 'listening' | 'thinking' | 'happy' | 'surprised' | 'reading' | 'nudge';

const MOOD_EYES: Record<PipeMood, {
  rxScale: number; ryScale: number; offsetY: number;
  rotation: number; blinks: boolean; gap: number;
}> = {
  idle:      { rxScale: 1,    ryScale: 1,    offsetY: 0,      rotation: 0,   blinks: true,  gap: 1 },
  listening: { rxScale: 1.05, ryScale: 1.1,  offsetY: -0.005, rotation: 0,   blinks: true,  gap: 1 },
  thinking:  { rxScale: 0.85, ryScale: 0.6,  offsetY: 0.01,   rotation: 8,   blinks: false, gap: 0.9 },
  happy:     { rxScale: 1.15, ryScale: 0.4,  offsetY: 0.005,  rotation: 0,   blinks: false, gap: 1.1 },
  surprised: { rxScale: 1.35, ryScale: 1.5,  offsetY: -0.015, rotation: 0,   blinks: false, gap: 1.15 },
  reading:   { rxScale: 0.9,  ryScale: 0.35, offsetY: 0.02,   rotation: 0,   blinks: false, gap: 0.95 },
  nudge:     { rxScale: 1.15, ryScale: 1.1,  offsetY: 0,      rotation: 5,   blinks: false, gap: 1.05 },
};

const MOOD_ANIM: Record<PipeMood, string> = {
  idle:      'pipe-breathe 3s cubic-bezier(0.37,0,0.63,1) infinite',
  listening: 'pipe-listen 2.5s cubic-bezier(0.37,0,0.63,1) infinite',
  thinking:  'pipe-think 2.5s cubic-bezier(0.37,0,0.63,1) infinite',
  happy:     'pipe-happy 1s cubic-bezier(0.34,1.56,0.64,1)',
  surprised: 'pipe-surprised 0.8s cubic-bezier(0.22,1,0.36,1)',
  reading:   'pipe-read 2.8s cubic-bezier(0.37,0,0.63,1) infinite',
  nudge:     'pipe-nudge 1s cubic-bezier(0.37,0,0.63,1)',
};

// ─── PipeAvatar Component ────────────────────────────────
export function PipeAvatar({
  mood = 'idle',
  size = 36,
  calm = false,
  lookTarget,
}: {
  mood?: PipeMood;
  size?: number;
  calm?: boolean;
  /** Fixed look direction: 'right' | 'left' | 'up' | 'down'. Overrides cursor tracking. */
  lookTarget?: 'right' | 'left' | 'up' | 'down';
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

  const uidRef = useRef<string | null>(null);
  if (uidRef.current === null) uidRef.current = `pipe-${_pipeIdCounter++}`;
  const uid = uidRef.current;
  const containerRef = useRef<HTMLDivElement>(null);
  const [lookOffset, setLookOffset] = useState({ x: 0, y: 0 });
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

  useEffect(() => {
    if (fixedLookOffset) return;
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      const t = Math.min(dist / 150, 1);
      setLookOffset({
        x: (dx / dist) * maxLook * t,
        y: (dy / dist) * maxLook * t,
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [maxLook, fixedLookOffset]);

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

  const look = fixedLookOffset ?? lookOffset;
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
            'rx 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            'ry 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            'cx 0.15s ease-out',
            'cy 0.15s ease-out',
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
      </svg>

      <style dangerouslySetInnerHTML={{ __html: PIPE_KEYFRAMES }} />
    </div>
  );
}

// ─── PipeStatic — 3D sphere with happy eyes, no interactivity ─
export function PipeStatic({ size = 24 }: { size?: number }) {
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

  const uidRef = useRef<string | null>(null);
  if (uidRef.current === null) uidRef.current = `pipe-s-${_pipeIdCounter++}`;
  const uid = uidRef.current;

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

      <ellipse cx={cx - eyeSpread} cy={eyeY + eyeOffY} rx={eyeRx} ry={eyeRy} fill="#fff" />
      <ellipse cx={cx + eyeSpread} cy={eyeY + eyeOffY} rx={eyeRx} ry={eyeRy} fill="#fff" />
    </svg>
  );
}

// ─── PipeAdmin — Navy-colored Pipe for admin context ─────
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

  const uidRef = useRef<string | null>(null);
  if (uidRef.current === null) uidRef.current = `pipe-admin-${_pipeIdCounter++}`;
  const uid = uidRef.current;
  const containerRef = useRef<HTMLDivElement>(null);
  const [lookOffset, setLookOffset] = useState({ x: 0, y: 0 });

  const maxLook = s * 0.06;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;
      const t = Math.min(dist / 150, 1);
      setLookOffset({
        x: (dx / dist) * maxLook * t,
        y: (dy / dist) * maxLook * t,
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [maxLook]);

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
