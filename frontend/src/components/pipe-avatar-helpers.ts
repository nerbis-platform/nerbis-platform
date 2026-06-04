// ─── Colors ──────────────────────────────────────────────

export const TEAL = '#0D9488';
export const NAVY = '#1C3B57';

// ─── Types ───────────────────────────────────────────────

export type PipeMood = 'idle' | 'listening' | 'thinking' | 'happy' | 'surprised' | 'reading' | 'nudge' | 'pleading';

// ─── Mood config ─────────────────────────────────────────

export const MOOD_EYES: Record<PipeMood, {
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
  pleading:  { rxScale: 1.5,  ryScale: 1.6,  offsetY: -0.02,  rotation: 0,   blinks: false, gap: 1 },
};

export const MOOD_ANIM: Record<PipeMood, string> = {
  idle:      'pipe-breathe 3s cubic-bezier(0.37,0,0.63,1) infinite',
  listening: 'pipe-listen 2.5s cubic-bezier(0.37,0,0.63,1) infinite',
  thinking:  'pipe-think 2.5s cubic-bezier(0.37,0,0.63,1) infinite',
  happy:     'pipe-happy 1s cubic-bezier(0.34,1.56,0.64,1)',
  surprised: 'pipe-surprised 0.8s cubic-bezier(0.22,1,0.36,1)',
  reading:   'pipe-read 2.8s cubic-bezier(0.37,0,0.63,1) infinite',
  nudge:     'pipe-nudge 1s cubic-bezier(0.37,0,0.63,1)',
  pleading:  'pipe-breathe 2.5s cubic-bezier(0.37,0,0.63,1) infinite',
};
